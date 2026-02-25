#!/usr/bin/env node

/**
 * Comprehensive test suite for all Attractor features
 */

import { 
  DOTParser, 
  Attractor, 
  PipelineLinter, 
  ModelStylesheet, 
  ConsoleInterviewer,
  Question,
  QuestionType,
  Option,
  Answer
} from '../src/index.js';
import assert from 'assert';
import fs from 'fs/promises';
import path from 'path';

async function testValidationAndLinting() {
  console.log('Testing validation and linting...');
  
  const linter = new PipelineLinter();
  const parser = new DOTParser();
  
  // Test 1: Valid pipeline passes validation
  const validDot = `
    digraph ValidPipeline {
      graph [goal="Test goal"]
      start [shape=Mdiamond]
      exit [shape=Msquare]
      task [prompt="Do something"]
      start -> task -> exit
    }
  `;
  
  const validGraph = parser.parse(validDot);
  const validResult = linter.validate(validGraph);
  
  assert.strictEqual(validResult.hasErrors, false, 'Valid pipeline should not have errors');
  
  // Test 2: Invalid pipeline fails validation
  const invalidDot = `
    digraph InvalidPipeline {
      // Missing exit node, has orphaned node
      start [shape=Mdiamond]
      task1 [prompt="Do something"]
      orphan [prompt="Unreachable"]
      start -> task1
    }
  `;
  
  const invalidGraph = parser.parse(invalidDot);
  const invalidResult = linter.validate(invalidGraph);
  
  assert.strictEqual(invalidResult.hasErrors, true, 'Invalid pipeline should have errors');
  assert(invalidResult.errorCount > 0, 'Should report specific errors');
  
  console.log('✅ Validation and linting tests passed');
}

async function testModelStylesheets() {
  console.log('Testing model stylesheets...');
  
  // Test 1: Basic stylesheet parsing
  const stylesheet = new ModelStylesheet(`
    .critical {
      model: claude-opus-4-6;
      reasoning_effort: high;
      temperature: 0.2;
    }
    
    #special {
      provider: openai;
    }
    
    box {
      max_tokens: 2000;
    }
  `);
  
  // Test 2: Style application
  const mockNode = {
    id: 'special',
    shape: 'box',
    attributes: { class: 'critical' },
    get: function(key, defaultValue = null) {
      return this.attributes[key] !== undefined ? this.attributes[key] : defaultValue;
    }
  };
  
  const styles = stylesheet.applyToNode(mockNode);
  
  assert.strictEqual(styles.model, 'claude-opus-4-6', 'Should apply class-based styles');
  assert.strictEqual(styles.provider, 'openai', 'Should apply ID-based styles');
  assert.strictEqual(styles.max_tokens, '2000', 'Should apply shape-based styles');
  assert.strictEqual(styles.reasoning_effort, 'high', 'Should apply multiple style rules');
  
  console.log('✅ Model stylesheet tests passed');
}

async function testHumanInteractionComponents() {
  console.log('Testing human interaction components...');
  
  // Test 1: Question creation
  const question = new Question({
    text: 'Select an option:',
    type: QuestionType.MULTIPLE_CHOICE,
    options: [
      new Option('A', 'Approve'),
      new Option('R', 'Reject')
    ]
  });
  
  assert.strictEqual(question.text, 'Select an option:');
  assert.strictEqual(question.options.length, 2);
  assert.strictEqual(question.options[0].key, 'A');
  
  // Test 2: Answer creation and validation
  const answer = new Answer('A');
  assert.strictEqual(answer.value, 'A');
  assert.strictEqual(answer.isTimeout(), false);
  assert.strictEqual(answer.isSkipped(), false);
  
  const timeoutAnswer = Answer.timeout();
  assert.strictEqual(timeoutAnswer.isTimeout(), true);
  
  // Test 3: Accelerator key parsing
  const { AcceleratorParser } = await import('../src/human/interviewer.js');
  
  assert.strictEqual(AcceleratorParser.parseAcceleratorKey('[Y] Yes'), 'Y');
  assert.strictEqual(AcceleratorParser.parseAcceleratorKey('A) Approve'), 'A');
  assert.strictEqual(AcceleratorParser.parseAcceleratorKey('N - No'), 'N');
  assert.strictEqual(AcceleratorParser.parseAcceleratorKey('Maybe'), 'M');
  
  assert.strictEqual(AcceleratorParser.stripAcceleratorPrefix('[Y] Yes'), 'Yes');
  assert.strictEqual(AcceleratorParser.stripAcceleratorPrefix('A) Approve'), 'Approve');
  assert.strictEqual(AcceleratorParser.stripAcceleratorPrefix('N - No'), 'No');
  
  console.log('✅ Human interaction component tests passed');
}

async function testPipelineExecutionWithAllFeatures() {
  console.log('Testing pipeline execution with all features...');
  
  // Create test pipeline with validation, stylesheet, and human interaction
  const testDot = `
    digraph ComprehensiveTest {
      graph [
        goal="Test all features",
        model_stylesheet="
          .fast { model: claude-sonnet-4-5; }
          .precise { model: claude-opus-4-6; reasoning_effort: high; }
        "
      ]
      
      start [shape=Mdiamond]
      exit [shape=Msquare]
      
      task1 [
        class="fast",
        label="Fast Task", 
        prompt="This is a fast task"
      ]
      
      gate [
        shape=hexagon,
        label="Manual Gate"
      ]
      
      task2 [
        class="precise",
        label="Precise Task",
        prompt="This is a precise task"
      ]
      
      start -> task1 -> gate
      gate -> task2 [label="[C] Continue"]
      gate -> exit [label="[S] Skip"]
      task2 -> exit
    }
  `;
  
  // Write test DOT file
  const testDir = './test-temp';
  await fs.mkdir(testDir, { recursive: true });
  const dotPath = path.join(testDir, 'comprehensive-test.dot');
  await fs.writeFile(dotPath, testDot);
  
  try {
    // Create attractor with all features enabled
    const attractor = await Attractor.create({
      engine: {
        enableValidation: true,
        enableStylesheet: true,
        enableCheckpointing: true
      }
    });
    
    // Mock human interaction for automated testing
    const { WaitForHumanHandler } = await import('../src/handlers/human.js');
    
    class MockInterviewer {
      async ask(question) {
        // Always select "Continue" option
        const continueOption = question.options.find(opt => 
          opt.label.includes('Continue') || opt.key === 'C'
        ) || question.options[0];
        
        return new Answer(continueOption.value);
      }
      close() {}
    }
    
    attractor.registerHandler('wait.human', new WaitForHumanHandler(new MockInterviewer()));
    
    // Override codergen handler for simulation
    const { CodergenHandler } = await import('../src/handlers/codergen.js');
    attractor.registerHandler('codergen', new CodergenHandler(null)); // null = simulation
    
    // Track events
    let events = [];
    attractor.on('validation_complete', (data) => events.push({ type: 'validation', data }));
    attractor.on('stylesheet_loaded', (data) => events.push({ type: 'stylesheet', data }));
    attractor.on('node_execution_success', (data) => events.push({ type: 'node_success', data }));
    
    // Run pipeline
    const result = await attractor.run(dotPath, { runId: 'comprehensive-test' });
    
    // Verify results
    assert.strictEqual(result.success, true, 'Pipeline should complete successfully');
    assert(events.some(e => e.type === 'validation'), 'Should emit validation events');
    assert(events.some(e => e.type === 'stylesheet'), 'Should emit stylesheet events');
    assert(events.some(e => e.type === 'node_success' && e.data.nodeId === 'task1'), 'Should execute task1');
    assert(events.some(e => e.type === 'node_success' && e.data.nodeId === 'task2'), 'Should execute task2');
    
    console.log('✅ Comprehensive pipeline execution test passed');
    
  } finally {
    // Clean up
    await fs.rm(testDir, { recursive: true, force: true });
  }
}

async function testCompleteWorkflow() {
  console.log('Testing complete workflow integration...');
  
  // This test verifies that all components work together correctly
  const parser = new DOTParser();
  const linter = new PipelineLinter();
  const stylesheet = new ModelStylesheet(`
    * { model: default-model; }
    .special { model: special-model; }
  `);
  
  const dotContent = `
    digraph Integration {
      graph [goal="Integration test"]
      start [shape=Mdiamond]
      exit [shape=Msquare]
      work [class="special", prompt="Do work"]
      start -> work -> exit
    }
  `;
  
  // Parse
  const graph = parser.parse(dotContent);
  assert.strictEqual(graph.id, 'Integration');
  
  // Validate
  const validation = linter.validate(graph);
  assert.strictEqual(validation.hasErrors, false);
  
  // Apply stylesheet
  const workNode = graph.getNode('work');
  const styles = stylesheet.applyToNode(workNode);
  assert.strictEqual(styles.model, 'special-model');
  
  console.log('✅ Complete workflow integration test passed');
}

async function main() {
  try {
    console.log('🧪 Running Comprehensive Attractor Tests\n');
    
    await testValidationAndLinting();
    await testModelStylesheets();  
    await testHumanInteractionComponents();
    await testPipelineExecutionWithAllFeatures();
    await testCompleteWorkflow();
    
    console.log('\n🎉 All comprehensive tests passed!');
    console.log('✅ Attractor implementation is fully functional');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}