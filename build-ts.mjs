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
  
  // Convert to JavaScript by replacing TypeScript specific syntax
  let jsContent = tsContent
    // Remove interfaces
    .replace(/export\s+interface\s+[^{]+{[^}]+}/g, '')
    // Remove type annotations
    .replace(/:\s*[a-zA-Z<>\[\]|]+/g, '')
    // Remove 'any' types
    .replace(/\s*:\s*any/g, '')
    // Fix export statements for ESM
    .replace(/export\s+function/g, 'export function');
  
  // Write the JavaScript file
  await fs.writeFile('./dist/server/utils/contentFiltering.js', jsContent, 'utf8');
  
  console.log('TypeScript build completed.');
}

// Run the build
buildTypeScript()
  .then(() => console.log('Build successful'))
  .catch(err => console.error('Build failed:', err));