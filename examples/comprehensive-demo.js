#!/usr/bin/env node

/**
 * Comprehensive Attractor Demo - Shows all features including human interaction,
 * validation, and model stylesheets
 */

import { 
  Attractor, 
  PipelineLinter, 
  ConsoleInterviewer, 
  PredefinedStylesheets 
} from '../src/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('🚀 Comprehensive Attractor Demo Starting...\n');

  try {
    // Create Attractor instance with full features enabled
    console.log('Initializing Attractor with full feature set...');
    const attractor = await Attractor.create({
      engine: {
        logsRoot: './logs',
        enableCheckpointing: true,
        enableValidation: true,
        enableStylesheet: true
      }
    });

    // Set up comprehensive event listeners
    setupEventListeners(attractor);

    // Demo 1: Validation and Linting
    console.log('\n--- Demo 1: Pipeline Validation ---');
    await demoValidation();

    // Demo 2: Model Stylesheets
    console.log('\n--- Demo 2: Model Stylesheets ---');
    await demoModelStylesheets();

    // Demo 3: Human-in-the-Loop Workflow (simulation)
    console.log('\n--- Demo 3: Human-in-the-Loop Workflow ---');
    console.log('ℹ️  This demo would normally require human interaction.');
    console.log('   In a real scenario, you would be prompted to make choices.');
    console.log('   For this demo, we\'ll use simulation mode.');
    
    // Override human handler for demo
    const { WaitForHumanHandler } = await import('../src/handlers/human.js');
    const { MockInterviewer } = createMockInterviewer();
    attractor.registerHandler('wait.human', new WaitForHumanHandler(new MockInterviewer()));

    const humanWorkflowResult = await attractor.run(
      path.join(__dirname, 'human-approval-workflow.dot'),
      { runId: 'demo-human-workflow' }
    );

    console.log('\n✨ All comprehensive demos completed successfully!');
    console.log(`\n📊 Final Results:`);
    console.log(`   - Human workflow success: ${humanWorkflowResult.success}`);
    console.log(`   - Completed nodes: ${humanWorkflowResult.completedNodes.join(' -> ')}`);

  } catch (error) {
    console.error('\n💥 Demo failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

function setupEventListeners(attractor) {
  attractor.on('pipeline_start', ({ runId, dotFilePath }) => {
    console.log(`📋 Pipeline started: ${runId}`);
    console.log(`   DOT file: ${path.basename(dotFilePath)}`);
  });

  attractor.on('validation_complete', ({ errorCount, warningCount }) => {
    console.log(`✅ Validation complete: ${errorCount} errors, ${warningCount} warnings`);
  });

  attractor.on('validation_warnings', ({ warnings, count }) => {
    console.log(`⚠️  ${count} validation warnings:`);
    warnings.forEach(w => console.log(`   - ${w.message}`));
  });

  attractor.on('stylesheet_loaded', ({ stylesheet }) => {
    console.log(`🎨 Model stylesheet loaded (${stylesheet.length} chars)`);
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
  });

  attractor.on('pipeline_error', ({ runId, error }) => {
    console.error(`\n❌ Pipeline failed: ${runId}`);
    console.error(`   Error: ${error.message}`);
  });
}

async function demoValidation() {
  console.log('Running pipeline validation on example workflows...');
  
  const linter = new PipelineLinter();
  
  // Test valid pipeline
  const { DOTParser } = await import('../src/pipeline/parser.js');
  const parser = new DOTParser();
  
  const validDot = `
    digraph Valid {
      start [shape=Mdiamond]
      exit [shape=Msquare]
      task [prompt="Do something"]
      start -> task -> exit
    }
  `;
  
  const validGraph = parser.parse(validDot);
  const validResult = linter.validate(validGraph);
  
  console.log(`✅ Valid pipeline: ${validResult.errorCount} errors, ${validResult.warningCount} warnings`);
  
  // Test invalid pipeline
  const invalidDot = `
    digraph Invalid {
      // Missing exit node
      start [shape=Mdiamond]
      task1 [prompt="Do something"]  
      task2 []  // Missing prompt
      orphan [prompt="Unreachable"]  // Orphaned node
      
      start -> task1 -> task2
      // task2 has no outgoing edge (dead end)
    }
  `;
  
  const invalidGraph = parser.parse(invalidDot);
  const invalidResult = linter.validate(invalidGraph);
  
  console.log(`❌ Invalid pipeline: ${invalidResult.errorCount} errors, ${invalidResult.warningCount} warnings`);
  
  if (invalidResult.hasErrors) {
    console.log('   Errors found:');
    invalidResult.getErrors().forEach(error => {
      console.log(`     - ${error.message}`);
    });
  }
  
  if (invalidResult.hasWarnings) {
    console.log('   Warnings found:');
    invalidResult.getWarnings().forEach(warning => {
      console.log(`     - ${warning.message}`);
    });
  }
}

async function demoModelStylesheets() {
  console.log('Demonstrating model stylesheet features...');
  
  // Show predefined stylesheets
  const balanced = PredefinedStylesheets.balanced();
  console.log('📋 Balanced stylesheet:');
  console.log(balanced.toString().split('\n').map(line => `   ${line}`).join('\n'));
  
  // Show custom stylesheet application
  console.log('\n🎨 Custom stylesheet application:');
  
  const { ModelStylesheet } = await import('../src/styling/stylesheet.js');
  const customStylesheet = new ModelStylesheet(`
    .critical {
      model: claude-opus-4-6;
      reasoning_effort: high;
      temperature: 0.2;
    }
    
    .fast {
      model: claude-haiku-4-5;
      reasoning_effort: low;
      temperature: 0.8;
    }
    
    #special_node {
      model: gpt-5-2-codex;
      provider: openai;
    }
  `);
  
  // Mock node for demonstration
  const mockNode = {
    id: 'test_node',
    attributes: { class: 'critical,fast' },
    get: function(key, defaultValue = null) {
      return this.attributes[key] !== undefined ? this.attributes[key] : defaultValue;
    }
  };
  
  const appliedStyles = customStylesheet.applyToNode(mockNode);
  console.log(`   Node styles applied:`, appliedStyles);
}

function createMockInterviewer() {
  // Mock interviewer for demo purposes
  class MockInterviewer {
    constructor() {
      this.responses = [
        'A', // Approve first time
        'F', // Request fix second time  
        'A'  // Approve after fix
      ];
      this.responseIndex = 0;
    }

    async ask(question) {
      console.log(`\n🤔 ${question.text}`);
      question.options.forEach(option => {
        console.log(`   ${option.label}`);
      });

      const response = this.responses[this.responseIndex % this.responses.length];
      this.responseIndex++;

      console.log(`🤖 [Simulated choice: ${response}]`);

      const { Answer, Choice } = await import('../src/human/interviewer.js');
      const option = question.options.find(o => o.key === response) || question.options[0];
      return new Answer(option.value, new Choice(option.key, option.label, option.value));
    }

    close() {
      // No cleanup needed for mock
    }
  }

  return { MockInterviewer };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}