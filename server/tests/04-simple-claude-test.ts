// Test 4: Simple Claude execution test with timeout

import { createSandbox, executeCommand, deleteSandbox } from "../src/services/daytona"
import dotenv from "dotenv"

dotenv.config()

async function testSimpleClaude() {
  console.log("🧪 Test 4: Simple Claude Execution")
  console.log("==================================")
  
  let sandboxId: string | undefined
  
  try {
    // Step 1: Create sandbox
    console.log("\n1️⃣ Creating sandbox...")
    const sandbox = await createSandbox("test-simple-claude")
    sandboxId = sandbox.id
    console.log(`✅ Sandbox created: ${sandboxId}`)
    
    // Step 2: Test working VibeKit pattern 
    console.log("\n2️⃣ Testing working VibeKit pattern...")
    const prompt = "What is 2 + 2? Answer briefly."
    const command = `echo "${prompt}" | claude -p --output-format json --model sonnet`
    
    console.log(`Running: ${command}`)
    const result = await executeCommand(sandboxId, command)
    console.log(`Exit code: ${result.exitCode}`)
    
    if (result.exitCode === 0) {
      console.log(`✅ Success! Response length: ${result.stdout.length} chars`)
      
      // Try to parse JSON response
      try {
        const parsed = JSON.parse(result.stdout)
        console.log(`✅ Valid JSON response`)
        console.log(`   Result: ${parsed.result}`)
        console.log(`   Session ID: ${parsed.session_id}`)
        console.log(`   Duration: ${parsed.duration_ms}ms`)
      } catch (parseError) {
        console.log(`❌ JSON parsing failed: ${parseError}`)
        console.log(`   Raw output: ${result.stdout.substring(0, 200)}...`)
      }
    } else {
      console.log(`❌ Command failed: ${result.stderr}`)
    }
    
    console.log("\n✅ Simple Claude test completed!")
    
  } catch (error) {
    console.error("\n❌ Simple Claude test failed:", error)
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

testSimpleClaude()
  .then(() => {
    console.log("\n🎉 Test 4 completed!")
    process.exit(0)
  })
  .catch(err => {
    console.error("\nFatal error:", err)
    process.exit(1)
  })