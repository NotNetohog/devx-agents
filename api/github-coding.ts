import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { codingAgent } from '../src/agents/coding-agent-ai';

// Request validation schema for API endpoint (no GitHub token required in body)
const apiRequestSchema = z.object({
  prompt: z.string().min(10, 'Prompt must be at least 10 characters'),
  repositoryUrl: z.string().url('Must be a valid repository URL'),
  baseBranch: z.string().optional().default('main'),
  context: z.string().optional(),
});

// Response logging interface
interface RequestLog {
  timestamp: string;
  method: string;
  url: string;
  userAgent?: string;
  ip?: string;
  prompt: string;
  repositoryUrl: string;
  success: boolean;
  duration: number;
  error?: string;
}

// Concurrent request management
interface ActiveRequest {
  id: string;
  repositoryUrl: string;
  startTime: number;
  ip: string;
}

// Global state for request management
const activeRequests = new Map<string, ActiveRequest>();
const requestQueue: Array<() => Promise<void>> = [];
const MAX_CONCURRENT_REQUESTS = 5;
const MAX_REQUESTS_PER_IP = 2;
const REQUEST_TIMEOUT = 5 * 60 * 1000; // 5 minutes

/**
 * GitHub Coding Agent API Endpoint
 * Accepts coding requests and returns pull request URLs
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const startTime = Date.now();
  const requestId = generateRequestId();
  const clientIp =
    (req.headers['x-forwarded-for'] as string) ||
    req.connection?.remoteAddress ||
    'unknown';

  let requestLog: Partial<RequestLog> = {
    timestamp: new Date().toISOString(),
    method: req.method || 'UNKNOWN',
    url: req.url || '',
    userAgent: req.headers['user-agent'],
    ip: clientIp,
  };

  try {
    // Validate request method
    if (req.method !== 'POST') {
      res.status(405).json({
        success: false,
        error: 'Method not allowed. Use POST.',
        code: 'METHOD_NOT_ALLOWED',
      });
      return;
    }

    // Check concurrent request limits
    const concurrencyCheck = checkConcurrentRequests(clientIp);
    if (!concurrencyCheck.allowed) {
      res.status(429).json({
        success: false,
        error: concurrencyCheck.reason,
        code: 'TOO_MANY_REQUESTS',
        suggestions: [
          'Wait for existing requests to complete',
          'Reduce the number of concurrent requests',
          'Try again in a few minutes',
        ],
        meta: {
          activeRequests: concurrencyCheck.activeCount,
          maxAllowed: concurrencyCheck.maxAllowed,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // Get GitHub token from environment
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken || githubToken.length < 10) {
      res.status(500).json({
        success: false,
        error: 'GitHub token not configured on server',
        code: 'AUTHENTICATION_FAILED',
        suggestions: [
          'Contact the administrator to configure GITHUB_TOKEN environment variable',
          'Ensure the server has a valid GitHub personal access token',
        ],
      });
      return;
    }

    // Validate and sanitize request body
    const validatedData = apiRequestSchema.parse(req.body);

    // Add to request log
    requestLog.prompt = validatedData.prompt.substring(0, 100); // Truncate for logging
    requestLog.repositoryUrl = validatedData.repositoryUrl;

    // Input sanitization
    const sanitizedRequest = {
      prompt: sanitizeInput(validatedData.prompt),
      repositoryUrl: validatedData.repositoryUrl,
      baseBranch: validatedData.baseBranch,
      context: validatedData.context
        ? sanitizeInput(validatedData.context)
        : undefined,
    };

    // Register active request
    registerActiveRequest(requestId, validatedData.repositoryUrl, clientIp);

    let result;
    try {
      // Process the coding request using the AI-powered coding agent
      result = await codingAgent(sanitizedRequest);

      // Unregister request on completion
      unregisterActiveRequest(requestId);
    } catch (processingError) {
      // Unregister request on error
      unregisterActiveRequest(requestId);
      throw processingError;
    }

    // Calculate duration
    const duration = Date.now() - startTime;
    requestLog.duration = duration;
    requestLog.success = result.success;

    if (result.success) {
      // Log successful request
      logRequest({ ...requestLog, success: true } as RequestLog);

      res.status(200).json({
        success: true,
        data: {
          pullRequestUrl: result.pullRequestUrl,
          branchName: result.branchName,
          summary: result.summary,
        },
        meta: {
          duration,
          timestamp: new Date().toISOString(),
        },
      });
    } else {
      // Log failed request
      requestLog.error = result.error;
      logRequest({ ...requestLog, success: false } as RequestLog);

      res.status(400).json({
        success: false,
        error: result.error,
        code: 'CODING_REQUEST_FAILED',
        meta: {
          duration,
          timestamp: new Date().toISOString(),
        },
      });
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    requestLog.duration = duration;
    requestLog.success = false;

    if (error instanceof z.ZodError) {
      requestLog.error = 'Validation failed';
      logRequest({ ...requestLog, success: false } as RequestLog);

      res.status(400).json({
        success: false,
        error: 'Invalid request format',
        code: 'VALIDATION_ERROR',
        details: error.errors,
        suggestions: [
          'Check that all required fields are provided',
          'Ensure prompt is at least 10 characters',
          'Verify repository URL is valid',
          'Provide a valid GitHub token',
        ],
        meta: {
          duration,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // Handle other errors
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';
    requestLog.error = errorMessage;
    logRequest({ ...requestLog, success: false } as RequestLog);

    console.error('API Error:', error);

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      suggestions: [
        'Try again in a few moments',
        'Check if the repository is accessible',
        'Verify your GitHub token permissions',
      ],
      meta: {
        duration,
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Sanitize input to prevent injection attacks
 */
function sanitizeInput(input: string): string {
  // Remove potentially dangerous characters and patterns
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
    .substring(0, 10000); // Limit length
}

/**
 * Log request for monitoring and debugging
 */
function logRequest(log: RequestLog): void {
  // In production, this would send to a logging service
  console.log('API Request:', {
    timestamp: log.timestamp,
    method: log.method,
    prompt: log.prompt,
    repository: log.repositoryUrl,
    success: log.success,
    duration: `${log.duration}ms`,
    error: log.error,
    ip: log.ip,
    userAgent: log.userAgent?.substring(0, 100),
  });
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Check concurrent request limits
 */
function checkConcurrentRequests(clientIp: string): {
  allowed: boolean;
  reason?: string;
  activeCount: number;
  maxAllowed: number;
} {
  // Clean up expired requests
  cleanupExpiredRequests();

  const totalActive = activeRequests.size;
  const ipActive = Array.from(activeRequests.values()).filter(
    (req) => req.ip === clientIp
  ).length;

  // Check global concurrent limit
  if (totalActive >= MAX_CONCURRENT_REQUESTS) {
    return {
      allowed: false,
      reason: `Too many concurrent requests. Maximum ${MAX_CONCURRENT_REQUESTS} allowed globally.`,
      activeCount: totalActive,
      maxAllowed: MAX_CONCURRENT_REQUESTS,
    };
  }

  // Check per-IP limit
  if (ipActive >= MAX_REQUESTS_PER_IP) {
    return {
      allowed: false,
      reason: `Too many concurrent requests from your IP. Maximum ${MAX_REQUESTS_PER_IP} allowed per IP.`,
      activeCount: ipActive,
      maxAllowed: MAX_REQUESTS_PER_IP,
    };
  }

  return {
    allowed: true,
    activeCount: totalActive,
    maxAllowed: MAX_CONCURRENT_REQUESTS,
  };
}

/**
 * Register active request
 */
function registerActiveRequest(
  requestId: string,
  repositoryUrl: string,
  clientIp: string
): void {
  activeRequests.set(requestId, {
    id: requestId,
    repositoryUrl,
    startTime: Date.now(),
    ip: clientIp,
  });
}

/**
 * Unregister active request
 */
function unregisterActiveRequest(requestId: string): void {
  activeRequests.delete(requestId);
}

/**
 * Clean up expired requests
 */
function cleanupExpiredRequests(): void {
  const now = Date.now();
  for (const [requestId, request] of activeRequests.entries()) {
    if (now - request.startTime > REQUEST_TIMEOUT) {
      activeRequests.delete(requestId);
    }
  }
}

/**
 * Check for branch name conflicts across concurrent requests
 */
function checkBranchConflicts(
  repositoryUrl: string,
  branchName: string
): boolean {
  for (const request of activeRequests.values()) {
    if (request.repositoryUrl === repositoryUrl) {
      // There's already an active request for this repository
      // This could potentially cause branch conflicts
      return true;
    }
  }
  return false;
}

/**
 * Rate limiting middleware (placeholder)
 * TODO: Implement actual rate limiting
 */
function checkRateLimit(ip: string): boolean {
  // Mock implementation - always allow for now
  // In production, implement proper rate limiting
  return true;
}

/**
 * Validate GitHub token permissions (placeholder)
 * TODO: Implement actual token validation
 */
async function validateGitHubToken(
  token: string,
  repositoryUrl: string
): Promise<boolean> {
  // Mock implementation - always valid for now
  // In production, validate token has necessary permissions for the repository
  return token.length > 10;
}
