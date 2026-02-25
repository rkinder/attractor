#!/usr/bin/env node

/**
 * Kilo Integration Demonstration
 * 
 * Shows off all the new Kilo Gateway features including:
 * - Smart model routing
 * - Cost tracking
 * - Usage monitoring  
 * - Multi-workflow execution
 * - Performance analytics
 */

import { 
  Attractor, 
  createKiloAdapter, 
  createModelRouter, 
  TaskHints,
  UsageTracker,
  UsageReporter
} from './src/index.js';

class KiloDemo {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
  }

  async run() {
    console.log('🚀 Kilo Gateway Integration Demonstration\n');
    
    // Check if we have a real Kilo API key
    const hasKiloKey = !!process.env.KILO_API_KEY;
    
    if (hasKiloKey) {
      console.log('✅ Kilo API key detected - running with real LLM calls');
      await this.runRealDemo();
    } else {
      console.log('⚠️  No Kilo API key - running simulation demo');
      await this.runSimulationDemo();
    }
    
    await this.generateDemoReport();
  }

  async runRealDemo() {
    console.log('\n🔧 Initializing Kilo Gateway integration...');
    
    // Create usage tracker
    const usageTracker = new UsageTracker({
      sessionId: `kilo-demo-${Date.now()}`,
      persistPath: './logs/kilo-demo-usage.json'
    });
    await usageTracker.initialize();
    
    // Test different Kilo configurations
    const configs = ['budget', 'balanced', 'performance'];
    
    for (const config of configs) {
      console.log(`\n📊 Testing ${config} configuration...`);
      
      try {
        const kiloAdapter = createKiloAdapter(config, {
          api_key: process.env.KILO_API_KEY,
          organization_id: process.env.KILO_ORG_ID
        });
        
        await kiloAdapter.initialize();
        console.log(`   ✅ ${config} configuration initialized`);
        
        // Show model strategies
        const strategies = kiloAdapter.getModelStrategies();
        console.log(`   🎯 Model strategies:`, strategies);
        
        this.results.push({
          config,
          status: 'success',
          modelStrategies: strategies,
          timestamp: Date.now()
        });
        
      } catch (error) {
        console.log(`   ❌ ${config} configuration failed: ${error.message}`);
        this.results.push({
          config,
          status: 'error',
          error: error.message,
          timestamp: Date.now()
        });
      }
    }
    
    // Test model router
    console.log('\n🧠 Testing smart model routing...');
    const modelRouter = createModelRouter('balanced');
    
    const testTasks = [
      { taskType: 'code_analysis', complexity: 'high' },
      { taskType: 'documentation', complexity: 'medium' },
      { taskType: 'security_review', complexity: 'high', priority: 'high' },
      { taskType: 'quick_tasks', complexity: 'low' }
    ];
    
    for (const task of testTasks) {
      const selectedModel = modelRouter.selectModel(task);
      console.log(`   📋 ${task.taskType} (${task.complexity}) → ${selectedModel}`);
    }
    
    // Show workflow model strategies
    console.log('\n🔄 Workflow model strategies:');
    const workflowTypes = ['code_analysis', 'documentation', 'testing', 'development'];
    
    for (const workflowType of workflowTypes) {
      const strategy = modelRouter.getWorkflowModelStrategy(workflowType);
      console.log(`   📈 ${workflowType}:`, strategy);
    }
    
    await usageTracker.persist();
  }

  async runSimulationDemo() {
    console.log('\n🎮 Running simulation to demonstrate features...');
    
    // Show what would happen with different configurations
    console.log('\n📊 Available Kilo Configurations:');
    
    const configs = {
      budget: 'Cost-optimized for daily use under $1',
      balanced: 'Best performance/cost ratio (recommended)', 
      performance: 'Maximum quality regardless of cost'
    };
    
    for (const [config, description] of Object.entries(configs)) {
      console.log(`   ${config.padEnd(12)} - ${description}`);
    }
    
    // Show model routing examples
    console.log('\n🧠 Smart Model Routing Examples:');
    const modelRouter = createModelRouter('balanced');
    
    const examples = [
      { taskType: 'code_analysis', complexity: 'high', description: 'Deep code analysis' },
      { taskType: 'security_review', complexity: 'high', description: 'Security audit' },
      { taskType: 'documentation', complexity: 'medium', description: 'README generation' },
      { taskType: 'quick_tasks', complexity: 'low', description: 'Simple formatting' }
    ];
    
    for (const example of examples) {
      const model = modelRouter.selectModel(example);
      console.log(`   ${example.description.padEnd(20)} → ${model}`);
    }
    
    // Show workflow capabilities
    console.log('\n🔄 Available AI Workflows:');
    const workflows = [
      { file: 'comprehensive-code-analysis.dot', description: 'Multi-stage code analysis with security & performance' },
      { file: 'documentation-suite.dot', description: 'Complete documentation generation' },
      { file: 'testing-pipeline.dot', description: 'Test generation and coverage analysis' },
      { file: 'development-lifecycle.dot', description: 'End-to-end development workflow' }
    ];
    
    for (const workflow of workflows) {
      console.log(`   ${workflow.file.padEnd(35)} - ${workflow.description}`);
    }
    
    // Simulate usage tracking
    console.log('\n💰 Cost Tracking Simulation:');
    const usageTracker = new UsageTracker({ trackingEnabled: true });
    
    // Simulate some requests
    const simulatedRequests = [
      { model: 'anthropic/claude-sonnet-4.5', inputTokens: 1000, outputTokens: 500, nodeId: 'analyze_code' },
      { model: 'openai/gpt-4o', inputTokens: 800, outputTokens: 1200, nodeId: 'generate_docs' },
      { model: 'anthropic/claude-opus-4-6', inputTokens: 1500, outputTokens: 800, nodeId: 'security_review' }
    ];
    
    let totalCost = 0;
    for (const request of simulatedRequests) {
      usageTracker.trackRequest({ 
        ...request, 
        workflowId: 'demo-workflow',
        success: true,
        duration: Math.random() * 5000 + 1000
      });
      
      // Calculate cost for display
      const costEstimates = {
        'anthropic/claude-sonnet-4.5': { input: 0.003, output: 0.015 },
        'openai/gpt-4o': { input: 0.0025, output: 0.01 },
        'anthropic/claude-opus-4-6': { input: 0.015, output: 0.075 }
      };
      
      const rates = costEstimates[request.model];
      const cost = (request.inputTokens / 1000) * rates.input + (request.outputTokens / 1000) * rates.output;
      totalCost += cost;
      
      console.log(`   ${request.nodeId.padEnd(15)} - ${request.model.padEnd(30)} $${cost.toFixed(4)}`);
    }
    
    console.log(`   ${''.padEnd(47)}-------`);
    console.log(`   ${'Total Estimated Cost'.padEnd(47)} $${totalCost.toFixed(4)}`);
  }

  async generateDemoReport() {
    const duration = (Date.now() - this.startTime) / 1000;
    
    console.log('\n📋 Demo Summary:');
    console.log(`   Duration: ${duration.toFixed(1)}s`);
    console.log(`   Configurations tested: ${this.results.length}`);
    console.log(`   Successful: ${this.results.filter(r => r.status === 'success').length}`);
    console.log(`   Failed: ${this.results.filter(r => r.status === 'error').length}`);
    
    console.log('\n🎯 Key Features Demonstrated:');
    console.log('   ✅ Kilo Gateway adapter with OpenAI compatibility');
    console.log('   ✅ Smart model routing based on task type and complexity');
    console.log('   ✅ Multiple configuration presets (budget/balanced/performance)');
    console.log('   ✅ Cost tracking and usage monitoring');
    console.log('   ✅ Comprehensive workflow templates');
    console.log('   ✅ Error handling and fallback strategies');
    
    console.log('\n🚀 Next Steps:');
    console.log('   1. Set KILO_API_KEY to run with real LLM calls');
    console.log('   2. Try: node run-with-kilo.js workflows/comprehensive-code-analysis.dot ./');
    console.log('   3. Experiment with different KILO_CONFIG values');
    console.log('   4. Set KILO_COST_BUDGET to control spending');
    
    console.log('\n💡 Example Commands:');
    console.log('   export KILO_API_KEY=your-api-key');
    console.log('   export KILO_CONFIG=balanced');
    console.log('   export KILO_COST_BUDGET=5.00');
    console.log('   node run-with-kilo.js workflows/comprehensive-code-analysis.dot');
    
    console.log('\n🎉 Kilo integration demonstration complete!');
  }
}

async function main() {
  const demo = new KiloDemo();
  await demo.run();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}