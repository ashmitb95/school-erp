#!/bin/bash

# Setup database defaults for easier data insertion
# This script adds DEFAULT values to id, created_at, and updated_at columns

echo "🔧 Setting up database defaults..."
echo ""

docker exec -i erp-postgres psql -U erp_user -d school_erp < scripts/fix-timestamp-defaults.sql

if [ $? -eq 0 ]; then
    echo "✅ Database defaults configured successfully!"
    echo ""
    echo "Now you can insert data without specifying id, created_at, or updated_at."
else
    echo "❌ Failed to set up defaults"
    exit 1
fi


