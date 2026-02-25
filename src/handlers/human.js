/**
 * Human-in-the-Loop Handler - Wait for Human input
 */

import { Handler } from './registry.js';
import { Outcome } from '../pipeline/outcome.js';
import { 
  Question, 
  Option, 
  Choice, 
  QuestionType, 
  AcceleratorParser,
  ConsoleInterviewer 
} from '../human/interviewer.js';

export class WaitForHumanHandler extends Handler {
  constructor(interviewer = null) {
    super();
    this.interviewer = interviewer || new ConsoleInterviewer();
  }

  async execute(node, context, graph, logsRoot) {
    // 1. Derive choices from outgoing edges
    const edges = graph.getOutgoingEdges(node.id);
    const choices = [];

    for (const edge of edges) {
      const label = edge.label || edge.to;
      const key = AcceleratorParser.parseAcceleratorKey(label);
      const cleanLabel = AcceleratorParser.stripAcceleratorPrefix(label);
      
      choices.push(new Choice(key, cleanLabel, edge.to));
    }

    if (choices.length === 0) {
      return Outcome.fail('No outgoing edges for human gate');
    }

    // 2. Build question from choices
    const options = choices.map(choice => 
      new Option(choice.key, `${choice.key}) ${choice.label}`, choice.to)
    );

    const question = new Question({
      text: node.label || 'Select an option:',
      type: QuestionType.MULTIPLE_CHOICE,
      options,
      stage: node.id,
      timeout: node.timeout || null
    });

    try {
      // 3. Present to interviewer and wait for answer
      const answer = await this.interviewer.ask(question);

      // 4. Handle timeout/skip
      if (answer.isTimeout()) {
        const defaultChoice = node.get('human.default_choice');
        if (defaultChoice) {
          const selected = choices.find(c => 
            c.key === defaultChoice || 
            c.to === defaultChoice ||
            c.label.toLowerCase() === defaultChoice.toLowerCase()
          );
          
          if (selected) {
            return Outcome.success(`Human gate completed with default choice: ${selected.label}`, {
              'human.gate.selected': selected.key,
              'human.gate.label': selected.label,
              'human.gate.timeout': true
            }).withSuggestedNext([selected.to]);
          }
        }
        
        return Outcome.retry('Human gate timeout, no default choice available');
      }

      if (answer.isSkipped()) {
        return Outcome.fail('Human skipped interaction');
      }

      // 5. Find matching choice
      let selected = choices.find(c => c.to === answer.value);
      
      if (!selected && answer.choice) {
        selected = choices.find(c => 
          c.key === answer.choice.key ||
          c.to === answer.choice.to
        );
      }
      
      if (!selected) {
        // Fallback to first choice
        selected = choices[0];
      }

      // 6. Record in context and return
      return Outcome.success(`Human selected: ${selected.label}`, {
        'human.gate.selected': selected.key,
        'human.gate.label': selected.label,
        'human.gate.value': answer.value
      }).withSuggestedNext([selected.to]);

    } catch (error) {
      return Outcome.fail(`Human interaction error: ${error.message}`);
    }
  }
}