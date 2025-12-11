// Preload script - runs in renderer process before page loads
// Can expose safe APIs to the renderer if needed

const { contextBridge } = require('electron');

// Expose protected methods that allow the renderer process to use
// the APIs we define here
contextBridge.exposeInMainWorld('electronAPI', {
  // Add any Electron APIs you need to expose to the renderer
  // For now, we don't need any - everything works through Next.js API routes
});












