/**
 * Unit tests for CodergenHandler target_file functionality
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'assert';
import { CodergenHandler } from '../src/handlers/codergen.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('CodergenHandler target_file', () => {
  let handler;
  let tempDir;

  beforeEach(async () => {
    handler = new CodergenHandler();
    tempDir = path.join(os.tmpdir(), `codergen-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('_buildReadModifyPrompt', () => {
    it('should include existing content in prompt', () => {
      const existingCode = 'function foo() { return 1; }';
      const task = 'Add a new function';
      
      const prompt = handler._buildReadModifyPrompt('test.js', existingCode, task);
      
      assert.ok(prompt.includes('test.js'));
      assert.ok(prompt.includes(existingCode));
      assert.ok(prompt.includes(task));
      assert.ok(prompt.includes('complete'));
    });

    it('should use correct language for .ts files', () => {
      const prompt = handler._buildReadModifyPrompt('test.ts', 'const x: number = 1;', 'Add function');
      
      assert.ok(prompt.includes('typescript'));
    });

    it('should use correct language for .py files', () => {
      const prompt = handler._buildReadModifyPrompt('test.py', 'def foo(): pass', 'Add function');
      
      assert.ok(prompt.includes('python'));
    });
  });

  describe('_buildNewFilePrompt', () => {
    it('should include file path and task', () => {
      const prompt = handler._buildNewFilePrompt('src/utils.js', 'Create a helper');
      
      assert.ok(prompt.includes('src/utils.js'));
      assert.ok(prompt.includes('Create a helper'));
      assert.ok(prompt.includes('complete file'));
    });
  });

  describe('_getLanguage', () => {
    it('should map .js to javascript', () => {
      assert.strictEqual(handler._getLanguage('.js'), 'javascript');
    });

    it('should map .ts to typescript', () => {
      assert.strictEqual(handler._getLanguage('.ts'), 'typescript');
    });

    it('should map .py to python', () => {
      assert.strictEqual(handler._getLanguage('.py'), 'python');
    });

    it('should map .go to go', () => {
      assert.strictEqual(handler._getLanguage('.go'), 'go');
    });

    it('should return text for unknown extensions', () => {
      assert.strictEqual(handler._getLanguage('.xyz'), 'text');
    });
  });

  describe('_extractCodeFromResponse', () => {
    it('should extract code from javascript code block', () => {
      const response = 'Here is the code:\n```javascript\nfunction test() { return 1; }\n```';
      const result = handler._extractCodeFromResponse(response, 'test.js');
      
      assert.ok(result.includes('function test()'));
    });

    it('should extract code from code block without language', () => {
      const response = '```\nconst x = 1;\n```';
      const result = handler._extractCodeFromResponse(response, 'test.js');
      
      assert.ok(result.includes('const x = 1'));
    });

    it('should extract code from response with multiple code blocks', () => {
      const response = `
Some text
\`\`\`javascript
function one() {}
\`\`\`

More text
\`\`\`python
def two(): pass
\`\`\`
`;
      const result = handler._extractCodeFromResponse(response, 'test.js');
      
      assert.ok(result.includes('function one()'));
    });
  });

  describe('_extractAndWriteFiles', () => {
    it('should write file from FILE: directive', async () => {
      const response = `FILE: test-output/example.js
\`\`\`javascript
function greet(name) { return "Hello, " + name; }
module.exports = { greet };
\`\`\``;
      
      const files = await handler._extractAndWriteFiles(response, tempDir);
      
      assert.strictEqual(files.length, 1);
      assert.strictEqual(files[0], 'test-output/example.js');
      
      const written = await fs.readFile(path.join(process.cwd(), 'test-output/example.js'), 'utf-8');
      assert.ok(written.includes('function greet'));
    });

    it('should write multiple files from multiple FILE: directives', async () => {
      const response = `FILE: test-multiple/a.js
\`\`\`javascript
const a = 1;
\`\`\`

FILE: test-multiple/b.js
\`\`\`javascript
const b = 2;
\`\`\``;
      
      const files = await handler._extractAndWriteFiles(response, tempDir);
      
      assert.strictEqual(files.length, 2);
    });

    it('should infer filename from export statement', async () => {
      const response = `Here is a utility function:
\`\`\`javascript
export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
\`\`\``;
      
      const files = await handler._extractAndWriteFiles(response, tempDir);
      
      assert.strictEqual(files.length, 1);
      assert.ok(files[0].includes('capitalize'));
    });

    it('should return empty array when no files found', async () => {
      const response = 'This is just a regular response without any code blocks.';
      
      const files = await handler._extractAndWriteFiles(response, tempDir);
      
      assert.strictEqual(files.length, 0);
    });
  });

  describe('_inferFilename', () => {
    it('should infer from module.exports', () => {
      const code = 'module.exports = { foo: function() {} };';
      const result = handler._inferFilename(code);
      
      assert.ok(result.includes('foo'));
    });

    it('should infer from export function', () => {
      const code = 'export function bar() {}';
      const result = handler._inferFilename(code);
      
      assert.ok(result.includes('bar'));
    });

    it('should infer from export default', () => {
      const code = 'export default function myFunc() {}';
      const result = handler._inferFilename(code);
      
      assert.ok(result.includes('myFunc'));
    });

    it('should return null for unrecognized code', () => {
      const code = 'some random text without exports';
      const result = handler._inferFilename(code);
      
      assert.strictEqual(result, null);
    });
  });

  describe('_guessExtension', () => {
    it('should guess .js for javascript', () => {
      assert.strictEqual(handler._guessExtension('const x = 1;'), 'js');
    });

    it('should guess .ts for typescript-like code', () => {
      assert.strictEqual(handler._guessExtension('const x: string = "hello";'), 'ts');
    });

    it('should guess .py for python', () => {
      assert.strictEqual(handler._guessExtension('def foo(): pass'), 'py');
    });

    it('should guess .go for go', () => {
      assert.strictEqual(handler._guessExtension('func main() {}'), 'go');
    });
  });
});
