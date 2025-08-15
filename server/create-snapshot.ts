#!/usr/bin/env bun
// Create a new Daytona snapshot from our current Dockerfile

import { Daytona, Image } from "@daytonaio/sdk"
import { loadConfig } from "./src/services/config"
import { resolve } from "path"
import { writeFileSync } from "fs"
import dotenv from "dotenv"

dotenv.config()

async function createNewSnapshot() {
  console.log("🏗️ Creating New Omni Snapshot from Current Dockerfile")
  console.log("=====================================================")
  
  try {
    const config = loadConfig()
    if (!config.daytonaApiUrl || !config.daytonaApiKey) {
      throw new Error("Daytona not configured - missing API URL or key")
    }
    
    const daytona = new Daytona({
      apiKey: config.daytonaApiKey,
      apiUrl: config.daytonaApiUrl
    })
    
    // Create Image from our current Dockerfile
    const dockerfilePath = resolve("../Dockerfile")
    console.log(`📄 Creating Image from Dockerfile: ${dockerfilePath}`)
    const image = await Image.fromDockerfile(dockerfilePath)
    console.log(`✅ Image created from Dockerfile`)
    
    // Generate unique snapshot name with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const snapshotName = `omni-snapshot-${timestamp}`
    
    console.log(`🔨 Creating snapshot: ${snapshotName}`)
    console.log("This will take several minutes as it builds from Dockerfile...")
    
    // Create snapshot from our Image
    const snapshot = await daytona.snapshot.create({
      name: snapshotName,
      image: image,
      resources: {
        cpu: 1,
        memory: 1,
        disk: 3
      }
    }, {
      onLogs: (chunk) => {
        process.stdout.write(chunk)
      },
      timeout: 900 // 15 minute timeout
    })
    
    console.log(`\n✅ Snapshot created successfully!`)
    console.log(`   Name: ${snapshotName}`)
    console.log(`   ID: ${snapshot.id}`)
    
    // Update .snapshot-cache.json with new snapshot
    const cacheData = {
      name: snapshotName,
      id: snapshot.id,
      dockerHash: "new", // Will be updated by hash calculation
      ts: Date.now(),
      createdFrom: "current-dockerfile"
    }
    
    writeFileSync("./.snapshot-cache.json", JSON.stringify(cacheData, null, 2))
    console.log(`✅ Updated .snapshot-cache.json`)
    
    console.log(`\n🎉 New snapshot ready for use!`)
    console.log(`   Update daytona.ts to use: snapshot: "${snapshotName}"`)
    
    return snapshotName
    
  } catch (error) {
    console.error("\n❌ Snapshot creation failed:", error)
    throw error
  }
}

createNewSnapshot()
  .then((snapshotName) => {
    console.log(`\n🎉 Snapshot creation completed: ${snapshotName}`)
    process.exit(0)
  })
  .catch(err => {
    console.error("\nFatal error:", err)
    process.exit(1)
  })