FROM public.ecr.aws/lambda/nodejs:22 AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml tsconfig.json tsconfig.tests.json ./
COPY src ./src

# Install deps, build, then prune down to production dependencies for the final image
RUN corepack enable && \
    pnpm install --frozen-lockfile && \
    pnpm run build && \
    pnpm prune --prod && \
    pnpm store prune && \
    rm -rf /tmp/* /var/cache/apk/* ~/.npm

FROM gcr.io/distroless/nodejs22-debian12

WORKDIR /app

COPY --from=builder --chown=nonroot:nonroot /app/node_modules ./node_modules
COPY --from=builder --chown=nonroot:nonroot /app/dist ./dist

# Baked-in MCP env for this image (JSON string). At runtime you can add/override
# with MCP_ENV_JSON / MCP_ENV to match the inline templates used by worker-compute.
ARG MCP_ENV_JSON="{}"
ENV MCP_ENV_JSON=${MCP_ENV_JSON}

# HTTP MCP server entrypoint for dedicated Petbooqz server.
# This exposes a /mcp JSON-RPC endpoint, matching what worker-compute expects.
CMD ["dist/server/mcp_server_dedicated.js"]
