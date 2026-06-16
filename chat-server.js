// Simple HTTP server for the chat app
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp'
};

const server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);

    // ── CORS proxy endpoint for website agent content extraction ──
    if (parsedUrl.pathname === '/api/proxy') {
        const targetUrl = parsedUrl.searchParams.get('url');
        if (!targetUrl) {
            res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ error: 'Missing url parameter' }));
            return;
        }

        // Validate URL protocol
        try {
            const parsed = new URL(targetUrl);
            if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
                res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ error: 'Only http/https URLs are allowed' }));
                return;
            }
        } catch {
            res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ error: 'Invalid URL' }));
            return;
        }

        // Fetch the target URL server-side (no CORS restrictions)
        const fetchModule = targetUrl.startsWith('https') ? require('https') : require('http');
        fetchModule.get(targetUrl, { timeout: 10000 }, (proxyRes) => {
            let body = '';
            proxyRes.setEncoding('utf8');
            proxyRes.on('data', (chunk) => { body += chunk; });
            proxyRes.on('end', () => {
                res.writeHead(200, {
                    'Content-Type': 'text/html; charset=utf-8',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end(body);
            });
        }).on('error', (err) => {
            res.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ error: 'Proxy fetch failed: ' + err.message }));
        });
        return;
    }

    // ── Health check for proxy availability detection ──
    if (parsedUrl.pathname === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ status: 'ok', proxy: true }));
        return;
    }

    // ── Static file serving ──
    let filePath = '.' + parsedUrl.pathname;
    if (filePath === './') {
        filePath = './index.html';
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(500);
                res.end('Server error: ' + error.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': mimeType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`Chat app server running at http://localhost:${PORT}/`);
    console.log('Open this URL in your browser to use the chat app.');
});
