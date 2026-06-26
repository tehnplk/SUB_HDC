FROM node:20-alpine

WORKDIR /app

# Copy package configuration
COPY package*.json ./

# Install all dependencies (dev + production)
RUN npm ci

# Copy application source code
COPY . .

# Build the Next.js application
RUN npm run build

# Prune devDependencies to keep the container lightweight
RUN npm prune --production

# Next.js runs on port 3000 inside the container by default
EXPOSE 3000

ENV NODE_ENV=production

# Start the application
CMD ["npm", "run", "start"]
