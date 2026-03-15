#!/usr/bin/env node
//
// DEPRECATED: This file previously contained hardcoded pen data.
//
// The new workflow is:
//   1. Ask Cursor: "rebuild the Figma plugin"
//      (This triggers the rebuild-figma-plugin skill)
//
//   2. Or manually:
//      a. Export pen-data.json from pencil-new.pen using Pencil MCP tools
//      b. Run: node rebuild.js
//
// See rebuild.js for the build step.
//

console.log("This script is deprecated.");
console.log("Ask Cursor to 'rebuild the Figma plugin' instead.");
console.log("Or run 'node rebuild.js' after updating pen-data.json.");
process.exit(0);
