#!/usr/bin/env node

/**
 * Demo runner with free LLM support
 * 
 * Usage:
 *   # Use simulation mode (default, no API key needed)
 *   node run-with-free-llm.js examples/parallel-workflow.dot
 * 
 *   # Use Groq (free API key at https://console.groq.com)
 *   GROQ_API_KEY=your_key node run-with-free-llm.js examples/parallel-workflow.dot
 * 
 *   # Use Ollama (local, free)
 *   node run-with-free-llm.js examples/parallel-workflow.dot --provider=ollama
 */

import { Attractor } from './src/index.js';
import { GatewayAdapter } from './src/llm/adapters/gateway.js';
import { Client } from './src/llm/client.js';
import path from 'path';
import process from 'process';

const args = process.argv.slice(2);
const workflowPath = args[0] || 'examples/parallel-workflow.dot';

async function main() {
  let llmClient = null;
  
  // Check for free LLM options
  if (process.env.GROQ_API_KEY) {
    console.log('Using Groq (free tier)...');
    const gateway = new GatewayAdapter({
      base_url: 'https://api.groq.com/openai/v1',
      api_key: process.env.GROQ_API_KEY,
      model: 'llama-3.1-70b-versatile'
    });
    await gateway.initialize();
    llmClient = new Client({
      providers: { gateway },
      default_provider: 'gateway'
    });
  } else if (args.includes('--provider=ollama')) {
    console.log('Using Ollama (local)...');
    const gateway = new GatewayAdapter({
      base_url: 'http://localhost:11434/v1',
      api_key: 'ollama',  // dummy key
      model: 'llama2'
    });
    await gateway.initialize();
    llmClient = new Client({
      providers: { gateway },
      default_provider: 'gateway'
    });
  } else {
    console.log('Using simulation mode (no LLM API key required)');
    console.log('To use a real LLM, set GROQ_API_KEY or use --provider=ollama\n');
  }
  
  // Create Attractor
  const attractor = await Attractor.create({ llmClient });
  
  // Set up events
  attractor.on('pipeline_start', ({ runId }) => console.log(`Starting: ${runId}`));
  attractor.on('node_execution_start', ({ nodeId }) => console.log(`  → ${nodeId}`));
  attractor.on('node_execution_success', ({ nodeId }) => console.log(`  ✓ ${nodeId}`));
  attractor.on('node_execution_failed', ({ nodeId, reason }) => console.log(`  ✗ ${nodeId}: ${reason}`));
  attractor.on('pipeline_complete', ({ result }) => {
    console.log(`\nCompleted: ${result.success}`);
    console.log(`Nodes: ${result.completedNodes?.join(' → ')}`);
  });
  
  // Run workflow
  const result = await attractor.run(workflowPath, {
    runId: 'demo-' + Date.now()
  });
  
  console.log('\nDone!');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
