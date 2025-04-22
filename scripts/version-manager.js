#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// The path to the version file relative to the repository root
const VERSION_FILE = path.join(__dirname, '..', 'version.json');

/**
 * Read the current version information from the version file
 * Creates the file with an initial version if it doesn't exist
 */
function getCurrentVersion() {
  try {
    if (!fs.existsSync(VERSION_FILE)) {
      const initialVersion = {
        major: 0,
        minor: 1,
        patch: 0,
        commits: 0,
        lastCommit: new Date().toISOString(),
      };
      fs.writeFileSync(VERSION_FILE, JSON.stringify(initialVersion, null, 2));
      return initialVersion;
    }
    
    const versionData = fs.readFileSync(VERSION_FILE, 'utf8');
    return JSON.parse(versionData);
  } catch (error) {
    console.error('Error reading version file:', error);
    process.exit(1);
  }
}

/**
 * Update the version file with new version information
 */
function updateVersion(versionInfo) {
  try {
    versionInfo.lastCommit = new Date().toISOString();
    versionInfo.commits += 1;
    fs.writeFileSync(VERSION_FILE, JSON.stringify(versionInfo, null, 2));
    return versionInfo;
  } catch (error) {
    console.error('Error updating version file:', error);
    process.exit(1);
  }
}

/**
 * Format the version string
 */
function formatVersion(versionInfo) {
  return `v${versionInfo.major}.${versionInfo.minor}.${versionInfo.patch}`;
}

/**
 * Increment the version based on the specified part
 */
function incrementVersion(part = 'patch') {
  const version = getCurrentVersion();
  
  switch (part.toLowerCase()) {
    case 'major':
      version.major += 1;
      version.minor = 0;
      version.patch = 0;
      break;
    case 'minor':
      version.minor += 1;
      version.patch = 0;
      break;
    case 'patch':
    default:
      version.patch += 1;
      break;
  }
  
  return updateVersion(version);
}

/**
 * Create a git commit with the specified message and version tag
 */
function createVersionedCommit(message, versionInfo) {
  try {
    const versionString = formatVersion(versionInfo);
    const fullMessage = `${message} [${versionString}]`;
    
    // Add all changes to git
    execSync('git add .', { stdio: 'inherit' });
    
    // Create the commit with the versioned message
    execSync(`git commit -m "${fullMessage}"`, { stdio: 'inherit' });
    
    // Tag the commit with the version
    execSync(`git tag -a ${versionString} -m "Version ${versionString}"`, { stdio: 'inherit' });
    
    console.log(`Created commit and tag for ${versionString}`);
    return versionString;
  } catch (error) {
    console.error('Error creating git commit:', error);
    process.exit(1);
  }
}

/**
 * Automatic commit of changes with version increment
 */
function autoCommit() {
  try {
    // Check if there are changes to commit
    const status = execSync('git status --porcelain').toString();
    
    if (!status.trim()) {
      console.log('No changes to commit');
      return null;
    }
    
    // Get a summary of changes
    const changedFiles = status
      .split('\n')
      .filter(line => line.trim())
      .map(line => line.trim().substring(3))
      .filter(file => file);
    
    // Create a meaningful commit message
    const fileCount = changedFiles.length;
    let message = `Update ${fileCount} file${fileCount !== 1 ? 's' : ''}`;
    
    // Include up to 3 filenames in the message
    if (fileCount <= 3) {
      message += ': ' + changedFiles.join(', ');
    }
    
    // Increment version and create commit
    const newVersion = incrementVersion('patch');
    return createVersionedCommit(message, newVersion);
  } catch (error) {
    console.error('Error in auto-commit process:', error);
    process.exit(1);
  }
}

/**
 * Push changes to remote repository if configured
 */
function pushChanges() {
  try {
    // Check if a remote is configured
    const remotes = execSync('git remote').toString().trim();
    
    if (!remotes) {
      console.log('No remote repository configured');
      return false;
    }
    
    // Push commits and tags
    execSync('git push', { stdio: 'inherit' });
    execSync('git push --tags', { stdio: 'inherit' });
    
    console.log('Pushed changes to remote repository');
    return true;
  } catch (error) {
    console.error('Error pushing to remote repository:', error);
    return false;
  }
}

// Main function to handle command line usage
function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'auto';
  
  switch (command) {
    case 'auto':
      const version = autoCommit();
      if (version) {
        pushChanges();
      }
      break;
    case 'increment':
      const part = args[1] || 'patch';
      const newVersion = incrementVersion(part);
      console.log(`Incremented ${part} version to ${formatVersion(newVersion)}`);
      break;
    case 'get':
      const currentVersion = getCurrentVersion();
      console.log(formatVersion(currentVersion));
      break;
    case 'push':
      pushChanges();
      break;
    default:
      console.log(`
Usage: node version-manager.js <command> [args]

Commands:
  auto                  Automatically commit changes and increment patch version
  increment [part]      Increment version number (part can be 'major', 'minor', or 'patch')
  get                   Display the current version
  push                  Push changes to remote repository
`);
      break;
  }
}

main();