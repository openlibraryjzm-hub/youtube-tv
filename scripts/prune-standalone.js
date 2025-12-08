const fs = require('fs');
const path = require('path');

/**
 * Prune unnecessary files from .next/standalone to reduce size
 * Removes: test files, docs, examples, source maps (optional)
 */

const standalonePath = path.join(process.cwd(), '.next', 'standalone');
const nodeModulesPath = path.join(standalonePath, 'node_modules');

console.log('🧹 Pruning standalone build...');
console.log('Standalone path:', standalonePath);

if (!fs.existsSync(nodeModulesPath)) {
  console.log('⚠️  node_modules not found, skipping prune');
  process.exit(0);
}

let filesRemoved = 0;
let bytesRemoved = 0;

// Patterns to exclude
const excludePatterns = [
  /\/test\//i,
  /\/tests\//i,
  /\/__tests__\//i,
  /\/spec\//i,
  /\/\.test\./i,
  /\/\.spec\./i,
  /\/docs?\//i,
  /\/examples?\//i,
  /\/\.github\//i,
  /\/\.vscode\//i,
  /\/\.idea\//i,
  /\/coverage\//i,
  /\/\.nyc_output\//i,
  /\/benchmark\//i,
  /\/benchmarks\//i,
  /\/demo\//i,
  /\/demos\//i,
  /\/\.git\//i,
  /\/CHANGELOG/i,
  /\/LICENSE/i,
  /\/README/i,
  /\/\.npmignore/i,
  /\/\.eslintrc/i,
  /\/\.prettierrc/i,
  /\/tsconfig\.json/i,
  /\/\.map$/i, // Source maps (optional - comment out if you need them)
];

function shouldExclude(filePath) {
  return excludePatterns.some(pattern => pattern.test(filePath));
}

function removeFile(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const size = stats.size;
    fs.unlinkSync(filePath);
    filesRemoved++;
    bytesRemoved += size;
    return true;
  } catch (error) {
    // Ignore errors (file might be locked or already deleted)
    return false;
  }
}

function removeDirectory(dirPath) {
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
      return true;
    }
  } catch (error) {
    // Ignore errors
    return false;
  }
  return false;
}

function pruneDirectory(dir) {
  if (!fs.existsSync(dir)) {
    return;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(nodeModulesPath, fullPath);

    if (shouldExclude(relativePath)) {
      if (entry.isDirectory()) {
        removeDirectory(fullPath);
      } else {
        removeFile(fullPath);
      }
      continue;
    }

    if (entry.isDirectory()) {
      pruneDirectory(fullPath);
      
      // Remove empty directories
      try {
        const remaining = fs.readdirSync(fullPath);
        if (remaining.length === 0) {
          fs.rmdirSync(fullPath);
        }
      } catch (error) {
        // Directory might have been removed or is not empty
      }
    }
  }
}

// Start pruning
console.log('📋 Scanning node_modules...');
pruneDirectory(nodeModulesPath);

const mbRemoved = (bytesRemoved / 1024 / 1024).toFixed(2);

console.log(`✅ Pruning complete!`);
console.log(`   Files removed: ${filesRemoved}`);
console.log(`   Size removed: ${mbRemoved} MB`);

