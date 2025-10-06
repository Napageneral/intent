/**
 * Status Service
 * Returns current Intent status and latest run info
 */

import { getLatestRun, getAllGuides, getProject } from '../../store/db';

export interface StatusResponse {
  project: {
    name: string;
    root: string;
  } | null;
  last_run: {
    id: number;
    status: string;
    scope: string;
    started_at: string;
    guides_updated: number;
    guides_nochange: number;
    guides_failed: number;
  } | null;
  guides: {
    total: number;
    active: number;
  };
}

export function getStatus(): StatusResponse {
  const project = getProject();
  const lastRun = getLatestRun();
  const allGuides = getAllGuides();
  
  return {
    project: project ? {
      name: project.name,
      root: project.repo_root
    } : null,
    last_run: lastRun ? {
      id: lastRun.id,
      status: lastRun.status,
      scope: lastRun.scope,
      started_at: lastRun.started_at,
      guides_updated: lastRun.guides_updated,
      guides_nochange: lastRun.guides_nochange,
      guides_failed: lastRun.guides_failed,
    } : null,
    guides: {
      total: allGuides.length,
      active: allGuides.filter(g => g.status === 'active').length,
    }
  };
}

