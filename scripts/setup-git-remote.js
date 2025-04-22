#!/usr/bin/env node

/**
 * Script to set up a remote Git repository
 * 
 * Usage:
 *   node scripts/setup-git-remote.js [repo-url]
 * 
 * Where:
 *   repo-url: The GitHub repository URL (e.g., https://github.com/username/repo.git)
 */

const { execSync } = require('child_process');

// Get the repository URL from command line arguments
const args = process.argv.slice(2);
const repoUrl = args[0];

if (!repoUrl) {
  console.error('Error: Repository URL is required');
  console.log('Usage: node scripts/setup-git-remote.js [repo-url]');
  console.log('Example: node scripts/setup-git-remote.js https://github.com/username/repo.git');
  process.exit(1);
}

// Function to set up the remote repository
async function setupRemoteRepository() {
  try {
    // Check if we already have a remote named 'origin'
    try {
      const remotes = execSync('git remote').toString().trim();
      
      if (remotes.split('\n').includes('origin')) {
        console.log('Remote "origin" already exists. Updating URL...');
        execSync(`git remote set-url origin ${repoUrl}`, { stdio: 'inherit' });
      } else {
        console.log('Adding remote "origin"...');
        execSync(`git remote add origin ${repoUrl}`, { stdio: 'inherit' });
      }
      
      console.log(`Remote repository set to: ${repoUrl}`);
      
      // Check if GIT_TOKEN is available for authentication
      const gitToken = process.env.GIT_TOKEN;
      if (gitToken) {
        let tokenizedUrl;
        
        if (repoUrl.startsWith('https://github.com/')) {
          const repoPath = repoUrl.substring('https://github.com/'.length);
          tokenizedUrl = `https://${gitToken}@github.com/${repoPath}`;
        } else if (repoUrl.startsWith('git@github.com:')) {
          const repoPath = repoUrl.substring('git@github.com:'.length);
          tokenizedUrl = `https://${gitToken}@github.com/${repoPath}`;
        } else {
          console.log('Unsupported URL format. Cannot apply token authentication.');
          return;
        }
        
        // Update remote URL with token
        execSync(`git remote set-url origin "${tokenizedUrl}"`, { stdio: 'inherit' });
        console.log('Configured Git with authentication token');
        
        // Try to push an initial commit
        console.log('Pushing to remote repository...');
        try {
          execSync('git push -u origin main', { stdio: 'inherit' });
        } catch (pushError) {
          try {
            execSync('git push -u origin master', { stdio: 'inherit' });
          } catch (masterPushError) {
            console.error('Failed to push to remote repository. You may need to create a new branch.');
          }
        }
      } else {
        console.log('No GIT_TOKEN found. Setup complete, but you will need to push manually.');
      }
    } catch (error) {
      console.error('Error setting up remote repository:', error.message);
    }
  } catch (error) {
    console.error('Error in setup process:', error.message);
  }
}

// Run the script
setupRemoteRepository();