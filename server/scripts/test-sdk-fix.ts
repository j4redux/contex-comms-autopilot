/*
  Test the SDK path fix for file detection
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
  const uniqueUserId = `test-sdk-fix-${Date.now()}`;
  const taskId = `sdk-fix-test-${Date.now()}`;
  
  console.log("🔧 Testing SDK Path Fix for File Detection");
  console.log(`User ID: ${uniqueUserId}`);
  console.log(`Task ID: ${taskId}`);
  console.log("");

  // Create and wait for sandbox
  const { sandboxId } = await createSandbox(uniqueUserId);
  console.log(`📦 Created sandbox: ${sandboxId}`);
  
  await waitForReady(sandboxId);
  console.log("✅ Sandbox ready");

  console.log("🚀 Testing corrected SDK paths...");
  
  const jobId = `sdk-fix-job-${Date.now()}`;
  await inngest.send({
    name: "omni/process.knowledge",
    data: {
      taskId,
      sandboxId,
      userId: uniqueUserId,
      input: "Create a Q3 investor update memo in deliverables/memos/ with the filename 'q3-update.md' showing 40% growth. Also create a thank you email in deliverables/emails/ with filename 'thank-you.md' for investors.",
      model: "sonnet",
      jobId,
    },
  });

  console.log(`✅ Event sent with jobId: ${jobId}`);
  console.log("");
  console.log("🔍 EXPECTED CORRECTED LOGS:");
  console.log("  ✅ 'claude working directory: /home/daytona/workspace'");
  console.log("  ✅ 'executing claude command from: /home/daytona/workspace'");  
  console.log("  ✅ 'Looking for files in workspace/ subdirectories'");
  console.log("  📁 NO 'no such file or directory' errors");
  console.log("  📄 'file_created' messages for q3-update.md and thank-you.md");
  console.log("  📋 'file_content' messages with actual file content");
  console.log("");
  console.log("⏱️  Waiting 60 seconds for processing...");
  
  await new Promise(r => setTimeout(r, 60000));
  
  console.log("✅ SDK path fix test completed!");
  console.log("");
  console.log("🎯 SUCCESS INDICATORS:");
  console.log("1. File detection finds files in workspace/deliverables/");
  console.log("2. file_created and file_content messages published");
  console.log("3. No SDK path resolution errors");
  console.log("4. Files actually detected and processed");
}

main().catch(console.error);