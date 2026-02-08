# =============================================================================
# BUILDER STAGE - Common build for all targets
# =============================================================================
# Using Debian-based image (node:22) instead of Alpine for Playwright support
FROM node:22 AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files (lockfile is optional)
COPY package.json tsconfig.json tsup.config.ts ./
COPY src ./src

# Install dependencies (including dev deps for build), compile, then prune
# Note: Using --no-frozen-lockfile since lockfile may not exist
# Playwright postinstall script will install browser binaries here
RUN pnpm install --no-frozen-lockfile && \
    pnpm run build && \
    pnpm prune --prod && \
    pnpm store prune && \
    rm -rf /tmp/* /var/cache/apt/* ~/.npm

# =============================================================================
# DEDICATED STAGE - For local Docker and ECS deployments (HTTP server)
# =============================================================================
# Using Debian-based image to keep Playwright browser binaries
FROM node:22 AS dedicated

WORKDIR /app

# Install system dependencies required by Playwright on Debian
RUN apt-get update && \
    apt-get install -y \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

# Copy built artifacts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Install Playwright browser binaries for Debian
# This must run in the dedicated stage because browser binaries are stored
# in ~/.cache/ms-playwright, which isn't copied from the builder stage
RUN npx playwright install chromium --with-deps || \
    (echo "Warning: Playwright install failed, trying without deps" && \
     npx playwright install chromium)

# Allow overriding the baked-in MCP env at runtime
ARG MCP_ENV_JSON="{}"
ENV MCP_ENV_JSON=${MCP_ENV_JSON}

# Expose the HTTP port
EXPOSE 3000

# Run as HTTP server (dedicated mode auto-detected by absence of AWS_LAMBDA_FUNCTION_NAME)
CMD ["node", "dist/server/mcp_server.js"]

# =============================================================================
# SERVERLESS STAGE - For AWS Lambda deployments
# =============================================================================
# Note: Playwright adds significant size to Lambda images (~200MB+)
# Lambda base image is Amazon Linux 2023, so we need to install Playwright
# browser binaries here (not copy from Debian builder)
FROM public.ecr.aws/lambda/nodejs:22 AS serverless

WORKDIR ${LAMBDA_TASK_ROOT}

# Install system dependencies required by Playwright on Amazon Linux
# Amazon Linux 2023 uses dnf (not yum)
RUN dnf install -y \
    nss \
    atk \
    at-spi2-atk \
    cups-libs \
    gtk3 \
    libdrm \
    libxkbcommon \
    libxcomposite \
    libxdamage \
    libxfixes \
    libxrandr \
    mesa-libgbm \
    alsa-lib \
    && dnf clean all \
    && rm -rf /var/cache/dnf

# Copy node_modules and dist from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Install Playwright browser binaries for Amazon Linux (Lambda's platform)
# This must run in the Lambda stage, not the builder, because browser binaries
# are platform-specific (Debian vs Amazon Linux)
RUN npx playwright install chromium --with-deps || \
    (echo "Warning: Playwright install failed, trying without deps" && \
     npx playwright install chromium)

# Allow overriding the baked-in MCP env at runtime
ARG MCP_ENV_JSON="{}"
ENV MCP_ENV_JSON=${MCP_ENV_JSON}

# Lambda handler format
CMD ["dist/server/mcp_server.handler"]

# =============================================================================
# DEFAULT - Use dedicated for local development, override with --target for production
# =============================================================================
FROM dedicated
