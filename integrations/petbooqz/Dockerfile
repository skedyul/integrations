FROM public.ecr.aws/lambda/nodejs:22 AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml tsconfig.json tsconfig.tests.json ./
COPY src ./src
COPY tests ./tests

# Install deps, build, then prune down to production dependencies for the final image
RUN corepack enable && \
    pnpm install --frozen-lockfile && \
    pnpm run build && \
    pnpm prune --prod && \
    pnpm store prune && \
    rm -rf /tmp/* /var/cache/apk/* ~/.npm

FROM public.ecr.aws/lambda/nodejs:22

WORKDIR ${LAMBDA_TASK_ROOT}

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Baked-in MCP env for this Lambda container image (JSON string). At runtime you
# can override/extend via MCP_ENV, which the MCP server merges with MCP_ENV_JSON.
ARG MCP_ENV_JSON="{}"
ENV MCP_ENV_JSON=${MCP_ENV_JSON}

CMD ["dist/server/mcp-server.handler"]