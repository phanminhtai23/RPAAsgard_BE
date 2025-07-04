# Sử dụng Node.js Alpine image
FROM node:20-alpine

# Cài đặt dependencies tối thiểu cho Playwright
RUN apk add --no-cache chromium && \
    rm -rf /var/cache/apk/*

# Set environment cho Playwright
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Set working directory
WORKDIR /app

# Copy và cài đặt dependencies
COPY package*.json ./
RUN npm install --only=production

# Copy source code
COPY . .

# Tạo user non-root
RUN adduser -D -s /bin/sh nodejs && \
    chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 4000

# Start server
CMD ["npm", "start"] 
