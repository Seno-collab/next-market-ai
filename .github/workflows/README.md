# GitHub Actions Workflows

This directory contains CI/CD workflows for the Next.js application.

## Workflows

### 1. CI - Build and Test (`ci.yml`)

Runs on every push and pull request to `main` and `develop` branches.

**Jobs:**
- **build**: Builds the Next.js application with environment variables
- **docker-build**: Builds and tests the Docker image
- **lint**: Runs ESLint checks

**Required Secrets:**
- `NEXT_PUBLIC_API_URL` (optional) - API URL for build-time embedding

### 2. Deploy to Production (`deploy.yml`)

Runs on:
- Push to `main` branch
- Version tags (`v*`)
- Manual workflow dispatch

**Jobs:**
- **build-and-push**: Builds Docker image and pushes to GitHub Container Registry
- **deploy-check**: Verifies deployment readiness
- **health-check**: Tests deployed application (manual dispatch only)

**Required Secrets:**
- `PRODUCTION_API_URL` - Production API URL (required)
- `STAGING_API_URL` - Staging API URL (optional)
- `DEPLOYMENT_URL` - Your deployed frontend URL (optional, for health checks)
- `GITHUB_TOKEN` - Automatically provided by GitHub

## Setting Up Secrets

Go to your repository Settings → Secrets and variables → Actions, then add:

### Required:
```
PRODUCTION_API_URL=https://api.yourproduction.com
```

### Optional but recommended:
```
STAGING_API_URL=https://api.yourstaging.com
DEPLOYMENT_URL=https://yourapp.com
NEXT_PUBLIC_API_URL=https://api.yourproduction.com
```

## Usage

### Automatic Deployment

Push to `main` branch:
```bash
git push origin main
```

The workflow will automatically:
1. Build the Docker image with `PRODUCTION_API_URL`
2. Push to GitHub Container Registry
3. Tag with `latest` and commit SHA

### Manual Deployment

1. Go to Actions tab in GitHub
2. Select "Deploy to Production"
3. Click "Run workflow"
4. Choose environment (production/staging)
5. Click "Run workflow"

### Pull Built Image

After successful build:
```bash
# Login to GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Pull the image
docker pull ghcr.io/YOUR_USERNAME/next-ai:latest

# Run on your server
docker run -d -p 3000:3000 ghcr.io/YOUR_USERNAME/next-ai:latest
```

## Environment Variable Flow

### Build Time (Embedded in Client Bundle)
```
GitHub Secret → Docker build-arg → Next.js build → Client bundle
```

The `NEXT_PUBLIC_API_URL` is:
1. Set in GitHub Secrets
2. Passed as `--build-arg` to Docker build
3. Embedded into the JavaScript bundle during `next build`
4. Available in browser as hardcoded value

### Runtime (Server-side only)
Not used in this project, but you can add server-side env vars that aren't embedded in the client bundle.

## Workflow Triggers

### CI Workflow
- ✅ Push to `main` or `develop`
- ✅ Pull request to `main` or `develop`

### Deploy Workflow
- ✅ Push to `main` (auto-deploy)
- ✅ Push version tag like `v1.0.0`
- ✅ Manual trigger from Actions tab

## Health Checks

The deploy workflow includes health checks when triggered manually:

1. **Application Health**: Checks if the app responds with 200/301/302
2. **API Connectivity**: Tests if the API backend is reachable

To enable health checks, set `DEPLOYMENT_URL` secret.

## Troubleshooting

### Build fails with "API URL not found"
- Check that `PRODUCTION_API_URL` or `NEXT_PUBLIC_API_URL` secret is set
- Verify the secret name matches exactly

### Image not found after push
- Check GitHub Packages tab in your repository
- Ensure workflow completed successfully
- Verify you have permissions to write packages

### Health check fails
- Ensure `DEPLOYMENT_URL` is correct and accessible
- Check if your server is running the latest image
- Verify firewall/security group settings

### Docker pull authentication fails
```bash
# Create a Personal Access Token with read:packages scope
# Then login:
echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_USERNAME --password-stdin
```

## Example: Complete Deployment Flow

1. **Developer pushes code:**
   ```bash
   git add .
   git commit -m "Add new feature"
   git push origin main
   ```

2. **GitHub Actions runs:**
   - CI workflow tests the build
   - Deploy workflow builds Docker image
   - Image pushed to `ghcr.io/username/next-ai:latest`

3. **Server pulls and runs:**
   ```bash
   docker pull ghcr.io/username/next-ai:latest
   docker-compose down
   docker-compose up -d
   ```

4. **Health check verifies:**
   - App is responding
   - API is accessible

## Security Notes

- Never commit secrets to `.env` files
- Use GitHub Secrets for all sensitive values
- `GITHUB_TOKEN` is automatically provided (no need to create)
- Container images are private by default (can be changed in package settings)
