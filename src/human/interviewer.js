/**
 * Human-in-the-Loop Interviewer Pattern
 * Enables human interaction within pipeline execution
 */

export const QuestionType = {
  MULTIPLE_CHOICE: 'multiple_choice',
  TEXT_INPUT: 'text_input',
  YES_NO: 'yes_no',
  CONFIRMATION: 'confirmation'
};

export class Question {
  constructor(options = {}) {
    this.text = options.text || '';
    this.type = options.type || QuestionType.MULTIPLE_CHOICE;
    this.options = options.options || [];
    this.stage = options.stage || '';
    this.timeout = options.timeout || null;
    this.defaultChoice = options.defaultChoice || null;
  }
}

export class Option {
  constructor(key, label, value = null) {
    this.key = key;
    this.label = label;
    this.value = value || key;
  }
}

export class Choice {
  constructor(key, label, to) {
    this.key = key;
    this.label = label;
    this.to = to;
  }
}

export class Answer {
  constructor(value, choice = null) {
    this.value = value;
    this.choice = choice;
    this.timestamp = new Date();
  }

  static timeout() {
    return new Answer('TIMEOUT');
  }

  static skip() {
    return new Answer('SKIPPED');
  }

  isTimeout() {
    return this.value === 'TIMEOUT';
  }

  isSkipped() {
    return this.value === 'SKIPPED';
  }
}

// Base Interviewer interface
export class Interviewer {
  async ask(question) {
    throw new Error('Interviewer.ask() must be implemented by subclasses');
  }

  close() {
    // Override in subclasses if cleanup needed
  }
}

// Console-based interviewer for CLI usage
export class ConsoleInterviewer extends Interviewer {
  constructor(options = {}) {
    super();
    this.timeout = options.timeout || 60000; // 1 minute default
    this.readline = null;
  }

  async ask(question) {
    const readline = await import('readline');
    
    this.readline = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    try {
      return await this._askQuestion(question);
    } finally {
      this.readline.close();
      this.readline = null;
    }
  }

  async _askQuestion(question) {
    console.log(`\n🤔 ${question.text}`);
    
    if (question.type === QuestionType.MULTIPLE_CHOICE) {
      return await this._askMultipleChoice(question);
    } else if (question.type === QuestionType.YES_NO) {
      return await this._askYesNo(question);
    } else if (question.type === QuestionType.TEXT_INPUT) {
      return await this._askTextInput(question);
    } else {
      throw new Error(`Unsupported question type: ${question.type}`);
    }
  }

  async _askMultipleChoice(question) {
    // Display options
    for (const option of question.options) {
      console.log(`  [${option.key}] ${option.label}`);
    }

    if (question.timeout) {
      console.log(`\n⏱️  Timeout: ${Math.round(question.timeout / 1000)}s`);
    }

    return new Promise((resolve) => {
      const timeoutId = question.timeout ? 
        setTimeout(() => {
          console.log('\n⏰ Timeout reached');
          resolve(Answer.timeout());
        }, question.timeout) : null;

      const askForInput = () => {
        this.readline.question('\nYour choice: ', (input) => {
          if (timeoutId) clearTimeout(timeoutId);
          
          const choice = input.trim().toUpperCase();
          
          if (choice === 'Q' || choice === 'QUIT') {
            resolve(Answer.skip());
            return;
          }

          // Find matching option
          const option = question.options.find(o => 
            o.key.toUpperCase() === choice || 
            o.label.toLowerCase().startsWith(choice.toLowerCase())
          );

          if (option) {
            resolve(new Answer(option.value, new Choice(option.key, option.label, option.value)));
          } else {
            console.log(`❌ Invalid choice. Please select from: ${question.options.map(o => o.key).join(', ')}`);
            askForInput();
          }
        });
      };

      askForInput();
    });
  }

  async _askYesNo(question) {
    console.log('  [Y] Yes');
    console.log('  [N] No');

    return new Promise((resolve) => {
      const timeoutId = question.timeout ? 
        setTimeout(() => {
          console.log('\n⏰ Timeout reached');
          resolve(Answer.timeout());
        }, question.timeout) : null;

      const askForInput = () => {
        this.readline.question('\nYour choice (Y/N): ', (input) => {
          if (timeoutId) clearTimeout(timeoutId);
          
          const choice = input.trim().toUpperCase();
          
          if (choice === 'Q' || choice === 'QUIT') {
            resolve(Answer.skip());
            return;
          }

          if (choice === 'Y' || choice === 'YES') {
            resolve(new Answer('yes', new Choice('Y', 'Yes', 'yes')));
          } else if (choice === 'N' || choice === 'NO') {
            resolve(new Answer('no', new Choice('N', 'No', 'no')));
          } else {
            console.log('❌ Please enter Y for Yes or N for No');
            askForInput();
          }
        });
      };

      askForInput();
    });
  }

  async _askTextInput(question) {
    return new Promise((resolve) => {
      const timeoutId = question.timeout ? 
        setTimeout(() => {
          console.log('\n⏰ Timeout reached');
          resolve(Answer.timeout());
        }, question.timeout) : null;

      this.readline.question('\nYour input: ', (input) => {
        if (timeoutId) clearTimeout(timeoutId);
        
        const text = input.trim();
        
        if (text === 'q' || text === 'quit') {
          resolve(Answer.skip());
          return;
        }

        resolve(new Answer(text));
      });
    });
  }

  close() {
    if (this.readline) {
      this.readline.close();
    }
  }
}

// Web-based interviewer for browser/server usage
export class WebInterviewer extends Interviewer {
  constructor(options = {}) {
    super();
    this.port = options.port || 3001;
    this.server = null;
    this.pendingQuestions = new Map();
    this.questionId = 0;
  }

  async ask(question) {
    if (!this.server) {
      await this._startServer();
    }

    const id = ++this.questionId;
    
    return new Promise((resolve) => {
      const timeoutId = question.timeout ? 
        setTimeout(() => {
          this.pendingQuestions.delete(id);
          resolve(Answer.timeout());
        }, question.timeout) : null;

      this.pendingQuestions.set(id, {
        question,
        resolve: (answer) => {
          if (timeoutId) clearTimeout(timeoutId);
          this.pendingQuestions.delete(id);
          resolve(answer);
        }
      });

      // Emit question to connected clients
      this._broadcastQuestion(id, question);
    });
  }

  async _startServer() {
    // This would start an HTTP server for web-based interaction
    // Implementation would depend on specific web framework
    console.log(`🌐 Web interviewer would start on port ${this.port}`);
    console.log('   (Web interface implementation depends on specific web framework)');
  }

  _broadcastQuestion(id, question) {
    // This would broadcast the question to connected web clients
    console.log(`📡 Broadcasting question ${id}: ${question.text}`);
  }

  close() {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }
}

// Utility functions for parsing accelerator keys
export class AcceleratorParser {
  static parseAcceleratorKey(label) {
    if (!label) return null;

    // Pattern: [K] Label
    let match = label.match(/^\[(\w)\]\s*(.+)$/);
    if (match) return match[1].toUpperCase();

    // Pattern: K) Label  
    match = label.match(/^(\w)\)\s*(.+)$/);
    if (match) return match[1].toUpperCase();

    // Pattern: K - Label
    match = label.match(/^(\w)\s*-\s*(.+)$/);
    if (match) return match[1].toUpperCase();

    // Default: first character
    return label.charAt(0).toUpperCase();
  }

  static stripAcceleratorPrefix(label) {
    if (!label) return '';

    // Remove [K] prefix
    let cleaned = label.replace(/^\[?\w+\]\s*/, '');
    if (cleaned !== label) return cleaned;

    // Remove K) prefix
    cleaned = label.replace(/^\w+\)\s*/, '');
    if (cleaned !== label) return cleaned;

    // Remove K - prefix
    cleaned = label.replace(/^\w+\s*-\s*/, '');
    if (cleaned !== label) return cleaned;

    return label;
  }
}