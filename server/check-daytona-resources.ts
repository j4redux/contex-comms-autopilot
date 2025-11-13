// Check available Daytona resources (targets, snapshots, etc.)
import { Daytona } from "@daytonaio/sdk"

async function checkResources() {
  console.log("🔍 Checking Daytona account resources...")
  
  const apiUrl = process.env.DAYTONA_API_URL || "https://app.daytona.io/api"
  const apiKey = process.env.DAYTONA_API_KEY
  const target = process.env.DAYTONA_TARGET || "us"
  
  if (!apiKey) {
    console.error("❌ DAYTONA_API_KEY not set")
    process.exit(1)
  }
  
  const daytona = new Daytona({
    apiKey,
    apiUrl,
    target
  })
  
  try {
    // Check existing sandboxes
    console.log("\n--- Existing Sandboxes ---")
    const sandboxes = await daytona.list()
    console.log(`Found ${sandboxes.length} sandboxes:`)
    sandboxes.forEach(sb => {
      console.log(`  - ID: ${sb.id}`)
      console.log(`    State: ${sb.state}`)
      console.log(`    Created: ${sb.createdAt}`)
      console.log(`    Name: ${sb.name || 'N/A'}`)
      console.log("")
    })
    
    // Try to create with minimal config (no snapshot)
    console.log("--- Test: Create sandbox without snapshot ---")
    try {
      const workspace = await daytona.create()
      console.log("✅ Successfully created sandbox without snapshot!")
      console.log("ID:", workspace.id)
      
      // Clean up
      await daytona.delete(workspace)
      console.log("✅ Cleaned up test sandbox")
    } catch (error: any) {
      console.error("❌ Failed to create sandbox without snapshot:")
      console.error("Message:", error.message)
      if (error.response?.data) {
        console.error("Response:", JSON.stringify(error.response.data, null, 2))
      }
    }
    
    // Try to create with image instead of snapshot
    console.log("\n--- Test: Create sandbox with debian image ---")
    try {
      const workspace = await daytona.create({
        image: "debian:latest"
      })
      console.log("✅ Successfully created sandbox with debian image!")
      console.log("ID:", workspace.id)
      
      // Clean up
      await daytona.delete(workspace)
      console.log("✅ Cleaned up test sandbox")
    } catch (error: any) {
      console.error("❌ Failed to create sandbox with image:")
      console.error("Message:", error.message)
      if (error.response?.data) {
        console.error("Response:", JSON.stringify(error.response.data, null, 2))
      }
    }
    
  } catch (error: any) {
    console.error("\n❌ Error checking resources:", error.message)
    if (error.response?.data) {
      console.error("Response:", JSON.stringify(error.response.data, null, 2))
    }
  }
}

checkResources().catch(console.error)
