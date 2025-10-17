const express = require('express');
const os = require('os');
const axios = require('axios');
const http = require('http');
const { WebSocketServer } = require('ws');
const cors = require('cors'); // ✅ Import CORS

const app = express();
const PORT = 8000;


app.use(cors({
  origin: '*',       
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Create a standard HTTP server with the Express app
const server = http.createServer(app);

// Create a WebSocket server and attach it to the HTTP server
const wss = new WebSocketServer({ server });

let connectedClients = 0;

// WebSocket server logic
wss.on('connection', (ws) => {
  connectedClients++;
  console.log(`✅ New client connected. Total clients: ${connectedClients}`);

  // Handle client disconnection
  ws.on('close', () => {
    connectedClients--;
    console.log(`❌ Client disconnected. Total clients: ${connectedClients}`);
  });

  ws.on('error', console.error);
});

/**
 * Finds the non-internal IPv4 addresses of the server.
 * @returns {object} An object containing network interface names and their IPs.
 */
function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const localIps = {};
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        localIps[name] = localIps[name] || [];
        localIps[name].push(net.address);
      }
    }
  }
  return localIps;
}

// API endpoint to get server IPs and client count
app.get('/ip', async (req, res) => {
  let publicIp = 'Could not fetch public IP';
  try {
    const response = await axios.get('https://api.ipify.org?format=json');
    publicIp = response.data.ip;
  } catch (error) {
    console.error('Error fetching public IP:', error.message);
  }

  const serverInfo = {
    publicIp: publicIp,
    localIps: getLocalIpAddresses(),
    activeWebSocketClients: connectedClients, // Add the client count here
  };
  
  console.log('Server info requested:', serverInfo);
  res.json(serverInfo);
});

// Start the server
server.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log('Visit http://localhost:3000/ip to see the server info.');
});
