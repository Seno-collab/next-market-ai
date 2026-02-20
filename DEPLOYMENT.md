# Deployment Guide

This guide explains how to deploy the Next.js application using Docker with proper environment variable configuration.

## Environment Variables

### Required Variables

- `NEXT_PUBLIC_API_URL`: The base URL for backend API calls

**Important:** Variables prefixed with `NEXT_PUBLIC_` are embedded into the client-side JavaScript bundle at **build time**. They cannot be changed at runtime.

### Configuration Files

- `.env` - Local development configuration (not included in Docker)
- `.env.example` - Template showing required variables
- `.env.production.example` - Production deployment template

## Development

```bash
# Install dependencies
pnpm install

# Copy .env.example to .env and update values
cp .env.example .env

# Run development server
pnpm dev
```

The app will be available at `http://localhost:3000`

## Docker Deployment

### Method 1: Docker Compose (Recommended)

1. Create a `.env` file in the project root:
   ```env
   NEXT_PUBLIC_API_URL=https://api.yourproductiondomain.com
   ```

2. Build and run:
   ```bash
   docker-compose up --build
   ```

3. The app will be available at `http://localhost:3000`

### Method 2: Docker Build

Build the image with the API URL as a build argument:

```bash
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://api.yourproductiondomain.com \
  -t next-market-ai \
  .
```

Run the container:

```bash
docker run -p 3000:3000 next-market-ai
```

## Production Deployment

### Using Docker Hub or Container Registry

1. **Build the image** with your production API URL:
   ```bash
   docker build \
     --build-arg NEXT_PUBLIC_API_URL=https://api.example.com \
     -t your-registry/next-market-ai:latest \
     .
   ```

2. **Push to registry**:
   ```bash
   docker push your-registry/next-market-ai:latest
   ```

3. **Deploy** on your server:
   ```bash
   docker pull your-registry/next-market-ai:latest
   docker run -d -p 3000:3000 --name next-market-ai your-registry/next-market-ai:latest
   ```

### Using docker-compose in Production

1. Create `.env` file on your production server:
   ```env
   NEXT_PUBLIC_API_URL=https://api.yourproductiondomain.com
   ```

2. Deploy:
   ```bash
   docker-compose up -d --build
   ```

## Standalone Build

This project uses Next.js `output: "standalone"` mode, which creates an optimized production build that:

- Includes only necessary files and dependencies
- Reduces Docker image size significantly
- Starts with `node server.js` instead of `next start`
- Does not require the full `node_modules` directory at runtime

## Troubleshooting

### API Calls Failing

If API calls are failing in production:

1. **Check the API URL** is correct:
   - Open browser DevTools > Network tab
   - Check the URL being called
   - Verify it matches your backend server

2. **Rebuild the image** if you changed the API URL:
   ```bash
   # The API URL is embedded at build time!
   docker-compose up --build
   ```

3. **Verify CORS** settings on your backend server allow requests from your frontend domain

### Environment Variable Not Loading

**Remember:** `NEXT_PUBLIC_*` variables must be set at **build time**, not runtime.

If you change the `.env` file, you must rebuild the Docker image:

```bash
docker-compose down
docker-compose up --build
```

### Image Size Too Large

The standalone build should produce a relatively small image (~200-300MB). If it's much larger:

1. Ensure `.dockerignore` includes:
   - `.git`
   - `.next`
   - `node_modules`
   - `.env*`

2. Rebuild with no cache:
   ```bash
   docker-compose build --no-cache
   ```

## Optimization

### Multi-stage Build

The Dockerfile uses a multi-stage build to minimize the final image size:

- `deps`: Installs dependencies
- `builder`: Builds the application
- `runner`: Final minimal image with only runtime files

### Build Cache

To speed up builds, Docker caches each layer. When you change:

- `package.json` → Reinstalls dependencies
- Source code → Rebuilds application only
- Build args → Rebuilds from that point

## Health Checks

To add health checks to your deployment, update `docker-compose.yml`:

```yaml
services:
  next-market-ai:
    # ... existing config
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

## Reverse Proxy (Nginx)

For production, you should use a reverse proxy like Nginx:

1. Uncomment the nginx service in `docker-compose.yml`
2. Create `nginx.conf` with your configuration
3. Setup SSL certificates (Let's Encrypt recommended)

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build and Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker image
        run: |
          docker build \
            --build-arg NEXT_PUBLIC_API_URL=${{ secrets.API_URL }} \
            -t your-registry/next-market-ai:${{ github.sha }} \
            .
      - name: Push to registry
        run: docker push your-registry/next-market-ai:${{ github.sha }}
```

## Support

For issues or questions, please create an issue in the GitHub repository.
