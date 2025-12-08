const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Ensuring complete build...\n');

const standalonePath = path.join(__dirname, '..', '.next', 'standalone');
const nodeModulesPath = path.join(standalonePath, 'node_modules');
const rootNodeModulesPath = path.join(__dirname, '..', 'node_modules');

// Check if standalone exists
if (!fs.existsSync(standalonePath)) {
  console.log('📦 Building Next.js app...');
  execSync('npm run build', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
}

// Ensure node_modules exists and is complete
const criticalModules = {
  'next': ['server.js', 'index.js', 'package.json'],
  'react': ['index.js', 'package.json'],
  'react-dom': ['index.js', 'server.js', 'package.json']
};

let needsCopy = false;

for (const [module, requiredFiles] of Object.entries(criticalModules)) {
  const modulePath = path.join(nodeModulesPath, module);
  const rootModulePath = path.join(rootNodeModulesPath, module);
  
  if (!fs.existsSync(modulePath)) {
    console.log(`⚠️  ${module} module missing`);
    needsCopy = true;
  } else {
    const missingFiles = requiredFiles.filter(file => {
      return !fs.existsSync(path.join(modulePath, file));
    });
    
    if (missingFiles.length > 0) {
      console.log(`⚠️  ${module} module incomplete (missing: ${missingFiles.join(', ')})`);
      needsCopy = true;
    }
  }
}

if (needsCopy) {
  console.log('\n📋 Running verification script to fix modules...');
  execSync('node scripts/verify-standalone.js', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
}

// Final verification
console.log('\n✅ Final verification:');
let allGood = true;

for (const [module, requiredFiles] of Object.entries(criticalModules)) {
  const modulePath = path.join(nodeModulesPath, module);
  const missingFiles = requiredFiles.filter(file => {
    return !fs.existsSync(path.join(modulePath, file));
  });
  
  if (missingFiles.length > 0) {
    console.log(`❌ ${module} still incomplete (missing: ${missingFiles.join(', ')})`);
    allGood = false;
  } else {
    console.log(`✅ ${module} is complete`);
  }
}

if (!allGood) {
  console.error('\n❌ Build verification failed. Please run: node scripts/verify-standalone.js');
  process.exit(1);
}

console.log('\n✅ All modules verified. Ready for electron-builder!');
