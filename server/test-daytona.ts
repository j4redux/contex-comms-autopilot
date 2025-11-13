// Test script to diagnose Daytona "No available runners" error
import { Daytona } from "@daytonaio/sdk"

async function testDaytona() {
  console.log("🔍 Testing Daytona connection and available targets...")
  
  const apiUrl = process.env.DAYTONA_API_URL || "https://app.daytona.io/api"
  const apiKey = process.env.DAYTONA_API_KEY
  const target = process.env.DAYTONA_TARGET || "us"
  
  if (!apiKey) {
    console.error("❌ DAYTONA_API_KEY not set")
    process.exit(1)
  }
  
  console.log(`📍 API URL: ${apiUrl}`)
  console.log(`📍 Target: ${target}`)
  console.log(`🔑 API Key: ${apiKey.substring(0, 10)}...`)
  
  try {
    // Test 1: Create client without target
    console.log("\n--- Test 1: Client without explicit target ---")
    const daytona1 = new Daytona({
      apiKey,
      apiUrl
    })
    console.log("✅ Client created successfully (no target)")
    
    // Test 2: Create client with target
    console.log("\n--- Test 2: Client with explicit target ---")
    const daytona2 = new Daytona({
      apiKey,
      apiUrl,
      target
    })
    console.log(`✅ Client created successfully (target: ${target})`)
    
    // Test 3: Try to list existing sandboxes
    console.log("\n--- Test 3: List existing sandboxes ---")
    try {
      const sandboxes = await daytona2.list()
      console.log(`✅ Found ${sandboxes.length} existing sandboxes`)
      if (sandboxes.length > 0) {
        console.log("First sandbox:", {
          id: sandboxes[0].id,
          state: sandboxes[0].state,
          createdAt: sandboxes[0].createdAt
        })
      }
    } catch (listError: any) {
      console.error("❌ Failed to list sandboxes:", listError.message)
    }
    
    // Test 4: Try to create a sandbox
    console.log("\n--- Test 4: Create new sandbox ---")
    try {
      console.log("Attempting to create sandbox with snapshot: omni-snapshot-2025-08-18T21-57-49-580Z")
      const workspace = await daytona2.create({
        snapshot: "omni-snapshot-2025-08-18T21-57-49-580Z",
        envVars: {
          USER_ID: "test-user",
          ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || ""
        }
      })
      console.log("✅ Sandbox created successfully!")
      console.log("Sandbox ID:", workspace.id)
      console.log("Sandbox state:", workspace.state)
      
      // Clean up
      console.log("\n--- Cleanup: Delete test sandbox ---")
      await daytona2.delete(workspace)
      console.log("✅ Test sandbox deleted")
      
    } catch (createError: any) {
      console.error("\n❌ Failed to create sandbox:")
      console.error("Error message:", createError.message)
      console.error("Error response:", createError.response?.data)
      console.error("Status code:", createError.response?.data?.statusCode)
      
      // Try to get more details about the error
      if (createError.response?.data) {
        console.error("\nFull error response:", JSON.stringify(createError.response.data, null, 2))
      }
    }
    
  } catch (error: any) {
    console.error("\n❌ Unexpected error:", error.message)
    console.error("Stack:", error.stack)
  }
}

// Run the test
testDaytona().catch(console.error)
