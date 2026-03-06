#!/usr/bin/env node

/**
 * Example runner for the fanin handler workflow
 * 
 * This example demonstrates parallel execution followed by fan-in consolidation.
 * Works in simulation mode (no LLM API keys required).
 */

import { Attractor } from '../src/index.js';

async function runExample() {
  try {
    console.log('Starting fanin handler example...');
    console.log('(Running in simulation mode - no LLM API keys required)\n');
    
    // Create attractor instance - will use simulation mode since no LLM is configured
    const attractor = await Attractor.create();
    
    // Register a simulation-only codergen handler (no LLM calls)
    const SimulationHandler = (await import('../src/handlers/codergen.js')).CodergenHandler;
    attractor.registerHandler('codergen', new SimulationHandler(null)); // null backend = simulation mode
    
    // Run the example workflow
    const result = await attractor.run('./examples/fanin-workflow.dot', {
      runId: 'fanin-example-' + Date.now()
    });
    
    console.log('\nPipeline execution completed!');
    console.log('Success:', result.success);
    console.log('Final node:', result.finalNode);
    console.log('Completed nodes:', result.completedNodes?.join(' -> '));
    
    if (!result.success) {
      console.log('Pipeline failed with:', result.finalOutcome?.failure_reason);
    }
    
  } catch (error) {
    console.error('Error running example:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runExample();
}

export { runExample };