#!/bin/bash

echo "Installing YouTube TV..."
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Start the app
echo "Starting YouTube TV..."
echo
echo "The app will open in your browser at http://localhost:3000"
echo "Press Ctrl+C to stop the server"
echo
npm run dev
