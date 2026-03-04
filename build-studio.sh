#!/bin/bash
# SPDX-FileCopyrightText: 2025 Deutsche Telekom AG and others
#
# SPDX-License-Identifier: Apache-2.0

# Define paths
STUDIO_DIR="../ald-studio"
SERVER_STATIC_DIR="adl-server/src/main/resources/static"

echo "Building adl-studio..."

# Navigate to studio directory
pushd "$STUDIO_DIR" > /dev/null || { echo "Directory $STUDIO_DIR not found"; exit 1; }

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
popd > /dev/null

echo "Clearing old static files in $SERVER_STATIC_DIR..."
mkdir -p "$SERVER_STATIC_DIR"
rm -rf "$SERVER_STATIC_DIR"/*

echo "Copying new build files to $SERVER_STATIC_DIR..."

if [ ! -d "$STUDIO_DIR/out" ]; then
    echo "Error: Build output directory $STUDIO_DIR/out not found!"
    exit 1
fi

# Copy contents including hidden files
cp -R "$STUDIO_DIR/out"/. "$SERVER_STATIC_DIR"/

if [ $? -ne 0 ]; then
    echo "Copy failed!"
    exit 1
fi

echo "Done!"

echo "Building docker image..."
docker build -f adl-server/Dockerfile -t ghcr.io/eclipse-lmos/adl-server:latest .
