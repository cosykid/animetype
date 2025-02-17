# Step 1: Use a Node.js image
FROM node:18 AS build

# Step 2: Set working directory
WORKDIR /app

# Step 3: Copy project files
COPY package*.json ./
COPY . .

# Step 4: Install dependencies and build the project
RUN npm install
RUN npm run build

# Step 5: Use an Nginx image for serving the app
FROM nginx:stable-alpine

# Step 6: Copy build files to the Nginx HTML directory
COPY --from=build /app/dist /usr/share/nginx/html

# Step 7: Expose port 80
EXPOSE 80

# Step 8: Start Nginx
CMD ["nginx", "-g", "daemon off;"]
