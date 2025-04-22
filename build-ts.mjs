/**
 * Script to build TypeScript files for testing
 */
import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

// Ensure directory exists
async function ensureDir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}

// Create JS files from our TS modules
async function buildTypeScript() {
  console.log('Building TypeScript files...');
  
  // Create the output directory
  await ensureDir('./dist');
  await ensureDir('./dist/server/utils');
  
  // Read the content filtering module
  const tsContent = await fs.readFile('./server/utils/contentFiltering.ts', 'utf8');
  
  // Create a proper ESM module
  let jsContent = `// Generated JavaScript file from TypeScript source
// Content filtering module for WordPress XML to Markdown converter

/**
 * Functions for analyzing content quality
 */

`;

  // Add the converted TypeScript code
  jsContent += tsContent
    // Remove interfaces
    .replace(/export\s+interface\s+[^{]+{[\s\S]+?}/g, '')
    // Remove function return type annotations
    .replace(/\):\s*{[^}]+}/g, ') {')
    .replace(/\):\s*[a-zA-Z<>\[\]|]+/g, ')')
    // Remove parameter type annotations
    .replace(/\([^)]*\)/g, (match) => {
      return match.replace(/:\s*[a-zA-Z<>\[\]|]+/g, '');
    })
    // Remove variable type annotations
    .replace(/:\s*[a-zA-Z<>\[\]|]+(\s*=)/g, '$1')
    // Remove 'any' types
    .replace(/\s*:\s*any/g, '')
    // Make sure exports are correctly formatted
    .replace(/export\s+function/g, 'export function');
  
  // Write the JavaScript file
  await fs.writeFile('./dist/server/utils/contentFiltering.js', jsContent, 'utf8');
  
  console.log('TypeScript build completed.');
}

// Run the build
buildTypeScript()
  .then(() => console.log('Build successful'))
  .catch(err => console.error('Build failed:', err));