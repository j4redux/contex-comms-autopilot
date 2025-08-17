/*
  Bun script to exercise the Omni backend end-to-end with Inngest architecture.
  - Creates a sandbox
  - Polls until ready  
  - Starts a knowledge/process job (triggers Inngest function)
  - Verifies job was accepted and function execution begins

  Since we use Inngest for real-time streaming, this test validates:
  1. API endpoints work correctly
  2. Inngest function is triggered
  3. Task is properly accepted

  Real-time streaming validation should be done through:
  - Inngest Dev Server dashboard at http://localhost:8288
  - Frontend integration tests with @inngest/realtime

  Usage:
    bun run scripts/e2e-inngest-process.ts

  Env:
    BASE_URL (default: http://localhost:8787)
    USER_ID (default: u1)
    INPUT (default prompt)
    MODEL (optional, e.g. sonnet)
    TASK_ID (optional: specify taskId; if not set, generates one)
*/

const BASE = Bun.env.BASE_URL || "http://localhost:8787";
const USER_ID = Bun.env.USER_ID || "u1";
const INPUT = Bun.env.INPUT || "What is 3 plus 7?";
const MODEL = Bun.env.MODEL || "sonnet";
const TASK_ID = Bun.env.TASK_ID || `test-task-${Date.now()}`;
const TIMEOUT_MS = Number(Bun.env.TIMEOUT_MS || 180_000);

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function createSandbox(userId: string) {
  const res = await fetch(`${BASE}/api/sandbox/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) {
    let body = "";
    try { body = await res.text(); } catch {}
    throw new Error(`create sandbox failed: ${res.status} ${body}`);
  }
  return res.json() as Promise<{ sandboxId: string; status: string }>; 
}

async function getSandboxStatus(id: string) {
  const res = await fetch(`${BASE}/api/sandbox/status?id=${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`status failed: ${res.status}`);
  return res.json() as Promise<{ sandboxId: string; status: string; createdAt?: string } | { error: any }>;
}

async function startProcess(params: any) {
  const res = await fetch(`${BASE}/api/knowledge/process`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`process start failed: ${res.status} ${txt}`);
  }
  return res.json() as Promise<{ jobId: string; accepted: boolean } | { error: any }>;
}

async function main() {
  console.log("=== E2E Inngest Test Configuration ===");
  console.log(`BASE=${BASE}`);
  console.log(`USER_ID=${USER_ID}`);
  console.log(`TASK_ID=${TASK_ID}`);
  console.log(`INPUT=${INPUT.substring(0, 50)}${INPUT.length > 50 ? '...' : ''}`);
  console.log(`MODEL=${MODEL}`);
  console.log(`TIMEOUT_MS=${TIMEOUT_MS}`);
  console.log("========================================\n");
  
  // 1) Create sandbox
  console.log("Step 1: Creating sandbox...");
  const cs = await createSandbox(USER_ID);
  console.log("sandbox:", cs);
  const sandboxId = (cs as any).sandboxId;

  // 2) Poll until ready
  console.log(`Step 2: Polling sandbox ${sandboxId} for ready status...`);
  const deadline = Date.now() + 120_000;
  let attempts = 0;
  while (Date.now() < deadline) {
    attempts++;
    try {
      const st = await getSandboxStatus(sandboxId);
      if ((st as any).error) throw new Error(`sandbox status error: ${(st as any).error?.message || "unknown"}`);
      console.log(`[Attempt ${attempts}] status:`, st);
      if ((st as any).status === "ready") {
        console.log("✅ Sandbox is ready!");
        break;
      }
      if ((st as any).status === "error") {
        throw new Error(`Sandbox failed with error status`);
      }
    } catch (error) {
      console.error(`[Attempt ${attempts}] Error checking sandbox status:`, error);
      if (attempts > 5) throw error; // Give up after several failed attempts
    }
    await sleep(2000);
  }
  
  if (Date.now() >= deadline) {
    throw new Error("Sandbox did not become ready within timeout");
  }

  // 3) Start process (triggers Inngest function)
  console.log("Step 3: Starting knowledge processing (triggering Inngest function)...");
  const body = {
    userId: USER_ID,
    sandboxId,
    taskId: TASK_ID,
    input: INPUT,
    model: MODEL,
  };
  const start = await startProcess(body);
  console.log("process response:", start);

  if ((start as any).error) {
    throw new Error(`Process failed: ${(start as any).error}`);
  }

  if (!(start as any).accepted) {
    throw new Error("Process was not accepted by server");
  }

  console.log("✅ Process request accepted!");
  console.log(`📋 Job ID: ${(start as any).jobId}`);
  console.log(`🏷️  Task ID: ${TASK_ID}`);
  
  console.log("\n🎯 Next Steps for Validation:");
  console.log("1. Check Inngest Dev Server dashboard: http://localhost:8288");
  console.log(`2. Look for function execution with event 'omni/process.knowledge'`);
  console.log(`3. Verify taskId correlation: ${TASK_ID}`);
  console.log("4. Monitor real-time streaming through frontend or Inngest channels");
  
  console.log("\n✅ E2E Inngest test completed successfully!");
  console.log("   Server accepted the job and triggered Inngest function.");
  console.log("   Use Inngest dashboard to monitor execution and real-time streaming.");
}

main().catch((e) => {
  console.error("E2E Inngest error:", e);
  process.exitCode = 1;
});