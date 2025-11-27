# GitHub Pages Workflow Documentation

This document describes how the GitHub Pages deployment workflow works and how to customize it for your project.

## Overview

The `.github/workflows/pages.yml` workflow automatically deploys your site to GitHub Pages whenever changes are pushed to the `main` branch. It includes diagnostic logging to help troubleshoot deployment issues.

## How It Works

1. **Trigger**: The workflow runs on:
   - Push to `main` branch
   - Manual trigger via the Actions tab (workflow_dispatch)

2. **Checkout**: Uses `actions/checkout@v4` with `fetch-depth: 0` to ensure the full repository history is available and the correct commit is checked out.

3. **Diagnostics**: Logs the following to help verify the correct commit is deployed:
   - `GITHUB_SHA` - The exact commit being deployed
   - Git log of recent commits
   - Git status

4. **Output Directory Detection**: Automatically detects the output directory in this order:
   - `./index.html` (root directory - for static sites)
   - `build/` directory (for React apps, etc.)
   - `dist/` directory (for Vite, Vue, etc.)
   - `docs/` directory (for documentation sites)
   - `public/` directory (for some static generators)

5. **Upload & Deploy**: Uses GitHub's official Pages actions to upload and deploy the site.

## Customizing the Output Directory

If your project uses a different output directory, you can modify the `Detect and validate output directory` step in the workflow file. 

### For Projects with a Build Step

If your project requires a build step (e.g., `npm run build`), add a build step before the output directory detection:

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'

- name: Install dependencies
  run: npm ci

- name: Build
  run: npm run build
```

### For Custom Output Directories

If your output directory is different, update the detection script:

```yaml
- name: Detect and validate output directory
  id: detect-output
  run: |
    # Add your custom directory here
    if [ -d "my-custom-output" ]; then
      echo "output_dir=my-custom-output" >> $GITHUB_OUTPUT
      echo "OUTPUT_DIR=my-custom-output" >> $GITHUB_ENV
    fi
```

## Troubleshooting

### Site Not Updating After Deployment

1. Check the Actions tab to verify the workflow ran successfully
2. Look at the "Deployment Diagnostics" step output to confirm the correct commit SHA
3. Verify the "FILES TO BE DEPLOYED" list includes your expected files
4. Check the deployment summary in the job for the deployed URL

### Common Issues

| Issue | Solution |
|-------|----------|
| "No valid output directory found" | Ensure your project has an `index.html` file in one of the expected locations |
| Workflow not triggering | Check that you're pushing to the `main` branch |
| Permissions error | Ensure GitHub Pages is enabled in repository settings with "GitHub Actions" as the source |

## Repository Settings Required

1. Go to **Settings** → **Pages**
2. Under "Build and deployment", select **Source**: `GitHub Actions`
3. Ensure the repository has the necessary permissions enabled

## Commit SHA Verification

After deployment, you can verify the deployed commit by:
1. Checking the workflow run summary
2. Looking at the "DEPLOYMENT COMPLETE" step output
3. Comparing the logged SHA with your expected commit

This ensures you can always trace exactly which code version is live on your site.
