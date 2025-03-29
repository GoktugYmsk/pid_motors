import { WebSocketServer } from 'ws';
import net from 'net';

export default function handler(req, res) {
  if (!res.socket.server.wsProxy) {
    const wss = new WebSocketServer({ noServer: true });
    res.socket.server.wsProxy = wss;

    wss.on('connection', (clientWs) => {
      let stm32Connection = null;
      
      clientWs.on('message', (message) => {
        try {
          const msg = JSON.parse(message);
          
          // STM32'ye bağlantı kur
          if (msg.type === 'INIT_CONNECTION') {
            if (msg.authToken !== process.env.WS_TOKEN) {
              clientWs.close(1008, 'Unauthorized');
              return;
            }
            
            stm32Connection = net.createConnection({
              host: msg.deviceIp,
              port: 80
            });

            // STM32'den gelen verileri client'a ilet
            stm32Connection.on('data', (data) => {
              clientWs.send(data.toString());
            });

            stm32Connection.on('error', (err) => {
              console.error('STM32 Connection Error:', err);
              clientWs.close(1011, 'Device Error');
            });
          }
          // Diğer mesajları ilet
          else if (stm32Connection) {
            stm32Connection.write(JSON.stringify(msg) + '\n');
          }
        } catch (err) {
          console.error('Message Processing Error:', err);
        }
      });

      // Temizlik
      clientWs.on('close', () => {
        stm32Connection?.end();
      });
    });
  }

  // WebSocket upgrade işlemi
  res.socket.server.wsProxy.handleUpgrade(
    req,
    req.socket,
    Buffer.alloc(0),
    (ws) => {
      res.socket.server.wsProxy.emit('connection', ws, req);
    }
  );
}