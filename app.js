const express = require('express');
const os = require('os');
const axios = require('axios');
const http = require('http');
const { WebSocketServer } = require('ws');
const cors = require('cors');

const app = express();

app.use(cors({
  origin: '*',       
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// We need to handle both standard HTTP requests and WebSocket upgrade requests.
// Vercel's runtime will pass the request to this exported handler.
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

let connectedClients = 0; // This will reset on every invocation.

wss.on('connection', (ws) => {
  connectedClients++;
  console.log(`✅ Client connection event fired. Total clients in this instance: ${connectedClients}`);

  // This event will likely fire immediately as the function terminates.
  ws.on('close', () => {
    connectedClients--;
    console.log(`❌ Client disconnected. Total clients in this instance: ${connectedClients}`);
  });

  ws.on('error', console.error);
});

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
    activeWebSocketClients: connectedClients,
  };
  
  res.json(serverInfo);
});

// We wrap the server logic in a handler that Vercel can use.
const handler = (req, res) => {
  // Pass the request to the Express app
  server.emit('request', req, res);
};

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

// Export the handler for Vercel
module.exports = handler;