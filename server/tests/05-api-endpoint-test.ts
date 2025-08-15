#!/usr/bin/env bun
// Test 5: API endpoint functionality

import { createSandbox, deleteSandbox } from "../src/services/daytona"
import dotenv from "dotenv"

dotenv.config()

async function testApiEndpoint() {
  console.log("🧪 Test 5: API Endpoint Functionality")
  console.log("====================================")
  
  let sandboxId: string | undefined
  const userId = `test-api-${Date.now()}`
  
  try {
    // Step 1: Create sandbox via API
    console.log("\n1️⃣ Testing sandbox creation API...")
    const createResponse = await fetch("http://localhost:8787/api/sandbox/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId })
    })
    
    if (!createResponse.ok) {
      throw new Error(`Create API failed: ${createResponse.status}`)
    }
    
    const createResult = await createResponse.json()
    sandboxId = createResult.sandboxId
    console.log(`✅ API sandbox created: ${sandboxId}`)
    
    // Step 2: Test sandbox status API
    console.log("\n2️⃣ Testing sandbox status API...")
    const statusResponse = await fetch(`http://localhost:8787/api/sandbox/status?id=${sandboxId}`)
    const statusResult = await statusResponse.json()
    console.log(`✅ Status API: ${statusResult.status}`)
    
    // Step 3: Test knowledge processing API
    console.log("\n3️⃣ Testing knowledge processing API...")
    const processBody = {
      userId,
      sandboxId: sandboxId,
      input: "What is 5 times 6? Answer briefly.",
      model: "sonnet"
    }
    
    const processResponse = await fetch("http://localhost:8787/api/knowledge/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(processBody)
    })
    
    if (!processResponse.ok) {
      throw new Error(`Process API failed: ${processResponse.status}`)
    }
    
    const processResult = await processResponse.json()
    console.log(`✅ Process API accepted: ${processResult.accepted}`)
    console.log(`   Job ID: ${processResult.jobId}`)
    
    // Step 4: Test WebSocket connection
    console.log("\n4️⃣ Testing WebSocket streaming...")
    const wsUrl = `ws://localhost:8787/ws?userId=${userId}`
    const ws = new WebSocket(wsUrl)
    const messages: any[] = []
    
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("WebSocket timeout"))
      }, 60000) // 60 second timeout
      
      ws.onopen = () => {
        console.log(`✅ WebSocket connected`)
        clearTimeout(timeout)
      }
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data.toString())
          messages.push(data)
          console.log(`   WS: ${data.type} - ${data.data || data.code || 'heartbeat'}`)
          
          if (data.type === "done") {
            console.log(`✅ Job completed with exit code: ${data.exitCode}`)
            resolve(undefined)
          }
        } catch {
          console.log(`   WS(raw): ${event.data}`)
        }
      }
      
      ws.onerror = (error) => {
        clearTimeout(timeout)
        reject(error)
      }
    })
    
    ws.close()
    
    // Step 5: Check for result
    const resultMessages = messages.filter(m => m.type === "result")
    if (resultMessages.length > 0) {
      console.log(`✅ Got result: ${resultMessages[0].data}`)
    } else {
      console.log(`❌ No result received`)
    }
    
    console.log("\n✅ API endpoint test completed!")
    
  } catch (error) {
    console.error("\n❌ API endpoint test failed:", error)
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

testApiEndpoint()
  .then(() => {
    console.log("\n🎉 Test 5 completed!")
    process.exit(0)
  })
  .catch(err => {
    console.error("\nFatal error:", err)
    process.exit(1)
  })