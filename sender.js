// save as stream_client.js
const http = require('http');

// --- Your upload endpoint ---
const UPLOAD_URL = new URL('http://localhost:881/upload');

// --- Setup connection options ---
const options = {
  hostname: UPLOAD_URL.hostname,
  port: UPLOAD_URL.port,
  path: UPLOAD_URL.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/octet-stream',
    'Transfer-Encoding': 'chunked', // tell server we're streaming chunks
  },
};

// --- Create the HTTP request ---
const req = http.request(options, (res) => {
  console.log(`✅ Server responded with status: ${res.statusCode}`);
  let data = '';
  res.on('data', (chunk) => (data += chunk));
  res.on('end', () => {
    console.log('✅ Server response body:\n', data);
  });
});

req.on('error', (err) => {
  console.error('❌ Request error:', err);
});

// --- Stream data every second ---
let chunkCount = 0;
let totalBytes = 0;

const intervalId = setInterval(() => {
  const chunk = `Data chunk #${++chunkCount} sent at ${new Date().toISOString()}\n`;
  const buf = Buffer.from(chunk, 'utf8');
  totalBytes += buf.length;

  const ok = req.write(buf);
  console.log(`📤 Sent ${buf.length} bytes (total: ${totalBytes})`);

  if (!ok) {
    console.log('⚠️ Backpressure detected — waiting...');
  }
}, 1000);

// --- Stop sending after 10 seconds ---
setTimeout(() => {
  clearInterval(intervalId);
  console.log('⏹️ Stopping stream...');
  req.end(); // Signal end of stream to the server
}, 10000);
