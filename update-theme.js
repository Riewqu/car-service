const fs = require('fs');
const path = require('path');

const replacements = [
  // Background colors
  { from: /className="([^"]*)\bbg-black\b/g, to: 'className="$1bg-white dark:bg-black' },
  { from: /className="([^"]*)\bbg-zinc-900\b/g, to: 'className="$1bg-gray-50 dark:bg-zinc-900' },
  { from: /className="([^"]*)\bbg-zinc-800\b/g, to: 'className="$1bg-gray-100 dark:bg-zinc-800' },
  { from: /className="([^"]*)\bbg-zinc-700\b/g, to: 'className="$1bg-gray-200 dark:bg-zinc-700' },

  // Text colors
  { from: /className="([^"]*)\btext-white\b/g, to: 'className="$1text-gray-900 dark:text-white' },
  { from: /className="([^"]*)\btext-zinc-400\b/g, to: 'className="$1text-gray-600 dark:text-zinc-400' },
  { from: /className="([^"]*)\btext-zinc-500\b/g, to: 'className="$1text-gray-500 dark:text-zinc-500' },

  // Border colors
  { from: /className="([^"]*)\bborder-zinc-800\b/g, to: 'className="$1border-gray-200 dark:border-zinc-800' },
  { from: /className="([^"]*)\bborder-zinc-700\b/g, to: 'className="$1border-gray-300 dark:border-zinc-700' },
];

function updateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let updated = false;

  replacements.forEach(({ from, to }) => {
    if (from.test(content)) {
      content = content.replace(from, to);
      updated = true;
    }
  });

  if (updated) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated: ${filePath}`);
  }
}

// Update all tsx files in app directory
function walkDir(dir) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory() && !filePath.includes('node_modules') && !filePath.includes('.next')) {
      walkDir(filePath);
    } else if (file.endsWith('.tsx')) {
      updateFile(filePath);
    }
  });
}

console.log('🎨 Updating theme colors...\n');
walkDir('./app');
walkDir('./components');
console.log('\n✨ Done!');
