# Use official Node.js LTS Alpine image for smaller size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy all source files
COPY . .

# Remove unnecessary files
RUN rm -rf node_modules && npm install --production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port (Discord bot doesn't need a port, but good practice)
EXPOSE 3000

# Start the bot
CMD ["node", "src/index.js"]
