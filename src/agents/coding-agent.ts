import { z } from 'zod';

// Regex constants for performance
const GIT_SUFFIX_REGEX = /\.git$/;

// Core interfaces for the coding agent
export interface CodingRequest {
  prompt: string;
  repositoryUrl: string;
  baseBranch?: string;
  context?: string;
}

export interface CodingResponse {
  success: boolean;
  pullRequestUrl?: string;
  branchName?: string;
  summary?: string;
  error?: string;
}

export interface CodingSession {
  id: string;
  prompt: string;
  repositoryUrl: string;
  baseBranch: string;
  branchName: string;
  status:
    | 'analyzing'
    | 'generating'
    | 'committing'
    | 'creating-pr'
    | 'completed'
    | 'failed';
  createdFiles: string[];
  modifiedFiles: string[];
  commitMessage: string;
  pullRequestUrl?: string;
  error?: string;
}

// Error handling types
export interface CodingError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  suggestions?: string[];
}

export type CodingErrorCode =
  | 'INVALID_PROMPT'
  | 'INVALID_REPOSITORY'
  | 'AUTHENTICATION_FAILED'
  | 'REPOSITORY_NOT_FOUND'
  | 'BRANCH_CONFLICT'
  | 'CODE_GENERATION_FAILED'
  | 'GIT_OPERATION_FAILED'
  | 'PR_CREATION_FAILED'
  | 'UNKNOWN_ERROR';

// Response format for API endpoints
export interface CodingApiResponse {
  success: boolean;
  data?: CodingResponse;
  error?: CodingError;
}

// Code generation context interfaces
export interface CodeContext {
  projectStructure: ProjectStructure;
  existingPatterns: CodePattern[];
  dependencies: string[];
  language: string;
  framework?: string;
}

export interface ProjectStructure {
  directories: string[];
  fileTypes: Record<string, string[]>;
  conventions: NamingConvention[];
}

export interface CodePattern {
  type: 'function' | 'class' | 'component' | 'module';
  pattern: string;
  examples: string[];
}

export interface NamingConvention {
  type: 'file' | 'variable' | 'function' | 'class';
  convention: 'camelCase' | 'PascalCase' | 'kebab-case' | 'snake_case';
}

// Code generation interfaces
export interface GeneratedCode {
  filePath: string;
  content: string;
  operation: 'create' | 'modify';
  description: string;
}

export interface CodeGenerationRequest {
  prompt: string;
  context: CodeContext;
  existingFiles?: Record<string, string>;
}

export interface CodeGenerationResult {
  generatedFiles: GeneratedCode[];
  summary: string;
  reasoning: string;
}

// Validation schemas
export const codingRequestSchema = z.object({
  prompt: z.string().min(10, 'Prompt must be at least 10 characters'),
  repositoryUrl: z.string().url('Must be a valid repository URL'),
  baseBranch: z.string().optional().default('main'),
  context: z.string().optional(),
});

export const codingSessionSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  repositoryUrl: z.string().url(),
  baseBranch: z.string(),
  branchName: z.string(),
  status: z.enum([
    'analyzing',
    'generating',
    'committing',
    'creating-pr',
    'completed',
    'failed',
  ]),
  createdFiles: z.array(z.string()),
  modifiedFiles: z.array(z.string()),
  commitMessage: z.string(),
  pullRequestUrl: z.string().optional(),
  error: z.string().optional(),
});

// Error creation utilities
export function createCodingError(
  code: CodingErrorCode,
  message: string,
  details?: Record<string, unknown>,
  suggestions?: string[]
): CodingError {
  return {
    code,
    message,
    details,
    suggestions,
  };
}

export function createErrorResponse(error: CodingError): CodingApiResponse {
  return {
    success: false,
    error,
  };
}

export function createSuccessResponse(data: CodingResponse): CodingApiResponse {
  return {
    success: true,
    data,
  };
}

// Main coding agent class structure
export class CodingAgent {
  private session: CodingSession | null = null;
  private githubMcp: unknown; // Will be properly typed when implementing GitHub integration
  private sandboxManager: unknown; // Will be properly typed when implementing sandbox integration

  constructor(githubMcp: unknown, sandboxManager: unknown) {
    this.githubMcp = githubMcp;
    this.sandboxManager = sandboxManager;
  }

  /**
   * Main entry point for the coding agent
   * Orchestrates the entire workflow from prompt to PR creation
   */
  async processRequest(request: CodingRequest): Promise<CodingResponse> {
    try {
      // Validate the request
      const validatedRequest = codingRequestSchema.parse(request);

      // Initialize session
      this.session = this.createSession({
        prompt: validatedRequest.prompt,
        repositoryUrl: validatedRequest.repositoryUrl,
        baseBranch: validatedRequest.baseBranch,
        context: validatedRequest.context,
      });

      // Step 1: Analyze codebase
      this.updateSessionStatus('analyzing');
      const codeContext = await this.analyzeCodebase(
        validatedRequest.repositoryUrl,
        validatedRequest.baseBranch
      );

      // Step 2: Generate code
      this.updateSessionStatus('generating');
      const codeGenerationResult = await this.generateCode({
        prompt: validatedRequest.prompt,
        context: codeContext,
        existingFiles: {}, // TODO: Add existing files if needed for modification
      });

      // Step 3: Create branch and commit files
      this.updateSessionStatus('committing');
      const uniqueBranchName = await this.generateUniqueBranchName(
        validatedRequest.repositoryUrl,
        this.session.branchName
      );

      await this.performGitOperations(
        validatedRequest.repositoryUrl,
        uniqueBranchName,
        codeGenerationResult.generatedFiles,
        validatedRequest.baseBranch
      );

      // Step 4: Create pull request
      this.updateSessionStatus('creating-pr');
      const pullRequestUrl = await this.createPullRequest(
        validatedRequest.repositoryUrl,
        uniqueBranchName,
        validatedRequest.baseBranch,
        codeGenerationResult.generatedFiles,
        validatedRequest.prompt
      );

      // Return successful response
      return {
        success: true,
        pullRequestUrl,
        branchName: uniqueBranchName,
        summary: codeGenerationResult.summary,
      };
    } catch (error) {
      // Update session status to failed
      if (this.session) {
        this.updateSessionStatus(
          'failed',
          error instanceof Error ? error.message : 'Unknown error'
        );
      }

      // Attempt cleanup if we have session info
      if (this.session && this.session.branchName) {
        try {
          await this.cleanupFailedGitOperations(
            this.session.repositoryUrl,
            this.session.branchName
          );
        } catch (cleanupError) {
          // Log cleanup failure but don't override original error
          console.error('Cleanup failed:', cleanupError);
        }
      }

      const codingError = this.handleError(error);
      return {
        success: false,
        error: codingError.message,
      };
    }
  }

  /**
   * Create a new coding session
   */
  private createSession(request: CodingRequest): CodingSession {
    const sessionId = `coding-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const branchName = `coding-agent/${sessionId}`;

    return {
      id: sessionId,
      prompt: request.prompt,
      repositoryUrl: request.repositoryUrl,
      baseBranch: request.baseBranch || 'main',
      branchName,
      status: 'analyzing',
      createdFiles: [],
      modifiedFiles: [],
      commitMessage: '',
      pullRequestUrl: undefined,
      error: undefined,
    };
  }

  /**
   * Handle and categorize errors
   */
  private handleError(error: unknown): CodingError {
    if (error instanceof z.ZodError) {
      return createCodingError(
        'INVALID_PROMPT',
        'Invalid request format',
        { validationErrors: error.errors },
        [
          'Check that your prompt is at least 10 characters',
          'Ensure repository URL is valid',
        ]
      );
    }

    if (error instanceof Error) {
      // Categorize known error types
      if (error.message.includes('repository')) {
        return createCodingError(
          'REPOSITORY_NOT_FOUND',
          error.message,
          undefined,
          [
            'Verify the repository URL is correct',
            'Check that you have access to the repository',
          ]
        );
      }

      if (
        error.message.includes('authentication') ||
        error.message.includes('token')
      ) {
        return createCodingError(
          'AUTHENTICATION_FAILED',
          error.message,
          undefined,
          [
            'Check your GitHub token is valid',
            'Ensure the token has necessary permissions',
          ]
        );
      }

      return createCodingError('UNKNOWN_ERROR', error.message);
    }

    return createCodingError('UNKNOWN_ERROR', 'An unexpected error occurred', {
      originalError: String(error),
    });
  }

  /**
   * Get current session status
   */
  getSession(): CodingSession | null {
    return this.session;
  }

  /**
   * Update session status
   */
  private updateSessionStatus(
    status: CodingSession['status'],
    error?: string
  ): void {
    if (this.session) {
      this.session.status = status;
      if (error) {
        this.session.error = error;
      }
    }
  }

  /**
   * Analyze the existing codebase structure and patterns
   * This is the main entry point for codebase analysis
   */
  async analyzeCodebase(
    repositoryUrl: string,
    baseBranch = 'main'
  ): Promise<CodeContext> {
    try {
      // Extract repository info from URL
      const repoInfo = this.parseRepositoryUrl(repositoryUrl);

      // Analyze project structure
      const projectStructure = await this.analyzeProjectStructure(
        repoInfo,
        baseBranch
      );

      // Identify coding patterns
      const existingPatterns = await this.identifyCodingPatterns(
        repoInfo,
        baseBranch
      );

      // Analyze dependencies and framework
      const { dependencies, language, framework } =
        await this.analyzeDependencies(repoInfo, baseBranch);

      return {
        projectStructure,
        existingPatterns,
        dependencies,
        language,
        framework,
      };
    } catch (error) {
      throw createCodingError(
        'CODE_GENERATION_FAILED',
        `Failed to analyze codebase: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { repositoryUrl, baseBranch },
        [
          'Check repository URL is accessible',
          'Verify branch exists',
          'Ensure proper GitHub permissions',
        ]
      );
    }
  }

  /**
   * Parse repository URL to extract owner and repo name
   */
  private parseRepositoryUrl(repositoryUrl: string): {
    owner: string;
    repo: string;
  } {
    try {
      const url = new URL(repositoryUrl);
      const pathParts = url.pathname
        .split('/')
        .filter((part) => part.length > 0);

      if (pathParts.length < 2) {
        throw new Error('Invalid repository URL format');
      }

      const owner = pathParts[0];
      const repo = pathParts[1].replace(GIT_SUFFIX_REGEX, ''); // Remove .git suffix if present

      return { owner, repo };
    } catch (_error) {
      throw createCodingError(
        'INVALID_REPOSITORY',
        'Invalid repository URL format',
        { repositoryUrl },
        [
          'Use format: https://github.com/owner/repo',
          'Ensure URL is valid GitHub repository',
        ]
      );
    }
  }

  /**
   * Analyze project structure using GitHub MCP tools
   */
  private analyzeProjectStructure(
    repoInfo: { owner: string; repo: string },
    baseBranch: string
  ): Promise<ProjectStructure> {
    return Promise.resolve().then(() => {
      try {
        // TODO: Implement actual GitHub MCP integration
        // const files = await this.githubMcp.listFiles({ owner: repoInfo.owner, repo: repoInfo.repo, ref: baseBranch });

        // Mock implementation for now - this will be replaced with actual GitHub MCP calls
        const mockFiles = [
          'src/agents/review-agent.ts',
          'src/tools/run-command.ts',
          'src/mcps/copilot.ts',
          'api/github-review.ts',
          'package.json',
          'tsconfig.json',
        ];

        const directories = this.extractDirectories(mockFiles);
        const fileTypes = this.analyzeFileTypes(mockFiles);
        const conventions = this.determineNamingConventions();

        return {
          directories,
          fileTypes,
          conventions,
        };
      } catch (error) {
        throw createCodingError(
          'CODE_GENERATION_FAILED',
          `Failed to analyze project structure: ${error instanceof Error ? error.message : 'Unknown error'}`,
          { repoInfo, baseBranch }
        );
      }
    });
  }

  /**
   * Extract directory structure from file list
   */
  private extractDirectories(files: string[]): string[] {
    const uniqueDirectories = new Set<string>();

    for (const file of files) {
      const dir = file.split('/').slice(0, -1).join('/');
      if (dir) {
        uniqueDirectories.add(dir);
        // Add parent directories too
        const parts = dir.split('/');
        for (let i = 1; i < parts.length; i++) {
          uniqueDirectories.add(parts.slice(0, i).join('/'));
        }
      }
    }

    return Array.from(uniqueDirectories).sort();
  }

  /**
   * Analyze file types by directory
   */
  private analyzeFileTypes(files: string[]): Record<string, string[]> {
    const fileTypes: Record<string, string[]> = {};

    for (const file of files) {
      const extension = file.split('.').pop() || '';
      const dir = file.split('/').slice(0, -1).join('/') || 'root';

      if (!fileTypes[dir]) {
        fileTypes[dir] = [];
      }
      if (extension && !fileTypes[dir].includes(extension)) {
        fileTypes[dir].push(extension);
      }
    }

    return fileTypes;
  }

  /**
   * Determine naming conventions based on project patterns
   */
  private determineNamingConventions(): NamingConvention[] {
    return [
      { type: 'file', convention: 'kebab-case' }, // Based on existing files like review-agent.ts
      { type: 'variable', convention: 'camelCase' }, // TypeScript standard
      { type: 'function', convention: 'camelCase' }, // TypeScript standard
      { type: 'class', convention: 'PascalCase' }, // TypeScript standard
    ];
  }

  /**
   * Identify coding patterns from existing files
   */
  private identifyCodingPatterns(
    repoInfo: { owner: string; repo: string },
    baseBranch: string
  ): Promise<CodePattern[]> {
    return Promise.resolve().then(() => {
      try {
        const patterns: CodePattern[] = [];

        // TODO: Implement actual GitHub MCP integration to read file contents
        // const fileContents = await this.githubMcp.getFileContents({ ... });

        // Mock patterns based on the existing codebase structure
        patterns.push(
          {
            type: 'function',
            pattern:
              'export const createTool = (getDependency: () => Promise<Dependency>) => tool({ ... })',
            examples: ['createRunCommand', 'createCodingAgent'],
          },
          {
            type: 'class',
            pattern:
              'export class Manager { private instance; constructor(); getInstance(); getTools(); stop(); }',
            examples: ['CopilotMcpManager', 'SandboxManager'],
          },
          {
            type: 'module',
            pattern: 'Agent modules with system prompts and tool orchestration',
            examples: ['review-agent.ts', 'coding-agent.ts'],
          },
          {
            type: 'component',
            pattern: 'API endpoints as Vercel serverless functions',
            examples: ['github-review.ts', 'github-coding.ts'],
          }
        );

        return patterns;
      } catch (error) {
        throw createCodingError(
          'CODE_GENERATION_FAILED',
          `Failed to identify coding patterns: ${error instanceof Error ? error.message : 'Unknown error'}`,
          { repoInfo, baseBranch }
        );
      }
    });
  }

  /**
   * Analyze project dependencies and determine framework
   */
  private analyzeDependencies(
    repoInfo: { owner: string; repo: string },
    baseBranch: string
  ): Promise<{ dependencies: string[]; language: string; framework?: string }> {
    return Promise.resolve().then(() => {
      try {
        // TODO: Implement actual GitHub MCP integration to read package.json
        // const packageJson = await this.githubMcp.getFileContents({
        //   owner: repoInfo.owner,
        //   repo: repoInfo.repo,
        //   path: 'package.json',
        //   ref: baseBranch
        // });

        // Mock analysis based on known project structure
        const dependencies = [
          'ai', // AI SDK
          '@modelcontextprotocol/sdk', // MCP
          '@vercel/sandbox', // Vercel Sandbox
          'zod', // Validation
          'typescript', // Language
          'tsx', // TypeScript execution
          'biome', // Linting
        ];

        const language = 'typescript';
        const framework = 'vercel'; // Based on deployment target

        return {
          dependencies,
          language,
          framework,
        };
      } catch (error) {
        throw createCodingError(
          'CODE_GENERATION_FAILED',
          `Failed to analyze dependencies: ${error instanceof Error ? error.message : 'Unknown error'}`,
          { repoInfo, baseBranch }
        );
      }
    });
  }

  /**
   * Generate code based on natural language prompt and project context
   * This is the main entry point for code generation
   */
  async generateCode(
    request: CodeGenerationRequest
  ): Promise<CodeGenerationResult> {
    try {
      // Update session status if available
      if (this.session) {
        this.updateSessionStatus('generating');
      }

      // Build the AI prompt with context
      const aiPrompt = this.buildAIPrompt(request);

      // Generate code using AI (mock implementation for now)
      const generatedFiles = await this.generateCodeWithAI(
        aiPrompt,
        request.context
      );

      // Validate generated code
      const validatedFiles = this.validateGeneratedCode(
        generatedFiles,
        request.context
      );

      // Determine appropriate file locations
      const finalFiles = this.determineFileLocations(
        validatedFiles,
        request.context
      );

      // Create summary and reasoning
      const summary = this.createGenerationSummary(finalFiles);
      const reasoning = this.createGenerationReasoning(
        request.prompt,
        request.context,
        finalFiles
      );

      return {
        generatedFiles: finalFiles,
        summary,
        reasoning,
      };
    } catch (error) {
      throw createCodingError(
        'CODE_GENERATION_FAILED',
        `Failed to generate code: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { prompt: request.prompt },
        [
          'Check that the prompt is clear and specific',
          'Ensure the project context is valid',
          'Try simplifying the request',
        ]
      );
    }
  }

  /**
   * Build AI prompt incorporating project context and patterns
   */
  private buildAIPrompt(request: CodeGenerationRequest): string {
    const { prompt, context } = request;

    const aiPrompt = `You are a TypeScript code generator for a ${context.framework || 'Node.js'} project.

PROJECT CONTEXT:
- Language: ${context.language}
- Framework: ${context.framework || 'Node.js'}
- Dependencies: ${context.dependencies.join(', ')}

PROJECT STRUCTURE:
- Directories: ${context.projectStructure.directories.join(', ')}
- File Types: ${JSON.stringify(context.projectStructure.fileTypes, null, 2)}

NAMING CONVENTIONS:
${context.projectStructure.conventions.map((c) => `- ${c.type}: ${c.convention}`).join('\n')}

EXISTING PATTERNS:
${context.existingPatterns.map((p) => `- ${p.type}: ${p.pattern}\n  Examples: ${p.examples.join(', ')}`).join('\n')}

USER REQUEST:
${prompt}

REQUIREMENTS:
1. Follow the existing project structure and conventions
2. Use TypeScript with proper type definitions
3. Follow the established coding patterns
4. Include proper error handling
5. Add appropriate comments and documentation
6. Ensure code is production-ready

Please generate the appropriate code files with clear file paths and descriptions.`;

    return aiPrompt;
  }

  /**
   * Generate code using AI (mock implementation)
   */
  private generateCodeWithAI(
    aiPrompt: string,
    _context: CodeContext
  ): Promise<GeneratedCode[]> {
    // TODO: Implement actual AI integration using the AI SDK
    // For now, return mock generated code based on common patterns

    const generatedFiles: GeneratedCode[] = [];

    // Mock code generation based on prompt analysis
    if (
      aiPrompt.toLowerCase().includes('api') ||
      aiPrompt.toLowerCase().includes('endpoint')
    ) {
      generatedFiles.push({
        filePath: 'api/new-endpoint.ts',
        content: this.generateMockAPIEndpoint(),
        operation: 'create',
        description:
          'New API endpoint following Vercel serverless function pattern',
      });
    }

    if (
      aiPrompt.toLowerCase().includes('agent') ||
      aiPrompt.toLowerCase().includes('tool')
    ) {
      generatedFiles.push({
        filePath: 'src/agents/new-agent.ts',
        content: this.generateMockAgent(),
        operation: 'create',
        description: 'New agent following the established agent pattern',
      });
    }

    if (
      aiPrompt.toLowerCase().includes('utility') ||
      aiPrompt.toLowerCase().includes('helper')
    ) {
      generatedFiles.push({
        filePath: 'src/utils/new-utility.ts',
        content: this.generateMockUtility(),
        operation: 'create',
        description: 'New utility function with proper TypeScript types',
      });
    }

    // If no specific patterns detected, generate a generic module
    if (generatedFiles.length === 0) {
      generatedFiles.push({
        filePath: 'src/modules/generated-module.ts',
        content: this.generateMockModule(),
        operation: 'create',
        description: 'Generated module based on user requirements',
      });
    }

    return Promise.resolve(generatedFiles);
  }

  /**
   * Generate mock API endpoint code
   */
  private generateMockAPIEndpoint(): string {
    return `import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';

// Request validation schema
const requestSchema = z.object({
  // Add your request fields here
  data: z.string(),
});

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  try {
    // Validate request method
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Validate request body
    const validatedData = requestSchema.parse(req.body);

    // Process the request
    const result = await processRequest(validatedData);

    // Return success response
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('API Error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid request format',
        details: error.errors,
      });
    }

    res.status(500).json({
      error: 'Internal server error',
    });
  }
}

async function processRequest(data: z.infer<typeof requestSchema>) {
  // Implement your business logic here
  return { processed: data.data };
}`;
  }

  /**
   * Generate mock agent code
   */
  private generateMockAgent(): string {
    return `import { tool } from 'ai';
import { z } from 'zod';

// Tool input schema
const toolInputSchema = z.object({
  input: z.string().min(1, 'Input is required'),
});

export const createNewAgent = (getDependency: () => Promise<unknown>) => {
  return tool({
    description: 'New agent tool for processing requests',
    inputSchema: toolInputSchema,
    execute: async ({ input }) => {
      try {
        const dependency = await getDependency();
        
        // Process the input
        const result = await processInput(input);
        
        return {
          success: true,
          result,
        };
      } catch (error) {
        console.error('Agent Error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  });
};

async function processInput(input: string): Promise<string> {
  // Implement your agent logic here
  return \`Processed: \${input}\`;
}`;
  }

  /**
   * Generate mock utility code
   */
  private generateMockUtility(): string {
    return `/**
 * Utility functions for common operations
 */

export interface UtilityOptions {
  option1?: string;
  option2?: number;
}

/**
 * Main utility function
 */
export function processUtility(
  input: string,
  options: UtilityOptions = {}
): string {
  try {
    // Implement utility logic here
    const processed = input.trim();
    
    if (options.option1) {
      return \`\${processed} - \${options.option1}\`;
    }
    
    return processed;
  } catch (error) {
    throw new Error(\`Utility processing failed: \${error instanceof Error ? error.message : 'Unknown error'}\`);
  }
}

/**
 * Helper function for validation
 */
export function validateInput(input: unknown): input is string {
  return typeof input === 'string' && input.length > 0;
}`;
  }

  /**
   * Generate mock module code
   */
  private generateMockModule(): string {
    return `/**
 * Generated module based on user requirements
 */

export interface ModuleConfig {
  enabled: boolean;
  settings?: Record<string, unknown>;
}

export class GeneratedModule {
  private config: ModuleConfig;

  constructor(config: ModuleConfig) {
    this.config = config;
  }

  /**
   * Initialize the module
   */
  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      throw new Error('Module is not enabled');
    }

    // Initialization logic here
    console.log('Module initialized');
  }

  /**
   * Process data with the module
   */
  async process(data: unknown): Promise<unknown> {
    if (!this.config.enabled) {
      throw new Error('Module is not enabled');
    }

    // Processing logic here
    return data;
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    // Cleanup logic here
    console.log('Module cleaned up');
  }
}

export const createModule = (config: ModuleConfig): GeneratedModule => {
  return new GeneratedModule(config);
};`;
  }

  /**
   * Validate generated code to ensure it follows project conventions
   */
  private validateGeneratedCode(
    generatedFiles: GeneratedCode[],
    context: CodeContext
  ): GeneratedCode[] {
    return generatedFiles.map((file) => {
      let validatedContent = file.content;

      // Validate naming conventions
      validatedContent = this.validateNamingConventions(
        validatedContent,
        context
      );

      // Validate TypeScript usage
      validatedContent = this.validateTypeScriptUsage(validatedContent);

      // Validate project patterns
      validatedContent = this.validateProjectPatterns(
        validatedContent,
        context
      );

      return {
        ...file,
        content: validatedContent,
      };
    });
  }

  /**
   * Validate naming conventions in generated code
   */
  private validateNamingConventions(
    content: string,
    context: CodeContext
  ): string {
    // This is a simplified validation - in a real implementation,
    // you would use AST parsing to properly validate naming conventions

    const conventions = context.projectStructure.conventions;
    let validatedContent = content;

    // Check for common naming issues and fix them
    for (const convention of conventions) {
      if (
        convention.type === 'function' &&
        convention.convention === 'camelCase'
      ) {
        // Ensure function names are camelCase (simplified check)
        validatedContent = validatedContent.replace(
          /function\s+([A-Z][a-zA-Z0-9]*)/g,
          (_match, name) =>
            `function ${name.charAt(0).toLowerCase()}${name.slice(1)}`
        );
      }
    }

    return validatedContent;
  }

  /**
   * Validate TypeScript usage in generated code
   */
  private validateTypeScriptUsage(content: string): string {
    // Ensure proper TypeScript patterns are used
    let validatedContent = content;

    // Add return type annotations if missing (simplified)
    validatedContent = validatedContent.replace(
      /function\s+(\w+)\s*\([^)]*\)\s*{/g,
      (match) => {
        if (!match.includes('):')) {
          return match.replace('{', ': void {');
        }
        return match;
      }
    );

    return validatedContent;
  }

  /**
   * Validate project patterns in generated code
   */
  private validateProjectPatterns(
    content: string,
    _context: CodeContext
  ): string {
    // Ensure generated code follows established patterns
    const validatedContent = content;

    // Check if code follows tool creation pattern for agents
    if (content.includes('tool({') && !content.includes('getDependency')) {
      // This would be more sophisticated in a real implementation
      // Note: Generated agent code may not follow established patterns
    }

    return validatedContent;
  }

  /**
   * Determine appropriate file locations for generated code
   */
  private determineFileLocations(
    generatedFiles: GeneratedCode[],
    context: CodeContext
  ): GeneratedCode[] {
    return generatedFiles.map((file) => {
      let filePath = file.filePath;

      // Ensure file paths follow project structure
      const directories = context.projectStructure.directories;

      // Validate and adjust file paths based on project structure
      if (filePath.startsWith('src/') && !directories.includes('src')) {
        // If src directory doesn't exist, place in root or appropriate directory
        filePath = filePath.replace('src/', '');
      }

      // Ensure proper file extensions based on project conventions
      if (!(filePath.endsWith('.ts') || filePath.endsWith('.js'))) {
        filePath += '.ts'; // Default to TypeScript
      }

      return {
        ...file,
        filePath,
      };
    });
  }

  /**
   * Create summary of generated code
   */
  private createGenerationSummary(generatedFiles: GeneratedCode[]): string {
    const fileCount = generatedFiles.length;
    const operations = generatedFiles.reduce(
      (acc, file) => {
        acc[file.operation] = (acc[file.operation] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    let summary = `Generated ${fileCount} file${fileCount === 1 ? '' : 's'}:\n`;

    for (const file of generatedFiles) {
      summary += `- ${file.filePath} (${file.operation}): ${file.description}\n`;
    }

    if (operations.create) {
      summary += `\nCreated ${operations.create} new file${operations.create === 1 ? '' : 's'}`;
    }
    if (operations.modify) {
      summary += `\nModified ${operations.modify} existing file${operations.modify === 1 ? '' : 's'}`;
    }

    return summary;
  }

  /**
   * Create reasoning explanation for code generation
   */
  private createGenerationReasoning(
    prompt: string,
    context: CodeContext,
    generatedFiles: GeneratedCode[]
  ): string {
    let reasoning = 'Code generation reasoning:\n\n';

    reasoning += `1. Analyzed user prompt: "${prompt}"\n`;
    reasoning += `2. Considered project context: ${context.language} project with ${context.framework} framework\n`;
    reasoning += `3. Applied existing patterns: ${context.existingPatterns.map((p) => p.type).join(', ')}\n`;
    reasoning += `4. Followed naming conventions: ${context.projectStructure.conventions.map((c) => `${c.type}=${c.convention}`).join(', ')}\n`;
    reasoning +=
      '5. Generated files in appropriate locations based on project structure\n';

    reasoning += '\nGenerated files:\n';
    generatedFiles.forEach((file, index) => {
      reasoning += `${index + 1}. ${file.filePath} - ${file.description}\n`;
    });

    return reasoning;
  }

  /**
   * Create a new Git branch for the coding changes
   */
  createBranch(
    repositoryUrl: string,
    branchName: string,
    baseBranch = 'main'
  ): Promise<void> {
    return Promise.resolve().then(() => {
      try {
        const repoInfo = this.parseRepositoryUrl(repositoryUrl);

        // TODO: Implement actual GitHub MCP integration
        // await this.githubMcp.createBranch({
        //   owner: repoInfo.owner,
        //   repo: repoInfo.repo,
        //   branch: branchName,
        //   from_branch: baseBranch
        // });

        // Mock implementation for now
        // Note: Creating branch ${branchName} from ${baseBranch} in ${repoInfo.owner}/${repoInfo.repo}

        // Update session if available
        if (this.session) {
          this.session.branchName = branchName;
          this.updateSessionStatus('committing');
        }
      } catch (error) {
        throw createCodingError(
          'GIT_OPERATION_FAILED',
          `Failed to create branch: ${error instanceof Error ? error.message : 'Unknown error'}`,
          { repositoryUrl, branchName, baseBranch },
          [
            'Check that the base branch exists',
            'Ensure you have write permissions to the repository',
            "Verify the branch name is valid and doesn't already exist",
          ]
        );
      }
    });
  }

  /**
   * Commit generated files to the branch
   */
  async commitFiles(
    repositoryUrl: string,
    branchName: string,
    generatedFiles: GeneratedCode[],
    commitMessage?: string
  ): Promise<void> {
    try {
      const repoInfo = this.parseRepositoryUrl(repositoryUrl);
      const message =
        commitMessage || this.generateCommitMessage(generatedFiles);

      // TODO: Implement actual GitHub MCP integration
      // for (const file of generatedFiles) {
      //   await this.githubMcp.createOrUpdateFile({
      //     owner: repoInfo.owner,
      //     repo: repoInfo.repo,
      //     path: file.filePath,
      //     content: file.content,
      //     message: `${message}\n\n${file.description}`,
      //     branch: branchName
      //   });
      // }

      // Mock implementation for now
      console.log(
        `Committing ${generatedFiles.length} files to branch ${branchName}`
      );
      console.log(`Commit message: ${message}`);

      generatedFiles.forEach((file, index) => {
        console.log(`${index + 1}. ${file.filePath} (${file.operation})`);
      });

      // Update session if available
      if (this.session) {
        this.session.commitMessage = message;
        this.session.createdFiles = generatedFiles
          .filter((f) => f.operation === 'create')
          .map((f) => f.filePath);
        this.session.modifiedFiles = generatedFiles
          .filter((f) => f.operation === 'modify')
          .map((f) => f.filePath);
      }
    } catch (error) {
      throw createCodingError(
        'GIT_OPERATION_FAILED',
        `Failed to commit files: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { repositoryUrl, branchName, fileCount: generatedFiles.length },
        [
          'Check that the branch exists',
          'Ensure file paths are valid',
          'Verify you have write permissions to the repository',
          'Check that file content is valid',
        ]
      );
    }
  }

  /**
   * Push the branch to remote repository
   */
  async pushBranch(repositoryUrl: string, branchName: string): Promise<void> {
    try {
      const repoInfo = this.parseRepositoryUrl(repositoryUrl);

      // TODO: Implement actual GitHub MCP integration
      // The GitHub MCP tools handle pushing automatically when creating/updating files
      // This method serves as a placeholder for explicit push operations if needed

      // Mock implementation for now
      console.log(
        `Pushing branch ${branchName} to ${repoInfo.owner}/${repoInfo.repo}`
      );

      // Update session if available
      if (this.session) {
        this.updateSessionStatus('creating-pr');
      }
    } catch (error) {
      throw createCodingError(
        'GIT_OPERATION_FAILED',
        `Failed to push branch: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { repositoryUrl, branchName },
        [
          'Check that the branch exists locally',
          'Ensure you have push permissions to the repository',
          'Verify network connectivity',
          'Check if the remote repository is accessible',
        ]
      );
    }
  }

  /**
   * Generate a descriptive commit message based on generated files
   */
  private generateCommitMessage(generatedFiles: GeneratedCode[]): string {
    const createCount = generatedFiles.filter(
      (f) => f.operation === 'create'
    ).length;
    const modifyCount = generatedFiles.filter(
      (f) => f.operation === 'modify'
    ).length;

    let message = 'feat: ';

    if (createCount > 0 && modifyCount > 0) {
      message += `add ${createCount} new file${createCount === 1 ? '' : 's'} and modify ${modifyCount} file${modifyCount === 1 ? '' : 's'}`;
    } else if (createCount > 0) {
      message += `add ${createCount} new file${createCount === 1 ? '' : 's'}`;
    } else if (modifyCount > 0) {
      message += `modify ${modifyCount} file${modifyCount === 1 ? '' : 's'}`;
    } else {
      message += 'update codebase';
    }

    // Add file details
    const fileTypes = new Set(
      generatedFiles.map((f) => {
        const ext = f.filePath.split('.').pop();
        return ext === 'ts' ? 'TypeScript' : ext?.toUpperCase() || 'file';
      })
    );

    if (fileTypes.size === 1) {
      message += ` (${Array.from(fileTypes)[0]})`;
    } else if (fileTypes.size > 1) {
      message += ` (${Array.from(fileTypes).join(', ')})`;
    }

    return message;
  }

  /**
   * Perform complete Git workflow: create branch, commit files, and push
   */
  async performGitOperations(
    repositoryUrl: string,
    branchName: string,
    generatedFiles: GeneratedCode[],
    baseBranch = 'main',
    commitMessage?: string
  ): Promise<void> {
    try {
      // Create branch
      await this.createBranch(repositoryUrl, branchName, baseBranch);

      // Commit files
      await this.commitFiles(
        repositoryUrl,
        branchName,
        generatedFiles,
        commitMessage
      );

      // Push branch
      await this.pushBranch(repositoryUrl, branchName);
    } catch (error) {
      // If any step fails, attempt cleanup
      await this.cleanupFailedGitOperations(repositoryUrl, branchName);
      throw error;
    }
  }

  /**
   * Cleanup failed Git operations
   */
  private async cleanupFailedGitOperations(
    repositoryUrl: string,
    branchName: string
  ): Promise<void> {
    try {
      const repoInfo = this.parseRepositoryUrl(repositoryUrl);

      // TODO: Implement actual GitHub MCP integration for cleanup
      // await this.githubMcp.deleteBranch({
      //   owner: repoInfo.owner,
      //   repo: repoInfo.repo,
      //   branch: branchName
      // });

      // Mock implementation for now
      console.log(
        `Cleaning up failed branch ${branchName} in ${repoInfo.owner}/${repoInfo.repo}`
      );
    } catch (cleanupError) {
      // Log cleanup failure but don't throw - original error is more important
      console.error('Failed to cleanup Git operations:', cleanupError);
    }
  }

  /**
   * Check if branch already exists
   */
  async branchExists(
    repositoryUrl: string,
    branchName: string
  ): Promise<boolean> {
    try {
      const repoInfo = this.parseRepositoryUrl(repositoryUrl);

      // TODO: Implement actual GitHub MCP integration
      // const branches = await this.githubMcp.listBranches({
      //   owner: repoInfo.owner,
      //   repo: repoInfo.repo
      // });
      // return branches.some(branch => branch.name === branchName);

      // Mock implementation for now
      console.log(
        `Checking if branch ${branchName} exists in ${repoInfo.owner}/${repoInfo.repo}`
      );
      return false; // Assume branch doesn't exist for now
    } catch (error) {
      throw createCodingError(
        'GIT_OPERATION_FAILED',
        `Failed to check branch existence: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { repositoryUrl, branchName },
        [
          'Check repository URL is valid',
          'Ensure you have read permissions to the repository',
          'Verify network connectivity',
        ]
      );
    }
  }

  /**
   * Generate alternative branch name if conflict occurs
   */
  async generateUniqueBranchName(
    repositoryUrl: string,
    baseName: string
  ): Promise<string> {
    let branchName = baseName;
    let counter = 1;

    while (await this.branchExists(repositoryUrl, branchName)) {
      branchName = `${baseName}-${counter}`;
      counter++;

      // Prevent infinite loop
      if (counter > 100) {
        throw createCodingError(
          'BRANCH_CONFLICT',
          'Unable to generate unique branch name after 100 attempts',
          { repositoryUrl, baseName },
          [
            'Try using a different base branch name',
            'Clean up old branches in the repository',
            'Check if there are naming conflicts',
          ]
        );
      }
    }

    return branchName;
  }

  /**
   * Create a pull request with the generated changes
   */
  async createPullRequest(
    repositoryUrl: string,
    branchName: string,
    baseBranch: string,
    generatedFiles: GeneratedCode[],
    prompt: string
  ): Promise<string> {
    try {
      const repoInfo = this.parseRepositoryUrl(repositoryUrl);

      // Generate PR title and body
      const title = this.generatePRTitle(generatedFiles, prompt);
      const body = this.generatePRBody(generatedFiles, prompt);

      // TODO: Implement actual GitHub MCP integration
      // const pullRequest = await this.githubMcp.createPullRequest({
      //   owner: repoInfo.owner,
      //   repo: repoInfo.repo,
      //   title,
      //   body,
      //   head: branchName,
      //   base: baseBranch
      // });

      // Mock implementation for now
      const mockPRUrl = `https://github.com/${repoInfo.owner}/${repoInfo.repo}/pull/123`;

      // Update session if available
      if (this.session) {
        this.session.pullRequestUrl = mockPRUrl;
        this.updateSessionStatus('completed');
      }

      return mockPRUrl;
    } catch (error) {
      throw createCodingError(
        'PR_CREATION_FAILED',
        `Failed to create pull request: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { repositoryUrl, branchName, baseBranch },
        [
          'Check that the branch exists and has commits',
          'Ensure you have write permissions to the repository',
          'Verify the base branch exists',
          'Check if there are any conflicts with existing PRs',
        ]
      );
    }
  }

  /**
   * Generate a descriptive PR title based on generated files and prompt
   */
  private generatePRTitle(
    generatedFiles: GeneratedCode[],
    prompt: string
  ): string {
    const createCount = generatedFiles.filter(
      (f) => f.operation === 'create'
    ).length;
    const modifyCount = generatedFiles.filter(
      (f) => f.operation === 'modify'
    ).length;

    // Extract key action from prompt
    const promptLower = prompt.toLowerCase();
    let action = 'feat';

    if (promptLower.includes('fix') || promptLower.includes('bug')) {
      action = 'fix';
    } else if (promptLower.includes('refactor')) {
      action = 'refactor';
    } else if (
      promptLower.includes('docs') ||
      promptLower.includes('documentation')
    ) {
      action = 'docs';
    } else if (promptLower.includes('test')) {
      action = 'test';
    }

    // Generate title based on operations
    let title = `${action}: `;

    if (createCount > 0 && modifyCount > 0) {
      title += `add ${createCount} new file${createCount === 1 ? '' : 's'} and update ${modifyCount} file${modifyCount === 1 ? '' : 's'}`;
    } else if (createCount > 0) {
      title += `add ${createCount} new file${createCount === 1 ? '' : 's'}`;
    } else if (modifyCount > 0) {
      title += `update ${modifyCount} file${modifyCount === 1 ? '' : 's'}`;
    } else {
      title += 'update codebase';
    }

    // Add context from prompt (first few words)
    const promptWords = prompt.split(' ').slice(0, 5).join(' ');
    if (promptWords.length > 0 && promptWords.length < 50) {
      title += ` - ${promptWords}`;
    }

    return title;
  }

  /**
   * Generate a comprehensive PR body with change details
   */
  private generatePRBody(
    generatedFiles: GeneratedCode[],
    prompt: string
  ): string {
    let body = '## Summary\n\n';
    body += `This PR implements the requested changes based on the following prompt:\n\n`;
    body += `> ${prompt}\n\n`;

    body += '## Changes Made\n\n';

    const createdFiles = generatedFiles.filter((f) => f.operation === 'create');
    const modifiedFiles = generatedFiles.filter(
      (f) => f.operation === 'modify'
    );

    if (createdFiles.length > 0) {
      body += '### New Files Created\n\n';
      for (const file of createdFiles) {
        body += `- **${file.filePath}**: ${file.description}\n`;
      }
      body += '\n';
    }

    if (modifiedFiles.length > 0) {
      body += '### Files Modified\n\n';
      for (const file of modifiedFiles) {
        body += `- **${file.filePath}**: ${file.description}\n`;
      }
      body += '\n';
    }

    // Add file type analysis
    const fileTypes = new Set(
      generatedFiles.map((f) => {
        const ext = f.filePath.split('.').pop();
        return ext === 'ts' ? 'TypeScript' : ext?.toUpperCase() || 'file';
      })
    );

    body += '## Technical Details\n\n';
    body += `- **Languages**: ${Array.from(fileTypes).join(', ')}\n`;
    body += `- **Files affected**: ${generatedFiles.length}\n`;
    body += `- **Operations**: ${createdFiles.length} created, ${modifiedFiles.length} modified\n\n`;

    body += '## Testing\n\n';
    body += '- [ ] Code compiles without errors\n';
    body += '- [ ] All existing tests pass\n';
    body += '- [ ] New functionality works as expected\n';
    body += '- [ ] Code follows project conventions\n\n';

    body += '## Notes\n\n';
    body += 'This PR was generated automatically by the coding agent. ';
    body += 'Please review the changes carefully before merging.\n\n';

    body += '---\n';
    body += '*Generated by DevX Coding Agent*';

    return body;
  }

  /**
   * Retry logic for transient failures
   */
  private async retryOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries = 3,
    baseDelay = 1000
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if error is retryable
        if (!this.isRetryableError(lastError) || attempt === maxRetries) {
          throw lastError;
        }

        // Calculate delay with exponential backoff
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await this.sleep(delay);

        console.warn(
          `${operationName} failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms:`,
          lastError.message
        );
      }
    }

    throw lastError;
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: Error): boolean {
    const retryablePatterns = [
      /network/i,
      /timeout/i,
      /rate limit/i,
      /502/,
      /503/,
      /504/,
      /ECONNRESET/,
      /ENOTFOUND/,
      /ETIMEDOUT/,
    ];

    return retryablePatterns.some((pattern) => pattern.test(error.message));
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Enhanced branch name generation with fallback strategies
   */
  async generateUniqueBranchNameWithFallback(
    repositoryUrl: string,
    baseName: string,
    maxAttempts = 10
  ): Promise<string> {
    const fallbackStrategies = [
      // Strategy 1: Add timestamp
      () => `${baseName}-${Date.now()}`,
      // Strategy 2: Add random suffix
      () => `${baseName}-${Math.random().toString(36).substring(2, 8)}`,
      // Strategy 3: Add UUID-like suffix
      () => `${baseName}-${crypto.randomUUID().substring(0, 8)}`,
      // Strategy 4: Use different prefix
      () => `feature-${baseName.replace(/^[^-]+-/, '')}-${Date.now()}`,
      // Strategy 5: Simplified name
      () => `auto-${Date.now()}`,
    ];

    // Try original name first
    try {
      const exists = await this.retryOperation(
        () => this.branchExists(repositoryUrl, baseName),
        'Check branch existence'
      );

      if (!exists) {
        return baseName;
      }
    } catch (error) {
      console.warn('Failed to check branch existence, using fallback strategy');
    }

    // Try fallback strategies
    for (let i = 0; i < fallbackStrategies.length && i < maxAttempts; i++) {
      try {
        const fallbackName = fallbackStrategies[i]();
        const exists = await this.retryOperation(
          () => this.branchExists(repositoryUrl, fallbackName),
          'Check fallback branch existence'
        );

        if (!exists) {
          return fallbackName;
        }
      } catch (error) {
        console.warn(`Fallback strategy ${i + 1} failed:`, error);
        continue;
      }
    }

    // Final fallback - use timestamp
    return `emergency-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  }

  /**
   * Enhanced Git operations with retry and recovery
   */
  async performGitOperationsWithRetry(
    repositoryUrl: string,
    branchName: string,
    generatedFiles: GeneratedCode[],
    baseBranch = 'main',
    commitMessage?: string
  ): Promise<void> {
    let finalBranchName = branchName;

    try {
      // Step 1: Create branch with retry
      await this.retryOperation(
        () => this.createBranch(repositoryUrl, finalBranchName, baseBranch),
        'Create branch'
      );

      // Step 2: Commit files with retry
      await this.retryOperation(
        () =>
          this.commitFiles(
            repositoryUrl,
            finalBranchName,
            generatedFiles,
            commitMessage
          ),
        'Commit files'
      );

      // Step 3: Push branch with retry
      await this.retryOperation(
        () => this.pushBranch(repositoryUrl, finalBranchName),
        'Push branch'
      );
    } catch (error) {
      // Enhanced cleanup with retry
      try {
        await this.retryOperation(
          () => this.cleanupFailedGitOperations(repositoryUrl, finalBranchName),
          'Cleanup failed operations',
          2 // Fewer retries for cleanup
        );
      } catch (cleanupError) {
        console.error(
          'Failed to cleanup after Git operation failure:',
          cleanupError
        );
      }

      throw error;
    }
  }

  /**
   * Enhanced error reporting with detailed suggestions
   */
  private createDetailedError(
    code: CodingErrorCode,
    message: string,
    originalError: unknown,
    context: Record<string, unknown> = {}
  ): CodingError {
    const suggestions: string[] = [];
    const details: Record<string, unknown> = { ...context };

    if (originalError instanceof Error) {
      details.originalMessage = originalError.message;
      details.stack = originalError.stack;
    }

    // Add context-specific suggestions
    switch (code) {
      case 'GIT_OPERATION_FAILED':
        suggestions.push(
          'Check your internet connection',
          'Verify GitHub token has necessary permissions',
          'Ensure the repository exists and is accessible',
          'Try again in a few minutes if rate limited'
        );
        break;

      case 'CODE_GENERATION_FAILED':
        suggestions.push(
          'Simplify your prompt and try again',
          'Check if the repository structure is valid',
          'Ensure the project context is accessible',
          'Try breaking down complex requests into smaller parts'
        );
        break;

      case 'PR_CREATION_FAILED':
        suggestions.push(
          'Check if a similar PR already exists',
          'Verify the branch has commits to create a PR',
          'Ensure you have write permissions to create PRs',
          'Check if the base branch exists'
        );
        break;

      case 'AUTHENTICATION_FAILED':
        suggestions.push(
          'Verify your GitHub token is valid and not expired',
          'Check that the token has the required scopes',
          'Ensure the token has access to the target repository',
          'Try regenerating your GitHub personal access token'
        );
        break;

      default:
        suggestions.push(
          'Check the error details for more information',
          'Try the operation again',
          'Contact support if the issue persists'
        );
    }

    return createCodingError(code, message, details, suggestions);
  }

  /**
   * Circuit breaker pattern for external service calls
   */
  private circuitBreakers = new Map<
    string,
    {
      failures: number;
      lastFailure: number;
      state: 'closed' | 'open' | 'half-open';
    }
  >();

  private async callWithCircuitBreaker<T>(
    serviceKey: string,
    operation: () => Promise<T>,
    failureThreshold = 5,
    timeout = 60000 // 1 minute
  ): Promise<T> {
    const breaker = this.circuitBreakers.get(serviceKey) || {
      failures: 0,
      lastFailure: 0,
      state: 'closed' as const,
    };

    const now = Date.now();

    // Check if circuit breaker should reset
    if (breaker.state === 'open' && now - breaker.lastFailure > timeout) {
      breaker.state = 'half-open';
      breaker.failures = 0;
    }

    // Reject if circuit is open
    if (breaker.state === 'open') {
      throw createCodingError(
        'GIT_OPERATION_FAILED',
        `Service ${serviceKey} is temporarily unavailable (circuit breaker open)`,
        { serviceKey, failures: breaker.failures },
        [
          `Wait ${Math.ceil((timeout - (now - breaker.lastFailure)) / 1000)} seconds before retrying`,
          'Check service status',
          'Try alternative approaches',
        ]
      );
    }

    try {
      const result = await operation();

      // Reset on success
      if (breaker.state === 'half-open') {
        breaker.state = 'closed';
        breaker.failures = 0;
      }

      this.circuitBreakers.set(serviceKey, breaker);
      return result;
    } catch (error) {
      breaker.failures++;
      breaker.lastFailure = now;

      if (breaker.failures >= failureThreshold) {
        breaker.state = 'open';
      }

      this.circuitBreakers.set(serviceKey, breaker);
      throw error;
    }
  }
}

// Factory function for creating the coding agent (following the project pattern)
export const createCodingAgent = async (
  getGithubMcp: () => Promise<unknown>,
  getSandboxManager: () => Promise<unknown>
): Promise<CodingAgent> => {
  return new CodingAgent(await getGithubMcp(), await getSandboxManager());
};
