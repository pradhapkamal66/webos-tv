FROM mcr.microsoft.com/devcontainers/typescript-node:22-noble

# Install bun
RUN curl -fsSL https://bun.sh/install | bash

# Install additional tools
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Copy environment setup
COPY .env.example /tmp/.env.example
COPY package.json /tmp/package.json
COPY bun.lock /tmp/bun.lock

WORKDIR /tmp
RUN bun install --frozen-lockfile

WORKDIR /workspace
