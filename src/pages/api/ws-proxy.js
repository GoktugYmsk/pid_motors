import { WebSocketServer } from 'ws';
import { createServer } from 'http';

// WebSocket proxy sunucusu
const server = createServer();
const wss = new WebSocketServer({ noServer: true });

// ESP32 WebSocket bağlantısı
let esp32Socket = null;

wss.on('connection', (clientWs) => {
  console.log('Yeni istemci bağlandı');
  
  // ESP32'ye bağlan
  esp32Socket = new WebSocket('ws://172.20.10.8:81');
  
  esp32Socket.onopen = () => {
    console.log('ESP32 WebSocket bağlantısı kuruldu');
  };

  // İstemciden ESP32'ye mesaj ilet
  clientWs.on('message', (message) => {
    if (esp32Socket && esp32Socket.readyState === WebSocket.OPEN) {
      esp32Socket.send(message.toString());
    }
  });

  // ESP32'den gelen mesajları istemciye ilet
  esp32Socket.on('message', (message) => {
    clientWs.send(message.toString());
  });

  // Hata yönetimi
  esp32Socket.onerror = (error) => {
    console.error('ESP32 bağlantı hatası:', error);
    clientWs.close();
  };
});

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

export default function handler(req, res) {
  if (!res.socket.server.wss) {
    res.socket.server = { wss };
    server.listen(3001, () => {
      console.log('WebSocket proxy sunucusu 3001 portunda çalışıyor');
    });
  }
  
  res.socket.server.wss.handleUpgrade(req, req.socket, Buffer.alloc(0), (ws) => {
    res.socket.server.wss.emit('connection', ws, req);
  });
  
  res.end();
}