#!/usr/bin/env node

/**
 * Universal Workflow Runner - Run Attractor workflows on any project
 * 
 * Usage:
 *   node run-workflow.js <workflow.dot> [project-path]
 *   
 * Examples:
 *   node run-workflow.js workflows/code-review.dot /path/to/my-app
 *   node run-workflow.js workflows/testing.dot ../my-react-app
 */

import { Attractor } from './src/index.js';
import path from 'path';
import process from 'process';

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length < 1) {
        console.error('Usage: node run-workflow.js <workflow.dot> [project-path]');
        console.error('');
        console.error('Available workflows:');
        console.error('  workflows/code-review.dot     - Comprehensive code review');
        console.error('  examples/simple-linear.dot    - Basic testing workflow');
        console.error('  examples/branching-workflow.dot - Feature implementation');
        process.exit(1);
    }
    
    const workflowPath = args[0];
    const projectPath = args[1] || process.cwd();
    
    console.log(`🚀 Running workflow: ${workflowPath}`);
    console.log(`📁 Target project: ${projectPath}`);
    console.log('');
    
    // Create Attractor with project context
    const attractor = await Attractor.create({
        engine: {
            logsRoot: './logs',
            enableCheckpointing: true,
            projectPath: projectPath  // This would be available to handlers
        }
    });
    
    // Set up progress tracking
    attractor.on('pipeline_start', ({ runId }) => {
        console.log(`📋 Starting workflow: ${runId}`);
    });
    
    attractor.on('node_execution_start', ({ nodeId }) => {
        console.log(`🔄 Executing: ${nodeId}`);
    });
    
    attractor.on('node_execution_success', ({ nodeId, outcome }) => {
        console.log(`✅ Completed: ${nodeId}`);
        if (outcome.message) {
            console.log(`   ${outcome.message}`);
        }
    });
    
    attractor.on('human_input_required', ({ nodeId, message }) => {
        console.log(`\n👤 Human input required at: ${nodeId}`);
        console.log(`   ${message}`);
        console.log('   Press [A] to approve, [R] to request changes, [S] to skip');
    });
    
    attractor.on('pipeline_complete', ({ result }) => {
        console.log(`\n🎉 Workflow completed successfully!`);
        console.log(`   Final status: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    });
    
    try {
        const result = await attractor.run(workflowPath, {
            runId: `workflow-${Date.now()}`,
            context: {
                projectPath: projectPath,
                timestamp: new Date().toISOString()
            }
        });
        
        console.log('\n📊 Results Summary:');
        console.log(`   Nodes completed: ${result.completedNodes.length}`);
        console.log(`   Path: ${result.completedNodes.join(' → ')}`);
        
    } catch (error) {
        console.error(`\n❌ Workflow failed: ${error.message}`);
        process.exit(1);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}