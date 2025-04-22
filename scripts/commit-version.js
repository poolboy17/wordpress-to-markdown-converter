#!/usr/bin/env node

/**
 * Script to manage Git versioning for the project
 * 
 * Usage:
 *   node scripts/commit-version.js [message] [version-type]
 * 
 * Where:
 *   message: The commit message (defaults to "Update project files")
 *   version-type: "major", "minor", or "patch" (defaults to "patch")
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Calculate __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// The version file
const VERSION_FILE = path.join(__dirname, '..', 'version.json');

// Get command line arguments
const args = process.argv.slice(2);
const commitMessage = args[0] || 'Update project files';
const versionType = (args[1] || 'patch').toLowerCase();

// Function to read the current version
function getCurrentVersion() {
  try {
    const versionData = fs.readFileSync(VERSION_FILE, 'utf8');
    return JSON.parse(versionData);
  } catch (error) {
    console.error('Error reading version file:', error);
    return { major: 0, minor: 1, patch: 0, commits: 0, lastCommit: new Date().toISOString() };
  }
}

// Function to update the version
function incrementVersion() {
  const version = getCurrentVersion();
  
  // Increment version based on specified type
  switch (versionType) {
    case 'major':
      version.major++;
      version.minor = 0;
      version.patch = 0;
      break;
    case 'minor':
      version.minor++;
      version.patch = 0;
      break;
    default:
      version.patch++;
  }
  
  // Update commit info
  version.commits++;
  version.lastCommit = new Date().toISOString();
  
  // Save the updated version
  fs.writeFileSync(VERSION_FILE, JSON.stringify(version, null, 2));
  
  return version;
}

// Format version string
function formatVersion(version) {
  return `v${version.major}.${version.minor}.${version.patch}`;
}

// Make a Git commit with the new version
function commitWithVersion() {
  try {
    // Check if there are changes to commit
    const status = execSync('git status --porcelain').toString();
    
    if (!status.trim()) {
      console.log('No changes to commit');
      return;
    }
    
    // Update version and get version string
    const version = incrementVersion();
    const versionString = formatVersion(version);
    
    // Add all changes
    execSync('git add .', { stdio: 'inherit' });
    
    // Make the commit with version in message
    const fullMessage = `${commitMessage} [${versionString}]`;
    execSync(`git commit -m "${fullMessage}"`, { stdio: 'inherit' });
    
    // Add a version tag
    execSync(`git tag -a ${versionString} -m "Version ${versionString}"`, { stdio: 'inherit' });
    
    console.log(`Created commit and tag for ${versionString}`);
    
    // Try to push if GIT_TOKEN is available
    const gitToken = process.env.GIT_TOKEN;
    if (gitToken) {
      try {
        // Check if we have a remote repository
        const remotes = execSync('git remote').toString().trim();
        
        if (remotes) {
          // Get the current remote URL
          const remoteUrl = execSync('git remote get-url origin').toString().trim();
          
          // Only modify if it's not already using a token
          if (!remoteUrl.includes('@github.com')) {
            // Extract the repo path from the remote URL
            let repoPath;
            if (remoteUrl.startsWith('https://github.com/')) {
              repoPath = remoteUrl.substring('https://github.com/'.length);
            } else if (remoteUrl.startsWith('git@github.com:')) {
              repoPath = remoteUrl.substring('git@github.com:'.length);
            }
            
            if (repoPath) {
              // Set the new URL with the token
              const tokenUrl = `https://${gitToken}@github.com/${repoPath}`;
              execSync(`git remote set-url origin "${tokenUrl}"`);
              console.log('Configured Git with authentication token');
            }
          }
          
          // Push the commit and tag
          console.log('Pushing to remote repository...');
          execSync('git push', { stdio: 'inherit' });
          execSync('git push --tags', { stdio: 'inherit' });
          console.log('Changes pushed successfully');
        } else {
          console.log('No remote repository configured. Skipping push.');
        }
      } catch (pushError) {
        console.error('Error pushing to remote repository:', pushError.message);
      }
    } else {
      console.log('No GIT_TOKEN found. Skipping push to remote repository.');
    }
  } catch (error) {
    console.error('Error making commit:', error.message);
  }
}

// Run the script
commitWithVersion();