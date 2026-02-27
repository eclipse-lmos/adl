#!/bin/bash

# Define paths
STUDIO_DIR="ald-studio"
SERVER_STATIC_DIR="adl-server/src/main/resources/static"

echo "Building adl-studio..."

# Navigate to studio directory
cd "$STUDIO_DIR" || { echo "Directory $STUDIO_DIR not found"; exit 1; }

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Build the project (output will be in 'out' due to output: 'exports' in next.config.ts)
npm run build

if [ $? -ne 0 ]; then
    echo "Build failed!"
    exit 1
fi

# Go back to root
cd ..

echo "Clearing old static files in $SERVER_STATIC_DIR..."
mkdir -p "$SERVER_STATIC_DIR"
rm -rf "$SERVER_STATIC_DIR"/*

echo "Copying new build files to $SERVER_STATIC_DIR..."
# Copy contents including hidden files
cp -R "$STUDIO_DIR/out"/. "$SERVER_STATIC_DIR"/

echo "Done!"


