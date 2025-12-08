const fs = require('fs');
const path = require('path');

const standalonePath = path.join(__dirname, '..', '.next', 'standalone');
const nodeModulesPath = path.join(standalonePath, 'node_modules');
const rootNodeModulesPath = path.join(__dirname, '..', 'node_modules');

console.log('🔍 Verifying Next.js standalone build...');
console.log('Standalone path:', standalonePath);

// Check if standalone directory exists
if (!fs.existsSync(standalonePath)) {
  console.error('❌ ERROR: .next/standalone directory does not exist!');
  console.error('   Run "npm run build" first.');
  process.exit(1);
}

// Check if node_modules exists in standalone
if (!fs.existsSync(nodeModulesPath)) {
  console.warn('⚠️  WARNING: node_modules missing in standalone directory!');
  console.log('   Attempting to copy from root node_modules...');
  
  // Check if root node_modules exists
  if (!fs.existsSync(rootNodeModulesPath)) {
    console.error('❌ ERROR: Root node_modules does not exist!');
    console.error('   Run "npm install" first.');
    process.exit(1);
  }
  
  // Copy node_modules to standalone
  try {
    console.log('   Copying node_modules...');
    copyDirectory(rootNodeModulesPath, nodeModulesPath);
    console.log('✅ Successfully copied node_modules to standalone directory');
  } catch (error) {
    console.error('❌ ERROR: Failed to copy node_modules:', error.message);
    console.error('   This is a critical issue. The app will not work without node_modules.');
    process.exit(1);
  }
} else {
  console.log('✅ node_modules exists in standalone directory');
  
  // Verify critical modules exist AND are complete
  const criticalModules = ['next', 'react', 'react-dom'];
  let missingModules = [];
  let incompleteModules = [];
  
  for (const module of criticalModules) {
    const modulePath = path.join(nodeModulesPath, module);
    if (!fs.existsSync(modulePath)) {
      missingModules.push(module);
    } else {
      // Check if module is complete by looking for key files
      const keyFiles = {
        'next': ['server.js', 'package.json'], // server.js is critical, index.js doesn't exist in Next.js 14
        'react': ['index.js', 'package.json'],
        'react-dom': ['index.js', 'server.js', 'package.json']
      };
      
      const requiredFiles = keyFiles[module] || ['package.json'];
      const missingFiles = requiredFiles.filter(file => {
        const filePath = path.join(modulePath, file);
        return !fs.existsSync(filePath);
      });
      
      if (missingFiles.length > 0) {
        incompleteModules.push({ module, missingFiles });
      }
    }
  }
  
  // Copy missing or incomplete modules
  const modulesToCopy = [...missingModules, ...incompleteModules.map(m => m.module)];
  const uniqueModulesToCopy = [...new Set(modulesToCopy)];
  
  if (uniqueModulesToCopy.length > 0) {
    console.warn(`⚠️  WARNING: ${missingModules.length > 0 ? 'Missing' : ''}${missingModules.length > 0 && incompleteModules.length > 0 ? ' and ' : ''}${incompleteModules.length > 0 ? 'Incomplete' : ''} critical modules: ${uniqueModulesToCopy.join(', ')}`);
    if (incompleteModules.length > 0) {
      incompleteModules.forEach(({ module, missingFiles }) => {
        console.warn(`   ${module} is missing: ${missingFiles.join(', ')}`);
      });
    }
    console.log('   Attempting to copy modules from root...');
    
    for (const module of uniqueModulesToCopy) {
      const srcPath = path.join(rootNodeModulesPath, module);
      const destPath = path.join(nodeModulesPath, module);
      
      if (fs.existsSync(srcPath)) {
        try {
          // Remove incomplete module first
          if (fs.existsSync(destPath)) {
            console.log(`   Removing incomplete ${module}...`);
            fs.rmSync(destPath, { recursive: true, force: true });
          }
          console.log(`   Copying ${module}...`);
          copyDirectory(srcPath, destPath);
          console.log(`   ✅ Copied ${module}`);
        } catch (error) {
          console.error(`   ❌ Failed to copy ${module}:`, error.message);
          process.exit(1);
        }
      } else {
        console.error(`   ❌ ${module} not found in root node_modules!`);
        process.exit(1);
      }
    }
  } else {
    console.log('✅ All critical modules present and complete');
  }
}

// Clean up nested build artifacts
const distPath = path.join(standalonePath, 'dist');
if (fs.existsSync(distPath)) {
  console.warn('⚠️  Found nested dist directory, removing...');
  try {
    fs.rmSync(distPath, { recursive: true, force: true });
    console.log('✅ Removed nested dist directory');
  } catch (error) {
    console.warn('   Could not remove nested dist:', error.message);
  }
}

// Remove database file if it exists in standalone (should be in AppData)
const dbPath = path.join(standalonePath, 'youtube-tv.db');
if (fs.existsSync(dbPath)) {
  console.warn('⚠️  Found database file in standalone directory, removing...');
  try {
    fs.unlinkSync(dbPath);
    console.log('✅ Removed database file from standalone (should be in AppData)');
  } catch (error) {
    console.warn('   Could not remove database file:', error.message);
  }
}

console.log('✅ Standalone verification complete!');

// Helper function to copy directory recursively
function copyDirectory(src, dest) {
  // Create destination directory
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      // Skip certain directories to avoid copying unnecessary files
      if (entry.name === '.git' || entry.name === 'test' || entry.name === 'tests' || entry.name === '__tests__') {
        continue;
      }
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
