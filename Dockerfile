# Start with Ubuntu base image
FROM ubuntu:22.04

# Avoid prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install basic dependencies
RUN apt-get update && apt-get install -y \
    curl \
    unzip \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js and npm
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV BUN_INSTALL="/root/.bun"
ENV PATH="$BUN_INSTALL/bin:$PATH"

# Install Deno
RUN curl -fsSL https://deno.land/x/install/install.sh | sh
ENV DENO_INSTALL="/root/.deno"
ENV PATH="$DENO_INSTALL/bin:$PATH"

# Set working directory
WORKDIR /usr/src/app

# Copy application files
COPY app/ ./app/
COPY backend/ ./backend/

# Install backend dependencies
WORKDIR /usr/src/app/backend
RUN deno install

# Install frontend dependencies
WORKDIR /usr/src/app/app
RUN bun install

# Create entrypoint script
WORKDIR /usr/src/app
RUN echo '#!/bin/bash\n\
# Create .env file with runtime environment variable\n\
echo "ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY\nPORT=3000\nHOST=0.0.0.0\nENV=development" > /usr/src/app/backend/.env\n\
# Start backend\n\
cd /usr/src/app/backend && deno run --allow-net --allow-env --allow-read src/app.ts & \n\
# Start frontend\n\
cd /usr/src/app/app && bun run dev' > entrypoint.sh && \
chmod +x entrypoint.sh

# Expose ports
EXPOSE 3000
EXPOSE 8000

# Start services using entrypoint script
ENTRYPOINT ["./entrypoint.sh"]
