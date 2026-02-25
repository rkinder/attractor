#!/usr/bin/env node

/**
 * Attractor Demo - Shows how to run pipeline workflows
 */

import { Attractor } from '../src/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('🚀 Attractor Demo Starting...\n');

  try {
    // Create Attractor instance
    console.log('Initializing Attractor...');
    const attractor = await Attractor.create({
      engine: {
        logsRoot: './logs',
        enableCheckpointing: true
      }
    });

    // Set up event listeners
    attractor.on('pipeline_start', ({ runId, dotFilePath }) => {
      console.log(`📋 Pipeline started: ${runId}`);
      console.log(`   DOT file: ${dotFilePath}`);
    });

    attractor.on('node_execution_start', ({ nodeId, attempt, maxAttempts }) => {
      console.log(`🔄 Executing node: ${nodeId} (attempt ${attempt}/${maxAttempts})`);
    });

    attractor.on('node_execution_success', ({ nodeId, outcome }) => {
      console.log(`✅ Node completed: ${nodeId}`);
      if (outcome.notes) {
        console.log(`   Notes: ${outcome.notes}`);
      }
    });

    attractor.on('edge_traversed', ({ from, to }) => {
      console.log(`➡️  Traversed: ${from} -> ${to}`);
    });

    attractor.on('pipeline_complete', ({ runId, result }) => {
      console.log(`\n🎉 Pipeline completed: ${runId}`);
      console.log(`   Success: ${result.success}`);
      console.log(`   Final node: ${result.finalNode}`);
      console.log(`   Completed nodes: ${result.completedNodes.join(' -> ')}`);
    });

    attractor.on('pipeline_error', ({ runId, error }) => {
      console.error(`\n❌ Pipeline failed: ${runId}`);
      console.error(`   Error: ${error.message}`);
    });

    // Run the simple linear workflow
    console.log('\n--- Running Simple Linear Workflow ---');
    const simpleResult = await attractor.run(
      path.join(__dirname, 'simple-linear.dot'),
      { runId: 'demo-simple-linear' }
    );

    console.log('\n--- Running Branching Workflow ---');
    const branchingResult = await attractor.run(
      path.join(__dirname, 'branching-workflow.dot'),
      { runId: 'demo-branching' }
    );

    console.log('\n✨ All demos completed successfully!');

  } catch (error) {
    console.error('\n💥 Demo failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Helper to create a simulation mode for demo
class SimulationMode {
  static async create() {
    return {
      // Override handlers to simulate execution without actual LLM calls
      setupSimulation: async (attractor) => {
        const { CodergenHandler } = await import('../src/handlers/codergen.js');
        
        // Use simulation codergen handler
        const simulationHandler = new CodergenHandler(null); // null backend = simulation mode
        attractor.registerHandler('codergen', simulationHandler);
        
        console.log('🔧 Running in simulation mode (no actual LLM calls)');
      }
    };
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}