# Use official Node.js LTS Alpine image for smaller size
FROM node:18-alpine

# Install tini as a minimal init process (PID 1) for proper signal handling
# and zombie reaping
RUN apk add --no-cache tini

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Copy all source files
COPY . .

# Install dependencies
RUN npm install --production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port (Discord bot doesn't need a port, but good practice)
EXPOSE 3000

# The bot exposes no port; health is defined as the persistence file having
# been written recently (the autosave refreshes it every 30 seconds)
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
  CMD node -e "const fs=require('fs');const file=process.env.PERSISTENCE_FILE||'/app/data/games.json';const s=fs.statSync(file);process.exit((Date.now()-s.mtimeMs)>120000?1:0)" || exit 1

# Start the bot under tini
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/index.js"]
