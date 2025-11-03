require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

const app = express();
const port = process.env.PORT || 881;
const SERVER_URL = process.env.SERVER_URL || `http://localhost:${port}`;

app.use(express.json());
app.use(cors({ origin: '*' }));
let clientId;

// Temp file (non-persistent)
const CLIENTS_FILE_PATH = path.join(os.tmpdir(), 'connected_clients.txt');

// ----------------------------------------------
// 🔹 Route: Append data to file
// ----------------------------------------------
app.post('/append', async (req, res) => {
  const { data } = req.body || clientId;
  if (!data) return res.status(400).json({ error: 'Missing "data" field.' });

  try {
    const handle = await fs.open(CLIENTS_FILE_PATH, 'a');
    await handle.appendFile(data + '\n', 'utf8');
    await handle.sync();
    await handle.close();

    console.log(`✅ Appended "${data}" to file.`);
    res.json({ success: true, message: `Data appended: ${data}` });
  } catch (err) {
    console.error('❌ Append failed:', err);
    res.status(500).json({ success: false, error: 'Failed to append to file.' });
  }
});

// ----------------------------------------------
// 🔹 Route: Read data from file
// ----------------------------------------------
app.get('/read', async (req, res) => {
  try {
    const handle = await fs.open(CLIENTS_FILE_PATH, 'r');
    const data = await handle.readFile('utf8');
    await handle.close();

    const clients = data.split('\n').filter(Boolean);
    res.json({ success: true, clients });
  } catch (err) {
    if (err.code === 'ENOENT') return res.json({ success: true, clients: [] });
    console.error('❌ Read failed:', err);
    res.status(500).json({ success: false, error: 'Failed to read file.' });
  }
});

// ----------------------------------------------
// 🔹 Route: Upload (calls /append + /read via SERVER_URL)
// ----------------------------------------------
app.post('/upload', async (req, res) => {
   clientId = `client_${Date.now()}`;
  let chunkCount = 0;
  let totalBytes = 0;

  try {
    const appendUrl = `${SERVER_URL}/append`;
    const resp = await fetch(appendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: clientId }),
    });

    if (!resp.ok) throw new Error(`Append route failed: ${resp.status}`);
    console.log(`📤 Called /append for ${clientId}`);
  } catch (err) {
    console.error('❌ Failed to call /append route:', err);
    return res.status(500).json({ error: 'Could not append via route.' });
  }

  req.on('data', (chunk) => {
    chunkCount++;
    totalBytes += chunk.length;
  });

  req.on('end', async () => {
    try {
      const readUrl = `${SERVER_URL}/read`;
      const readResp = await fetch(readUrl);
      const json = await readResp.json();

      console.log(`✅ Upload done for ${clientId}. Active clients: ${json.clients.length}`);
      res.json({
        message: 'Upload successful!',
        clientId,
        totalChunks: chunkCount,
        totalBytes,
        clients: json.clients,
      });
    } catch (err) {
      console.error('❌ Error reading clients after upload:', err);
      res.status(500).json({ error: 'Error reading clients after upload.' });
    }
  });
});

// ----------------------------------------------
// 🔹 Route: Clients (calls /read internally)
// ----------------------------------------------
app.get('/clients', async (req, res) => {
  try {
    const readUrl = `${SERVER_URL}/read`;
    const response = await fetch(readUrl);
    const json = await response.json();

    res.json({
      message: 'List of connected clients (via /read route)',
      clients: json.clients || [],
      count: (json.clients || []).length,
    });
  } catch (err) {
    console.error('❌ Failed to fetch clients via /read:', err);
    res.status(500).json({ error: 'Failed to get client list.' });
  }
});

// ----------------------------------------------
// 🔹 Start server
// ----------------------------------------------
app.listen(port, () => {
  console.log(`✅ Server running on ${SERVER_URL}`);
  console.log(`📄 Client list stored at: ${CLIENTS_FILE_PATH}`);
});

module.exports = app;
