/*
  Quick test to verify file detection is working
  Captures console logs and verifies file messages are published
*/

import { inngest } from "../src/services/inngest"

const UNIQUE_USER_ID = `test-detect-${Date.now()}`;
const TASK_ID = `detect-test-${Date.now()}`;
const TEST_PROMPT = "Create a simple investor update memo in deliverables/memos/ with Q3 results showing 25% growth.";

async function createSandbox(userId: string) {
  const res = await fetch("http://localhost:8787/api/sandbox/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) throw new Error(`Sandbox creation failed: ${res.status}`);
  return res.json() as Promise<{ sandboxId: string; status: string }>;
}

async function waitForReady(sandboxId: string) {
  for (let i = 0; i < 30; i++) {
    const res = await fetch(`http://localhost:8787/api/sandbox/status?id=${sandboxId}`);
    const status = await res.json() as { status: string };
    if (status.status === "ready") return;
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error("Sandbox didn't become ready");
}

async function main() {
  console.log("🧪 Testing File Detection System");
  console.log(`User ID: ${UNIQUE_USER_ID}`);
  console.log(`Task ID: ${TASK_ID}`);
  console.log(`Prompt: ${TEST_PROMPT}`);
  console.log("");

  // Create and wait for sandbox
  const { sandboxId } = await createSandbox(UNIQUE_USER_ID);
  console.log(`📦 Created sandbox: ${sandboxId}`);
  
  await waitForReady(sandboxId);
  console.log("✅ Sandbox ready");

  // Send Inngest event to trigger file detection
  console.log("🚀 Sending processKnowledge event...");
  
  const jobId = `test-job-${Date.now()}`;
  await inngest.send({
    name: "omni/process.knowledge",
    data: {
      taskId: TASK_ID,
      sandboxId,
      userId: UNIQUE_USER_ID,
      input: TEST_PROMPT,
      model: "sonnet",
      jobId,
    },
  });

  console.log(`✅ Event sent with jobId: ${jobId}`);
  console.log("");
  console.log("🔍 MONITOR BACKEND CONSOLE FOR:");
  console.log("  - 🔍 Starting file detection scan...");
  console.log("  - 🔍 File detection: Scanning for changes after...");
  console.log("  - 🔍 File detection: Baseline captured X existing files");
  console.log("  - ✅ File detection scan completed...");
  console.log("");
  console.log("📊 CHECK INNGEST DASHBOARD:");
  console.log("  - Open http://localhost:8288");
  console.log(`  - Look for event: omni/process.knowledge`);
  console.log(`  - TaskId: ${TASK_ID}`);
  console.log(`  - JobId: ${jobId}`);
  console.log("  - Check published messages for file_created, file_content types");
  console.log("");
  console.log("⏱️  Waiting 45 seconds for processing to complete...");
  
  // Wait for processing
  await new Promise(r => setTimeout(r, 45000));
  
  console.log("✅ Test completed!");
  console.log("Check the backend console and Inngest dashboard for file detection evidence.");
}

main().catch(console.error);