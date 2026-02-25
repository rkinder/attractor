/**
 * Advanced Usage Tracking and Cost Monitoring for Kilo Gateway
 * 
 * Provides detailed tracking of model usage, costs, performance metrics,
 * and workflow analytics for optimization and budgeting.
 */

import fs from 'fs/promises';
import path from 'path';
import { KiloModels } from '../llm/adapters/kilo.js';

export class UsageTracker {
  constructor(options = {}) {
    this.trackingEnabled = options.trackingEnabled !== false;
    this.persistPath = options.persistPath || './logs/usage-tracking.json';
    this.sessionId = options.sessionId || `session-${Date.now()}`;
    
    // Usage data
    this.usage = {
      sessions: new Map(),
      models: new Map(),
      workflows: new Map(),
      daily: new Map(),
      total: {
        requests: 0,
        tokens: { input: 0, output: 0, total: 0 },
        cost: 0,
        duration: 0
      }
    };
    
    // Cost estimates (USD per 1K tokens)
    this.costEstimates = {
      [KiloModels.openai.gpt4oMini]: { input: 0.00015, output: 0.0006 },
      [KiloModels.openai.gpt4o]: { input: 0.0025, output: 0.01 },
      [KiloModels.claude.haiku]: { input: 0.00025, output: 0.00125 },
      [KiloModels.claude.sonnet]: { input: 0.003, output: 0.015 },
      [KiloModels.claude.opus]: { input: 0.015, output: 0.075 },
      [KiloModels.google.gemini3Flash]: { input: 0.00035, output: 0.00105 },
      [KiloModels.google.gemini3Pro]: { input: 0.00125, output: 0.005 }
    };
    
    this.currentSession = {
      id: this.sessionId,
      startTime: Date.now(),
      requests: [],
      totalCost: 0,
      totalTokens: { input: 0, output: 0 }
    };
  }

  async initialize() {
    if (!this.trackingEnabled) return;
    
    try {
      // Load existing usage data if available
      const existingData = await fs.readFile(this.persistPath, 'utf8');
      const parsed = JSON.parse(existingData);
      
      // Restore Maps from serialized data
      this.usage.sessions = new Map(parsed.sessions || []);
      this.usage.models = new Map(parsed.models || []);
      this.usage.workflows = new Map(parsed.workflows || []);
      this.usage.daily = new Map(parsed.daily || []);
      this.usage.total = parsed.total || this.usage.total;
      
      console.log('📊 Usage tracking initialized with existing data');
    } catch (error) {
      // No existing data, start fresh
      console.log('📊 Usage tracking initialized (new session)');
    }
  }

  /**
   * Track a model request with token usage and cost
   */
  trackRequest(requestInfo) {
    if (!this.trackingEnabled) return;
    
    const {
      model,
      nodeId,
      workflowId,
      inputTokens = 0,
      outputTokens = 0,
      duration = 0,
      success = true,
      error = null
    } = requestInfo;
    
    const timestamp = Date.now();
    const totalTokens = inputTokens + outputTokens;
    const cost = this._calculateCost(model, inputTokens, outputTokens);
    const dateKey = this._getDayKey(timestamp);
    
    // Create request record
    const request = {
      timestamp,
      model,
      nodeId,
      workflowId,
      tokens: { input: inputTokens, output: outputTokens, total: totalTokens },
      cost,
      duration,
      success,
      error
    };
    
    // Track in current session
    this.currentSession.requests.push(request);
    this.currentSession.totalCost += cost;
    this.currentSession.totalTokens.input += inputTokens;
    this.currentSession.totalTokens.output += outputTokens;
    
    // Update model usage
    const modelUsage = this.usage.models.get(model) || {
      requests: 0,
      tokens: { input: 0, output: 0, total: 0 },
      cost: 0,
      avgDuration: 0,
      successRate: 0,
      errors: []
    };
    
    modelUsage.requests++;
    modelUsage.tokens.input += inputTokens;
    modelUsage.tokens.output += outputTokens;
    modelUsage.tokens.total += totalTokens;
    modelUsage.cost += cost;
    modelUsage.avgDuration = (modelUsage.avgDuration * (modelUsage.requests - 1) + duration) / modelUsage.requests;
    modelUsage.successRate = this._calculateSuccessRate(model);
    
    if (!success && error) {
      modelUsage.errors.push({ timestamp, error: error.substring(0, 200) });
    }
    
    this.usage.models.set(model, modelUsage);
    
    // Update workflow usage
    if (workflowId) {
      const workflowUsage = this.usage.workflows.get(workflowId) || {
        requests: 0,
        nodes: new Set(),
        models: new Set(),
        tokens: { input: 0, output: 0, total: 0 },
        cost: 0,
        duration: 0,
        successRate: 0
      };
      
      workflowUsage.requests++;
      workflowUsage.nodes.add(nodeId);
      workflowUsage.models.add(model);
      workflowUsage.tokens.input += inputTokens;
      workflowUsage.tokens.output += outputTokens;
      workflowUsage.tokens.total += totalTokens;
      workflowUsage.cost += cost;
      workflowUsage.duration += duration;
      
      this.usage.workflows.set(workflowId, workflowUsage);
    }
    
    // Update daily usage
    const dailyUsage = this.usage.daily.get(dateKey) || {
      date: dateKey,
      requests: 0,
      tokens: { input: 0, output: 0, total: 0 },
      cost: 0,
      models: new Set(),
      workflows: new Set()
    };
    
    dailyUsage.requests++;
    dailyUsage.tokens.input += inputTokens;
    dailyUsage.tokens.output += outputTokens;
    dailyUsage.tokens.total += totalTokens;
    dailyUsage.cost += cost;
    dailyUsage.models.add(model);
    if (workflowId) dailyUsage.workflows.add(workflowId);
    
    this.usage.daily.set(dateKey, dailyUsage);
    
    // Update totals
    this.usage.total.requests++;
    this.usage.total.tokens.input += inputTokens;
    this.usage.total.tokens.output += outputTokens;
    this.usage.total.tokens.total += totalTokens;
    this.usage.total.cost += cost;
    this.usage.total.duration += duration;
  }

  /**
   * Get usage statistics
   */
  getStats(type = 'session') {
    switch (type) {
      case 'session':
        return this._getSessionStats();
      case 'models':
        return this._getModelStats();
      case 'workflows':
        return this._getWorkflowStats();
      case 'daily':
        return this._getDailyStats();
      case 'total':
        return this.usage.total;
      default:
        return this._getAllStats();
    }
  }

  /**
   * Get cost breakdown by model
   */
  getCostBreakdown() {
    const breakdown = [];
    
    for (const [model, usage] of this.usage.models) {
      breakdown.push({
        model,
        cost: usage.cost,
        requests: usage.requests,
        tokens: usage.tokens.total,
        avgCostPerRequest: usage.cost / usage.requests,
        avgCostPer1KTokens: (usage.cost / usage.tokens.total) * 1000,
        successRate: usage.successRate
      });
    }
    
    return breakdown.sort((a, b) => b.cost - a.cost);
  }

  /**
   * Check if request would exceed budget
   */
  checkBudget(dailyBudget, estimatedCost = 0) {
    const today = this._getDayKey(Date.now());
    const todayUsage = this.usage.daily.get(today);
    const todayCost = todayUsage ? todayUsage.cost : 0;
    
    return {
      currentCost: todayCost,
      budgetLimit: dailyBudget,
      estimatedCost,
      totalProjected: todayCost + estimatedCost,
      withinBudget: (todayCost + estimatedCost) <= dailyBudget,
      remaining: Math.max(0, dailyBudget - todayCost)
    };
  }

  /**
   * Get efficiency metrics
   */
  getEfficiencyMetrics() {
    const modelPerformance = [];
    
    for (const [model, usage] of this.usage.models) {
      const efficiency = {
        model,
        costEfficiency: usage.tokens.total / usage.cost, // tokens per dollar
        timeEfficiency: usage.tokens.total / (usage.avgDuration / 1000), // tokens per second
        reliability: usage.successRate,
        avgResponseTime: usage.avgDuration,
        score: this._calculateEfficiencyScore(usage)
      };
      
      modelPerformance.push(efficiency);
    }
    
    return modelPerformance.sort((a, b) => b.score - a.score);
  }

  /**
   * Persist usage data to disk
   */
  async persist() {
    if (!this.trackingEnabled) return;
    
    try {
      // End current session
      this.currentSession.endTime = Date.now();
      this.currentSession.duration = this.currentSession.endTime - this.currentSession.startTime;
      
      // Store session
      this.usage.sessions.set(this.sessionId, { ...this.currentSession });
      
      // Prepare data for serialization (convert Maps to arrays)
      const dataToSave = {
        sessions: Array.from(this.usage.sessions.entries()),
        models: Array.from(this.usage.models.entries()),
        workflows: Array.from(this.usage.workflows.entries()),
        daily: Array.from(this.usage.daily.entries()),
        total: this.usage.total,
        lastUpdated: new Date().toISOString()
      };
      
      // Ensure directory exists
      await fs.mkdir(path.dirname(this.persistPath), { recursive: true });
      
      // Write to file
      await fs.writeFile(this.persistPath, JSON.stringify(dataToSave, null, 2));
      
      console.log(`💾 Usage data persisted to ${this.persistPath}`);
    } catch (error) {
      console.warn(`⚠️ Failed to persist usage data: ${error.message}`);
    }
  }

  _calculateCost(model, inputTokens, outputTokens) {
    const rates = this.costEstimates[model];
    if (!rates) return 0;
    
    const inputCost = (inputTokens / 1000) * rates.input;
    const outputCost = (outputTokens / 1000) * rates.output;
    return inputCost + outputCost;
  }

  _calculateSuccessRate(model) {
    const requests = this.currentSession.requests.filter(r => r.model === model);
    if (requests.length === 0) return 100;
    
    const successful = requests.filter(r => r.success).length;
    return (successful / requests.length) * 100;
  }

  _calculateEfficiencyScore(usage) {
    // Composite score: cost efficiency (40%) + time efficiency (30%) + reliability (30%)
    const costScore = Math.min(100, (usage.tokens.total / usage.cost) * 10);
    const timeScore = Math.min(100, (usage.tokens.total / (usage.avgDuration / 1000)) / 100);
    const reliabilityScore = usage.successRate;
    
    return (costScore * 0.4) + (timeScore * 0.3) + (reliabilityScore * 0.3);
  }

  _getDayKey(timestamp) {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  _getSessionStats() {
    return {
      id: this.sessionId,
      duration: Date.now() - this.currentSession.startTime,
      requests: this.currentSession.requests.length,
      tokens: this.currentSession.totalTokens,
      cost: this.currentSession.totalCost,
      models: [...new Set(this.currentSession.requests.map(r => r.model))],
      successRate: this._calculateSuccessRate()
    };
  }

  _getModelStats() {
    return Array.from(this.usage.models.entries()).map(([model, stats]) => ({
      model,
      ...stats,
      nodes: stats.nodes ? [...stats.nodes] : undefined,
      models: stats.models ? [...stats.models] : undefined
    }));
  }

  _getWorkflowStats() {
    return Array.from(this.usage.workflows.entries()).map(([workflow, stats]) => ({
      workflow,
      ...stats,
      nodes: [...stats.nodes],
      models: [...stats.models]
    }));
  }

  _getDailyStats() {
    return Array.from(this.usage.daily.entries()).map(([date, stats]) => ({
      date,
      ...stats,
      models: [...stats.models],
      workflows: [...stats.workflows]
    }));
  }

  _getAllStats() {
    return {
      session: this._getSessionStats(),
      models: this._getModelStats(),
      workflows: this._getWorkflowStats(),
      daily: this._getDailyStats(),
      total: this.usage.total
    };
  }
}

/**
 * Usage report generator
 */
export class UsageReporter {
  constructor(tracker) {
    this.tracker = tracker;
  }

  async generateReport(outputPath = null) {
    const stats = this.tracker.getStats('all');
    const costBreakdown = this.tracker.getCostBreakdown();
    const efficiency = this.tracker.getEfficiencyMetrics();
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: this._generateSummary(stats),
      costAnalysis: this._generateCostAnalysis(costBreakdown),
      modelPerformance: efficiency,
      recommendations: this._generateRecommendations(efficiency, costBreakdown),
      rawData: stats
    };
    
    if (outputPath) {
      await fs.writeFile(outputPath, JSON.stringify(report, null, 2));
      console.log(`📋 Usage report generated: ${outputPath}`);
    }
    
    return report;
  }

  _generateSummary(stats) {
    return {
      totalRequests: stats.total.requests,
      totalCost: `$${stats.total.cost.toFixed(4)}`,
      totalTokens: stats.total.tokens.total.toLocaleString(),
      avgCostPerRequest: `$${(stats.total.cost / stats.total.requests).toFixed(6)}`,
      avgCostPer1KTokens: `$${((stats.total.cost / stats.total.tokens.total) * 1000).toFixed(4)}`,
      modelsUsed: stats.models.length,
      workflowsRun: stats.workflows.length
    };
  }

  _generateCostAnalysis(costBreakdown) {
    const topCostModels = costBreakdown.slice(0, 3);
    const totalCost = costBreakdown.reduce((sum, model) => sum + model.cost, 0);
    
    return {
      topCostModels,
      costDistribution: costBreakdown.map(model => ({
        model: model.model,
        percentage: ((model.cost / totalCost) * 100).toFixed(1)
      }))
    };
  }

  _generateRecommendations(efficiency, costBreakdown) {
    const recommendations = [];
    
    // Efficiency recommendations
    const inefficientModels = efficiency.filter(e => e.score < 50);
    if (inefficientModels.length > 0) {
      recommendations.push({
        type: 'efficiency',
        message: `Consider replacing ${inefficientModels.map(m => m.model).join(', ')} with more efficient alternatives`,
        impact: 'medium'
      });
    }
    
    // Cost optimization recommendations
    const expensiveModels = costBreakdown.filter(m => m.avgCostPer1KTokens > 0.01);
    if (expensiveModels.length > 0) {
      recommendations.push({
        type: 'cost',
        message: `High-cost models detected. Consider using cheaper alternatives for non-critical tasks`,
        impact: 'high'
      });
    }
    
    return recommendations;
  }
}