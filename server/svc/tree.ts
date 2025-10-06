/**
 * Tree Service
 * Returns guide hierarchy with parent/child relationships
 */

import { getAllGuides } from '../../store/db';
import { parentGuidePath } from '../../core/workflows/build_tree';

export interface TreeNode {
  path: string;
  parent_path: string | null;
  children: string[];
  status: string;
  last_updated: string | null;
}

export interface TreeResponse {
  nodes: TreeNode[];
  coverage: {
    total: number;
    active: number;
    draft: number;
  };
}

export function getTree(): TreeResponse {
  const guides = getAllGuides();
  const pathSet = new Set(guides.map(g => g.path));
  
  // Build tree structure
  const nodes: TreeNode[] = guides.map(guide => {
    // Find children
    const children = guides
      .filter(g => {
        const parent = parentGuidePath(g.path, pathSet);
        return parent === guide.path;
      })
      .map(g => g.path);
    
    return {
      path: guide.path,
      parent_path: guide.parent_path,
      children,
      status: guide.status,
      last_updated: guide.last_updated_at,
    };
  });
  
  return {
    nodes,
    coverage: {
      total: guides.length,
      active: guides.filter(g => g.status === 'active').length,
      draft: guides.filter(g => g.status === 'draft').length,
    }
  };
}

