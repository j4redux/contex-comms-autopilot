// Test 2: Test Claude Code CLI execution patterns based on VibeKit

import { createSandbox, executeCommand, deleteSandbox } from "../src/services/daytona"
import dotenv from "dotenv"

dotenv.config()

async function testClaudeExecution() {
  console.log("🧪 Test 2: Claude Code CLI Execution")
  console.log("===================================")
  
  let sandboxId: string | undefined
  
  try {
    // Step 1: Create sandbox
    console.log("\n1️⃣ Creating sandbox...")
    const sandbox = await createSandbox("test-claude-exec")
    sandboxId = sandbox.id
    console.log(`✅ Sandbox created: ${sandboxId}`)
    
    // Step 2: Test VibeKit pattern - echo | claude -p
    console.log("\n2️⃣ Testing VibeKit pattern: echo | claude -p")
    const prompt1 = "What is 2 plus 2?"
    const vibekitCommand = `echo "${prompt1}" | claude -p --output-format json --model sonnet`
    
    console.log(`Running: ${vibekitCommand}`)
    const vibekitResult = await executeCommand(sandboxId, vibekitCommand)
    console.log(`Exit code: ${vibekitResult.exitCode}`)
    if (vibekitResult.exitCode === 0) {
      console.log(`✅ VibeKit pattern success: ${vibekitResult.stdout.substring(0, 200)}...`)
    } else {
      console.log(`❌ VibeKit pattern failed: ${vibekitResult.stderr}`)
    }
    
    // Step 3: Test VibeKit pattern with different models
    console.log("\n3️⃣ Testing VibeKit pattern with different models")
    const prompt3 = "What is the capital of France?"
    const haiku = `echo "${prompt3}" | claude -p --output-format json --model haiku`
    
    console.log(`Running: ${haiku}`)
    const haikuResult = await executeCommand(sandboxId, haiku)
    console.log(`Exit code: ${haikuResult.exitCode}`)
    if (haikuResult.exitCode === 0) {
      console.log(`✅ Haiku model success: ${haikuResult.stdout.substring(0, 200)}...`)
    } else {
      console.log(`❌ Haiku model failed: ${haikuResult.stderr}`)
    }
    
    // Step 4: Test VibeKit pattern with text output
    console.log("\n4️⃣ Testing VibeKit pattern with text output")
    const prompt4 = "Say hello briefly"
    const textOutput = `echo "${prompt4}" | claude -p --output-format text`
    
    console.log(`Running: ${textOutput}`)
    const textResult = await executeCommand(sandboxId, textOutput)
    console.log(`Exit code: ${textResult.exitCode}`)
    if (textResult.exitCode === 0) {
      console.log(`✅ Text output success: ${textResult.stdout.substring(0, 100)}...`)
    } else {
      console.log(`❌ Text output failed: ${textResult.stderr}`)
    }
    
    console.log("\n✅ Claude execution test completed!")
    
  } catch (error) {
    console.error("\n❌ Claude execution test failed:", error)
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

testClaudeExecution()
  .then(() => {
    console.log("\n🎉 Test 2 completed!")
    process.exit(0)
  })
  .catch(err => {
    console.error("\nFatal error:", err)
    process.exit(1)
  })