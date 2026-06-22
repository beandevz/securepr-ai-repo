/**
 * Custom exception hierarchy for SecurePR AI.
 */

export class SecurePRError extends Error {
  public details: Record<string, unknown>;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'SecurePRError';
    this.details = details || {};
  }
}

export class ConfigurationError extends SecurePRError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
    this.name = 'ConfigurationError';
  }
}

export class LlmProviderError extends SecurePRError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
    this.name = 'LlmProviderError';
  }
}

export class VCSIntegrationError extends SecurePRError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
    this.name = 'VCSIntegrationError';
  }
}

export class QueueError extends SecurePRError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
    this.name = 'QueueError';
  }
}

export class RagError extends SecurePRError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
    this.name = 'RagError';
  }
}

export class PipelineError extends SecurePRError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
    this.name = 'PipelineError';
  }
}

export class ValidationError extends SecurePRError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
    this.name = 'ValidationError';
  }
}

export class WebhookError extends SecurePRError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
    this.name = 'WebhookError';
  }
}
