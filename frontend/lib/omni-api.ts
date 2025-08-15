// Project Omni API Client
// Replaces VibeKit SDK integration with direct API calls

// TypeScript interfaces matching backend API contract
export interface Sandbox {
  id: string
  userId: string
  status: "creating" | "ready" | "stopped" | "error"
  createdAt: number
}

export interface ProcessKnowledgeRequest {
  input: string
  sandboxId: string
  userId: string
  taskId: string
  model?: string
  env?: Record<string, string>
}

export interface ProcessKnowledgeResponse {
  jobId: string
  accepted: boolean
}

export interface ApiError {
  error: {
    code: string
    message: string
    details?: unknown
  }
}

// Main API client class
export class OmniApiClient {
  private baseUrl: string

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.NEXT_PUBLIC_OMNI_API_URL || 'http://localhost:8787'
  }

  /**
   * Create a new sandbox for the user
   * Maps to: POST /api/sandbox/create
   */
  async createSandbox(userId: string): Promise<Sandbox> {
    const response = await fetch(`${this.baseUrl}/api/sandbox/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    })

    if (!response.ok) {
      const error: ApiError = await response.json()
      throw new Error(`Sandbox creation failed: ${error.error.message}`)
    }

    const data = await response.json()
    return {
      id: data.sandboxId,
      userId,
      status: data.status,
      createdAt: Date.now(), // Backend doesn't return this yet
    }
  }

  /**
   * Get status of existing sandbox
   * Maps to: GET /api/sandbox/status
   */
  async getSandboxStatus(sandboxId: string): Promise<Sandbox | null> {
    const response = await fetch(`${this.baseUrl}/api/sandbox/status?id=${sandboxId}`)

    if (response.status === 404) {
      return null
    }

    if (!response.ok) {
      const error: ApiError = await response.json()
      throw new Error(`Sandbox status check failed: ${error.error.message}`)
    }

    const data = await response.json()
    return {
      id: data.sandboxId,
      userId: '', // Backend doesn't return this
      status: data.status,
      createdAt: data.createdAt || Date.now(),
    }
  }

  /**
   * Process knowledge input (brain dump or query)
   * Maps to: POST /api/knowledge/process
   */
  async processKnowledge(request: ProcessKnowledgeRequest): Promise<ProcessKnowledgeResponse> {
    const response = await fetch(`${this.baseUrl}/api/knowledge/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error: ApiError = await response.json()
      throw new Error(`Knowledge processing failed: ${error.error.message}`)
    }

    return response.json()
  }

  /**
   * Query existing knowledge base
   * Maps to: GET /api/knowledge/query (when implemented)
   */
  async queryKnowledge(userId: string, query?: string): Promise<any> {
    const url = new URL(`${this.baseUrl}/api/knowledge/query`)
    if (query) {
      url.searchParams.set('query', query)
    }
    url.searchParams.set('userId', userId)

    const response = await fetch(url.toString())

    if (!response.ok) {
      const error: ApiError = await response.json()
      throw new Error(`Knowledge query failed: ${error.error.message}`)
    }

    return response.json()
  }
}

// Default client instance
export const omniApi = new OmniApiClient()

// Utility functions for common operations
export async function ensureSandbox(userId: string): Promise<Sandbox> {
  try {
    // Try to create sandbox (backend handles reuse automatically)
    return await omniApi.createSandbox(userId)
  } catch (error: any) {
    throw new Error(`Failed to ensure sandbox for user ${userId}: ${error.message}`)
  }
}

export async function submitFounderInput(
  userId: string,
  input: string,
  mode: 'process' | 'ask' = 'process'
): Promise<{ jobId: string; sandboxId: string }> {
  // Ensure sandbox exists
  const sandbox = await ensureSandbox(userId)

  // Submit processing request
  const response = await omniApi.processKnowledge({
    input,
    sandboxId: sandbox.id,
    userId,
    model: 'sonnet', // Default model
  })

  return {
    jobId: response.jobId,
    sandboxId: sandbox.id,
  }
}