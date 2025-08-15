// Project Omni WebSocket Client
// Connects to backend WebSocket for real-time streaming of Claude processing

// Backend WebSocket message types (from server WebSocket implementation)
interface OmniWebSocketMessage {
  type: "log" | "result" | "error" | "done" | "heartbeat";
  userId?: string;
  sandboxId?: string;
  jobId?: string;
  data?: string;
  format?: "text" | "json";
  code?: string;
  message?: string;
  exitCode?: number;
  ts?: number;
}

// Frontend message format (compatible with existing UI)
interface TaskMessage {
  role: "user" | "assistant";
  type: string;
  data: {
    text?: string;
    isStreaming?: boolean;
    streamId?: string;
    chunkIndex?: number;
    totalChunks?: number;
    id?: string;
  };
}

// Callback for when messages are received and mapped
type MessageCallback = (taskId: string, message: TaskMessage) => void;

export class OmniWebSocket {
  private ws: WebSocket | null = null;
  private userId: string | null = null;
  private onMessage: MessageCallback | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second

  constructor(private baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.NEXT_PUBLIC_OMNI_WS_URL || 'ws://localhost:8787/ws';
  }

  /**
   * Connect to the WebSocket server
   */
  connect(userId: string, onMessage: MessageCallback): void {
    this.userId = userId;
    this.onMessage = onMessage;
    
    try {
      // Close existing connection if any
      this.disconnect();
      
      const wsUrl = `${this.baseUrl}?userId=${encodeURIComponent(userId)}`;
      console.log('🔌 Connecting to WebSocket:', wsUrl);
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('✅ WebSocket connected');
        this.reconnectAttempts = 0; // Reset on successful connection
      };
      
      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };
      
      this.ws.onclose = (event) => {
        console.log('🔌 WebSocket closed:', event.code, event.reason);
        this.scheduleReconnect();
      };
      
      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };
      
    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.reconnectAttempts = 0;
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(rawMessage: string): void {
    try {
      const omniMessage: OmniWebSocketMessage = JSON.parse(rawMessage);
      
      // Skip heartbeat messages
      if (omniMessage.type === 'heartbeat') {
        return;
      }
      
      console.log('📨 WebSocket message:', omniMessage);
      
      // Map to task message format and call callback
      const taskMessage = this.mapToTaskMessage(omniMessage);
      if (taskMessage && this.onMessage && omniMessage.jobId) {
        // Use jobId as taskId for message routing
        this.onMessage(omniMessage.jobId, taskMessage);
      }
      
    } catch (error) {
      console.error('❌ Failed to parse WebSocket message:', rawMessage, error);
    }
  }

  /**
   * Map backend WebSocket messages to frontend task message format
   */
  private mapToTaskMessage(omniMessage: OmniWebSocketMessage): TaskMessage | null {
    const messageId = crypto.randomUUID();
    
    switch (omniMessage.type) {
      case 'log':
        // Real-time processing logs
        return {
          role: 'assistant',
          type: 'message',
          data: {
            id: messageId,
            text: omniMessage.data || '',
            isStreaming: true,
            streamId: `${omniMessage.jobId}-log`,
          }
        };
        
      case 'result':
        // Final processing results (investor materials)
        return {
          role: 'assistant', 
          type: 'message',
          data: {
            id: messageId,
            text: omniMessage.data || '',
            isStreaming: false,
            streamId: `${omniMessage.jobId}-result`,
          }
        };
        
      case 'error':
        // Error messages
        return {
          role: 'assistant',
          type: 'message', 
          data: {
            id: messageId,
            text: `❌ Error: ${omniMessage.message || 'Unknown error occurred'}`,
            isStreaming: false,
            streamId: `${omniMessage.jobId}-error`,
          }
        };
        
      case 'done':
        // Processing completion
        const exitCode = omniMessage.exitCode || 0;
        const status = exitCode === 0 ? 'completed successfully' : 'completed with errors';
        return {
          role: 'assistant',
          type: 'message',
          data: {
            id: messageId, 
            text: `✅ Processing ${status}`,
            isStreaming: false,
            streamId: `${omniMessage.jobId}-done`,
          }
        };
        
      default:
        console.warn('Unknown WebSocket message type:', omniMessage.type);
        return null;
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max WebSocket reconnection attempts reached');
      return;
    }
    
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;
    
    console.log(`🔄 WebSocket reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      if (this.userId && this.onMessage) {
        this.connect(this.userId, this.onMessage);
      }
    }, delay);
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Singleton instance for global use
export const omniWebSocket = new OmniWebSocket();