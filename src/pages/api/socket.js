import { WebSocketServer } from 'ws';

export default function handler(req, res) {
  if (!res.socket.server.wss) {
    const wss = new WebSocketServer({ noServer: true });
    res.socket.server.wss = wss;
    
    wss.on('connection', (ws) => {
      ws.on('message', (message) => {
        console.log('Received:', message);
        // STM32'ye iletme kodu buraya
      });
    });
  }
  
  res.status(200).end();
}