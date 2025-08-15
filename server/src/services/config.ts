// server/src/services/config.ts
// Centralized configuration loader
import dotenv from "dotenv"
dotenv.config()

export interface AppConfig {
  port: number
  jwtSecret: string
  daytonaApiUrl?: string
  daytonaApiKey?: string
  claudeCmd: string // e.g., 'claude'
}

export function loadConfig(): AppConfig {
  return {
    port: process.env.PORT ? Number(process.env.PORT) : 8787,
    jwtSecret: process.env.JWT_SECRET ?? "dev-secret",
    daytonaApiUrl: process.env.DAYTONA_API_URL,
    daytonaApiKey: process.env.DAYTONA_API_KEY,
    claudeCmd: process.env.CLAUDE_CMD ?? "claude",
  }
}
