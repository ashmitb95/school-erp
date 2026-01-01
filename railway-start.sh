#!/bin/sh

# Start ERP server
echo "Starting ERP server..."

cd /app/services && node dist/services/src/index.js
