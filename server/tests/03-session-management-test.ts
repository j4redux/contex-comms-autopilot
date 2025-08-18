#!/usr/bin/env bun
// Test 3: Test session management patterns from VibeKit

import { Daytona } from "@daytonaio/sdk"
import { loadConfig } from "../src/services/config"
import dotenv from "dotenv"

dotenv.config()

async function testSessionManagement() {
  console.log("🧪 Test 3: Session Management")
  console.log("=============================")
  
  let workspace: any = undefined
  
  try {
    const cfg = loadConfig()
    if (!cfg.daytonaApiUrl || !cfg.daytonaApiKey) {
      throw new Error("Daytona not configured")
    }
    
    const daytona = new Daytona({
      apiKey: cfg.daytonaApiKey,
      apiUrl: cfg.daytonaApiUrl
    })
    
    // Step 1: Create workspace
    console.log("\n1️⃣ Creating workspace...")
    workspace = await daytona.create({
      snapshot: "omni-snapshot-2025-08-18T21-57-49-580Z",
      envVars: { 
        USER_ID: "test-session",
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || ""
      }
    })
    console.log(`✅ Workspace created: ${workspace.id}`)
    
    // Step 2: Test different session approaches
    
    // Approach 1: Direct workspace.id usage (our current approach)
    console.log("\n2️⃣ Testing direct workspace.id usage...")
    try {
      await workspace.process.createSession(workspace.id)
      console.log(`✅ Session created with workspace.id`)
      
      const result1 = await workspace.process.executeSessionCommand(
        workspace.id,
        { command: "echo 'Direct workspace.id test'", runAsync: false },
        undefined
      )
      console.log(`✅ Direct workspace.id execution: ${result1.output}`)
    } catch (error) {
      console.log(`❌ Direct workspace.id failed: ${error}`)
    }
    
    // Approach 2: VibeKit pattern - getSession() first
    console.log("\n3️⃣ Testing VibeKit pattern: getSession() first...")
    try {
      const session = await workspace.process.getSession(workspace.id)
      console.log(`✅ Got session: ${session.sessionId}`)
      
      const result2 = await workspace.process.executeSessionCommand(
        session.sessionId,
        { command: "echo 'VibeKit pattern test'", runAsync: false },
        undefined
      )
      console.log(`✅ VibeKit pattern execution: ${result2.output}`)
    } catch (error) {
      console.log(`❌ VibeKit pattern failed: ${error}`)
    }
    
    // Step 3: Test Claude execution with proper session
    console.log("\n4️⃣ Testing Claude with proper session management...")
    try {
      const session = await workspace.process.getSession(workspace.id)
      const claudeResult = await workspace.process.executeSessionCommand(
        session.sessionId,
        { 
          command: "claude --version", 
          runAsync: false 
        },
        undefined
      )
      console.log(`✅ Claude version via session: ${claudeResult.output}`)
    } catch (error) {
      console.log(`❌ Claude via session failed: ${error}`)
    }
    
    console.log("\n✅ Session management test completed!")
    
  } catch (error) {
    console.error("\n❌ Session management test failed:", error)
    throw error
  } finally {
    if (workspace) {
      console.log("\n🧹 Cleaning up...")
      try {
        const daytona = new Daytona({
          apiKey: loadConfig().daytonaApiKey!,
          apiUrl: loadConfig().daytonaApiUrl!
        })
        await daytona.delete(workspace)
        console.log("✅ Cleanup completed")
      } catch (e) {
        console.log("⚠️ Cleanup warning:", String(e))
      }
    }
  }
}

testSessionManagement()
  .then(() => {
    console.log("\n🎉 Test 3 completed!")
    process.exit(0)
  })
  .catch(err => {
    console.error("\nFatal error:", err)
    process.exit(1)
  })