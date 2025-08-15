import ProxyServer from './server.js';

class ProxyManager {
  constructor() {
    this.proxyServer = null;
  }

  // Get or create proxy server instance
  getProxyServer(port = 8080) {
    if (!this.proxyServer) {
      this.proxyServer = new ProxyServer(port);
    }
    return this.proxyServer;
  }

  // Check if proxy server is running
  isRunning() {
    return this.proxyServer && this.proxyServer.server && this.proxyServer.server.listening;
  }

  // Clean shutdown
  stop() {
    if (this.proxyServer) {
      this.proxyServer.stop();
      this.proxyServer = null;
    }
  }
}

// Create a singleton instance
const proxyManager = new ProxyManager();

export default proxyManager;