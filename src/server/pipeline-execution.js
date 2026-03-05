/**
 * PipelineExecution Model
 * 
 * Represents a single pipeline execution with all metadata
 */

export const PipelineStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

export class PipelineExecution {
  constructor(options = {}) {
    this.id = options.id;
    this.dotSource = options.dotSource || '';
    this.autoApprove = options.autoApprove || false;
    this.gateway = options.gateway || null;
    this.status = PipelineStatus.PENDING;
    this.createdAt = new Date().toISOString();
    this.startedAt = null;
    this.completedAt = null;
    this.outcomeStatus = null;
    this.outcomeNotes = null;
    this.error = null;
    this.cancelled = false;
  }

  toJSON() {
    return {
      pipeline_id: this.id,
      status: this.status,
      created_at: this.createdAt,
      started_at: this.startedAt,
      completed_at: this.completedAt,
      outcome_status: this.outcomeStatus,
      outcome_notes: this.outcomeNotes,
      error: this.error,
      auto_approve: this.autoApprove,
      gateway: this.gateway
    };
  }
}

export default PipelineExecution;
