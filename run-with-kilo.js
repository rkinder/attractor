#!/usr/bin/env node

/**
 * Kilo-Optimized Attractor Workflow Runner
 * 
 * Advanced workflow runner with Kilo Gateway integration, smart model routing,
 * cost tracking, and comprehensive monitoring capabilities.
 */

import { Attractor, createKiloAdapter, createModelRouter, TaskHints } from './src/index.js';
import { Client } from './src/llm/client.js';
import { CodergenHandler, SessionBackend } from './src/handlers/codergen.js';
import { Session, SessionConfig } from './src/agent/session.js';
import path from 'path';
import process from 'process';
import fs from 'fs/promises';

class KiloWorkflowRunner {
  constructor(options = {}) {
    this.options = {
      kiloConfig: options.kiloConfig || 'balanced',
      costBudget: options.costBudget || null,
      enableCostTracking: options.enableCostTracking !== false,
      enableModelRouting: options.enableModelRouting !== false,
      projectPath: options.projectPath || process.cwd(),
      logsRoot: options.logsRoot || './logs',
      verbose: options.verbose || false,
      ...options
    };
    
    this.costTracker = new CostTracker();
    this.modelUsage = new Map();
    this.workflowStats = {
      startTime: null,
      endTime: null,
      totalNodes: 0,
      completedNodes: 0,
      failedNodes: 0,
      totalCost: 0
    };
  }

  static async _loadEnvFile() {
    if (process.env.KILO_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY) {
      return;
    }
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const envPaths = [path.join(process.cwd(), '.env'), path.resolve('.env')];
      for (const envPath of envPaths) {
        try {
          const content = await fs.readFile(envPath, 'utf-8');
          for (const line of content.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const eqIndex = trimmed.indexOf('=');
            if (eqIndex > 0) {
              const key = trimmed.slice(0, eqIndex).trim();
              let value = trimmed.slice(eqIndex + 1).trim();
              if ((value.startsWith('"') && value.endsWith('"')) ||
                  (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
              }
              if (!process.env[key]) process.env[key] = value;
            }
          }
        } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
  }

  async initialize() {
    // Load .env file if present
    await KiloWorkflowRunner._loadEnvFile();
    
    let llmClient = null;
    
    // Check for LM Studio first (local)
    if (process.env.LMSTUDIO_MODEL) {
      console.log('🔧 Initializing LM Studio (local)...');
      const { LMStudioAdapter, createLMStudioAdapter } = await import('./src/llm/adapters/lmstudio.js');
      
      const lmAdapter = createLMStudioAdapter({
        model: process.env.LMSTUDIO_MODEL
      });
      
      try {
        await lmAdapter.initialize();
        llmClient = new Client({
          providers: { lmstudio: lmAdapter },
          default_provider: 'lmstudio'
        });
        console.log('✅ LM Studio initialized successfully');
      } catch (e) {
        console.warn('⚠️  LM Studio not available:', e.message);
      }
    }
    
    // Fall back to Kilo if LM Studio not available
    if (!llmClient && !process.env.KILO_API_KEY) {
      throw new Error('No LLM configured. Set LMSTUDIO_MODEL or KILO_API_KEY in .env');
    }
    
    if (!llmClient) {
      // Validate Kilo API key
      if (!process.env.KILO_API_KEY) {
        throw new Error('KILO_API_KEY environment variable is required. Create a .env file with KILO_API_KEY and KILO_MODEL settings.');
      }

      // Create Kilo adapter with specified configuration
      console.log(`🔧 Initializing Kilo Gateway (${this.options.kiloConfig} configuration)...`);
      
      const kiloAdapter = createKiloAdapter(this.options.kiloConfig, {
        api_key: process.env.KILO_API_KEY,
        organization_id: process.env.KILO_ORG_ID,
        task_id: process.env.KILO_TASK_ID,
        default_model: process.env.KILO_MODEL
      });

      // Create LLM client with Kilo adapter
      llmClient = new Client({
        providers: { kilo: kiloAdapter },
        default_provider: 'kilo'
      });

      await kiloAdapter.initialize();
    }

    // Create model router if enabled
    let modelRouter = null;
    if (this.options.enableModelRouting) {
      modelRouter = createModelRouter(this.options.kiloConfig, {
        costBudget: this.options.costBudget
      });
      console.log('🧠 Smart model routing enabled');
    }

    // Create Attractor with enhanced codergen handler
    const attractor = await this._createEnhancedAttractor(llmClient, modelRouter);
    
    this.attractor = attractor;
    this.llmClient = llmClient;
    this.modelRouter = modelRouter;

    console.log('✅ LLM initialized successfully');
    return this;
  }

  async runWorkflow(workflowPath, options = {}) {
    const runId = options.runId || `kilo-${Date.now()}`;
    
    console.log(`\n🚀 Starting Kilo-powered workflow: ${runId}`);
    console.log(`📋 Workflow: ${workflowPath}`);
    console.log(`📁 Project: ${this.options.projectPath}`);
    console.log(`💰 Cost tracking: ${this.options.enableCostTracking ? 'enabled' : 'disabled'}`);
    
    if (this.options.costBudget) {
      console.log(`💵 Cost budget: $${this.options.costBudget}`);
    }
    console.log('');

    this.workflowStats.startTime = Date.now();

    try {
      const result = await this.attractor.run(workflowPath, {
        runId,
        context: {
          projectPath: this.options.projectPath,
          kiloConfig: this.options.kiloConfig,
          costBudget: this.options.costBudget,
          ...options.context
        }
      });

      this.workflowStats.endTime = Date.now();
      await this._generateWorkflowSummary(runId, result);
      
      return result;

    } catch (error) {
      this.workflowStats.endTime = Date.now();
      console.error(`\n❌ Workflow failed: ${error.message}`);
      
      if (this.options.verbose) {
        console.error(error.stack);
      }
      
      throw error;
    }
  }

  async _createEnhancedAttractor(llmClient, modelRouter) {
    // Use Attractor.create() to ensure all default handlers are registered
    const attractor = await Attractor.create({
      llmClient,
      engine: {
        logsRoot: this.options.logsRoot,
        enableCheckpointing: true
      }
    });

    // Set up enhanced event tracking
    this._setupEventTracking(attractor);

    // Create enhanced codergen handler with model routing
    if (modelRouter) {
      const providerProfile = {
        id: 'kilo',
        model: process.env.KILO_MODEL || 'anthropic/claude-sonnet-4.5',
        buildSystemPrompt: async () => 'You are a helpful AI coding assistant working through Kilo Gateway.',
        tools: () => [],
        providerOptions: () => ({}),
        supportsParallelToolCalls: false,
        toolRegistry: { get: () => null }
      };

      const executionEnv = {
        workingDirectory: () => this.options.projectPath,
        platform: () => process.platform
      };

      const session = new Session(
        providerProfile,
        executionEnv,
        new SessionConfig(),
        llmClient
      );

      const backend = new SessionBackend(session);
      const enhancedHandler = new CodergenHandler(backend, null, modelRouter);
      
      attractor.registerHandler('codergen', enhancedHandler);
    }

    return attractor;
  }

  _setupEventTracking(attractor) {
    attractor.on('pipeline_start', ({ runId, dotFilePath }) => {
      console.log(`📋 Pipeline started: ${runId}`);
      if (this.options.verbose) {
        console.log(`   DOT file: ${dotFilePath}`);
      }
    });

    attractor.on('node_execution_start', ({ nodeId, attempt, maxAttempts }) => {
      console.log(`🔄 Executing: ${nodeId} ${attempt > 1 ? `(attempt ${attempt}/${maxAttempts})` : ''}`);
      this.workflowStats.totalNodes++;
    });

    attractor.on('node_execution_success', ({ nodeId, outcome }) => {
      console.log(`✅ Completed: ${nodeId}`);
      this.workflowStats.completedNodes++;
      
      if (this.options.verbose && outcome.notes) {
        console.log(`   ${outcome.notes}`);
      }
      
      // Track model usage if available
      this._trackNodeExecution(nodeId, outcome, 'success');
    });

    attractor.on('node_execution_failed', ({ nodeId, reason }) => {
      console.log(`❌ Failed: ${nodeId}`);
      this.workflowStats.failedNodes++;
      
      if (reason) {
        console.log(`   Error: ${reason}`);
      }
      
      this._trackNodeExecution(nodeId, { failure_reason: reason }, 'failure');
    });

    attractor.on('edge_traversed', ({ from, to, label }) => {
      if (this.options.verbose) {
        console.log(`➡️  ${from} → ${to}${label ? ` (${label})` : ''}`);
      }
    });

    attractor.on('pipeline_complete', ({ runId, result }) => {
      console.log(`\n🎉 Pipeline completed: ${runId}`);
      console.log(`   Success: ${result.success}`);
      console.log(`   Completed nodes: ${result.completedNodes.length}`);
    });

    attractor.on('pipeline_error', ({ runId, error }) => {
      console.error(`\n💥 Pipeline error: ${runId}`);
      console.error(`   ${error.message}`);
    });
  }

  _trackNodeExecution(nodeId, outcome, status) {
    // This would track model usage and costs
    // Implementation depends on getting usage data from the LLM responses
    if (this.options.enableCostTracking) {
      // Track in costTracker
      this.costTracker.addExecution(nodeId, {
        status,
        timestamp: Date.now(),
        // Would include token counts and costs if available from Kilo
      });
    }
  }

  async _generateWorkflowSummary(runId, result) {
    const duration = (this.workflowStats.endTime - this.workflowStats.startTime) / 1000;
    
    console.log('\n📊 Workflow Summary:');
    console.log(`   Run ID: ${runId}`);
    console.log(`   Duration: ${duration.toFixed(1)}s`);
    console.log(`   Nodes executed: ${this.workflowStats.completedNodes}/${this.workflowStats.totalNodes}`);
    console.log(`   Success rate: ${(this.workflowStats.completedNodes / this.workflowStats.totalNodes * 100).toFixed(1)}%`);
    
    if (this.options.enableCostTracking) {
      console.log(`   Estimated cost: $${this.workflowStats.totalCost.toFixed(4)}`);
    }
    
    // Write summary to logs
    const summaryPath = path.join(this.options.logsRoot, runId, 'workflow-summary.json');
    await fs.mkdir(path.dirname(summaryPath), { recursive: true });
    await fs.writeFile(summaryPath, JSON.stringify({
      runId,
      workflow: result,
      stats: this.workflowStats,
      options: this.options,
      timestamp: new Date().toISOString()
    }, null, 2));
  }
}

/**
 * Simple cost tracking utility
 */
class CostTracker {
  constructor() {
    this.executions = [];
    this.totalCost = 0;
  }

  addExecution(nodeId, data) {
    this.executions.push({ nodeId, ...data });
    // Would calculate actual costs here
  }

  getTotalCost() {
    return this.totalCost;
  }

  getExecutionStats() {
    return {
      total: this.executions.length,
      successful: this.executions.filter(e => e.status === 'success').length,
      failed: this.executions.filter(e => e.status === 'failure').length,
      totalCost: this.totalCost
    };
  }
}

/**
 * Main CLI interface
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('🚀 Kilo-Powered Attractor Workflow Runner\n');
    console.log('Usage: node run-with-kilo.js <workflow.dot> [project-path] [options]\n');
    
    console.log('Environment Variables:');
    console.log('  KILO_API_KEY     - Your Kilo API key (required)');
    console.log('  KILO_ORG_ID      - Organization ID (optional)');
    console.log('  KILO_TASK_ID     - Task ID for tracking (optional)');
    console.log('  KILO_CONFIG      - Configuration preset (balanced|budget|performance)');
    console.log('  KILO_COST_BUDGET - Daily cost budget in USD (optional)\n');
    
    console.log('Available Workflows:');
    console.log('  workflows/comprehensive-code-analysis.dot - Complete code analysis');
    console.log('  workflows/documentation-suite.dot        - Generate documentation');  
    console.log('  workflows/testing-pipeline.dot           - Testing workflow');
    console.log('  workflows/development-lifecycle.dot      - Full dev lifecycle\n');
    
    console.log('Examples:');
    console.log('  # Basic code analysis');
    console.log('  node run-with-kilo.js workflows/comprehensive-code-analysis.dot ./my-project\n');
    console.log('  # Documentation generation with cost limit');
    console.log('  KILO_COST_BUDGET=5.00 node run-with-kilo.js workflows/documentation-suite.dot\n');
    console.log('  # High-performance configuration');
    console.log('  KILO_CONFIG=performance node run-with-kilo.js workflows/testing-pipeline.dot\n');
    
    process.exit(1);
  }
  
  const workflowPath = args[0];
  const projectPath = args[1] || process.cwd();
  
  try {
    const runner = new KiloWorkflowRunner({
      kiloConfig: process.env.KILO_CONFIG || 'balanced',
      costBudget: process.env.KILO_COST_BUDGET ? parseFloat(process.env.KILO_COST_BUDGET) : null,
      projectPath: projectPath,
      verbose: process.env.VERBOSE === 'true'
    });
    
    await runner.initialize();
    await runner.runWorkflow(workflowPath);
    
    console.log('\n🎉 Workflow completed successfully!');
    
  } catch (error) {
    console.error('\n💥 Error:', error.message);
    
    if (error.message.includes('KILO_API_KEY')) {
      console.error('\n💡 Setup Instructions:');
      console.error('1. Get your Kilo API key from https://app.kilo.ai');
      console.error('2. Set environment variable: export KILO_API_KEY=your-api-key');
      console.error('3. Run the workflow again');
    }
    
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}