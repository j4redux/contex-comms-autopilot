/*
  Bun script to exercise the Omni backend end-to-end without curl.
  - Creates a sandbox
  - Polls until ready
  - Opens WS for logs/results
  - Starts a knowledge/process job
  - Prints messages until done

  Usage:
    bun run scripts/e2e-process.ts

  Env:
    BASE_URL (default: http://localhost:8787)
    USER_ID (default: u1)
    INPUT (default prompt)
    MODEL (optional, e.g. sonnet)
    ARTIFACT_EXT (default: md)
    SANDBOX_ID (optional: reuse existing sandbox; if set, skip creation)
*/

const BASE = Bun.env.BASE_URL || "http://localhost:8787";
const USER_ID = Bun.env.USER_ID || "u1";
const INPUT = Bun.env.INPUT || "What is 2 plus 2?";
const MODEL = Bun.env.MODEL || "sonnet";
const ARTIFACT_EXT = Bun.env.ARTIFACT_EXT || "md";
const SANDBOX_ID = Bun.env.SANDBOX_ID || "";
const SMOKE_ONLY = Boolean(Bun.env.SMOKE_ONLY);
const OMNI_ALLOWED_TOOLS = Bun.env.OMNI_ALLOWED_TOOLS;
const TIMEOUT_MS = Number(Bun.env.TIMEOUT_MS || 180_000);
// Allow the client to wait slightly longer than the server-side job timeout to avoid race conditions
const CLIENT_TIMEOUT_MS = Number(Bun.env.CLIENT_TIMEOUT_MS || (TIMEOUT_MS + 15_000));

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
  console.log("=== E2E Test Configuration ===");
  console.log(`BASE=${BASE}`);
  console.log(`USER_ID=${USER_ID}`);
  console.log(`INPUT=${INPUT.substring(0, 50)}${INPUT.length > 50 ? '...' : ''}`);
  console.log(`MODEL=${MODEL}`);
  console.log(`ARTIFACT_EXT=${ARTIFACT_EXT}`);
  console.log(`TIMEOUT_MS=${TIMEOUT_MS}`);
  console.log(`CLIENT_TIMEOUT_MS=${CLIENT_TIMEOUT_MS}`);
  console.log(`OMNI_ALLOWED_TOOLS=${OMNI_ALLOWED_TOOLS || '(not set)'}`);
  console.log(`SMOKE_ONLY=${SMOKE_ONLY}`);
  console.log("================================\n");
  
  // 1) Create or reuse sandbox
  let sandboxId = SANDBOX_ID;
  if (sandboxId) {
    console.log(`Using existing sandbox: ${sandboxId}`);
  } else {
    const cs = await createSandbox(USER_ID);
    console.log("sandbox:", cs);
    sandboxId = (cs as any).sandboxId;
  }

  // 2) Poll until ready
  console.log(`Polling sandbox ${sandboxId} for ready status...`);
  const deadline = Date.now() + 120_000;
  let attempts = 0;
  while (Date.now() < deadline) {
    attempts++;
    try {
      const st = await getSandboxStatus(sandboxId);
      if ((st as any).error) throw new Error(`sandbox status error: ${(st as any).error?.message || "unknown"}`);
      console.log(`[Attempt ${attempts}] status:`, st);
      if ((st as any).status === "ready") {
        console.log("Sandbox is ready!");
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

  // 3) Open WS for logs/results
  const wsUrl = `${BASE.replace(/^http/, "ws")}/ws?userId=${encodeURIComponent(USER_ID)}`;
  console.log(`Connecting to WebSocket: ${wsUrl}`);
  const ws = new WebSocket(wsUrl);
  const messages: any[] = [];
  
  // Set up error handling
  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
  };
  
  ws.onclose = (event) => {
    console.log(`WebSocket closed: code=${event.code}, reason=${event.reason}`);
  };
  
  ws.onmessage = (ev) => {
    try {
      const data = JSON.parse(String(ev.data));
      console.log("WS:", data);
      messages.push(data);
    } catch {
      console.log("WS(raw):", String(ev.data));
      messages.push({ type: "raw", data: String(ev.data) });
    }
  };
  
  // Wait for WebSocket to open with timeout
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("WebSocket connection timeout"));
    }, 10000);
    
    ws.onopen = () => {
      clearTimeout(timeout);
      console.log("WebSocket connected successfully");
      resolve(undefined);
    };
  });

  // 4) Start process
  const systemPrompt = undefined; // rely on server default
  const body = {
    userId: USER_ID,
    sandboxId,
    input: INPUT,
    model: MODEL,
    systemPrompt,
    env: { ARTIFACT_EXT, TIMEOUT_MS: String(TIMEOUT_MS), SMOKE_ONLY: SMOKE_ONLY ? "1" : "", ...(OMNI_ALLOWED_TOOLS ? { OMNI_ALLOWED_TOOLS } : {}) },
  };
  const start = await startProcess(body);
  console.log("process:", start);

  // 5) Wait for done
  console.log(`Waiting for job completion (timeout: ${CLIENT_TIMEOUT_MS / 1000}s)...`);
  const doneDeadline = Date.now() + CLIENT_TIMEOUT_MS;
  let finishedByDone = false;
  let lastMessageCount = 0;
  
  while (Date.now() < doneDeadline) {
    // Log new messages for debugging
    if (messages.length > lastMessageCount) {
      console.log(`Received ${messages.length - lastMessageCount} new messages (total: ${messages.length})`);
      lastMessageCount = messages.length;
    }
    
    const last = messages[messages.length - 1];
    if (last && last.type === "done") { 
      finishedByDone = true; 
      console.log("Job completed successfully!");
      break; 
    }
    
    // Also check for error conditions
    if (last && last.type === "error") {
      console.log("Job failed with error:", last);
      break;
    }
    
    await sleep(1000);
  }
  
  ws.close();
  
  if (finishedByDone) {
    console.log("✅ E2E test completed successfully");
    // Show results if any
    const results = messages.filter(m => m.type === "result");
    if (results.length > 0) {
      console.log("\n📄 Results:");
      results.forEach((r, i) => {
        console.log(`[${i + 1}] ${r.format}: ${r.data?.substring(0, 200)}${r.data?.length > 200 ? '...' : ''}`);
      });
    }
  } else {
    console.log("❌ E2E test timed out or failed");
    console.log(`Total messages received: ${messages.length}`);
    if (messages.length > 0) {
      console.log("Last few messages:", messages.slice(-3));
    }
  }
}

main().catch((e) => {
  console.error("E2E error:", e);
  // Prefer setting exitCode for compatibility with Bun typings
  process.exitCode = 1;
});
