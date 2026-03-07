/**
 * Attractor Error Hierarchy
 * 
 * Provides structured error handling for the pipeline with specific error types
 * for different failure modes.
 */

export class AttractorError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = options.code || 'ATTACTOR_ERROR';
    this.details = options.details || null;
    this.timestamp = new Date().toISOString();
    
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

export class ValidationError extends AttractorError {
  constructor(message, options = {}) {
    super(message, { ...options, code: 'VALIDATION_ERROR' });
    this.field = options.field || null;
  }
}

export class WorkflowError extends AttractorError {
  constructor(message, options = {}) {
    super(message, { ...options, code: 'WORKFLOW_ERROR' });
    this.workflow = options.workflow || null;
    this.nodeId = options.nodeId || null;
  }
}

export class ExecutionError extends AttractorError {
  constructor(message, options = {}) {
    super(message, { ...options, code: 'EXECUTION_ERROR' });
    this.nodeId = options.nodeId || null;
    this.handler = options.handler || null;
  }
}

export class LLMError extends AttractorError {
  constructor(message, options = {}) {
    super(message, { ...options, code: 'LLM_ERROR' });
    this.provider = options.provider || null;
    this.model = options.model || null;
    this.statusCode = options.statusCode || null;
  }
}

export class ProviderError extends LLMError {
  constructor(message, options = {}) {
    super(message, { ...options, code: 'PROVIDER_ERROR' });
  }
}

export class TimeoutError extends AttractorError {
  constructor(message, options = {}) {
    super(message, { ...options, code: 'TIMEOUT_ERROR' });
    this.timeout = options.timeout || null;
    this.operation = options.operation || null;
  }
}

export class CheckpointError extends AttractorError {
  constructor(message, options = {}) {
    super(message, { ...options, code: 'CHECKPOINT_ERROR' });
    this.runId = options.runId || null;
  }
}

export class HandlerError extends AttractorError {
  constructor(message, options = {}) {
    super(message, { ...options, code: 'HANDLER_ERROR' });
    this.handler = options.handler || null;
    this.nodeId = options.nodeId || null;
  }
}

export class ConfigurationError extends AttractorError {
  constructor(message, options = {}) {
    super(message, { ...options, code: 'CONFIGURATION_ERROR' });
    this.configKey = options.configKey || null;
  }
}
