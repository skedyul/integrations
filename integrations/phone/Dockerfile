FROM public.ecr.aws/lambda/nodejs:22 AS builder

RUN groupadd -r nonroot && useradd -r -g nonroot nonroot

WORKDIR /app

COPY package.json pnpm-lock.yaml tsconfig.json ./
COPY src ./src

# Install dependencies, compile, and prune dev deps to keep the final image small.
RUN corepack enable && \
    pnpm install --frozen-lockfile && \
    pnpm run build && \
    pnpm prune --prod && \
    pnpm store prune && \
    rm -rf /tmp/* /var/cache/apk/* ~/.npm

FROM public.ecr.aws/lambda/nodejs:22

RUN groupadd -r nonroot && useradd -r -g nonroot nonroot

WORKDIR ${LAMBDA_TASK_ROOT}

COPY --from=builder --chown=nonroot:nonroot /app/node_modules ./node_modules
COPY --from=builder --chown=nonroot:nonroot /app/dist ./dist

# Allow overriding the baked-in MCP env at runtime.
ARG MCP_ENV_JSON="{}"
ENV MCP_ENV_JSON=${MCP_ENV_JSON}

CMD ["dist/server/mcp-server.handler"]
