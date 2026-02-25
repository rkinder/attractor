/**
 * Pipeline Outcome - Result of executing a node handler
 */

export const StageStatus = {
  SUCCESS: 'success',
  PARTIAL_SUCCESS: 'partial_success',
  RETRY: 'retry',
  FAIL: 'fail',
  SKIPPED: 'skipped'
};

export class Outcome {
  constructor(options = {}) {
    this.status = options.status || StageStatus.SUCCESS;
    this.preferred_label = options.preferred_label || '';
    this.suggested_next_ids = options.suggested_next_ids || [];
    this.context_updates = options.context_updates || {};
    this.notes = options.notes || '';
    this.failure_reason = options.failure_reason || '';
  }

  static success(notes = '', contextUpdates = {}) {
    return new Outcome({
      status: StageStatus.SUCCESS,
      notes,
      context_updates: contextUpdates
    });
  }

  static partialSuccess(notes = '', contextUpdates = {}) {
    return new Outcome({
      status: StageStatus.PARTIAL_SUCCESS,
      notes,
      context_updates: contextUpdates
    });
  }

  static retry(reason = '', contextUpdates = {}) {
    return new Outcome({
      status: StageStatus.RETRY,
      failure_reason: reason,
      context_updates: contextUpdates
    });
  }

  static fail(reason = '', contextUpdates = {}) {
    return new Outcome({
      status: StageStatus.FAIL,
      failure_reason: reason,
      context_updates: contextUpdates
    });
  }

  static skipped(notes = '', contextUpdates = {}) {
    return new Outcome({
      status: StageStatus.SKIPPED,
      notes,
      context_updates: contextUpdates
    });
  }

  withPreferredLabel(label) {
    this.preferred_label = label;
    return this;
  }

  withSuggestedNext(nodeIds) {
    this.suggested_next_ids = Array.isArray(nodeIds) ? nodeIds : [nodeIds];
    return this;
  }

  isSuccess() {
    return this.status === StageStatus.SUCCESS || this.status === StageStatus.PARTIAL_SUCCESS;
  }

  isFailed() {
    return this.status === StageStatus.FAIL;
  }

  needsRetry() {
    return this.status === StageStatus.RETRY;
  }

  isSkipped() {
    return this.status === StageStatus.SKIPPED;
  }
}