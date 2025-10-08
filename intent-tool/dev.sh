#!/bin/bash
# Quick rebuild and relink for development

set -e

echo "🔨 Building Intent..."
npm run build

echo "🔧 Fixing shebang..."
sed -i '' '1s|^#!/usr/bin/env node|#!/usr/bin/env bun|' dist/src/cli.js
chmod +x dist/src/cli.js

echo "🔗 Linking globally..."
npm link

echo "✅ Done! Run 'intent' to test"

