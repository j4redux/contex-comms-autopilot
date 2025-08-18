/*
  Simple script to monitor Inngest messages and verify file detection
  This subscribes to the task channel to see what messages are actually published
*/

import { inngest, taskChannel } from "../src/services/inngest"

const TASK_ID_TO_MONITOR = "detect-test-1755544952639"; // From our test above

async function main() {
  console.log("🔍 Monitoring messages for file detection verification");
  console.log(`Monitoring taskId: ${TASK_ID_TO_MONITOR}`);
  console.log("");

  // This won't work directly in a script context since we need the full Inngest realtime setup
  // But let's try to see what we can verify about the published messages
  
  console.log("❌ Direct message monitoring requires frontend Inngest realtime setup");
  console.log("");
  console.log("ALTERNATIVE VERIFICATION:");
  console.log("1. Check Inngest Dev Dashboard: http://localhost:8288");
  console.log("2. Look for function runs with:");
  console.log(`   - Event: omni/process.knowledge`);
  console.log(`   - TaskId: ${TASK_ID_TO_MONITOR}`);
  console.log("3. In the function execution details, check for published messages");
  console.log("");
  console.log("EXPECTED MESSAGE TYPES:");
  console.log("✅ type: 'log' - Various progress messages");
  console.log("✅ type: 'result' - Claude's response");  
  console.log("🔍 type: 'file_created' - File metadata (THIS IS WHAT WE'RE TESTING)");
  console.log("🔍 type: 'file_content' - File content (THIS IS WHAT WE'RE TESTING)");
  console.log("✅ type: 'done' - Completion message");
  console.log("");
  
  // Check if our task exists in any stored state
  console.log("Let's check if we can verify files were actually created...");
  
  // Try to create another verification task
  const verifyTaskId = `verify-${TASK_ID_TO_MONITOR}`;
  const jobId = `verify-job-${Date.now()}`;
  
  console.log(`🧪 Sending verification task: ${verifyTaskId}`);
  await inngest.send({
    name: "omni/process.knowledge", 
    data: {
      taskId: verifyTaskId,
      sandboxId: "8cf42ab9-508a-4637-9d68-a34f4f255651", // Same sandbox from test
      userId: "test-detect-1755544952639",
      input: "List all files in the deliverables/ directory. Show me the content of any memo files you find. This is to verify the previous task created files.",
      model: "sonnet",
      jobId,
    },
  });
  
  console.log(`✅ Verification task sent with jobId: ${jobId}`);
  console.log("This will help confirm if files were actually created by the first task.");
  console.log("");
  console.log("🎯 SUCCESS INDICATORS:");
  console.log("1. Verification task finds files in deliverables/memos/");
  console.log("2. Files contain investor update content about 25% growth");
  console.log("3. Original task published file_created messages");
}

main().catch(console.error);