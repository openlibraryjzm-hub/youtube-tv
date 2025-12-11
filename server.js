cat > server.js << 'EOF'
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const path = require('path');

const dev = false;
const app = next({ dev, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(3000, () => {
    console.log('> YouTube TV ready - opening in browser...');
    require('child_process').exec('start http://localhost:3000');
  });
});

if (typeof process.pkg !== 'undefined') {
  global.__dirname = path.dirname(process.execPath);
} else {
  global.__dirname = __dirname;
}
EOF