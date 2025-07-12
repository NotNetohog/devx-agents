import { Sandbox } from '@vercel/sandbox';
import ms from 'ms';

export class SandboxManager {
  private sandbox: Sandbox | undefined;
  private repoUrl: string;

  constructor(repoUrl: string) {
    if (!repoUrl) {
      throw new Error('repoUrl is required to create a SandboxManager.');
    }
    this.repoUrl = repoUrl;
  }

  private create(): Promise<Sandbox> {
    return Sandbox.create({
      source: {
        url: this.repoUrl,
        type: 'git',
        username: 'x-access-token',
        password: process.env.GITHUB_TOKEN!,
      },
      resources: { vcpus: 2 },
      timeout: ms('5m'),
      ports: [3000],
      runtime: 'node22',
    });
  }

  async getInstance(): Promise<Sandbox> {
    if (!this.sandbox) {
      this.sandbox = await this.create();
    }
    return this.sandbox;
  }

  async stop(): Promise<void> {
    if (this.sandbox) {
      await this.sandbox.stop();
      this.sandbox = undefined;
    }
  }
}
