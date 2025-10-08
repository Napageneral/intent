#!/usr/bin/env bash
#
# Intent Orchestrator - Wrapper for TypeScript implementation
#
# Usage:
#   scripts/intent/run.sh                    # staged changes (default)
#   INTENT_SCOPE=head scripts/intent/run.sh  # last commit
#   INTENT_SCOPE=pr scripts/intent/run.sh    # against origin/main
#

set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Run the TypeScript version with Bun
bun "${DIR}/run.ts" "$@"
