/*
  Test the complete workspace + Claude working directory fix
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
  const uniqueUserId = `test-complete-fix-${Date.now()}`;
  const taskId = `complete-fix-test-${Date.now()}`;
  
  console.log("🔧 Testing Complete File Detection Fix");
  console.log(`User ID: ${uniqueUserId}`);
  console.log(`Task ID: ${taskId}`);
  console.log("");

  // Create and wait for sandbox
  const { sandboxId } = await createSandbox(uniqueUserId);
  console.log(`📦 Created sandbox: ${sandboxId}`);
  
  await waitForReady(sandboxId);
  console.log("✅ Sandbox ready");

  console.log("🚀 Testing complete file detection fix...");
  
  const jobId = `complete-fix-job-${Date.now()}`;
  await inngest.send({
    name: "omni/process.knowledge",
    data: {
      taskId,
      sandboxId,
      userId: uniqueUserId,
      input: "Create a Q3 investor update memo in deliverables/memos/ with the filename 'q3-investor-update.md' showing 35% revenue growth. Also create a followup email in deliverables/emails/ with filename 'q3-followup-email.md' for investors about this growth.",
      model: "sonnet",
      jobId,
    },
  });

  console.log(`✅ Event sent with jobId: ${jobId}`);
  console.log("");
  console.log("🔍 EXPECTED IMPROVED LOGS:");
  console.log("  ✅ 'artifact base: /home/daytona/workspace'");
  console.log("  ✅ 'executing claude command from: /home/daytona/workspace'");
  console.log("  📁 Directories should exist after Claude creates them");
  console.log("  📄 'file_created' messages for q3-investor-update.md and q3-followup-email.md");
  console.log("  📋 'file_content' messages with actual file content");
  console.log("  ✅ 'done' message after file detection completes");
  console.log("");
  console.log("⏱️  Waiting 60 seconds for processing...");
  
  await new Promise(r => setTimeout(r, 60000));
  
  console.log("✅ Test completed!");
  console.log("");
  console.log("🎯 SUCCESS CRITERIA:");
  console.log("1. No 'no such file or directory' errors");
  console.log("2. File detection finds the created files");
  console.log("3. file_created and file_content messages published");
  console.log("4. Backend logs show files were detected");
}

main().catch(console.error);