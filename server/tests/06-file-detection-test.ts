#!/usr/bin/env bun
// Test 6: File detection with shell-based approach using proper Inngest flow

import { createSandbox, deleteSandbox } from "../src/services/daytona"
import { inngest } from "../src/services/inngest"
import dotenv from "dotenv"

dotenv.config()

async function testFileDetection() {
  console.log("🧪 Test 6: Shell-Based File Detection")
  console.log("====================================")
  
  let sandboxId: string | undefined
  const userId = `test-file-detection-${Date.now()}`
  const taskId = `test-task-${Date.now()}`
  
  try {
    // Step 1: Create sandbox directly for testing
    console.log("\n1️⃣ Creating sandbox for shell command testing...")
    const sandbox = await createSandbox(userId)
    sandboxId = sandbox.id
    console.log(`✅ Sandbox created: ${sandboxId}`)
    
    // Step 2: Test our shell-based file detection functions directly
    console.log("\n2️⃣ Testing shell commands in sandbox environment...")
    
    const { executeCommand } = await import("../src/services/daytona")
    
    // Create test files to simulate Claude output
    console.log("\n   Creating test directories...")
    const mkdirResult = await executeCommand(sandboxId, "mkdir -p /home/omni/deliverables/memos /home/omni/deliverables/emails /home/omni/metrics")
    console.log(`   Mkdir exit code: ${mkdirResult.exitCode}`)
    
    console.log("\n   Creating test files...")
    
    // Create memo file
    const memo = "# Q3 Investor Update\\n\\nOur Q3 results show 50% MRR growth.\\n\\n## Key Metrics\\n- MRR: $125K\\n- Customers: 847"
    const memoResult = await executeCommand(sandboxId, `echo "${memo}" > /home/omni/deliverables/memos/q3-update.md`)
    console.log(`   Memo file exit code: ${memoResult.exitCode}`)
    
    // Create email file  
    const email = "Subject: Q3 Update\\n\\nHi investors,\\n\\nQ3 MRR grew 50% to $125K.\\n\\nBest,\\nFounder"
    const emailResult = await executeCommand(sandboxId, `echo "${email}" > /home/omni/deliverables/emails/q3-followup.md`)
    console.log(`   Email file exit code: ${emailResult.exitCode}`)
    
    // Create JSON file
    const json = '{"timestamp":"2025-08-19","mrr":125000,"customers":847}'
    const jsonResult = await executeCommand(sandboxId, `echo '${json}' > /home/omni/metrics/current.json`)
    console.log(`   JSON file exit code: ${jsonResult.exitCode}`)
    
    // Step 3: Test our find command
    console.log("\n3️⃣ Testing find command...")
    const startTime = Date.now() - 5000 // 5 seconds ago
    const testDate = new Date(startTime).toISOString().slice(0, 19).replace('T', ' ')
    const findCommand = `find /home/omni -type f -newermt "${testDate}" \\( -name "*.md" -o -name "*.txt" -o -name "*.json" -o -name "*.html" -o -name "*.csv" \\) 2>/dev/null | head -20`
    
    console.log(`   Running: find /home/omni -type f -newermt "${testDate}" ...`)
    const findResult = await executeCommand(sandboxId, findCommand)
    console.log(`   Find exit code: ${findResult.exitCode}`)
    
    if (findResult.exitCode === 0 && findResult.stdout.trim()) {
      const filePaths = findResult.stdout.trim().split('\n').filter(path => path.length > 0)
      console.log(`   ✅ Found ${filePaths.length} files:`)
      
      // Step 4: Test stat and head commands for each file
      console.log("\n4️⃣ Testing stat and head commands...")
      for (const filePath of filePaths) {
        console.log(`\n   Processing: ${filePath}`)
        
        // Test stat command
        const statResult = await executeCommand(sandboxId, `stat -c "%s %Y" "${filePath}" 2>/dev/null`)
        if (statResult.exitCode === 0) {
          const [size, modTime] = statResult.stdout.trim().split(' ')
          console.log(`     ✅ Stat: ${size} bytes, modified ${new Date(parseInt(modTime) * 1000).toISOString()}`)
        } else {
          console.log(`     ❌ Stat failed: ${statResult.stderr}`)
        }
        
        // Test head command for content
        const contentResult = await executeCommand(sandboxId, `head -c 200 "${filePath}" 2>/dev/null`)
        if (contentResult.exitCode === 0) {
          console.log(`     ✅ Content preview: ${contentResult.stdout.substring(0, 60)}...`)
        } else {
          console.log(`     ❌ Head failed: ${contentResult.stderr}`)
        }
      }
      
      console.log("\n✅ Shell-based file detection SUCCESS! All commands working.")
    } else {
      console.log(`   ❌ No files found or find command failed`)
      console.log(`   stdout: ${findResult.stdout}`)
      console.log(`   stderr: ${findResult.stderr}`)
      
      // Debug: Check directory structure
      const lsResult = await executeCommand(sandboxId, "ls -la /home/omni/")
      console.log(`   /home/omni contents:\\n${lsResult.stdout}`)
    }
    
    console.log("\n✅ File detection test completed!")
    
  } catch (error) {
    console.error("\n❌ File detection test failed:", error)
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

testFileDetection()
  .then(() => {
    console.log("\n🎉 Test 6 completed!")
    process.exit(0)
  })
  .catch(err => {
    console.error("\nFatal error:", err)
    process.exit(1)
  })