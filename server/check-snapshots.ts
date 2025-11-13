// Check available snapshots in Daytona
import { Daytona } from "@daytonaio/sdk"

async function checkSnapshots() {
  console.log("🔍 Checking available Daytona snapshots...")
  
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
    console.log("\n--- Available Snapshots ---")
    const snapshots = await daytona.snapshot.list()
    console.log(`Found ${snapshots.length} snapshots:\n`)
    
    snapshots.forEach((snapshot, i) => {
      console.log(`${i + 1}. ${snapshot.name}`)
      console.log(`   ID: ${snapshot.id}`)
      console.log(`   Created: ${snapshot.createdAt}`)
      console.log(`   State: ${snapshot.state}`)
      console.log("")
    })
    
    // Check if our specific snapshot exists
    const targetSnapshot = "omni-snapshot-2025-08-18T21-57-49-580Z"
    const found = snapshots.find(s => s.name === targetSnapshot)
    
    if (found) {
      console.log(`✅ Target snapshot "${targetSnapshot}" exists!`)
      console.log(`   State: ${found.state}`)
    } else {
      console.log(`❌ Target snapshot "${targetSnapshot}" NOT FOUND`)
      console.log("\n💡 Available snapshots to use instead:")
      snapshots.slice(0, 3).forEach(s => {
        console.log(`   - ${s.name}`)
      })
    }
    
  } catch (error: any) {
    console.error("\n❌ Error listing snapshots:", error.message)
    if (error.response?.data) {
      console.error("Response:", JSON.stringify(error.response.data, null, 2))
    }
  }
}

checkSnapshots().catch(console.error)
