/**
 * Smart Model Routing for Kilo Gateway Integration
 * 
 * Automatically selects optimal models based on task type, complexity, and cost considerations
 */

import { KiloModels } from './adapters/kilo.js';

export class ModelRouter {
  constructor(options = {}) {
    this.config = options.config || 'balanced';
    this.costBudget = options.costBudget || null; // Daily budget in USD
    this.fallbackStrategy = options.fallbackStrategy || 'cheaper';
    this.customStrategies = options.customStrategies || {};
    
    // Task complexity scoring for model selection
    this.complexityThresholds = {
      low: 0.3,     // Simple tasks - use cheaper models
      medium: 0.7,  // Moderate tasks - use balanced models  
      high: 1.0     // Complex tasks - use premium models
    };
    
    // Cost estimates per 1k tokens (approximations)
    this.modelCosts = {
      [KiloModels.openai.gpt4oMini]: { input: 0.00015, output: 0.0006 },
      [KiloModels.openai.gpt4o]: { input: 0.0025, output: 0.01 },
      [KiloModels.claude.sonnet]: { input: 0.003, output: 0.015 },
      [KiloModels.claude.opus]: { input: 0.015, output: 0.075 },
      [KiloModels.claude.haiku]: { input: 0.00025, output: 0.00125 }
    };
  }

  /**
   * Select optimal model based on task characteristics
   */
  selectModel(taskInfo) {
    const {
      taskType = 'general',
      complexity = 'medium',
      priority = 'normal',
      maxCost = null,
      contextLength = 0,
      requiresReasoning = false,
      requiresCreativity = false
    } = taskInfo;

    // Check for custom strategy first
    if (this.customStrategies[taskType]) {
      return this.customStrategies[taskType];
    }

    // Calculate complexity score
    const complexityScore = this._calculateComplexityScore({
      contextLength,
      requiresReasoning,
      requiresCreativity,
      complexity
    });

    // Select model tier based on complexity and priority
    const modelTier = this._selectModelTier(complexityScore, priority, maxCost);
    
    // Get specific model for task type and tier
    return this._getModelForTaskAndTier(taskType, modelTier);
  }

  /**
   * Get recommended models for different workflow stages
   */
  getWorkflowModelStrategy(workflowType) {
    const strategies = {
      'code_analysis': {
        'structure_analysis': KiloModels.claude.sonnet,
        'security_review': KiloModels.claude.opus,
        'performance_analysis': KiloModels.claude.sonnet,
        'test_coverage': KiloModels.openai.gpt4o,
        'report_generation': KiloModels.openai.gpt4o
      },
      
      'documentation': {
        'code_analysis': KiloModels.claude.sonnet,
        'readme_generation': KiloModels.openai.gpt4o,
        'api_documentation': KiloModels.openai.gpt4o,
        'tutorial_creation': KiloModels.openai.gpt4o,
        'final_review': KiloModels.openai.gpt4oMini
      },
      
      'testing': {
        'test_planning': KiloModels.claude.sonnet,
        'test_generation': KiloModels.openai.gpt4o,
        'coverage_analysis': KiloModels.openai.gpt4o,
        'failure_diagnosis': KiloModels.claude.sonnet,
        'fix_suggestions': KiloModels.claude.sonnet
      },
      
      'development': {
        'feature_planning': KiloModels.openai.gpt4o,
        'implementation': KiloModels.claude.sonnet,
        'code_review': KiloModels.claude.opus,
        'testing': KiloModels.openai.gpt4o,
        'documentation': KiloModels.openai.gpt4o,
        'deployment_planning': KiloModels.openai.gpt4oMini
      }
    };

    return strategies[workflowType] || strategies['code_analysis'];
  }

  /**
   * Estimate cost for a task
   */
  estimateCost(model, inputTokens, outputTokens) {
    const costs = this.modelCosts[model];
    if (!costs) {
      return { estimated: 0, warning: 'Unknown model cost' };
    }

    const inputCost = (inputTokens / 1000) * costs.input;
    const outputCost = (outputTokens / 1000) * costs.output;
    const total = inputCost + outputCost;

    return {
      estimated: total,
      breakdown: { inputCost, outputCost },
      currency: 'USD'
    };
  }

  /**
   * Get fallback model if primary fails
   */
  getFallbackModel(primaryModel, reason = 'error') {
    const fallbackMaps = {
      // Premium models fall back to balanced
      [KiloModels.claude.opus]: KiloModels.claude.sonnet,
      [KiloModels.openai.gpt4o]: KiloModels.openai.gpt4oMini,
      
      // Balanced models fall back to budget
      [KiloModels.claude.sonnet]: KiloModels.claude.haiku,
      [KiloModels.openai.gpt4oMini]: KiloModels.claude.haiku,
      
      // Budget models have no fallback
      [KiloModels.claude.haiku]: null
    };

    return fallbackMaps[primaryModel] || KiloModels.openai.gpt4oMini;
  }

  _calculateComplexityScore(factors) {
    let score = 0;

    // Base complexity
    const complexityMap = { low: 0.2, medium: 0.5, high: 0.8 };
    score += complexityMap[factors.complexity] || 0.5;

    // Context length factor
    if (factors.contextLength > 100000) score += 0.3;
    else if (factors.contextLength > 50000) score += 0.2;
    else if (factors.contextLength > 10000) score += 0.1;

    // Reasoning requirement
    if (factors.requiresReasoning) score += 0.2;

    // Creativity requirement  
    if (factors.requiresCreativity) score += 0.1;

    return Math.min(score, 1.0);
  }

  _selectModelTier(complexityScore, priority, maxCost) {
    // Budget constraints override complexity
    if (maxCost && maxCost < 0.001) return 'budget';
    
    // High priority tasks get premium models
    if (priority === 'high' && complexityScore > this.complexityThresholds.medium) {
      return 'premium';
    }
    
    // Medium complexity and normal priority
    if (complexityScore > this.complexityThresholds.high) return 'premium';
    if (complexityScore > this.complexityThresholds.medium) return 'balanced';
    
    return 'budget';
  }

  _getModelForTaskAndTier(taskType, tier) {
    const tierMaps = {
      budget: {
        code_analysis: KiloModels.claude.haiku,
        documentation: KiloModels.openai.gpt4oMini,
        security_review: KiloModels.openai.gpt4oMini, // Security still needs decent model
        default: KiloModels.openai.gpt4oMini
      },
      
      balanced: {
        code_analysis: KiloModels.claude.sonnet,
        documentation: KiloModels.openai.gpt4o,
        security_review: KiloModels.claude.sonnet,
        performance_analysis: KiloModels.claude.sonnet,
        default: KiloModels.claude.sonnet
      },
      
      premium: {
        code_analysis: KiloModels.claude.opus,
        documentation: KiloModels.openai.gpt4o,
        security_review: KiloModels.claude.opus,
        performance_analysis: KiloModels.claude.opus,
        default: KiloModels.claude.opus
      }
    };

    const tierMap = tierMaps[tier] || tierMaps.balanced;
    return tierMap[taskType] || tierMap.default;
  }
}

/**
 * Utility function to create a model router with predefined configurations
 */
export function createModelRouter(config = 'balanced', options = {}) {
  const configs = {
    budget: {
      config: 'budget',
      costBudget: 1.0, // $1 per day
      fallbackStrategy: 'cheaper'
    },
    
    balanced: {
      config: 'balanced', 
      costBudget: 10.0, // $10 per day
      fallbackStrategy: 'balanced'
    },
    
    performance: {
      config: 'performance',
      costBudget: null, // No budget limit
      fallbackStrategy: 'maintain_quality'
    }
  };

  const selectedConfig = configs[config] || configs.balanced;
  return new ModelRouter({ ...selectedConfig, ...options });
}

/**
 * Context hints for automatic model selection in workflows
 */
export const TaskHints = {
  CODE_ANALYSIS: 'code_analysis',
  SECURITY_REVIEW: 'security_review', 
  DOCUMENTATION: 'documentation',
  TEST_GENERATION: 'test_generation',
  PERFORMANCE_ANALYSIS: 'performance_analysis',
  QUICK_TASK: 'quick_tasks',
  CREATIVE_WRITING: 'creative_writing',
  REASONING: 'complex_reasoning'
};