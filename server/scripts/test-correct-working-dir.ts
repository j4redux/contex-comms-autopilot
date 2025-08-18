/*
  Test the corrected working directory understanding
  Claude works from /home/daytona, not /home/daytona/workspace
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
  const uniqueUserId = `test-correct-workdir-${Date.now()}`;
  const taskId = `correct-workdir-test-${Date.now()}`;
  
  console.log("🔧 Testing Correct Working Directory Understanding");
  console.log(`User ID: ${uniqueUserId}`);
  console.log(`Task ID: ${taskId}`);
  console.log("");

  // Create and wait for sandbox
  const { sandboxId } = await createSandbox(uniqueUserId);
  console.log(`📦 Created sandbox: ${sandboxId}`);
  
  await waitForReady(sandboxId);
  console.log("✅ Sandbox ready");

  console.log("🚀 Testing file detection with correct working directory...");
  
  const jobId = `correct-workdir-job-${Date.now()}`;
  await inngest.send({
    name: "omni/process.knowledge",
    data: {
      taskId,
      sandboxId,
      userId: uniqueUserId,
      input: "Create a Q4 investor update memo in deliverables/memos/ with the filename 'q4-update.md' showing 50% revenue growth. Also create a celebration email in deliverables/emails/ with filename 'celebration.md' for the team.",
      model: "sonnet",
      jobId,
    },
  });

  console.log(`✅ Event sent with jobId: ${jobId}`);
  console.log("");
  console.log("🔍 EXPECTED CORRECT LOGS:");
  console.log("  ✅ 'claude working directory: /home/daytona'");
  console.log("  ✅ 'executing claude command from: /home/daytona'");  
  console.log("  ✅ 'Looking for files in deliverables/ directories'");
  console.log("  📁 File detection should find files in deliverables/");
  console.log("  📄 'file_created' messages for q4-update.md and celebration.md");
  console.log("  📋 'file_content' messages with actual file content");
  console.log("");
  console.log("⏱️  Waiting 60 seconds for processing...");
  
  await new Promise(r => setTimeout(r, 60000));
  
  console.log("✅ Correct working directory test completed!");
  console.log("");
  console.log("🎯 SUCCESS INDICATORS:");
  console.log("1. No 'no such file or directory' errors");
  console.log("2. File detection finds files in deliverables/ (not workspace/deliverables/)");
  console.log("3. file_created and file_content messages published");
  console.log("4. Files created at /home/daytona/deliverables/ by Claude");
}

main().catch(console.error);