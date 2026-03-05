import { test, describe } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

const CLI_PATH = './src/cli.js';

describe('Advanced CLI', () => {
  
  test('--version shows version number', () => {
    const output = execSync(`node ${CLI_PATH} --version`, { encoding: 'utf-8' });
    assert.strictEqual(output.trim(), '1.0.0');
  });
  
  test('--help shows help text', () => {
    const output = execSync(`node ${CLI_PATH} --help`, { encoding: 'utf-8' });
    assert.ok(output.includes('Usage:'));
    assert.ok(output.includes('Commands:'));
    assert.ok(output.includes('run'));
    assert.ok(output.includes('validate'));
  });
  
  test('validate command accepts valid DOT file', () => {
    const output = execSync(`node ${CLI_PATH} validate examples/simple-linear.dot`, { encoding: 'utf-8' });
    assert.ok(output.includes('✓ Validation passed'));
  });
  
  test('validate command returns exit code 0 for valid file', () => {
    try {
      execSync(`node ${CLI_PATH} validate examples/simple-linear.dot`, { encoding: 'utf-8' });
      assert(true);
    } catch (error) {
      assert.strictEqual(error.status, 0);
    }
  });
  
  test('validate command returns exit code 2 for missing file', () => {
    try {
      execSync(`node ${CLI_PATH} validate nonexistent.dot`, { encoding: 'utf-8' });
      assert(false, 'Should have thrown');
    } catch (error) {
      assert.strictEqual(error.status, 2);
    }
  });
  
  test('run command returns exit code 2 for missing file', () => {
    try {
      execSync(`node ${CLI_PATH} run nonexistent.dot`, { encoding: 'utf-8' });
      assert(false, 'Should have thrown');
    } catch (error) {
      assert.strictEqual(error.status, 2);
    }
  });
  
  test('run command shows error message for missing file', () => {
    try {
      execSync(`node ${CLI_PATH} run nonexistent.dot`, { encoding: 'utf-8' });
      assert(false, 'Should have thrown');
    } catch (error) {
      assert.ok(error.stderr.includes('Error: File not found'));
    }
  });
  
  test('validate command shows help when no file provided', () => {
    try {
      execSync(`node ${CLI_PATH} validate`, { encoding: 'utf-8' });
      assert(false, 'Should have thrown');
    } catch (error) {
      assert.ok(error.status === 1 || error.status === 2);
    }
  });
  
  test('run command shows help when no file provided', () => {
    try {
      execSync(`node ${CLI_PATH} run`, { encoding: 'utf-8' });
      assert(false, 'Should have thrown');
    } catch (error) {
      assert.ok(error.status === 1 || error.status === 2);
    }
  });
  
  test('default command shows help', () => {
    const output = execSync(`node ${CLI_PATH}`, { encoding: 'utf-8' });
    assert.ok(output.includes('Usage:'));
  });
});
