// server/src/api/inngest.ts
// Inngest API route to serve the Inngest functions

import { serve } from "inngest/bun"
import { inngest, createTask, processKnowledge } from "../services/inngest"

export const maxDuration = 800;

// Export the serve handler for Bun
export const inngestHandler = serve({
  client: inngest,
  functions: [createTask, processKnowledge],
})