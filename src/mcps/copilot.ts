const {
  StreamableHTTPClientTransport,
} = require('@modelcontextprotocol/sdk/client/streamableHttp.js');

import { experimental_createMCPClient } from 'ai';

type MCPClient = Awaited<ReturnType<typeof experimental_createMCPClient>>;

export class CopilotMcpManager {
  private client: MCPClient | undefined;

  private create(): Promise<MCPClient> {
    const url = new URL('https://api.githubcopilot.com/mcp/');

    if (!process.env.GITHUB_TOKEN) {
      throw new Error('GITHUB_TOKEN environment variable is not set.');
    }

    return experimental_createMCPClient({
      transport: new StreamableHTTPClientTransport(url, {
        requestInit: {
          headers: {
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          },
        },
      }),
    });
  }

  async getInstance(): Promise<MCPClient> {
    if (!this.client) {
      this.client = await this.create();
    }
    return this.client;
  }

  async getTools() {
    const client = await this.getInstance();
    return client.tools();
  }

  async stop(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = undefined;
    }
  }
}
