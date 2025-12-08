const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');
const fs = require('fs');
const http = require('http');
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow = null;
let nextServer = null;

// Get user data directory (AppData on Windows)
function getUserDataPath() {
  if (process.platform === 'win32') {
    return path.join(os.homedir(), 'AppData', 'Roaming', 'youtube-tv');
  } else if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'youtube-tv');
  } else {
    return path.join(os.homedir(), '.config', 'youtube-tv');
  }
}

// Set database path environment variable for Next.js API routes
const userDataPath = getUserDataPath();
if (!fs.existsSync(userDataPath)) {
  fs.mkdirSync(userDataPath, { recursive: true });
}
process.env.DATABASE_PATH = path.join(userDataPath, 'youtube-tv.db');

// Check if Next.js dev server is fully ready (not just responding)
function waitForServer(port, maxAttempts = 60) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const checkServer = () => {
      attempts++;
      // Check if the root page loads successfully (200 status)
      const req = http.get(`http://localhost:${port}`, (res) => {
        // Next.js dev server returns 200 when ready, 404 or other errors when not ready
        if (res.statusCode === 200) {
          req.destroy();
          // Give it an extra moment to ensure all assets are compiled
          setTimeout(() => resolve(true), 500);
        } else {
          req.destroy();
          if (attempts >= maxAttempts) {
            reject(new Error(`Server not ready after ${maxAttempts} attempts (status: ${res.statusCode})`));
          } else {
            setTimeout(checkServer, 1000);
          }
        }
      });
      req.setTimeout(2000, () => {
        req.destroy();
        if (attempts >= maxAttempts) {
          reject(new Error(`Server not ready after ${maxAttempts} attempts`));
        } else {
          setTimeout(checkServer, 1000);
        }
      });
      req.on('error', () => {
        req.destroy();
        if (attempts >= maxAttempts) {
          reject(new Error(`Server not ready after ${maxAttempts} attempts`));
        } else {
          setTimeout(checkServer, 1000); // Check every second
        }
      });
    };
    checkServer();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../public/favicon.ico'), // Will add icon later
    show: false // Don't show until ready
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });
  
  // Enable console logging in production for debugging
  if (!isDev) {
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('Failed to load:', errorCode, errorDescription);
    });
  }

  // Load the app
  if (isDev) {
    // Development: Connect to Next.js dev server
    const startDevServer = async () => {
      // Check if server is already running and ready
      try {
        await waitForServer(3000, 5); // Give it a few tries in case it's starting up
        // Server is already running and ready
        console.log('Next.js dev server already running and ready');
        mainWindow.loadURL('http://localhost:3000');
      } catch (error) {
        // Server not running, start it
        console.log('Starting Next.js dev server...');
        const nextPath = path.join(__dirname, '..');
        nextServer = spawn('npm', ['run', 'dev'], {
          cwd: nextPath,
          shell: true,
          stdio: 'inherit',
          env: {
            ...process.env,
            DATABASE_PATH: process.env.DATABASE_PATH
          }
        });
        
        // Wait for server to be ready
        try {
          await waitForServer(3000, 60); // Wait up to 60 seconds
          console.log('Next.js dev server is ready');
          // Small delay to ensure all assets are compiled
          await new Promise(resolve => setTimeout(resolve, 1000));
          mainWindow.loadURL('http://localhost:3000');
        } catch (error) {
          console.error('Failed to start Next.js dev server:', error);
          mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
            <html>
              <body style="font-family: Arial; padding: 20px;">
                <h1>Failed to start Next.js dev server</h1>
                <p>Please make sure you can run <code>npm run dev</code> manually.</p>
                <p>Error: ${error.message}</p>
              </body>
            </html>
          `)}`);
        }
      }
    };
    
    startDevServer();
  } else {
    // Production: Start Next.js standalone server
    const startProductionServer = async () => {
      const nextPath = path.join(process.resourcesPath, 'app', '.next', 'standalone');
      const serverPath = path.join(nextPath, 'server.js');
      const staticPath = path.join(process.resourcesPath, 'app', '.next', 'static');
      
      // Verify static files exist before starting server
      if (!fs.existsSync(staticPath)) {
        console.error('❌ CRITICAL ERROR: Static files not found!');
        console.error('   Expected path:', staticPath);
        mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
          <html>
            <body style="font-family: Arial; padding: 20px;">
              <h1>❌ Build Error: Missing Static Files</h1>
              <p>Static files are required for the app to load.</p>
              <p><strong>Expected location:</strong> ${staticPath}</p>
              <p>Please rebuild the app.</p>
            </body>
          </html>
        `)}`);
        return;
      }
      
      console.log('Production mode - Starting Next.js server...');
      console.log('Server path:', serverPath);
      console.log('Server exists:', fs.existsSync(serverPath));
      console.log('Resources path:', process.resourcesPath);
      
      if (!fs.existsSync(serverPath)) {
        console.error('Next.js server not found at:', serverPath);
        mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
          <html>
            <body style="font-family: Arial; padding: 20px;">
              <h1>Error: Next.js server not found</h1>
              <p>Expected path: ${serverPath}</p>
              <p>Resources path: ${process.resourcesPath}</p>
            </body>
          </html>
        `)}`);
        return;
      }
      
      // Ensure DATABASE_PATH is passed to the spawned process
      // Also set NODE_PATH to ensure modules can be found
      const nodeModulesPath = path.join(nextPath, 'node_modules');
      
      // Verify node_modules exists
      if (!fs.existsSync(nodeModulesPath)) {
        console.error('❌ CRITICAL ERROR: node_modules not found in standalone directory!');
        console.error('   Expected path:', nodeModulesPath);
        console.error('   This means the build process did not copy node_modules correctly.');
        console.error('   Please rebuild the app with: npm run dist');
        mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
          <html>
            <body style="font-family: Arial; padding: 20px;">
              <h1>❌ Build Error: Missing node_modules</h1>
              <p>The Next.js standalone build is missing the <code>node_modules</code> directory.</p>
              <p><strong>Expected location:</strong> ${nodeModulesPath}</p>
              <p>This is a build configuration issue. Please rebuild the app.</p>
              <p><small>Check the build logs for more details.</small></p>
            </body>
          </html>
        `)}`);
        return;
      }
      
      // Verify critical 'next' module exists
      const nextModulePath = path.join(nodeModulesPath, 'next');
      if (!fs.existsSync(nextModulePath)) {
        console.error('❌ CRITICAL ERROR: "next" module not found in node_modules!');
        console.error('   Expected path:', nextModulePath);
        mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
          <html>
            <body style="font-family: Arial; padding: 20px;">
              <h1>❌ Build Error: Missing "next" module</h1>
              <p>The "next" module is missing from the standalone build.</p>
              <p><strong>Expected location:</strong> ${nextModulePath}</p>
              <p>Please rebuild the app with: <code>npm run dist</code></p>
            </body>
          </html>
        `)}`);
        return;
      }
      
      const env = {
        ...process.env,
        PORT: '3000',
        DATABASE_PATH: process.env.DATABASE_PATH,
        NODE_ENV: 'production',
        ELECTRON_IS_PACKAGED: 'true',
        NODE_PATH: nodeModulesPath // Ensure Node.js can find modules
      };
      
      // Log static files status (staticPath was already declared earlier)
      console.log('Static files path:', staticPath);
      console.log('Static files exist:', fs.existsSync(staticPath));
      if (!fs.existsSync(staticPath)) {
        console.warn('⚠️  WARNING: Static files not found at:', staticPath);
        console.warn('   Static files are required for the app to load');
      }
      
      console.log('✅ node_modules verified at:', nodeModulesPath);
      console.log('✅ "next" module verified');
      console.log('Starting server with DATABASE_PATH:', env.DATABASE_PATH);
      console.log('NODE_PATH:', env.NODE_PATH);
      
      let serverOutput = '';
      let serverErrors = '';
      
      // On Windows, use shell: true and quote the path to handle spaces
      // Use exec instead of spawn for better Windows path handling
      const { exec } = require('child_process');
      const command = `node "${serverPath}"`;
      
      // Set working directory to standalone so Next.js can find static files
      // Next.js standalone looks for static files at ../static relative to standalone
      // So from resources/app/.next/standalone, it looks for resources/app/.next/static
      // Also set NEXT_TELEMETRY_DISABLED to avoid telemetry issues
      env.NEXT_TELEMETRY_DISABLED = '1';
      
      // Verify the static path is correct before starting
      const expectedStaticPath = path.join(nextPath, '..', 'static');
      console.log('Expected static path (relative to server):', expectedStaticPath);
      console.log('Expected static path exists:', fs.existsSync(expectedStaticPath));
      
      nextServer = exec(command, {
        cwd: nextPath, // This is resources/app/.next/standalone
        env: env,
        shell: true
      }, (error, stdout, stderr) => {
        if (error) {
          console.error('Server exec error:', error);
        }
      });
      
      // Capture output
      if (nextServer.stdout) {
        nextServer.stdout.on('data', (data) => {
          const output = data.toString();
          serverOutput += output;
          console.log(`Server stdout: ${output}`);
        });
      }
      
      if (nextServer.stderr) {
        nextServer.stderr.on('data', (data) => {
          const error = data.toString();
          serverErrors += error;
          console.error(`Server stderr: ${error}`);
        });
      }
      
      // exec doesn't have 'error' event the same way, but we handle it in the callback
      // For exit, we need to track it differently with exec
      let serverExited = false;
      
      nextServer.on('exit', (code, signal) => {
        serverExited = true;
        if (code !== null && code !== 0) {
          console.error(`Server exited with code ${code}, signal: ${signal}`);
          console.error('Server output:', serverOutput);
          console.error('Server errors:', serverErrors);
          mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
            <html>
              <body style="font-family: Arial; padding: 20px;">
                <h1>Server crashed</h1>
                <p>Exit code: ${code}</p>
                <h3>Server Output:</h3>
                <pre style="background: #f0f0f0; padding: 10px; overflow: auto; max-height: 300px;">${serverOutput || '(no output)'}</pre>
                <h3>Server Errors:</h3>
                <pre style="background: #ffe0e0; padding: 10px; overflow: auto; max-height: 300px;">${serverErrors || '(no errors)'}</pre>
              </body>
            </html>
          `)}`);
        }
      });
      
      // Wait for server to be ready - give it more time
      try {
        console.log('Waiting for server to start...');
        await waitForServer(3000, 60); // Wait up to 60 seconds
        console.log('Next.js server is ready!');
        mainWindow.loadURL('http://localhost:3000');
      } catch (error) {
        console.error('Server not ready after waiting:', error);
        console.error('Server output so far:', serverOutput);
        console.error('Server errors so far:', serverErrors);
        mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
          <html>
            <body style="font-family: Arial; padding: 20px;">
              <h1>Server not ready</h1>
              <p>Error: ${error.message}</p>
              <p>Waited 60 seconds for server to start.</p>
              <h3>Server Output:</h3>
              <pre style="background: #f0f0f0; padding: 10px; overflow: auto; max-height: 300px;">${serverOutput || '(no output)'}</pre>
              <h3>Server Errors:</h3>
              <pre style="background: #ffe0e0; padding: 10px; overflow: auto; max-height: 300px;">${serverErrors || '(no errors)'}</pre>
              <p><small>Check the terminal/console where you launched the app for more details.</small></p>
            </body>
          </html>
        `)}`);
      }
    };
    
    startProductionServer();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App event handlers
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Kill Next.js server on Windows/Linux
  if (nextServer) {
    nextServer.kill();
    nextServer = null;
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // Clean up Next.js server
  if (nextServer) {
    nextServer.kill();
    nextServer = null;
  }
});

