const express = require('express');
const cors = require('cors'); // To allow requests from React dev server

const app = express();
const port = 881;

// ---
// Here is the global list you asked for.
// WARNING: This will NOT be shared between Vercel instances.
// Every request will get its own, separate, empty list.
let connectedClients = [];
// ---

// Enable CORS for your React app
app.use(cors({ origin: "*"}));


app.get('/clients', (req, res) => {
  console.log('GET /clients request received');
  res.status(200).json({
    message: "List of clients connected *only* to this specific serverless instance.",
    clients: connectedClients,
    count: connectedClients.length
  });
});

// This endpoint is for streaming uploads
app.post('/upload', (req, res) => {
  
  // Create a unique ID for this connection
  const clientId = `client_${Date.now()}`;
  
  // Add client to the list *for this instance*
  connectedClients.push(clientId);
  console.log(`Stream upload started from ${clientId}. Total clients on this instance: ${connectedClients.length}`);

  let chunkCount = 0;
  let totalBytes = 0;

  // Listen for 'data' events on the request stream
  req.on('data', (chunk) => {
    chunkCount++;
    totalBytes += chunk.length;
    console.log(`Received chunk #${chunkCount} from ${clientId}`);
  });

  // Listen for the 'end' event, which fires when the client closes the stream
  req.on('end', () => {
    // Remove client from the list *for this instance*
    connectedClients = connectedClients.filter(id => id !== clientId);
    console.log(`Stream from ${clientId} ended. Total clients on this instance: ${connectedClients.length}`);
    
    console.log(`Total chunks received: ${chunkCount}`);
    console.log(`Total bytes received: ${totalBytes}`);

    res.status(200).send('Stream received successfully!'+`Total chunks received: ${chunkCount}`+`Total bytes received: ${totalBytes}`+`clientId:${clientId}`
      +`cLIENTLIST:${connectedClients}`
    );
  });

  // Handle connection errors
  req.on('error', (err) => {
    // Remove client from the list *for this instance*
    //connectedClients = connectedClients.filter(id => id !== clientId);
    console.error('Request stream error:', err);
    console.log(`Stream from ${clientId} errored. Total clients on this instance: ${connectedClients.length}`);
    res.status(500).send('Error during stream.');
  });
});

// This listen block is for local testing only
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

// This export is what Vercel uses
module.exports = app;