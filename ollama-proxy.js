// Enhanced CORS proxy for Ollama
const http = require('http');
const url = require('url');

const OLLAMA_HOST = '127.0.0.1';  // Use 127.0.0.1 instead of localhost
const OLLAMA_PORT = 11434;
const PROXY_PORT = 3001;

const server = http.createServer((req, res) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

    // Enable CORS for all requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        console.log('Handling OPTIONS preflight request');
        res.writeHead(200);
        res.end();
        return;
    }

    // Parse the request URL
    const parsedUrl = url.parse(req.url, true);

    // Clean headers - remove browser-specific headers that might cause CORS issues
    const cleanHeaders = {};
    Object.keys(req.headers).forEach(key => {
        const lowerKey = key.toLowerCase();
        if (lowerKey !== 'host' &&
            lowerKey !== 'origin' &&
            lowerKey !== 'referer' &&
            lowerKey !== 'user-agent' &&
            lowerKey !== 'sec-fetch-site' &&
            lowerKey !== 'sec-fetch-mode' &&
            lowerKey !== 'sec-fetch-dest') {
            cleanHeaders[key] = req.headers[key];
        }
    });

    // Add Content-Type if not present for POST requests
    if (req.method === 'POST' && !cleanHeaders['content-type']) {
        cleanHeaders['content-type'] = 'application/json';
    }

    // Forward the request to Ollama
    const options = {
        hostname: OLLAMA_HOST,
        port: OLLAMA_PORT,
        path: parsedUrl.path,
        method: req.method,
        headers: cleanHeaders
    };

    console.log(`Forwarding to: http://${OLLAMA_HOST}:${OLLAMA_PORT}${parsedUrl.path}`);

    const proxyReq = http.request(options, (proxyRes) => {
        console.log(`Ollama responded with: ${proxyRes.statusCode} ${proxyRes.statusMessage}`);

        // Ensure CORS headers are always set first
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

        // Copy response headers (but not CORS ones from Ollama)
        Object.keys(proxyRes.headers).forEach(key => {
            const lowerKey = key.toLowerCase();
            if (!lowerKey.startsWith('access-control-')) {
                res.setHeader(key, proxyRes.headers[key]);
            }
        });

        // Set status code
        res.writeHead(proxyRes.statusCode);

        // Pipe the response
        proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
        console.error('Proxy request error:', err);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            error: 'Proxy Error',
            message: err.message,
            details: 'Failed to connect to Ollama server'
        }));
    });

    // Pipe the request body
    req.pipe(proxyReq);
});

server.listen(PROXY_PORT, () => {
    console.log(`Ollama CORS proxy running on http://localhost:${PROXY_PORT}`);
    console.log(`Forwarding requests to http://${OLLAMA_HOST}:${OLLAMA_PORT}`);
    console.log('');
    console.log('Usage in your chat app:');
    console.log(`  - Change Ollama URL to: http://localhost:${PROXY_PORT}`);
    console.log('  - All API endpoints will work normally');
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PROXY_PORT} is already in use. Try a different port.`);
    } else {
        console.error('Server error:', err);
    }
});
