# Size Optimization Plan - Reduce 800MB → Target: <200MB

## Current Size Analysis
- **Installer:** ~180MB
- **Installed App:** ~800MB
- **Target:** <200MB installed (<50MB installer)

---

## 🎯 Quick Wins (Estimated: 60-70% reduction)

### 1. Remove Unused Dependencies

#### Three.js Libraries (LIKELY HUGE - ~100-200MB)
**Check if used:**
- `@react-three/drei` - 3D helpers
- `@react-three/fiber` - 3D renderer
- `three` - 3D library

**Action:** If not used, remove these. They're massive libraries.

#### Development Dependencies in Production
- `json-server` - Development tool, NOT needed in production
- `firebase` - Check if still used (you migrated to SQLite)

**Action:** Move to `devDependencies` or remove entirely.

### 2. Next.js Production Optimizations

#### Enable Compression
```javascript
// next.config.mjs
const nextConfig = {
  output: 'standalone',
  compress: true, // Enable gzip compression
  images: { unoptimized: true },
  distDir: '.next',
  // Exclude source maps in production
  productionBrowserSourceMaps: false,
};
```

#### Tree Shaking
- Ensure unused code is eliminated
- Use dynamic imports for large components
- Lazy load routes

### 3. Electron-Builder Optimizations

#### Compression Settings
```json
{
  "compression": "maximum", // Use maximum compression
  "asar": true, // Already enabled
  "asarUnpack": [
    "**/node_modules/better-sqlite3/**",
    "**/node_modules/@next/swc-*/**"
  ]
}
```

#### Exclude Unnecessary Files
```json
{
  "files": [
    "app/**/*",
    "lib/**/*",
    "public/**/*",
    "package.json",
    "next.config.mjs",
    "electron/**/*",
    "!**/*.map", // Exclude source maps
    "!**/*.test.js",
    "!**/*.spec.js",
    "!**/test/**",
    "!**/tests/**",
    "!**/__tests__/**",
    "!**/node_modules/**/test/**",
    "!**/node_modules/**/tests/**",
    "!**/node_modules/**/docs/**",
    "!**/node_modules/**/examples/**"
  ]
}
```

### 4. Node Modules Optimization

#### Remove Unused Packages from Standalone
Next.js standalone includes ALL dependencies. We need to:
1. Audit what's actually needed
2. Use `experimental.outputFileTracingIncludes` to be more selective
3. Manually prune after build

#### Create Pruning Script
```javascript
// scripts/prune-standalone.js
// Remove unnecessary files from .next/standalone/node_modules
// - Remove test files
// - Remove docs
// - Remove examples
// - Remove source maps (if not debugging)
```

---

## 🔍 Detailed Analysis Needed

### Step 1: Check What's Actually Used

**Run these commands:**
```bash
# Check if Three.js is used
grep -r "three\|react-three" app/ lib/

# Check if Firebase is used
grep -r "firebase" app/ lib/

# Check if json-server is used
grep -r "json-server" app/ lib/
```

### Step 2: Measure Current Sizes

**Check what's taking up space:**
```bash
# Size of node_modules in standalone
du -sh .next/standalone/node_modules

# Size of static files
du -sh .next/static

# Size of specific packages
du -sh .next/standalone/node_modules/three
du -sh .next/standalone/node_modules/@react-three
du -sh .next/standalone/node_modules/firebase
```

### Step 3: Identify Large Packages

**Use this to find biggest packages:**
```bash
cd .next/standalone/node_modules
du -sh */ | sort -hr | head -20
```

---

## 📋 Implementation Steps

### Phase 1: Remove Unused Dependencies (HIGH IMPACT)

1. **Check Three.js usage:**
   ```bash
   grep -r "three\|react-three" app/ lib/
   ```
   - If not found → Remove from `package.json`
   - Run `npm install` to update
   - Rebuild

2. **Check Firebase usage:**
   ```bash
   grep -r "firebase" app/ lib/
   ```
   - If only in old code → Remove
   - You're using SQLite now, Firebase shouldn't be needed

3. **Remove json-server:**
   - This is a dev tool, remove from dependencies

### Phase 2: Optimize Next.js Build

1. **Update `next.config.mjs`:**
   ```javascript
   const nextConfig = {
     output: 'standalone',
     compress: true,
     images: { unoptimized: true },
     distDir: '.next',
     productionBrowserSourceMaps: false,
     // Exclude unnecessary files
     experimental: {
       outputFileTracingExcludes: {
         '*': [
           'node_modules/@swc/core*/**',
           'node_modules/@next/swc*/**/target/**',
           'node_modules/**/test/**',
           'node_modules/**/tests/**',
           'node_modules/**/docs/**',
           'node_modules/**/examples/**',
         ],
       },
     },
   };
   ```

### Phase 3: Optimize Electron-Builder

1. **Update `electron-builder.json`:**
   ```json
   {
     "compression": "maximum",
     "files": [
       "app/**/*",
       "lib/**/*",
       "public/**/*",
       "package.json",
       "next.config.mjs",
       "electron/**/*",
       "!**/*.map",
       "!**/test/**",
       "!**/tests/**",
       "!**/__tests__/**",
       "!**/docs/**",
       "!**/examples/**"
     ]
   }
   ```

### Phase 4: Create Pruning Script

1. **Create `scripts/prune-standalone.js`:**
   - Remove test files
   - Remove docs
   - Remove examples
   - Remove source maps (optional)

2. **Add to build chain:**
   ```json
   "postbuild": "node scripts/verify-standalone.js && node scripts/prune-standalone.js"
   ```

---

## 🎯 Expected Results

### After Phase 1 (Remove Unused):
- **Three.js removal:** -100-200MB
- **Firebase removal:** -50-100MB
- **json-server removal:** -10MB
- **Total:** ~160-310MB reduction

### After Phase 2 (Next.js optimization):
- **Compression:** -20-30MB
- **File tracing excludes:** -10-20MB
- **Total:** ~30-50MB reduction

### After Phase 3 (Electron-builder optimization):
- **Maximum compression:** -20-30MB
- **File exclusions:** -10-20MB
- **Total:** ~30-50MB reduction

### After Phase 4 (Pruning):
- **Test files removal:** -10-20MB
- **Docs/examples removal:** -5-10MB
- **Total:** ~15-30MB reduction

### **Grand Total Estimated Reduction: 235-440MB**
**New Size: 360-565MB → Target: <200MB (may need more aggressive pruning)**

---

## 🚀 Quick Start

**Let's start with Phase 1 - Check what's actually used:**

1. Check if Three.js is used
2. Check if Firebase is used
3. Remove unused dependencies
4. Rebuild and measure

**Ready to start? Let me know and I'll help you check what's actually being used!**

