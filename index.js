const express = require('express');
const cors = require('cors');
const fs = require('fs').promises; // Node.js File System module (async/promises)
const path = require('path');
const os = require('os');

const app = express();
const port = 881;

// ---
// Using a file to store the client list.
// This file will be created in your system's temporary directory.
// WARNING: This file is NOT shared between Vercel instances.
const CLIENTS_FILE_PATH = path.join(os.tmpdir(), 'connected_clients.txt');
// ---

// Helper function to read all clients from the file
async function getClientsFromFile() {
  try {
    const data = await fs.readFile(CLIENTS_FILE_PATH, 'utf8');
    return data.split('\n').filter(Boolean); // Filter out empty lines
  } catch (error) {
    // If the file doesn't exist yet, return an empty array
    if (error.code === 'ENOENT') {
      return [];
    }
    // For other errors, re-throw them
    throw error;
  }
}

// Helper function to remove a specific client from the file
async function removeClientFromFile(clientId) {
  try {
    let clients = await getClientsFromFile();
    // Filter out the client that disconnected
    const updatedClients = clients.filter(id => id !== clientId);
    // Write the new list back to the file
    await fs.writeFile(CLIENTS_FILE_PATH, updatedClients.join('\n') + '\n', 'utf8');
    return updatedClients;
  } catch (error) {
    console.error(`Failed to remove client ${clientId} from file:`, error);
  }
}

// Enable CORS for your React app
app.use(cors({ origin: "*" }));

app.get('/clients', async (req, res) => { // Made async
  console.log('GET /clients request received');
  try {
    const clients = await getClientsFromFile();
    res.status(200).json({
      message: "List of clients from *local file* (will not work on Vercel)",
      clients: clients,
      count: clients.length
    });
  } catch (error) {
    console.error('Failed to read clients file:', error);
    res.status(500).send('Error reading client list.');
  }
});

// This endpoint is for streaming uploads
app.post('/upload', async (req, res) => { // Made async
  
  // Create a unique ID for this connection
  const clientId = `client_${Date.now()}`;
  
  try {
    // ---
    // Here is the system call to "store the client id in it"
    // We append the new client ID to the file.
    await fs.appendFile(CLIENTS_FILE_PATH, clientId + '\n', 'utf8');
    // ---
    
    console.log(`Stream upload started from ${clientId}. Stored in ${CLIENTS_FILE_PATH}`);

  } catch (error) {
    console.error('Failed to write to clients file:', error);
    return res.status(500).send('Error saving client ID.');
  }

  let chunkCount = 0;
  let totalBytes = 0;

  // Listen for 'data' events on the request stream
  req.on('data', (chunk) => {
    chunkCount++;
    totalBytes += chunk.length;
    console.log(`Received chunk #${chunkCount} from ${clientId}`);
  });

  // Listen for the 'end' event, which fires when the client closes the stream
  req.on('end', async () => { // Made async
    // Remove client from the file
   // const clients = await removeClientFromFile(clientId);
    console.log(`Stream from ${clientId} ended. Total clients in file: ${clients ? clients.length : 'N/A'}`);
    
    console.log(`Total chunks received: ${chunkCount}`);
    console.log(`Total bytes received: ${totalBytes}`);

    res.status(200).send('Stream received successfully!'+`Total chunks received: ${chunkCount}`+`Total bytes received: ${totalBytes}`+`clientId:${clientId}`
      +`cLIENTLIST:${clients ? clients.join(',') : ''}`
    );
  });

  // Handle connection errors
  req.on('error', async (err) => { // Made async
    // Remove client from the file
    //const clients = await removeClientFromFile(clientId);
    console.error('Request stream error:', err);
    console.log(`Stream from ${clientId} errored. Total clients in file: ${clients ? clients.length : 'N/A'}`);
    res.status(500).send('Error during stream.');
  });
});

// This listen block is for local testing only
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
  console.log(`Client list is being stored in: ${CLIENTS_FILE_PATH}`);
});

// This export is what Vercel uses
module.exports = app;