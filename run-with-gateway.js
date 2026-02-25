#!/usr/bin/env node

/**
 * Attractor with Custom Gateway Configuration
 * 
 * This script shows how to use Attractor with your own LLM gateway
 * instead of direct OpenAI/Anthropic APIs.
 */

import { Attractor } from './src/index.js';
import { Client } from './src/llm/client.js';
import { GatewayAdapter, GatewayConfigs } from './src/llm/adapters/gateway.js';
import path from 'path';
import process from 'process';

async function createGatewayClient() {
  // Configure for your specific gateway
  const gatewayConfig = {
    base_url: process.env.GATEWAY_BASE_URL || 'https://your-gateway.com',
    api_key: process.env.GATEWAY_API_KEY || 'your-api-key',
    default_model: process.env.GATEWAY_MODEL || 'gpt-4',
    
    // Customize these for your gateway's auth requirements
    auth_header: 'Authorization',  // or 'X-API-Key', 'api-key', etc.
    auth_prefix: 'Bearer ',        // or '', 'Token ', etc.
    
    // Add any custom headers your gateway needs
    custom_headers: {
      'X-Client': 'attractor',
      // 'X-Organization-ID': 'your-org-id',
      // 'X-Custom-Header': 'value'
    }
  };

  // Create the gateway adapter
  const gatewayAdapter = new GatewayAdapter(gatewayConfig);
  
  // Create LLM client with your gateway
  const llmClient = new Client({
    providers: {
      gateway: gatewayAdapter
    },
    default_provider: 'gateway'
  });

  await gatewayAdapter.initialize();
  
  return llmClient;
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('🚀 Attractor with Custom Gateway');
    console.log('');
    console.log('Usage: node run-with-gateway.js <workflow.dot> [project-path]');
    console.log('');
    console.log('Environment Variables:');
    console.log('  GATEWAY_BASE_URL - Your gateway base URL');
    console.log('  GATEWAY_API_KEY  - Your gateway API key'); 
    console.log('  GATEWAY_MODEL    - Model to use (default: gpt-4)');
    console.log('');
    console.log('Examples:');
    console.log('  GATEWAY_BASE_URL=https://api.your-gateway.com \\');
    console.log('  GATEWAY_API_KEY=your-key \\');
    console.log('  node run-with-gateway.js workflows/code-review.dot ./');
    console.log('');
    process.exit(1);
  }
  
  const workflowPath = args[0];
  const projectPath = args[1] || process.cwd();
  
  console.log('🚀 Attractor with Custom Gateway');
  console.log(`📋 Workflow: ${workflowPath}`);
  console.log(`📁 Project: ${projectPath}`);
  console.log(`🌐 Gateway: ${process.env.GATEWAY_BASE_URL || 'Not configured'}`);
  console.log('');
  
  try {
    // Create gateway-configured LLM client
    const llmClient = await createGatewayClient();
    
    // Create Attractor with custom LLM client
    const attractor = await Attractor.create({
      llmClient: llmClient,
      engine: {
        logsRoot: './logs',
        enableCheckpointing: true
      }
    });
    
    console.log('✅ Gateway client configured successfully');
    console.log('');
    
    // Set up event listeners
    attractor.on('pipeline_start', ({ runId }) => {
      console.log(`📋 Pipeline started: ${runId}`);
    });
    
    attractor.on('node_execution_start', ({ nodeId }) => {
      console.log(`🔄 Executing: ${nodeId} (making LLM call...)`);
    });
    
    attractor.on('node_execution_success', ({ nodeId, outcome }) => {
      console.log(`✅ Completed: ${nodeId}`);
      if (outcome.notes) {
        console.log(`   Result: ${outcome.notes}`);
      }
    });
    
    attractor.on('node_execution_failure', ({ nodeId, outcome }) => {
      console.log(`❌ Failed: ${nodeId}`);
      console.log(`   Error: ${outcome.failure_reason}`);
    });
    
    // Run the workflow
    const result = await attractor.run(workflowPath, {
      runId: `gateway-workflow-${Date.now()}`,
      context: {
        projectPath: projectPath
      }
    });
    
    console.log('');
    console.log('🎉 Workflow completed!');
    console.log(`   Success: ${result.success}`);
    console.log(`   Nodes: ${result.completedNodes.join(' → ')}`);
    
  } catch (error) {
    console.error('');
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('Gateway API key')) {
      console.error('');
      console.error('💡 Make sure to set your gateway credentials:');
      console.error('   export GATEWAY_BASE_URL=https://your-gateway.com');
      console.error('   export GATEWAY_API_KEY=your-api-key');
    }
    
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}