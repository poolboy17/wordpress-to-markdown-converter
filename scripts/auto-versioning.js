#!/usr/bin/env node

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Calculate __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Settings
const CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
const VERSION_MANAGER = path.join(__dirname, 'commit-version.js');
const GIT_CONFIG_FILE = path.join(__dirname, '..', '.git', 'config');

// Set up Git configuration with token if provided
function setupGitWithToken() {
  try {
    const gitToken = process.env.GIT_TOKEN;
    
    if (!gitToken) {
      console.log('No GIT_TOKEN found in environment variables');
      return false;
    }
    
    // Check if we have a remote repository configured
    const remotes = execSync('git remote').toString().trim();
    
    if (!remotes) {
      console.log('No remote repository configured. Please run:');
      console.log('git remote add origin https://github.com/username/repo.git');
      return false;
    }
    
    // Get the current remote URL
    const remoteUrl = execSync('git remote get-url origin').toString().trim();
    
    // If it's already using a token, don't modify
    if (remoteUrl.includes('@github.com')) {
      return true;
    }
    
    // Extract the repo path from the remote URL
    let repoPath;
    if (remoteUrl.startsWith('https://github.com/')) {
      repoPath = remoteUrl.substring('https://github.com/'.length);
    } else if (remoteUrl.startsWith('git@github.com:')) {
      repoPath = remoteUrl.substring('git@github.com:'.length);
    } else {
      console.log('Unsupported remote URL format:', remoteUrl);
      return false;
    }
    
    // Set the new URL with the token
    const tokenUrl = `https://${gitToken}@github.com/${repoPath}`;
    execSync(`git remote set-url origin "${tokenUrl}"`);
    console.log('Successfully configured Git with authentication token');
    
    // Configure Git user identity if not already set
    try {
      execSync('git config user.name');
    } catch (e) {
      execSync('git config user.name "Automatic Versioning"');
    }
    
    try {
      execSync('git config user.email');
    } catch (e) {
      execSync('git config user.email "auto-version@example.com"');
    }
    
    return true;
  } catch (error) {
    console.error('Error setting up Git with token:', error);
    return false;
  }
}

// Initialize the repository and make an initial commit if needed
function initializeRepository() {
  try {
    // Check if there are any commits
    try {
      execSync('git rev-parse HEAD', { stdio: 'pipe' });
    } catch (e) {
      // No commits yet, make initial commit
      console.log('Creating initial commit...');
      execSync('git add .');
      execSync('git commit -m "Initial commit [v0.1.0]"');
      execSync('git tag -a v0.1.0 -m "Initial version"');
      console.log('Created initial commit with tag v0.1.0');
    }
    
    return true;
  } catch (error) {
    console.error('Error initializing repository:', error);
    return false;
  }
}

// Run the version manager to check for changes and commit them
function runVersionManager() {
  try {
    console.log('Checking for changes to commit...');
    execSync(`node ${VERSION_MANAGER} auto`, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error('Error running version manager:', error);
    return false;
  }
}

// Main function that sets up auto-versioning
function startAutoVersioning() {
  console.log('Starting automatic versioning service...');
  
  // Set up Git with token
  setupGitWithToken();
  
  // Initialize the repository
  initializeRepository();
  
  // Run the version manager immediately
  runVersionManager();
  
  // Set up interval to periodically check for changes
  console.log(`Will check for changes every ${CHECK_INTERVAL / 60000} minutes`);
  setInterval(runVersionManager, CHECK_INTERVAL);
}

// Start the auto-versioning process
startAutoVersioning();