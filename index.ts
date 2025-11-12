// console.log("Hello via Bun!");

// const express = require('express');
// const { WebSocketServer } = require('ws');

import WebSocket, { WebSocketServer } from 'ws';
import express from 'express';
import { randomUUID } from "crypto";
import client from 'prom-client';

// import path from 'path';
// import { fileURLToPath } from 'url';

// Required in ESM (since __dirname doesn’t exist)
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

const app = express();
const PORT = 8000;

// Prometheus metrics setup
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// Custom metrics
const wsConnectionsGauge = new client.Gauge({
  name: 'websocket_connections_total',
  help: 'Total number of active WebSocket connections',
  registers: [register]
});

const wsMessagesCounter = new client.Counter({
  name: 'websocket_messages_total',
  help: 'Total number of WebSocket messages received',
  labelNames: ['type'],
  registers: [register]
});

// Health check endpoint for container orchestration
app.get('/healthz', (_, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Metrics endpoint for Prometheus
app.get('/metrics', async (_, res) => {
  res.set('Content-Type', register.contentType);
  res.send(await register.metrics());
});

// app.get('/', (_: Request, res: Response) => {
//   res.sendFile(path.join(__dirname, 'index.html'));
// })

const server = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
})

const clients = new Map<WebSocket, { userId: string; username?: string }>();

// const app = express();
const wss = new WebSocketServer({
  server
});

wss.on('headers', (headers, req) => {
  headers.push('Access-Control-Allow-Origin: *');
});

wss.on('connection', (ws: any) => {
  console.log(`${ws.id} joined`);
  const userId = randomUUID().slice(0, 8);
  clients.set(ws, { userId });
  
  // Update metrics
  wsConnectionsGauge.set(clients.size);


  const clientInfo = clients.get(ws);
  if (!clientInfo) return;




  ws.on('message', (raw: any) => {
    let msg;

    try {
      msg = JSON.parse(raw.toString());
      if (msg.type == `message`) {
        console.log(`message recieved: ${msg.text}`);
      } else {
        console.log(`System message`);
      }
    } catch {
      console.warn("Received non-JSON message");
      return;
    }

    if (msg.type === 'identify' && typeof msg.username === 'string') {
      clientInfo.username = msg.username.slice(0, 32); // limit length
      wsMessagesCounter.inc({ type: 'identify' });
      ws.send(JSON.stringify(
        {
          system: true,
          message: `Hello ${clientInfo.username}!`
        }));

      // Broadcast join to others
      wss.clients.forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            system: true,
            message: `${clientInfo.username} joined the chat`
          }));
        }
      });
      return;
    }

    if (msg.type === 'message' && typeof msg.text === 'string') {
      wsMessagesCounter.inc({ type: 'message' });
      const payload = JSON.stringify({
        id: clientInfo.userId,
        username: clientInfo.username ?? clientInfo.userId,
        message: msg.text,
        system: false
      });

      wss.clients.forEach((client: any) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      });
    }


  });

  ws.on('close', () => {
    console.log('Client disconnected');


    const clientInfo = clients.get(ws);
    if (!clientInfo) return;

    clients.delete(ws);
    
    // Update metrics
    wsConnectionsGauge.set(clients.size);

    if (clientInfo.username) {
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            system: true,
            message: `${clientInfo.username ?? clientInfo.userId} left the chat`
          }));
        }
      });
    }

    console.log(`Client ${clientInfo.username ?? clientInfo.userId} disconnected`);
  });
})