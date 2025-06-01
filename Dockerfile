# Use an official Node.js runtime as a parent image
FROM node:20-slim

# Set the working directory in the container
WORKDIR /app

# Install system dependencies for Puppeteer and Xvfb
# We use apt-get update and apt-get install for Debian-based images (like node:20-slim)
RUN apt-get update && apt-get install -y \
    chromium \
    xvfb \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxss1 \
    libxtst6 \
    xdg-utils \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Copy package.json and package-lock.json (if any)
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the TypeScript application
RUN npm run build

# Set environment variables for Xvfb
ENV DISPLAY=:99
ENV CHROME_BIN=/usr/bin/chromium

# Command to run the application with Xvfb
CMD ["xvfb-run", "--auto-display", "--server-num=1", "npm", "start"]
