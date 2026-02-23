#!/usr/bin/env node
/**
 * Copy public folder to standalone build
 * This ensures manifest.json, icons, and other assets are available
 */

const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
  // Create destination if it doesn't exist
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  // Get all files and directories in source
  const files = fs.readdirSync(src);

  files.forEach((file) => {
    const srcFile = path.join(src, file);
    const destFile = path.join(dest, file);
    const stat = fs.statSync(srcFile);

    if (stat.isDirectory()) {
      // Recursively copy directories
      copyDir(srcFile, destFile);
    } else {
      // Copy files
      fs.copyFileSync(srcFile, destFile);
      console.log(`✓ Copied: ${file}`);
    }
  });
}

try {
  const publicSrc = path.join(__dirname, '..', 'public');
  const publicDest = path.join(__dirname, '..', '.next', 'standalone', 'public');

  if (fs.existsSync(publicSrc)) {
    console.log('📦 Copying public folder to standalone build...');
    copyDir(publicSrc, publicDest);
    console.log('✓ Public folder copied successfully');
  } else {
    console.log('⚠ public folder not found, skipping');
  }
} catch (error) {
  console.error('❌ Failed to copy public folder:', error.message);
  process.exit(1);
}
