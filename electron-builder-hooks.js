exports.afterPack = async (context) => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    // This runs AFTER electron-builder packages but BEFORE installer is created
    // Context structure: { packager: { projectDir, appOutDir }, ... } or direct properties
    const projectDir = (context?.packager?.projectDir || context?.projectDir || process.cwd());
    const appOutDir = (context?.packager?.appOutDir || context?.appOutDir || context?.outDir);
    
    if (!appOutDir) {
      console.log('⚠️  afterPack: Could not determine appOutDir, skipping node_modules copy');
      console.log('   Context structure:', Object.keys(context || {}));
      return;
    }
    
    const sourceStandalone = path.join(projectDir, '.next', 'standalone');
    const packagedStandalone = path.join(appOutDir, 'resources', 'app', '.next', 'standalone');
    const sourceNodeModules = path.join(sourceStandalone, 'node_modules');
    const packagedNodeModules = path.join(packagedStandalone, 'node_modules');
    
    console.log('\n🔧 afterPack hook: Ensuring node_modules are in packaged app...');
    console.log('Project dir:', projectDir);
    console.log('App out dir:', appOutDir);
    console.log('Source:', sourceNodeModules);
    console.log('Destination:', packagedNodeModules);
    
    // Check if source has node_modules
    if (!fs.existsSync(sourceNodeModules)) {
      console.log('⚠️  Source node_modules not found - skipping copy');
      return;
    }
    
    // Check if packaged already has complete node_modules
    if (fs.existsSync(packagedNodeModules)) {
      const nextServer = path.join(packagedNodeModules, 'next', 'server.js');
      if (fs.existsSync(nextServer)) {
        console.log('✅ node_modules already exist and are complete');
        return;
      }
      // Remove incomplete
      console.log('⚠️  Removing incomplete node_modules...');
      fs.rmSync(packagedNodeModules, { recursive: true, force: true });
    }
    
    // Copy node_modules
    console.log('📋 Copying node_modules from source to packaged app...');
    copyDirectory(sourceNodeModules, packagedNodeModules);
    
    // Verify node_modules
    const nextServer = path.join(packagedNodeModules, 'next', 'server.js');
    if (fs.existsSync(nextServer)) {
      console.log('✅ node_modules copied successfully!');
      console.log('✅ next/server.js verified');
    } else {
      console.log('❌ ERROR: Copy failed - next/server.js missing');
      throw new Error('Failed to copy node_modules');
    }
    
    // CRITICAL FIX: Next.js standalone expects static files INSIDE standalone/.next/static
    // NOT at ../static relative to standalone
    // Source: https://nextjs.org/docs/app/api-reference/config/next-config-js/output
    // "you'll need to manually copy .next/static into .next/standalone/.next/"
    const staticSource = path.join(projectDir, '.next', 'static');
    const staticDestInStandalone = path.join(packagedStandalone, '.next', 'static');
    
    // Also keep the old location as backup (some setups use it)
    const staticDestOldLocation = path.join(appOutDir, 'resources', 'app', '.next', 'static');
    
    console.log('\n📋 Verifying static files...');
    console.log('Static source:', staticSource);
    console.log('Static destination (CORRECT location):', staticDestInStandalone);
    console.log('Source exists:', fs.existsSync(staticSource));
    
    if (fs.existsSync(staticSource)) {
      // CRITICAL: Copy static files into standalone/.next/static
      // This is where Next.js standalone server expects them
      console.log('📋 Copying static files to standalone/.next/static...');
      
      // Remove destination if it exists to ensure clean copy
      if (fs.existsSync(staticDestInStandalone)) {
        console.log('   Removing existing static files...');
        fs.rmSync(staticDestInStandalone, { recursive: true, force: true });
      }
      
      // Ensure parent directory exists
      const staticDestParent = path.dirname(staticDestInStandalone);
      if (!fs.existsSync(staticDestParent)) {
        fs.mkdirSync(staticDestParent, { recursive: true });
      }
      
      console.log('   Copying from:', staticSource);
      console.log('   Copying to:', staticDestInStandalone);
      copyDirectory(staticSource, staticDestInStandalone);
      
      // Verify critical directories exist
      const chunksDest = path.join(staticDestInStandalone, 'chunks');
      const cssDest = path.join(staticDestInStandalone, 'css');
      
      if (fs.existsSync(chunksDest)) {
        const chunkFiles = fs.readdirSync(chunksDest);
        console.log(`✅ Static files copied - found ${chunkFiles.length} chunk files`);
      } else {
        console.log('⚠️  WARNING: chunks directory not found after copy');
      }
      
      if (fs.existsSync(cssDest)) {
        const cssFiles = fs.readdirSync(cssDest);
        console.log(`✅ CSS files found - ${cssFiles.length} files`);
      }
      
      // Final verification - check if any JS files exist
      const allFiles = getAllFiles(staticDestInStandalone);
      const jsFiles = allFiles.filter(f => f.endsWith('.js'));
      const cssFiles = allFiles.filter(f => f.endsWith('.css'));
      console.log(`✅ Verification: ${jsFiles.length} JS files, ${cssFiles.length} CSS files`);
      
      // Also copy to old location as backup (in case some paths still reference it)
      console.log('\n📋 Also copying to old location as backup...');
      if (fs.existsSync(staticDestOldLocation)) {
        fs.rmSync(staticDestOldLocation, { recursive: true, force: true });
      }
      const staticDestOldParent = path.dirname(staticDestOldLocation);
      if (!fs.existsSync(staticDestOldParent)) {
        fs.mkdirSync(staticDestOldParent, { recursive: true });
      }
      copyDirectory(staticSource, staticDestOldLocation);
      console.log('✅ Static files also copied to backup location');
    } else {
      console.log('❌ ERROR: Static files not found in source!');
      console.log('   Run: npm run build first');
      throw new Error('Static files missing from build');
    }
  } catch (error) {
    console.error('❌ afterPack hook error:', error.message);
    // Don't throw - let build continue, node_modules might be in extraResources
    console.log('⚠️  Continuing build - node_modules may be included via extraResources');
  }
};

function copyDirectory(src, dest) {
  const fs = require('fs');
  const path = require('path');
  
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      if (['.git', 'test', 'tests', '__tests__', '.nyc_output', 'coverage'].includes(entry.name)) {
        continue;
      }
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function getAllFiles(dir, fileList = []) {
  const fs = require('fs');
  const path = require('path');
  
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      getAllFiles(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}




