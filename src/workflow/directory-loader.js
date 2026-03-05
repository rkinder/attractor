/**
 * Directory-based Workflow Loader - Loads DOT workflows from directories
 * with separate prompt files in a prompts subdirectory
 */

import fs from 'fs/promises';
import path from 'path';
import { DOTParser } from '../pipeline/parser.js';

/**
 * Directory-based workflow loader that can handle workflows defined
 * as directories with DOT files alongside prompts in a prompts subdirectory
 */
export class DirectoryWorkflowLoader {
  constructor() {
    this.parser = new DOTParser();
  }

  /**
   * Load a workflow from a file path, which can be either:
   * 1. A DOT file directly (existing behavior)
   * 2. A directory containing a DOT file and prompts subdirectory (new behavior)
   * 
   * @param {string} workflowPath - Path to either a DOT file or workflow directory
   * @returns {Promise<{dotText: string, prompts: Map<string, string>}>} - Parsed workflow data
   */
  async load(workflowPath) {
    const stats = await fs.stat(workflowPath);
    
    if (stats.isDirectory()) {
      return await this._loadFromDirectory(workflowPath);
    } else if (stats.isFile() && workflowPath.endsWith('.dot')) {
      return await this._loadFromFile(workflowPath);
    } else {
      throw new Error(`Unsupported workflow path: ${workflowPath}. Must be a .dot file or directory.`);
    }
  }

  /**
   * Load workflow from a directory structure
   * 
   * @private
   * @param {string} dirPath - Path to directory containing workflow
   * @returns {Promise<{dotText: string, prompts: Map<string, string>}>}
   */
  async _loadFromDirectory(dirPath) {
    const dotFilePath = path.join(dirPath, 'workflow.dot');
    const promptsDirPath = path.join(dirPath, 'prompts');
    
    // Read the main DOT file
    const dotText = await fs.readFile(dotFilePath, 'utf-8');
    
    // Load all prompt files from prompts directory
    const prompts = new Map();
    
    try {
      const promptFiles = await fs.readdir(promptsDirPath);
      
      for (const fileName of promptFiles) {
        if (fileName.endsWith('.txt')) {
          const nodeId = path.basename(fileName, '.txt');
          const promptContent = await fs.readFile(path.join(promptsDirPath, fileName), 'utf-8');
          prompts.set(nodeId, promptContent);
        }
      }
    } catch (error) {
      // If prompts directory doesn't exist, that's fine - proceed with empty prompts
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
    
    return { dotText, prompts };
  }

  /**
   * Load workflow from a DOT file (existing behavior)
   * 
   * @private
   * @param {string} filePath - Path to DOT file
   * @returns {Promise<{dotText: string, prompts: Map<string, string>}>}
   */
  async _loadFromFile(filePath) {
    const dotText = await fs.readFile(filePath, 'utf-8');
    return { dotText, prompts: new Map() };
  }

   /**
    * Parse the DOT content and inject prompts if they exist
    * 
    * @param {string} dotText - DOT file content
    * @param {Map<string, string>} prompts - Map of node IDs to prompt content
    * @returns {import('../pipeline/parser.js').Graph} - Parsed graph with prompts injected
    */
  parseWithPrompts(dotText, prompts) {
    const graph = this.parser.parse(dotText);
    
    // Inject prompts into nodes that have corresponding prompt files
    for (const node of graph.nodes.values()) {
      if (prompts.has(node.id)) {
        // If there's already a prompt attribute, we might want to merge or override
        // For now, we'll override with the file content
        node.attributes.prompt = prompts.get(node.id);
      }
    }
    
    return graph;
  }
}