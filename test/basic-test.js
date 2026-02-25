#!/usr/bin/env node

/**
 * Basic functionality test for Attractor
 */

import { DOTParser, Attractor } from '../src/index.js';
import assert from 'assert';
import fs from 'fs/promises';
import path from 'path';

async function testDOTParser() {
  console.log('Testing DOT Parser...');
  
  const dotText = `
    digraph TestGraph {
      graph [goal="Test goal"]
      
      start [shape=Mdiamond, label="Start"]
      exit [shape=Msquare, label="Exit"]
      
      task1 [label="Task 1", prompt="Do something"]
      task2 [label="Task 2", condition="test"]
      
      start -> task1 -> task2 -> exit
    }
  `;
  
  const parser = new DOTParser();
  const graph = parser.parse(dotText);
  
  assert.strictEqual(graph.id, 'TestGraph');
  assert.strictEqual(graph.goal, 'Test goal');
  assert.strictEqual(graph.nodes.size, 4);
  assert.strictEqual(graph.edges.length, 3);
  
  const startNode = graph.findStartNode();
  assert.strictEqual(startNode.id, 'start');
  assert.strictEqual(startNode.shape, 'Mdiamond');
  
  const exitNode = graph.findExitNode();
  assert.strictEqual(exitNode.id, 'exit');
  assert.strictEqual(exitNode.shape, 'Msquare');
  
  console.log('✅ DOT Parser test passed');
}

async function testPipelineExecution() {
  console.log('Testing Pipeline Execution (simulation mode)...');
  
  // Create a minimal test pipeline
  const testDot = `
    digraph TestPipeline {
      graph [goal="Test execution"]
      
      start [shape=Mdiamond]
      exit [shape=Msquare]
      
      task [label="Test Task", prompt="This is a test"]
      
      start -> task -> exit
    }
  `;
  
  // Write test DOT file
  const testDir = './test-temp';
  await fs.mkdir(testDir, { recursive: true });
  const dotPath = path.join(testDir, 'test.dot');
  await fs.writeFile(dotPath, testDot);
  
  try {
    // Create attractor instance
    const attractor = await Attractor.create();
    
    // Override with simulation handler to avoid needing real LLM
    const { CodergenHandler } = await import('../src/handlers/codergen.js');
    attractor.registerHandler('codergen', new CodergenHandler(null)); // null = simulation mode
    
    // Track events
    let events = [];
    attractor.on('pipeline_start', (data) => events.push({ type: 'start', data }));
    attractor.on('node_execution_success', (data) => events.push({ type: 'node_success', data }));
    attractor.on('pipeline_complete', (data) => events.push({ type: 'complete', data }));
    
    // Run pipeline
    const result = await attractor.run(dotPath, { runId: 'test-run' });
    
    // Verify results
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.finalNode, 'exit');
    // Note: exit node is terminal so it's not executed as a handler
    assert.deepStrictEqual(result.completedNodes, ['start', 'task']);
    
    // Verify events were emitted
    assert(events.some(e => e.type === 'start'));
    assert(events.some(e => e.type === 'node_success' && e.data.nodeId === 'task'));
    assert(events.some(e => e.type === 'complete'));
    
    console.log('✅ Pipeline execution test passed');
    
  } finally {
    // Clean up
    await fs.rm(testDir, { recursive: true, force: true });
  }
}

async function main() {
  try {
    console.log('🧪 Running Attractor Tests\n');
    
    await testDOTParser();
    await testPipelineExecution();
    
    console.log('\n🎉 All tests passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}