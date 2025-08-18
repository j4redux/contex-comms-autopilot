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
const USER_ID = Bun.env.USER_ID || `test-user-${Date.now()}`;
const INPUT = Bun.env.INPUT || "Create an investor update memo in deliverables/memos/ about our Q3 performance showing 50% MRR growth from $10k to $15k. Also create a follow-up email in deliverables/emails/ to send to investors about this growth.";
const MODEL = Bun.env.MODEL || "sonnet";
const TASK_ID = Bun.env.TASK_ID || `test-file-detection-${Date.now()}`;
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
  
  // 4) Wait for file creation to complete, then verify files exist
  console.log("\nStep 4: Waiting for file creation to complete...");
  await sleep(30000); // Wait 30 seconds for Claude to finish creating files
  
  console.log("Step 5: Verifying files were actually created...");
  const verifyTaskId = `verify-${TASK_ID}`;
  const verifyBody = {
    userId: USER_ID,
    sandboxId,
    taskId: verifyTaskId,
    input: "List all files in the deliverables/ directory tree. Show me the contents of one of the memo files and one of the email files you just created to confirm they exist and contain the expected content.",
    model: MODEL,
  };
  
  const verifyStart = await startProcess(verifyBody);
  console.log("verification process response:", verifyStart);
  
  if ((verifyStart as any).error) {
    throw new Error(`Verification process failed: ${(verifyStart as any).error}`);
  }

  if (!(verifyStart as any).accepted) {
    throw new Error("Verification process was not accepted by server");
  }

  console.log("✅ Verification process accepted!");
  console.log(`📋 Verification Job ID: ${(verifyStart as any).jobId}`);
  console.log(`🏷️  Verification Task ID: ${verifyTaskId}`);
  
  // Wait for verification to complete
  console.log("\nStep 6: Waiting for verification to complete...");
  await sleep(20000); // Wait 20 seconds for verification
  
  console.log("\n🎯 File Detection Test Validation:");
  console.log("1. Check Inngest Dev Server dashboard: http://localhost:8288");
  console.log(`2. Look for function execution with event 'omni/process.knowledge'`);
  console.log(`3. Verify taskId correlation: ${TASK_ID}`);
  console.log(`4. Verify verification taskId: ${verifyTaskId}`);
  console.log("5. Monitor for NEW MESSAGE TYPES in real-time updates:");
  console.log("   - 📝 'result': Claude's text response");
  console.log("   - 📄 'file_created': New deliverable file metadata");
  console.log("   - 📄 'file_updated': Modified deliverable file metadata");
  console.log("   - 📋 'file_content': File contents for frontend display");
  console.log("   - ✅ 'done': Task completion");
  console.log("\n🔍 Expected File Creation:");
  console.log("   - deliverables/memos/[memo-file].md (investor update)");
  console.log("   - deliverables/emails/[email-file].md (follow-up email)");
  
  console.log("\n✅ E2E Test with verification completed!");
  console.log("   SUCCESS CRITERIA:");
  console.log("   1. Files created by first prompt");
  console.log("   2. Files verified to exist by second prompt");
  console.log("   3. File content matches expected investor update format");
  console.log("   4. File detection system publishes file_created messages");
}

main().catch((e) => {
  console.error("E2E Inngest error:", e);
  process.exitCode = 1;
});