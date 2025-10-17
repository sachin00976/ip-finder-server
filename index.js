const express = require('express');
const os = require('os');
const axios = require('axios');
const http = require('http');
const { WebSocketServer } = require('ws');
const cors = require('cors');

const app = express();
// No need for PORT, Vercel assigns it automatically

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// The WebSocket code below will not work on Vercel,
// but it doesn't harm the HTTP endpoint.
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
let connectedClients = 0;
wss.on('connection', (ws) => {
  connectedClients++;
  ws.on('close', () => { connectedClients--; });
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

// ✅ Export the app for Vercel
module.exports = app;