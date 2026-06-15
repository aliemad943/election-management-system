// Seed runner - compiles TypeScript seed file on the fly
const { execSync } = require('child_process');
const path = require('path');

try {
  // Use tsx or npx tsx to run the TypeScript seed
  execSync('npx tsx prisma/seed.ts', {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..'),
  });
} catch (e) {
  console.error('Seed failed:', e.message);
  // Don't exit with error code - allow server to start even if seed fails
  // (e.g., if data already exists)
}
