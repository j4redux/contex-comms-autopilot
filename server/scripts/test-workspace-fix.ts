/*
  Test the workspace path fix
*/

import { inngest } from "../src/services/inngest"

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
  const uniqueUserId = `test-workspace-fix-${Date.now()}`;
  const taskId = `workspace-fix-test-${Date.now()}`;
  
  console.log("🔧 Testing Workspace Path Fix");
  console.log(`User ID: ${uniqueUserId}`);
  console.log(`Task ID: ${taskId}`);
  console.log("");

  // Create and wait for sandbox
  const { sandboxId } = await createSandbox(uniqueUserId);
  console.log(`📦 Created sandbox: ${sandboxId}`);
  
  await waitForReady(sandboxId);
  console.log("✅ Sandbox ready");

  // Send test to trigger fixed path logic
  console.log("🚀 Testing fixed workspace detection...");
  
  const jobId = `workspace-fix-job-${Date.now()}`;
  await inngest.send({
    name: "omni/process.knowledge",
    data: {
      taskId,
      sandboxId,
      userId: uniqueUserId,
      input: "Create a Q3 investor update memo in deliverables/memos/ showing 30% growth.",
      model: "sonnet",
      jobId,
    },
  });

  console.log(`✅ Event sent with jobId: ${jobId}`);
  console.log("");
  console.log("🔍 LOOK FOR THESE IMPROVED LOGS:");
  console.log("  ✅ 'artifact base: /home/daytona/workspace' (not /workspace)");
  console.log("  📁 No 'no such file or directory' errors for deliverables/");
  console.log("  🔍 'File detection: Baseline captured X existing files'");
  console.log("  📄 'file_created' messages published");
  console.log("  📋 'file_content' messages published");
  console.log("");
  console.log("⏱️  Waiting 45 seconds for processing...");
  
  await new Promise(r => setTimeout(r, 45000));
  
  console.log("✅ Test completed! Check backend logs for workspace path fix results.");
}

main().catch(console.error);