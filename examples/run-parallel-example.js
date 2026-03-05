#!/usr/bin/env node

/**
 * Example runner for the parallel handler workflow
 */

import { Attractor } from '../src/index.js';

async function runExample() {
  try {
    console.log('Starting parallel handler example...');
    
    // Create attractor instance
    const attractor = await Attractor.create();
    
    // Run the example workflow
    const result = await attractor.run('./examples/parallel-workflow.dot', {
      runId: 'parallel-example-' + Date.now()
    });
    
    console.log('Pipeline execution completed!');
    console.log('Success:', result.success);
    console.log('Final node:', result.finalNode);
    
    if (!result.success) {
      console.log('Pipeline failed with:', result.finalOutcome?.failure_reason);
    }
    
  } catch (error) {
    console.error('Error running example:', error);
    process.exit(1);
  }
}

if (import.meta.url === process.argv[1]) {
  runExample();
}

export { runExample };