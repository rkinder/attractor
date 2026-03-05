#!/usr/bin/env node

/**
 * Example runner for directory-based workflows
 */

import { Attractor } from '../src/index.js';
import fs from 'fs/promises';
import path from 'path';

async function runDirectoryWorkflow() {
  console.log('Running directory-based workflow example...');
  
  try {
    // Create a simple directory workflow structure
    const workflowDir = './examples/directory-workflow';
    
    // Check if the directory exists
    try {
      await fs.access(workflowDir);
      console.log(`Using existing directory workflow: ${workflowDir}`);
    } catch {
      console.log('Directory workflow not found, creating example...');
      // The directory was already created earlier
    }
    
    // Create attractor instance
    const attractor = await Attractor.create();
    
    // Run the workflow from the directory
    const result = await attractor.run(workflowDir);
    
    console.log('Workflow completed successfully!');
    console.log('Result:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('Error running directory workflow:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runDirectoryWorkflow();
}

export { runDirectoryWorkflow };