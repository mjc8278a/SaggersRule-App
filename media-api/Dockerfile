FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Create directories for uploads and processed files
RUN mkdir -p /app/media/uploads /app/processed

# Set permissions
RUN chown -R node:node /app
USER node

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3200/health || exit 1

EXPOSE 3200

CMD ["node", "src/server.js"]