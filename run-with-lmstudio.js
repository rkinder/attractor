#!/usr/bin/env node

/**
 * LM Studio Workflow Runner
 * 
 * Run Attractor workflows using a local LM Studio LLM
 * 
 * Usage:
 *   node run-with-lmstudio.js <workflow.dot> [project-path]
 * 
 * Environment (via .env or LMSTUDIO_MODEL in .env):
 *   LMSTUDIO_MODEL=qwen/qwen3.5-9b
 *   LMSTUDIO_BASE_URL=http://172.24.144.1:1234/v1
 */

import { Attractor } from './src/index.js';
import { LMStudioAdapter } from './src/llm/adapters/lmstudio.js';
import { Client } from './src/llm/client.js';
import path from 'path';
import process from 'process';
import fs from 'fs/promises';

class LMStudioWorkflowRunner {
  constructor(options = {}) {
    this.options = {
      model: options.model || process.env.LMSTUDIO_MODEL || 'qwen/qwen3.5-9b',
      baseUrl: options.baseUrl || process.env.LMSTUDIO_BASE_URL || 'http://172.24.144.1:1234/v1',
      projectPath: options.projectPath || process.cwd(),
      logsRoot: options.logsRoot || './logs',
      verbose: options.verbose || false,
    };
    
    this.workflowStats = {
      startTime: null,
      endTime: null,
      totalNodes: 0,
      completedNodes: 0,
      failedNodes: 0,
    };
  }

  static async _loadEnvFile() {
    if (process.env.LMSTUDIO_MODEL || process.env.KILO_API_KEY) {
      return;
    }
    try {
      const envPath = path.join(process.cwd(), '.env');
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

  async initialize() {
    await LMStudioWorkflowRunner._loadEnvFile();
    
    if (!process.env.LMSTUDIO_MODEL) {
      throw new Error('LMSTUDIO_MODEL not set. Add it to .env file.');
    }

    console.log(`🔧 Initializing LM Studio (${this.options.model})...`);
    console.log(`   URL: ${this.options.baseUrl}`);
    
    const adapter = new LMStudioAdapter({
      model: process.env.LMSTUDIO_MODEL,
      base_url: process.env.LMSTUDIO_BASE_URL || this.options.baseUrl
    });
    
    try {
      await adapter.initialize();
    } catch (e) {
      throw new Error(`Failed to connect to LM Studio: ${e.message}. Is LM Studio running?`);
    }
    
    this.llmClient = new Client({
      providers: { lmstudio: adapter },
      default_provider: 'lmstudio'
    });
    
    this.attractor = await Attractor.create({
      llmClient: this.llmClient,
      engine: {
        logsRoot: this.options.logsRoot,
        enableCheckpointing: true
      }
    });
    
    this._setupEventTracking();
    console.log('✅ LM Studio initialized successfully');
    return this;
  }

  _setupEventTracking() {
    this.attractor.on('pipeline_start', ({ runId }) => {
      console.log(`📋 Pipeline started: ${runId}`);
    });

    this.attractor.on('node_execution_start', ({ nodeId }) => {
      console.log(`🔄 Executing: ${nodeId}`);
      this.workflowStats.totalNodes++;
    });

    this.attractor.on('node_execution_success', ({ nodeId, outcome }) => {
      console.log(`✅ Completed: ${nodeId}`);
      this.workflowStats.completedNodes++;
    });

    this.attractor.on('node_execution_failed', ({ nodeId, reason }) => {
      console.log(`❌ Failed: ${nodeId} - ${reason}`);
      this.workflowStats.failedNodes++;
    });

    this.attractor.on('pipeline_complete', ({ result }) => {
      console.log(`\n🎉 Pipeline completed: ${result.success}`);
    });
  }

  async runWorkflow(workflowPath, options = {}) {
    const runId = options.runId || `lmstudio-${Date.now()}`;
    
    console.log(`\n🚀 Starting LM Studio workflow: ${runId}`);
    console.log(`📋 Workflow: ${workflowPath}`);
    console.log(`📁 Project: ${this.options.projectPath}`);
    console.log(`🤖 Model: ${process.env.LMSTUDIO_MODEL}\n`);

    this.workflowStats.startTime = Date.now();

    try {
      const result = await this.attractor.run(workflowPath, {
        runId,
        context: {
          projectPath: this.options.projectPath,
          ...options.context
        }
      });

      this.workflowStats.endTime = Date.now();
      return result;
    } catch (error) {
      this.workflowStats.endTime = Date.now();
      console.error(`\n❌ Workflow failed: ${error.message}`);
      throw error;
    }
  }

  async printSummary(result) {
    const duration = (this.workflowStats.endTime - this.workflowStats.startTime) / 1000;
    
    console.log('\n📊 Workflow Summary:');
    console.log(`   Duration: ${duration.toFixed(1)}s`);
    console.log(`   Nodes executed: ${this.workflowStats.completedNodes}/${this.workflowStats.totalNodes}`);
    console.log(`   Success rate: ${(this.workflowStats.completedNodes / this.workflowStats.totalNodes * 100).toFixed(1)}%`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('🚀 LM Studio Workflow Runner\n');
    console.log('Usage: node run-with-lmstudio.js <workflow.dot> [project-path]\n');
    console.log('Environment (in .env):');
    console.log('   LMSTUDIO_MODEL=qwen/qwen3.5-9b');
    console.log('   LMSTUDIO_BASE_URL=http://172.24.144.1:1234/v1\n');
    console.log('Examples:');
    console.log('   node run-with-lmstudio.js examples/parallel-workflow.dot');
    console.log('   node run-with-lmstudio.js examples/parallel-workflow.dot ./my-project');
    process.exit(1);
  }
  
  const workflowPath = args[0];
  const projectPath = args[1] || process.cwd();
  
  try {
    const runner = new LMStudioWorkflowRunner({ projectPath });
    await runner.initialize();
    const result = await runner.runWorkflow(workflowPath);
    await runner.printSummary(result);
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('\n💥 Error:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { LMStudioWorkflowRunner };
