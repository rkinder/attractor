#!/usr/bin/env node

/**
 * Advanced CLI for Attractor - Unified command-line interface
 * 
 * Provides:
 * - attractor run <dot-file> - Execute workflow
 * - attractor validate <dot-file> - Validate workflow only
 * - Comprehensive help system
 * - Configuration options
 */

import { Command } from 'commander';
import fs from 'fs/promises';
import path from 'path';
import { Attractor } from './index.js';
import { PipelineLinter } from './validation/linter.js';
import { DOTParser } from './pipeline/parser.js';

const program = new Command();

async function validateDotFile(dotFilePath) {
  try {
    const dotText = await fs.readFile(dotFilePath, 'utf-8');
    const parser = new DOTParser();
    const graph = parser.parse(dotText);
    
    // Pass null handlerRegistry to skip handler validation
    const linter = new PipelineLinter({ handlerRegistry: null });
    
    const result = linter.validate(graph);
    
    if (result.hasErrors) {
      console.error('Validation failed with errors:');
      for (const error of result.getErrors()) {
        console.error(`  - ${error.message}`);
      }
      return false;
    }
    
    if (result.hasWarnings) {
      console.warn('Validation completed with warnings:');
      for (const warning of result.getWarnings()) {
        console.warn(`  - ${warning.message}`);
      }
    }
    
    console.log('✓ Validation passed');
    return true;
    
  } catch (error) {
    console.error(`Validation error: ${error.message}`);
    return false;
  }
}

async function runWorkflow(dotFilePath, options) {
  // Set environment variables from CLI options (CLI flags override env vars)
  if (options.gatewayConfig) {
    process.env.KILO_CONFIG = options.gatewayConfig;
  }
  
  if (options.gateway) {
    process.env.KILO_GATEWAY = options.gateway;
  }
  
  if (options.maxTokens) {
    process.env.KILO_MAX_TOKENS = options.maxTokens;
  }
  
  try {
    const attractor = await Attractor.create();
    
    // Setup event handlers
    attractor.on('pipeline_start', ({ runId, dotFilePath }) => {
      console.log(`Starting pipeline: ${runId}`);
      console.log(`Workflow: ${dotFilePath}`);
    });
    
    attractor.on('node_execution_start', ({ nodeId, attempt, maxAttempts }) => {
      if (attempt === 1) {
        console.log(`Executing: ${nodeId}`);
      } else {
        console.log(`Retry ${attempt}/${maxAttempts}: ${nodeId}`);
      }
    });
    
    attractor.on('node_execution_success', ({ nodeId, outcome }) => {
      console.log(`✓ ${nodeId}: ${outcome.notes || 'completed'}`);
    });
    
    attractor.on('node_execution_failed', ({ nodeId, reason }) => {
      console.error(`✗ ${nodeId}: ${reason}`);
    });
    
    attractor.on('pipeline_complete', ({ runId, result }) => {
      if (result.success) {
        console.log(`\n✓ Pipeline completed successfully`);
      } else {
        console.log(`\n✗ Pipeline failed`);
      }
      console.log(`Run ID: ${runId}`);
    });
    
    const runOptions = {
      runId: options.resume,
      logsRoot: options.logs || './logs'
    };
    
    const result = await attractor.run(dotFilePath, runOptions);
    
    return result.success ? 0 : 1;
    
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return 1;
  }
}

// Handle SIGINT for graceful exit
process.on('SIGINT', () => {
  console.log('\nInterrupted by user');
  process.exit(130);
});

// Main program setup
program
  .name('attractor')
  .description('A DOT-based pipeline runner for orchestrating multi-stage AI workflows')
  .version('1.0.0');

// Run command
program
  .command('run <dot-file>')
  .description('Execute a workflow from a DOT file')
  .option('--gateway-config <value>', 'Override KILO_CONFIG environment variable')
  .option('--gateway <host>', 'Override KILO_GATEWAY environment variable')
  .option('--stylesheet <file>', 'Apply specified model stylesheet')
  .option('--mcp-config <value>', 'Load specified MCP configuration')
  .option('--auto-approve', 'Automatically approve all human gates', false)
  .option('--logs <dir>', 'Write logs to specified directory', './logs')
  .option('--resume <run-id>', 'Resume from specified checkpoint')
  .option('--max-tokens <value>', 'Override token limit for LLM calls')
  .addHelpText('after', `
Examples:
  $ attractor run workflow.dot
  $ attractor run workflow.dot --logs ./my-logs
  $ attractor run workflow.dot --gateway-config balanced
  $ attractor run workflow.dot --resume run-2024-01-15-abc123`)
  .action(async (dotFile, options) => {
    // Validate file exists
    try {
      await fs.access(dotFile);
    } catch {
      console.error(`Error: File not found: ${dotFile}`);
      console.error(`Try 'attractor run --help' for more information`);
      process.exit(2);
    }
    
    const exitCode = await runWorkflow(dotFile, options);
    process.exit(exitCode);
  });

// Validate command
program
  .command('validate <dot-file>')
  .description('Validate a DOT file without executing')
  .addHelpText('after', `
Examples:
  $ attractor validate workflow.dot`)
  .action(async (dotFile) => {
    // Validate file exists
    try {
      await fs.access(dotFile);
    } catch {
      console.error(`Error: File not found: ${dotFile}`);
      console.error(`Try 'attractor validate --help' for more information`);
      process.exit(2);
    }
    
    const isValid = await validateDotFile(dotFile);
    process.exit(isValid ? 0 : 1);
  });

// Default command (show help)
program
  .action(() => {
    program.help();
  });

// Parse arguments
program.parse(process.argv);
