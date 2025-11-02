const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

const app = express();
const port = 881;
const CLIENTS_FILE_PATH = path.join(os.tmpdir(), 'connected_clients.txt');

// --- In-process lock to prevent concurrent writes ---
let fileLock = Promise.resolve();
async function withFileLock(task) {
  const release = fileLock;
  let releaseNext;
  fileLock = new Promise(resolve => (releaseNext = resolve));
  try {
    await release;
    return await task();
  } finally {
    releaseNext();
  }
}

// --- Helper: get all clients ---
async function getClientsFromFile() {
  try {
    const handle = await fs.open(CLIENTS_FILE_PATH, 'r');
    const data = await handle.readFile('utf8');
    await handle.close();
    return data.split('\n').filter(Boolean);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

// --- Helper: remove a client ---
async function removeClientFromFile(clientId) {
  return withFileLock(async () => {
    const clients = await getClientsFromFile();
    const updated = clients.filter(id => id !== clientId);

    const handle = await fs.open(CLIENTS_FILE_PATH, 'w');
    try {
      await handle.writeFile(updated.length ? updated.join('\n') + '\n' : '', 'utf8');
      await handle.sync();
    } finally {
      await handle.close();
    }

    return updated;
  });
}

// --- Helper: add a client ---
async function addClientToFile(clientId) {
  return withFileLock(async () => {
    const handle = await fs.open(CLIENTS_FILE_PATH, 'a');
    try {
      await handle.appendFile(clientId + '\n', 'utf8');
      await handle.sync();
    } finally {
      await handle.close();
    }
  });
}

// --- Enable CORS ---
app.use(cors({ origin: '*' }));

// --- GET /clients ---
app.get('/clients', async (req, res) => {
  try {
    const clients = await getClientsFromFile();
    res.status(200).json({
      message: 'List of clients from local temp file (non-persistent)',
      clients,
      count: clients.length
    });
  } catch (error) {
    console.error('Failed to read clients file:', error);
    res.status(500).json({ error: 'Error reading client list.' });
  }
});

// --- POST /upload ---
app.post('/upload', async (req, res) => {
  const clientId = `client_${Date.now()}`;
  let chunkCount = 0;
  let totalBytes = 0;

  try {
    await addClientToFile(clientId);
    console.log(`Stream upload started from ${clientId}`);
  } catch (error) {
    console.error('Failed to write to clients file:', error);
    return res.status(500).json({ error: 'Error saving client ID.' });
  }

  req.on('data', (chunk) => {
    chunkCount++;
    totalBytes += chunk.length;
  });

  req.on('end', async () => {
    try {
      const clients = await getClientsFromFile();
      console.log(`Stream from ${clientId} ended. Active clients: ${clients.length}`);
      res.status(200).json({
        message: 'Stream received successfully!',
        clientId,
        totalChunks: chunkCount,
        totalBytes,
        activeClients: clients
      });
    } catch (err) {
      console.error('Error handling stream end:', err);
      res.status(500).json({ error: 'Error processing stream end.' });
    }
  });

  req.on('error', async (err) => {
    console.error(`Stream error from ${clientId}:`, err);
    try {
      await removeClientFromFile(clientId);
    } catch (err2) {
      console.error('Error cleaning up after failed stream:', err2);
    }
    res.status(500).json({ error: 'Error during stream.' });
  });
});

app.listen(port, () => {
  console.log(`✅ Server listening at http://localhost:${port}`);
  console.log(`📄 Client list stored at: ${CLIENTS_FILE_PATH}`);
});

module.exports = app;
