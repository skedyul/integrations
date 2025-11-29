FROM public.ecr.aws/lambda/nodejs:22 AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml tsconfig.json tsconfig.tests.json ./
COPY src ./src
COPY tests ./tests

RUN corepack enable && \
    pnpm install --frozen-lockfile && \
    pnpm run build && \
    pnpm store prune && \
    rm -rf /tmp/* /var/cache/apk/* ~/.npm

FROM public.ecr.aws/lambda/nodejs:22

WORKDIR ${LAMBDA_TASK_ROOT}

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

ARG MCP_ENV_JSON="{}"
ENV MCP_ENV_JSON=${MCP_ENV_JSON}

CMD ["dist/server/mcp-server.handler"]