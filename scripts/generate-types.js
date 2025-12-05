#!/usr/bin/env node

/**
 * Generate TypeScript types from Supabase database
 *
 * This script uses Supabase CLI to generate types from your remote database
 * No Docker or local setup required!
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const PROJECT_ID = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/(.+?)\.supabase\.co/)?.[1];

if (!PROJECT_ID) {
  console.error('❌ Error: Cannot find Supabase project ID from NEXT_PUBLIC_SUPABASE_URL');
  console.error('Make sure .env.local is configured correctly');
  process.exit(1);
}

console.log('🔄 Generating TypeScript types from Supabase...');
console.log(`📦 Project ID: ${PROJECT_ID}`);

try {
  // Generate types using Supabase CLI
  const command = `npx supabase@latest gen types typescript --project-id ${PROJECT_ID}`;

  console.log('⏳ Running: ' + command);
  const types = execSync(command, { encoding: 'utf-8', stdio: 'pipe' });

  // Write to file
  const outputPath = path.join(__dirname, '..', 'lib', 'database.types.ts');
  fs.writeFileSync(outputPath, types, 'utf-8');

  console.log('✅ Types generated successfully!');
  console.log(`📝 Output: ${outputPath}`);
  console.log('');
  console.log('💡 Tip: Restart your dev server to see the changes');

} catch (error) {
  console.error('❌ Error generating types:', error.message);
  console.error('');
  console.error('🔧 Troubleshooting:');
  console.error('1. Make sure you have access to the Supabase project');
  console.error('2. Try logging in: npx supabase login');
  console.error('3. Or manually update lib/database.types.ts');
  process.exit(1);
}
