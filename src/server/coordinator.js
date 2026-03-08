/**
 * Coordinator Service
 * Listens to pipeline events and determines next actions
 */

import redisStorage from './storage/redis.js';
import config from './config.js';
import { StageStatus } from '../pipeline/outcome.js';

export const DecisionType = {
  TRIGGER_NEXT: 'trigger_next',
  REQUEST_HUMAN: 'request_human',
  FAIL: 'fail',
  ARCHIVE: 'archive',
  COMPLETE: 'complete'
};

export const DecisionReason = {
  SUCCESS: 'success',
  FAILURE: 'failure',
  BLOCKED: 'blocked',
  PARTIAL_SUCCESS: 'partial_success',
  AWAITING_CLARIFICATION: 'awaiting_clarification',
  AWAITING_APPROVAL: 'awaiting_approval'
};

class CoordinatorService {
  constructor() {
    this.workflowRules = new Map();
    this.pendingQuestions = new Map();
    this.eventEmitter = null;
    this.enabled = config.getCoordinator().enabled;
  }

  setEventEmitter(emitter) {
    this.eventEmitter = emitter;
  }

  registerWorkflowRule(workflowId, rule) {
    this.workflowRules.set(workflowId, rule);
  }

  async onPipelineComplete(pipelineId, result) {
    if (!this.enabled) {
      return null;
    }

    const decision = await this._makeDecision(pipelineId, result);
    
    await this._recordDecision(pipelineId, decision);
    
    if (this.eventEmitter) {
      this._broadcastDecision(decision);
    }

    return decision;
  }

  async onPipelineError(pipelineId, error) {
    if (!this.enabled) {
      return null;
    }

    const decision = {
      type: DecisionType.FAIL,
      reason: DecisionReason.FAILURE,
      pipelineId,
      error: error.message || String(error),
      timestamp: new Date().toISOString()
    };

    await this._recordDecision(pipelineId, decision);
    
    if (this.eventEmitter) {
      this._broadcastDecision(decision);
    }

    return decision;
  }

  async _makeDecision(pipelineId, result) {
    const state = await redisStorage.getPipelineState(pipelineId);
    const workflowId = state?.workflowId || 'default';
    
    const rule = this.workflowRules.get(workflowId);
    
    if (rule) {
      const customDecision = await rule(pipelineId, result, state);
      if (customDecision) {
        return customDecision;
      }
    }

    return this._defaultDecision(pipelineId, result, state);
  }

  _defaultDecision(pipelineId, result, state) {
    const outcome = result?.outcome || result;
    const status = outcome?.status;

    if (status === StageStatus.SUCCESS) {
      return {
        type: DecisionType.COMPLETE,
        reason: DecisionReason.SUCCESS,
        pipelineId,
        outcome,
        timestamp: new Date().toISOString()
      };
    }

    if (status === StageStatus.PARTIAL_SUCCESS) {
      if (state?.awaitingClarification) {
        return {
          type: DecisionType.REQUEST_HUMAN,
          reason: DecisionReason.AWAITING_CLARIFICATION,
          pipelineId,
          question: state.pendingQuestion,
          timestamp: new Date().toISOString()
        };
      }

      return {
        type: DecisionType.TRIGGER_NEXT,
        reason: DecisionReason.PARTIAL_SUCCESS,
        pipelineId,
        nextWorkflow: state?.nextWorkflow,
        timestamp: new Date().toISOString()
      };
    }

    if (status === StageStatus.FAIL || status === StageStatus.RETRY) {
      return {
        type: DecisionType.FAIL,
        reason: DecisionReason.FAILURE,
        pipelineId,
        failureReason: outcome?.failure_reason,
        timestamp: new Date().toISOString()
      };
    }

    return {
      type: DecisionType.ARCHIVE,
      reason: DecisionReason.BLOCKED,
      pipelineId,
      timestamp: new Date().toISOString()
    };
  }

  async _recordDecision(pipelineId, decision) {
    await redisStorage.addDecision({
      pipelineId,
      ...decision
    });
  }

  _broadcastDecision(decision) {
    this.eventEmitter.emit('coordinator_decision', decision);
    
    if (decision.type === DecisionType.REQUEST_HUMAN) {
      this.eventEmitter.emit('human_request', {
        pipelineId: decision.pipelineId,
        question: decision.question,
        reason: decision.reason
      });
    }

    if (decision.type === DecisionType.TRIGGER_NEXT) {
      this.eventEmitter.emit('workflow_triggered', {
        pipelineId: decision.pipelineId,
        nextWorkflow: decision.nextWorkflow
      });
    }
  }

  async addQuestion(pipelineId, question) {
    if (!this.pendingQuestions.has(pipelineId)) {
      this.pendingQuestions.set(pipelineId, []);
    }
    
    const questionWithId = {
      id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...question,
      stage: question.stage || 'unknown',
      timeout: question.timeout || 300000,
      createdAt: new Date().toISOString()
    };
    
    this.pendingQuestions.get(pipelineId).push(questionWithId);
    
    return questionWithId;
  }

  async getQuestions(pipelineId) {
    return this.pendingQuestions.get(pipelineId) || [];
  }

  async answerQuestion(pipelineId, questionId, answer) {
    const questions = this.pendingQuestions.get(pipelineId) || [];
    const questionIndex = questions.findIndex(q => q.id === questionId);
    
    if (questionIndex === -1) {
      return { success: false, error: 'Question not found' };
    }
    
    questions.splice(questionIndex, 1);
    
    return {
      success: true,
      answer,
      nextAction: 'resume'
    };
  }

  async submitApproval(pipelineId, decision, notes) {
    const decisionMap = {
      'proceed': DecisionType.TRIGGER_NEXT,
      'revise': DecisionType.REQUEST_HUMAN,
      'abort': DecisionType.FAIL
    };

    const decisionRecord = {
      type: decisionMap[decision] || DecisionType.FAIL,
      reason: DecisionReason.AWAITING_APPROVAL,
      pipelineId,
      approvalDecision: decision,
      notes,
      timestamp: new Date().toISOString()
    };

    await this._recordDecision(pipelineId, decisionRecord);
    
    if (this.eventEmitter) {
      this._broadcastDecision(decisionRecord);
    }

    return {
      success: true,
      nextAction: decisionRecord.type
    };
  }

  async addContext(pipelineId, contextUpdates) {
    const state = await redisStorage.getPipelineState(pipelineId);
    
    if (!state) {
      return { success: false, error: 'Pipeline not found' };
    }

    const updatedState = {
      ...state,
      context: {
        ...(state.context || {}),
        ...contextUpdates
      },
      updatedAt: new Date().toISOString()
    };

    const ttl = config.getCoordinator().pipelineStateTTL;
    await redisStorage.setPipelineState(pipelineId, updatedState, ttl);

    return { success: true };
  }

  async getDecisionHistory(pipelineId, limit = 100) {
    const allDecisions = await redisStorage.getDecisions(limit * 2);
    return allDecisions.filter(d => d.pipelineId === pipelineId).slice(0, limit);
  }

  async initializeState(pipelineId, workflowId, initialContext = {}) {
    const state = {
      workflowId,
      status: 'initialized',
      context: initialContext,
      createdAt: new Date().toISOString()
    };

    const ttl = config.getCoordinator().pipelineStateTTL;
    await redisStorage.setPipelineState(pipelineId, state, ttl);
    
    return state;
  }

  async updatePipelineState(pipelineId, updates) {
    const state = await redisStorage.getPipelineState(pipelineId);
    
    if (!state) {
      return null;
    }

    const updatedState = {
      ...state,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    const ttl = config.getCoordinator().pipelineStateTTL;
    await redisStorage.setPipelineState(pipelineId, updatedState, ttl);
    
    return updatedState;
  }
}

export const coordinatorService = new CoordinatorService();
export default coordinatorService;
