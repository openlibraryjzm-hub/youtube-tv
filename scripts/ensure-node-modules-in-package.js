const fs = require('fs');
const path = require('path');

// Paths - we're ensuring node_modules are in the SOURCE that electron-builder will package
const sourceStandalone = path.join(__dirname, '..', '.next', 'standalone');
const sourceNodeModules = path.join(sourceStandalone, 'node_modules');
const rootNodeModules = path.join(__dirname, '..', 'node_modules');

console.log('🔧 Ensuring node_modules are ready for electron-builder...\n');
console.log('Source standalone:', sourceStandalone);

// Check if source standalone exists
if (!fs.existsSync(sourceStandalone)) {
  console.log('❌ Source standalone not found!');
  console.log('   Run: npm run build first');
  process.exit(1);
}

// Check if source has node_modules and if they're complete
let needsCopy = false;
if (!fs.existsSync(sourceNodeModules)) {
  console.log('⚠️  node_modules missing in .next/standalone');
  needsCopy = true;
} else {
  // Verify it's complete - check for critical files (server.js is the key one)
  const nextServer = path.join(sourceNodeModules, 'next', 'server.js');
  const nextPackageJson = path.join(sourceNodeModules, 'next', 'package.json');
  if (!fs.existsSync(nextServer) || !fs.existsSync(nextPackageJson)) {
    console.log('⚠️  node_modules exist but incomplete (missing critical files)');
    if (!fs.existsSync(nextServer)) console.log('   Missing: next/server.js');
    if (!fs.existsSync(nextPackageJson)) console.log('   Missing: next/package.json');
    needsCopy = true;
  } else {
    console.log('✅ node_modules already exist and are complete');
    console.log('✅ next/server.js verified');
    console.log('✅ next/package.json verified');
    console.log('\n✅ Ready for electron-builder to package!');
    process.exit(0);
  }
}

// Copy from root node_modules if source is missing/incomplete
if (!fs.existsSync(rootNodeModules)) {
  console.log('❌ Root node_modules not found!');
  console.log('   Run: npm install first');
  process.exit(1);
}

if (needsCopy) {
  if (fs.existsSync(sourceNodeModules)) {
    console.log('📋 Removing incomplete node_modules...');
    fs.rmSync(sourceNodeModules, { recursive: true, force: true });
  }
  
  console.log('📋 Copying node_modules from root to .next/standalone...');
  console.log('   This ensures electron-builder will include them via extraResources');
  copyDirectory(rootNodeModules, sourceNodeModules);
  console.log('✅ node_modules copied successfully!');
  
  // Verify - only check for server.js (the critical one for the error)
  const nextServer = path.join(sourceNodeModules, 'next', 'server.js');
  const nextPackageJson = path.join(sourceNodeModules, 'next', 'package.json');
  if (fs.existsSync(nextServer) && fs.existsSync(nextPackageJson)) {
    console.log('✅ Verification: next/server.js exists');
    console.log('✅ Verification: next/package.json exists');
    console.log('\n✅ SUCCESS: node_modules are ready for electron-builder to package!');
  } else {
    console.log('❌ ERROR: Copy failed - critical files still missing');
    if (!fs.existsSync(nextServer)) console.log('   Missing: next/server.js');
    if (!fs.existsSync(nextPackageJson)) console.log('   Missing: next/package.json');
    process.exit(1);
  }
}

function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      // Skip certain directories
      if (['.git', 'test', 'tests', '__tests__', '.nyc_output', 'coverage'].includes(entry.name)) {
        continue;
      }
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}




