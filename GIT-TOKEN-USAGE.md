# Using GitHub Tokens with This Project

This document provides information on how the GitHub token is used in this project's versioning system.

## Purpose of the GitHub Token

The GitHub token (`GIT_TOKEN`) is used to:

1. Authenticate Git operations when pushing changes to a remote GitHub repository
2. Allow the automatic versioning system to commit and push changes without requiring manual authentication
3. Enable CI/CD workflows if configured in the future

## How the Token is Used

The token is accessed through the environment variable `GIT_TOKEN` in two script files:

1. **scripts/commit-version.js**: Uses the token when pushing version commits to the remote repository
2. **scripts/setup-git-remote.js**: Uses the token to configure the remote repository URL with authentication

## Security Considerations

- The token is never stored in the code; it's only accessed through environment variables
- The token is never logged or exposed in console output
- The token is only used for Git operations and not transmitted elsewhere
- If the token is not available, the scripts will still work for local operations but won't push to remote repositories

## Setting Up Your Token

1. Create a Personal Access Token in GitHub:
   - Go to GitHub → Settings → Developer settings → Personal access tokens
   - Generate a new token with the `repo` scope
   - Copy the token value

2. Set the token as an environment variable:
   - In Replit: Go to the Secrets tab and add the token with the key `GIT_TOKEN`
   - In local development: Set the environment variable before running the scripts:
     ```bash
     export GIT_TOKEN=your_token_here
     ```

3. Test the configuration:
   ```bash
   node scripts/setup-git-remote.js https://github.com/yourusername/your-repo.git
   ```

## Token Permissions

The minimum required permissions for the token:
- `repo`: Full control of private repositories

For more information on GitHub tokens, see the [GitHub documentation on creating personal access tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token).