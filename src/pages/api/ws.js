import { WebSocketServer } from 'ws';

// STM32'ye bağlantı için TCP istemcisi (Net modülü)
import net from 'net';

export default function handler(req, res) {
  if (!res.socket.server.wss) {
    const wss = new WebSocketServer({ noServer: true });
    res.socket.server.wss = wss;

    // STM32 TCP bağlantısı
    const stm32Client = net.createConnection({
      host: '192.168.1.100', // STM32 IP
      port: 80                // STM32 port
    });

    wss.on('connection', (ws) => {
      // Frontend'den gelen mesajları STM32'ye ilet
      ws.on('message', (message) => {
        stm32Client.write(message + '\n'); // STM32'ye gönder
      });

      // STM32'den gelen mesajları frontend'e ilet
      stm32Client.on('data', (data) => {
        ws.send(data.toString());
      });
    });

    // Hata yönetimi
    stm32Client.on('error', (err) => {
      console.error('STM32 Connection Error:', err);
    });
  }

  // WebSocket upgrade işlemi
  if (!res.socket.server.wss) {
    return res.status(500).end('WebSocket Server not initialized');
  }

  res.socket.server.wss.handleUpgrade(
    req,
    req.socket,
    Buffer.alloc(0),
    (ws) => {
      res.socket.server.wss.emit('connection', ws, req);
    }
  );
}