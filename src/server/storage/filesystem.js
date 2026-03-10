/**
 * Filesystem Storage Module
 * Simple file-based state persistence for pipeline data
 * Uses JSON files organized by pipeline ID
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class FileStorage {
  constructor() {
    this.baseDir = config.getStorage().stateDir || path.join(process.cwd(), 'data', 'state');
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    await fs.promises.mkdir(this.baseDir, { recursive: true });
    await fs.promises.mkdir(path.join(this.baseDir, 'pipelines'), { recursive: true });
    await fs.promises.mkdir(path.join(this.baseDir, 'artifacts'), { recursive: true });
    await fs.promises.mkdir(path.join(this.baseDir, 'decisions'), { recursive: true });
    
    this.initialized = true;
    console.log('[FileStorage] Initialized at:', this.baseDir);
  }

  _getPipelineDir(pipelineId) {
    return path.join(this.baseDir, 'pipelines', pipelineId);
  }

  async _ensurePipelineDir(pipelineId) {
    const dir = this._getPipelineDir(pipelineId);
    await fs.promises.mkdir(dir, { recursive: true });
    return dir;
  }

  // ==================== Pipeline State ====================

  async setPipelineState(pipelineId, state, ttlSeconds = null) {
    await this._ensurePipelineDir(pipelineId);
    const filePath = path.join(this._getPipelineDir(pipelineId), 'state.json');
    
    const data = {
      ...state,
      _updatedAt: new Date().toISOString()
    };
    
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
    return true;
  }

  async getPipelineState(pipelineId) {
    const filePath = path.join(this._getPipelineDir(pipelineId), 'state.json');
    
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }

  async deletePipelineState(pipelineId) {
    const dir = this._getPipelineDir(pipelineId);
    
    try {
      await fs.promises.rm(dir, { recursive: true, force: true });
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') return true;
      throw error;
    }
  }

  // ==================== Artifacts ====================

  async addArtifactMetadata(pipelineId, artifactId, metadata) {
    await this._ensurePipelineDir(pipelineId);
    const filePath = path.join(this._getPipelineDir(pipelineId), 'artifacts.json');
    
    let artifacts = {};
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      artifacts = JSON.parse(content);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    
    artifacts[artifactId] = {
      ...metadata,
      _createdAt: new Date().toISOString()
    };
    
    await fs.promises.writeFile(filePath, JSON.stringify(artifacts, null, 2));
    return true;
  }

  async getArtifactMetadata(pipelineId, artifactId) {
    const filePath = path.join(this._getPipelineDir(pipelineId), 'artifacts.json');
    
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const artifacts = JSON.parse(content);
      return artifacts[artifactId] || null;
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }

  async getAllArtifactMetadata(pipelineId) {
    const filePath = path.join(this._getPipelineDir(pipelineId), 'artifacts.json');
    
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      if (error.code === 'ENOENT') return {};
      throw error;
    }
  }

  async saveArtifactFile(pipelineId, filename, content) {
    const dir = path.join(config.getStorage().artifactsDir, pipelineId);
    await fs.promises.mkdir(dir, { recursive: true });
    
    const filePath = path.join(dir, filename);
    await fs.promises.writeFile(filePath, content);
    return filePath;
  }

  async getArtifactFile(pipelineId, filename) {
    const filePath = path.join(config.getStorage().artifactsDir, pipelineId, filename);
    return fs.promises.readFile(filePath, 'utf-8');
  }

  async listArtifactFiles(pipelineId) {
    const dir = path.join(config.getStorage().artifactsDir, pipelineId);
    
    try {
      const files = await fs.promises.readdir(dir);
      return files;
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  // ==================== Decisions ====================

  async addDecision(decision) {
    const filePath = path.join(this.baseDir, 'decisions', 'all.json');
    
    let decisions = [];
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      decisions = JSON.parse(content);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    
    decisions.push({
      ...decision,
      _timestamp: new Date().toISOString()
    });
    
    // Keep last 1000 decisions
    decisions = decisions.slice(-1000);
    
    await fs.promises.writeFile(filePath, JSON.stringify(decisions, null, 2));
    return true;
  }

  async getDecisions(limit = 100) {
    const filePath = path.join(this.baseDir, 'decisions', 'all.json');
    
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const decisions = JSON.parse(content);
      return decisions.slice(-limit).reverse();
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  async getPipelineDecisions(pipelineId, limit = 100) {
    const allDecisions = await this.getDecisions(limit * 2);
    return allDecisions.filter(d => d.pipelineId === pipelineId).slice(0, limit);
  }

  // ==================== Pipeline List ====================

  async listPipelines() {
    const pipelinesDir = path.join(this.baseDir, 'pipelines');
    
    try {
      const entries = await fs.promises.readdir(pipelinesDir);
      const pipelines = [];
      
      for (const id of entries) {
        const state = await this.getPipelineState(id);
        if (state) {
          pipelines.push({ id, ...state });
        }
      }
      
      return pipelines.sort((a, b) => 
        new Date(b._updatedAt) - new Date(a._updatedAt)
      );
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  // ==================== Instance Info (for distributed) ====================

  async setInstanceInfo(instanceId, info) {
    const filePath = path.join(this.baseDir, 'instances', `${instanceId}.json`);
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    
    await fs.promises.writeFile(filePath, JSON.stringify({
      ...info,
      _heartbeat: new Date().toISOString()
    }, null, 2));
    return true;
  }

  async getActiveInstances() {
    const instancesDir = path.join(this.baseDir, 'instances');
    
    try {
      const entries = await fs.promises.readdir(instancesDir);
      const instances = [];
      const now = Date.now();
      
      for (const file of entries) {
        if (!file.endsWith('.json')) continue;
        
        const content = await fs.promises.readFile(
          path.join(instancesDir, file), 'utf-8'
        );
        const info = JSON.parse(content);
        
        // Consider active if heartbeat within 60 seconds
        const heartbeatAge = now - new Date(info._heartbeat).getTime();
        if (heartbeatAge < 60000) {
          instances.push(info);
        }
      }
      
      return instances;
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }
}

export const fileStorage = new FileStorage();
export default fileStorage;
