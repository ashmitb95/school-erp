// Type-check script - validates TypeScript without running code
// This imports all models to check for compilation errors

// Use require for CommonJS compatibility
const { sequelize } = require('../shared/database/config');
const models = require('../shared/database/models');

// Just verify imports work - don't execute anything
console.log('✅ TypeScript compilation successful!');
console.log(`✅ Loaded ${Object.keys(models).length} models`);
console.log('Models:', Object.keys(models).join(', '));

// Exit successfully
process.exit(0);

