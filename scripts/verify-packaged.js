const fs = require('fs');
const path = require('path');

// Check if we're checking the built package or source
const distPath = path.join(__dirname, '..', 'dist', 'win-unpacked', 'resources', 'app', '.next', 'standalone');
const sourcePath = path.join(__dirname, '..', '.next', 'standalone');

console.log('🔍 Verifying node_modules are included in package...\n');

// Check source first
if (fs.existsSync(sourcePath)) {
  const sourceNodeModules = path.join(sourcePath, 'node_modules');
  if (fs.existsSync(sourceNodeModules)) {
    console.log('✅ Source: node_modules exists in .next/standalone');
    const nextModule = path.join(sourceNodeModules, 'next', 'server.js');
    if (fs.existsSync(nextModule)) {
      console.log('✅ Source: next/server.js exists');
    } else {
      console.log('❌ Source: next/server.js MISSING - run: node scripts/verify-standalone.js');
    }
  } else {
    console.log('❌ Source: node_modules MISSING in .next/standalone');
    console.log('   Run: node scripts/verify-standalone.js');
  }
} else {
  console.log('⚠️  Source: .next/standalone does not exist');
  console.log('   Run: npm run build');
}

console.log('');

// Check packaged version
if (fs.existsSync(distPath)) {
  const distNodeModules = path.join(distPath, 'node_modules');
  if (fs.existsSync(distNodeModules)) {
    console.log('✅ Packaged: node_modules exists in dist/win-unpacked');
    const nextModule = path.join(distNodeModules, 'next', 'server.js');
    if (fs.existsSync(nextModule)) {
      console.log('✅ Packaged: next/server.js exists');
      console.log('\n✅ SUCCESS: node_modules are properly packaged!');
    } else {
      console.log('❌ Packaged: next/server.js MISSING');
      console.log('\n❌ PROBLEM: node_modules exist but next module is incomplete');
      console.log('   This means electron-builder is excluding some files');
    }
  } else {
    console.log('❌ Packaged: node_modules MISSING in dist/win-unpacked');
    console.log('\n❌ PROBLEM: electron-builder is not including node_modules');
    console.log('   Check electron-builder.json extraResources configuration');
  }
} else {
  console.log('⚠️  Packaged: dist/win-unpacked does not exist');
  console.log('   Run: npx electron-builder --win');
}

console.log('');




