import { test } from 'node:test';
import assert from 'node:assert';
import { DirectoryWorkflowLoader } from '../src/workflow/directory-loader.js';
import fs from 'fs/promises';
import path from 'path';

test('DirectoryWorkflowLoader loads DOT file and prompts correctly', async () => {
  const loader = new DirectoryWorkflowLoader();
  
  // Create a temporary directory structure for testing
  const testDir = './test-workflow-dir';
  await fs.mkdir(testDir, { recursive: true });
  
  try {
    // Create a test DOT file
    const dotContent = `digraph Test {
      start [shape=Mdiamond label="Start" type="start"];
      end [shape=Msquare label="End" type="exit"];
      start -> end;
    }`;
    
    await fs.writeFile(path.join(testDir, 'workflow.dot'), dotContent);
    
    // Create a prompts directory with a prompt file
    await fs.mkdir(path.join(testDir, 'prompts'), { recursive: true });
    await fs.writeFile(path.join(testDir, 'prompts', 'end.txt'), 'This is a test prompt');
    
    // Load the workflow
    const result = await loader.load(testDir);
    
    assert.strictEqual(result.dotText, dotContent);
    assert(result.prompts.has('end'));
    assert.strictEqual(result.prompts.get('end'), 'This is a test prompt');
  } finally {
    // Cleanup
    await fs.rm(testDir, { recursive: true });
  }
});

test('DirectoryWorkflowLoader handles missing prompts directory', async () => {
  const loader = new DirectoryWorkflowLoader();
  
  // Create a temporary directory structure for testing
  const testDir = './test-workflow-dir2';
  await fs.mkdir(testDir, { recursive: true });
  
  try {
    // Create a test DOT file
    const dotContent = `digraph Test {
      start [shape=Mdiamond label="Start" type="start"];
      end [shape=Msquare label="End" type="exit"];
      start -> end;
    }`;
    
    await fs.writeFile(path.join(testDir, 'workflow.dot'), dotContent);
    
    // Load the workflow (no prompts directory)
    const result = await loader.load(testDir);
    
    assert.strictEqual(result.dotText, dotContent);
    assert(result.prompts.size === 0);
  } finally {
    // Cleanup
    await fs.rm(testDir, { recursive: true });
  }
});

test('DirectoryWorkflowLoader loads regular DOT file correctly', async () => {
  const loader = new DirectoryWorkflowLoader();
  
  // Create a temporary DOT file for testing
  const testDotFile = './test-workflow.dot';
  const dotContent = `digraph Test {
    start [shape=Mdiamond label="Start" type="start"];
    end [shape=Msquare label="End" type="exit"];
    start -> end;
  }`;
  
  await fs.writeFile(testDotFile, dotContent);
  
  try {
    // Load the workflow
    const result = await loader.load(testDotFile);
    
    assert.strictEqual(result.dotText, dotContent);
    assert(result.prompts.size === 0);
  } finally {
    // Cleanup
    await fs.rm(testDotFile);
  }
});

test('DirectoryWorkflowLoader parseWithPrompts injects prompts into nodes', () => {
  const loader = new DirectoryWorkflowLoader();
  
  const dotContent = `digraph Test {
    node [shape=box];
    start [id="start"];
    end [id="end"];
    start -> end;
  }`;
  
  const prompts = new Map([['end', 'Custom prompt for end node']]);
  
  const graph = loader.parseWithPrompts(dotContent, prompts);
  
  const endNode = graph.getNode('end');
  assert.ok(endNode);
  assert.strictEqual(endNode.attributes.prompt, 'Custom prompt for end node');
});