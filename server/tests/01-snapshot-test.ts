#!/usr/bin/env bun
// Test 1: Verify snapshot creation and basic Claude availability

import { createSandbox, executeCommand, deleteSandbox } from "../src/services/daytona"
import dotenv from "dotenv"

dotenv.config()

async function testSnapshot() {
  console.log("🧪 Test 1: Snapshot and Claude Availability")
  console.log("===========================================")
  
  let sandboxId: string | undefined
  
  try {
    // Step 1: Create sandbox from snapshot
    console.log("\n1️⃣ Creating sandbox from snapshot...")
    const sandbox = await createSandbox("test-snapshot")
    sandboxId = sandbox.id
    console.log(`✅ Sandbox created: ${sandboxId}`)
    
    // Step 2: Test basic commands
    console.log("\n2️⃣ Testing basic commands...")
    const whoami = await executeCommand(sandboxId, "whoami")
    console.log(`User: ${whoami.stdout.trim()}`)
    
    const pwd = await executeCommand(sandboxId, "pwd")
    console.log(`Working dir: ${pwd.stdout.trim()}`)
    
    // Step 3: Test Claude availability
    console.log("\n3️⃣ Testing Claude Code availability...")
    const claudeVersion = await executeCommand(sandboxId, "claude --version")
    console.log(`Claude version result: exit=${claudeVersion.exitCode}`)
    if (claudeVersion.exitCode === 0) {
      console.log(`✅ Claude Code available: ${claudeVersion.stdout.trim()}`)
    } else {
      console.log(`❌ Claude Code not available: ${claudeVersion.stderr}`)
    }
    
    // Step 4: Check environment variables
    console.log("\n4️⃣ Testing environment variables...")
    const apiKeyCheck = await executeCommand(sandboxId, "echo $ANTHROPIC_API_KEY | wc -c")
    const keyLength = parseInt(apiKeyCheck.stdout.trim()) - 1 // subtract newline
    console.log(`ANTHROPIC_API_KEY length: ${keyLength} chars`)
    
    // Step 5: Test filesystem
    console.log("\n5️⃣ Testing filesystem structure...")
    const ls = await executeCommand(sandboxId, "ls -la /home/daytona/workspace")
    console.log("Workspace contents:")
    console.log(ls.stdout)
    
    console.log("\n✅ Snapshot test completed successfully!")
    
  } catch (error) {
    console.error("\n❌ Snapshot test failed:", error)
    throw error
  } finally {
    if (sandboxId) {
      console.log("\n🧹 Cleaning up...")
      try {
        await deleteSandbox(sandboxId)
        console.log("✅ Cleanup completed")
      } catch (e) {
        console.log("⚠️ Cleanup warning:", String(e))
      }
    }
  }
}

testSnapshot()
  .then(() => {
    console.log("\n🎉 Test 1 completed!")
    process.exit(0)
  })
  .catch(err => {
    console.error("\nFatal error:", err)
    process.exit(1)
  })