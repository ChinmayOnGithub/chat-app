// console.log("Hello via Bun!");

// const express = require('express');
// const { WebSocketServer } = require('ws');

import WebSocket, { WebSocketServer } from 'ws';
import express from 'express';
import type { Request, Response } from 'express';
import { randomUUID } from "crypto";

import path from 'path';
import { fileURLToPath } from 'url';

// Required in ESM (since __dirname doesn’t exist)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 8000;


app.get('/', (_: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'index.html'));
})

const server = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
})

const clients = new Map<WebSocket, { userId: string; username?: string }>();

// const app = express();
const wss = new WebSocketServer({ server });

wss.on('connection', (ws: any) => {
  console.log(`${ws.id} joined`);
  const userId = randomUUID().slice(0, 8);
  clients.set(ws, { userId });



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

    const clientInfo = clients.get(ws);
    if (!clientInfo) return;

    if (msg.type === 'identify' && typeof msg.username === 'string') {
      clientInfo.username = msg.username.slice(0, 32); // limit length
      ws.send(JSON.stringify(
        {
          system: true,
          message: `Hello ${clientInfo.username}!`
        }));
      return;
    }


    if (msg.type === 'message' && typeof msg.text === 'string') {
      const payload = JSON.stringify({
        id: clientInfo.userId,
        username: clientInfo.username ?? clientInfo.userId,
        message: msg.text
      });

      wss.clients.forEach((client: any) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      });
    }


    // When a user connects
    wss.clients.forEach((client: any) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          system: true,
          message: `${clientInfo.username ?? clientInfo.userId} joined the chat`
        }));
      }
    });

    // When a user disconnects
    wss.clients.forEach((client: any) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          system: true,
          message: `${clientInfo.username ?? clientInfo.userId} left the chat`
        }));
      }
    });


  });

  ws.on('close', () => {
    console.log('Client disconnected');
    clients.delete(ws);
  });
})