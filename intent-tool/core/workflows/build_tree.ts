#!/usr/bin/env bun
/**
 * Build Guide Tree & Bottom-Up Layers
 * 
 * Input (stdin JSON): { affected_docs: string[], repo_root: string }
 * Output (stdout JSON): { layers: string[][] } where layers[0] = leaves
 * 
 * Algorithm:
 * 1. Build parent-child relationships for all affected guides
 * 2. Identify leaves (guides with no children)
 * 3. Compute layers bottom-up: process leaves, then their parents, etc.
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';

interface Input {
  affected_docs: string[];
  repo_root?: string;
}

/**
 * Find the parent guide for a given guide path
 * Walks up the directory tree looking for agents.md or CLAUDE.md
 */
function parentGuidePath(guide: string, allGuides: Set<string>): string | null {
  let dir = dirname(guide);
  
  while (dir !== '.' && dir !== '/' && dir !== '') {
    // Check for agents.md first (preferred)
    const candidate = join(dir, 'agents.md');
    if (allGuides.has(candidate) && candidate !== guide) {
      return candidate;
    }
    
    // Legacy fallback to CLAUDE.md
    const legacy = join(dir, 'CLAUDE.md');
    if (allGuides.has(legacy) && legacy !== guide) {
      return legacy;
    }
    
    dir = dirname(dir);
  }
  
  return null;
}

/**
 * Build layers bottom-up from affected guides
 */
function buildLayers(docs: string[]): string[][] {
  if (docs.length === 0) return [];
  
  const set = new Set<string>(docs);
  const parents = new Map<string, string | null>();
  const children = new Map<string, Set<string>>();
  
  // Build parent-child relationships
  for (const doc of docs) {
    const parent = parentGuidePath(doc, set);
    parents.set(doc, parent);
    
    if (parent) {
      if (!children.has(parent)) {
        children.set(parent, new Set());
      }
      children.get(parent)!.add(doc);
    }
  }
  
  // Identify leaves: guides that are not parents of anything
  const hasChildren = new Set([...children.keys()]);
  const leaves = docs.filter(d => !hasChildren.has(d));
  
  // Build layers via breadth-first traversal from leaves upward
  const layers: string[][] = [];
  const visited = new Set<string>();
  let frontier = leaves;
  
  while (frontier.length > 0) {
    // Current layer = unvisited nodes in frontier
    const layer = frontier.filter(d => !visited.has(d));
    
    if (layer.length === 0) break;
    
    layers.push(layer);
    layer.forEach(d => visited.add(d));
    
    // Next frontier = parents of current layer nodes
    const nextSet = new Set<string>();
    for (const doc of layer) {
      const parent = parents.get(doc);
      if (parent && !visited.has(parent)) {
        nextSet.add(parent);
      }
    }
    
    frontier = [...nextSet];
  }
  
  return layers;
}

/**
 * Main entry point
 */
function main() {
  try {
    const inputText = readFileSync(0, 'utf-8');
    const input: Input = JSON.parse(inputText);
    const docs = input.affected_docs || [];
    
    const layers = buildLayers(docs);
    
    console.log(JSON.stringify({ layers }, null, 2));
  } catch (error: any) {
    console.error('Error building guide tree:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  main();
}

export { buildLayers, parentGuidePath };

