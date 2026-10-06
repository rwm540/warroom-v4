# Local Validation Procedures

This document outlines the procedures to validate the application locally before deployment.

## Prerequisites
- Node.js (v22 recommended)
- npm

## Validation Steps
Run the following commands in the root of the repository:

```bash
# 1. Install dependencies
npm ci

# 2. Run linting
npm run lint

# 3. Build the project
npm run build

# 4. Check for uncommitted/temp files
git diff --check
```

## Docker Build Validation
If Docker is available:
```bash
docker compose build --pull
```

## Security Sanity Check
Ensure no secrets are exposed and hardcoded fallback credentials are removed.
