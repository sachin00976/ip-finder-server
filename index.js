const express = require('express');
const cors = require('cors'); // To allow requests from React dev server

const app = express();
const port = 881;

// Enable CORS for your React app
app.use(cors({ origin: "*"}));

// This endpoint is for streaming uploads
app.post('/upload', (req, res) => {
  console.log('Stream upload started...');

  let chunkCount = 0;
  let totalBytes = 0;

  // Listen for 'data' events on the request stream
  req.on('data', (chunk) => {
    chunkCount++;
    totalBytes += chunk.length;
    // chunk is a Buffer. We convert to string for logging.
    console.log(`Received chunk #${chunkCount} (${chunk.length} bytes)`);
    // console.log('Chunk data:', chunk.toString());
  });

  // Listen for the 'end' event, which fires when the client closes the stream
  req.on('end', () => {
    console.log('Stream ended.');
    console.log(`Total chunks received: ${chunkCount}`);
    console.log(`Total bytes received: ${totalBytes}`);

    // Now that the stream is complete, send a final response
    res.status(200).send('Stream received successfully!');
  });

  // Handle connection errors
  req.on('error', (err) => {
    console.error('Request stream error:', err);
    res.status(500).send('Error during stream.');
  });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
module.exports=app;