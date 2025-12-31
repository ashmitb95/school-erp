#!/bin/bash

# Check TypeScript compilation before running migrations

echo "🔍 Checking TypeScript compilation..."
echo ""

# Check if ts-node is available
if ! command -v ts-node &> /dev/null; then
    echo "⚠️  ts-node not found. Installing..."
    npm install -g ts-node typescript
fi

# Try to compile the migration file
echo "Compiling migration script..."
npx ts-node --type-check shared/database/migrate.ts > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ TypeScript compilation successful!"
    echo ""
    echo "Running migrations..."
    npm run migrate
else
    echo "❌ TypeScript compilation failed!"
    echo ""
    echo "Please fix compilation errors before running migrations."
    echo ""
    echo "To see errors:"
    echo "  npx ts-node --type-check shared/database/migrate.ts"
    exit 1
fi


