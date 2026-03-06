#!/usr/bin/env node

/**
 * Example runner for the tool handler workflow
 * 
 * This example demonstrates shell command execution.
 * Note: Commands like 'npm install' and 'npm test' require a Node.js project.
 */

import { Attractor } from '../src/index.js';

async function runExample() {
  try {
    console.log('Starting tool handler example...');
    console.log('(Note: Some commands may fail if not in a Node.js project)\n');
    
    // Create attractor instance
    const attractor = await Attractor.create();
    
    // Run the example workflow
    const result = await attractor.run('./examples/tool-workflow.dot', {
      runId: 'tool-example-' + Date.now()
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