/**
 * Intent API
 * 
 * Programmatic interface for integrations.
 */

export interface IntentConfig {
  projectName: string;
  adrDirectory: string;
  agentsFiles: string[];
  autoGenerateADRs: boolean;
  llm: {
    provider: string;
    model: string;
  };
}

export async function detectChanges(scope: 'staged' | 'head' | 'pr' = 'staged') {
  // Implementation placeholder
  throw new Error('Not implemented - use CLI for now');
}

export async function updateGuides(scope: 'staged' | 'head' | 'pr' = 'staged') {
  // Implementation placeholder
  throw new Error('Not implemented - use CLI for now');
}

export const VERSION = '0.1.0';

