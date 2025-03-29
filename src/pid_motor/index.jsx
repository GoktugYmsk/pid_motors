import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { FiPower, FiSun, FiMoon, FiWifi, FiWifiOff, FiRotateCw, FiSettings } from "react-icons/fi";
import { GiProgression } from "react-icons/gi";
import { IoMdSpeedometer } from "react-icons/io";
import { 
  MdSensors, } from "react-icons/md";
import { FaAngleRight } from "react-icons/fa"
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './index.scss';

let ws;

function PidMotor() {
  const [motorStatus, setMotorStatus] = useState("Bağlantı Yok");
  const [data, setData] = useState([]);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const [distance, setDistance] = useState(0);
  const [angle, setAngle] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [inputAngle, setInputAngle] = useState("");

  const connectWebSocket = () => {
    // 1. Dinamik WebSocket URL belirleme
    const getWebSocketUrl = () => {
      // Geliştirme ortamında doğrudan STM32'ye bağlan
      if (process.env.NODE_ENV === 'development') {
        return 'ws://192.168.1.100/ws';
      }
      
      // Production'da Vercel proxy üzerinden
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${window.location.host}/api/ws-proxy`;
    };
  
    // 2. WebSocket bağlantısını oluştur
    ws = new WebSocket(getWebSocketUrl());
  
    // 3. Bağlantı açıldığında
    ws.onopen = () => {
      setIsConnected(true);
      setMotorStatus("Hazır");
      showToast("Bağlantı sağlandı", "success");
  
      // Production'da STM32 IP'sini gönder
      if (process.env.NODE_ENV === 'production') {
        ws.send(JSON.stringify({
          type: 'INIT_CONNECTION',
          deviceIp: process.env.NEXT_PUBLIC_STM32_IP || '192.168.1.100',
          authToken: process.env.NEXT_PUBLIC_WS_TOKEN // Güvenlik için
        }));
      }
    };
  
    // 4. Gelen mesajları işleme
    ws.onmessage = (event) => {
      try {
        const rawData = event.data;
        
        // Binary veri desteği
        const message = typeof rawData === 'string' 
          ? JSON.parse(rawData) 
          : JSON.parse(new TextDecoder().decode(rawData));
  
        // Veri güncellemeleri
        if (message.distance !== undefined) {
          setDistance(parseFloat(message.distance.toFixed(2)));
        }
        if (message.angle !== undefined) {
          setAngle(parseInt(message.angle));
        }
        if (message.speed !== undefined) {
          setSpeed(parseInt(message.speed));
        }
        if (message.status) {
          setMotorStatus(message.status);
        }
  
        // Grafik verisini güncelle (son 50 kayıt)
        setData(prev => {
          const newData = [...prev, {
            timestamp: new Date().toISOString(),
            speed: message.speed || 0,
            distance: message.distance || 0,
            angle: message.angle || 0
          }];
          return newData.slice(-50); // Sabit boyutlu veri seti
        });
  
      } catch (error) {
        console.error("Veri işleme hatası:", error);
        setMotorStatus(`Veri Hatası: ${event.data}`);
      }
    };
  
    // 5. Hata yönetimi
    ws.onerror = (error) => {
      console.error("WebSocket hatası:", error);
      handleDisconnection();
      
      // Özel hata mesajları
      if (error.message.includes('failed')) {
        showToast("Sunucuya ulaşılamıyor", "error");
      } else {
        showToast("Bağlantı hatası oluştu", "error");
      }
    };
  
    // 6. Bağlantı kapatıldığında
    ws.onclose = () => {
      handleDisconnection();
    };
  
    // 7. Yeniden bağlanma mekanizması
    const handleDisconnection = () => {
      if (isConnected) {
        setIsConnected(false);
        setMotorStatus("Bağlantı Yok");
        
        // 3 saniye sonra otomatik yeniden bağlan
        const reconnectTimeout = setTimeout(() => {
          if (!isConnected) {
            showToast("Yeniden bağlanılıyor...", "info");
            connectWebSocket();
          }
        }, 3000);
  
        // Temizleme fonksiyonu
        return () => clearTimeout(reconnectTimeout);
      }
    };
  };
  
  // 8. Komponent unmount olduğunda bağlantıyı kapat
  useEffect(() => {
    return () => {
      if (ws) {
        ws.close();
        console.log("WebSocket bağlantısı kapatıldı");
      }
    };
  }, []);

  useEffect(() => {
    connectWebSocket();
    return () => ws?.close();
  }, []);

  const showToast = (message, type) => {
    toast[type](message, {
      position: "top-right",
      autoClose: 3000,
      theme: darkMode ? "dark" : "light"
    });
  };

  const sendCommand = (command) => {
    if (!isConnected) {
      showToast("Motor bağlı değil!", "error");
      return false;
    }
    ws.send(command);
    return true;
  };

  const handleStart = () => {
    if (sendCommand("START")) {
      showToast("Maksimum güç modu aktif", "success");
    }
  };

  const handleDistanceMode = () => {
    if (sendCommand("DISTANCE")) {
      showToast("Mesafe modu aktif", "success");
    }
  };

  const handleAngleSubmit = () => {
    if (!inputAngle || isNaN(inputAngle)) {
      showToast("Geçerli bir açı girin", "error");
      return;
    }
    if (sendCommand(`ANGLE:${inputAngle}`)) {
      showToast(`${inputAngle}° açıya hareket ediliyor`, "success");
      setInputAngle("");
    }
  };

  const handleStop = () => {
    if (sendCommand("STOP")) {
      showToast("Motor durduruldu", "info");
    }
  };

  const toggleTheme = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', newMode);
  };

  const handleReconnect = () => {
    showToast("Yeniden bağlanılıyor...", "info");
    connectWebSocket();
  };

  return (
    <div className={`app ${darkMode ? 'dark' : 'light'}`}>
      <ToastContainer />
      
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <FiSettings className="icon" />
            <h1>PID Motor Kontrol</h1>
          </div>
          
          <div className="controls">
            <div className={`connection ${isConnected ? 'connected' : 'disconnected'}`}>
              {isConnected ? (
                <>
                  <FiWifi className="icon" />
                  <span>Bağlı</span>
                </>
              ) : (
                <button onClick={handleReconnect}>
                  <FiWifiOff className="icon" />
                  <span>Yeniden Bağlan</span>
                </button>
              )}
            </div>
            
            <button className="theme-toggle" onClick={toggleTheme}>
              {darkMode ? <FiSun className="icon" /> : <FiMoon className="icon" />}
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="dashboard">
          <div className="status-cards">
            <div className="card">
              <div className="card-icon speed">
                <IoMdSpeedometer />
              </div>
              <div className="card-content">
                <h3>Motor Durumu</h3>
                <p>{motorStatus}</p>
              </div>
            </div>
            
            <div className="card">
              <div className="card-icon distance">
                <MdSensors />
              </div>
              <div className="card-content">
                <h3>Mesafe</h3>
                <p>{distance} cm</p>
              </div>
            </div>
            
            <div className="card">
              <div className="card-icon angle">
                <FaAngleRight  />
              
              </div>
              <div className="card-content">
                <h3>Açı</h3>
                <p>{angle}°</p>
              </div>
            </div>
            
            <div className="card">
              <div className="card-icon speed">
                <GiProgression />
              </div>
              <div className="card-content">
                <h3>Hız</h3>
                <p>{speed}%</p>
              </div>
            </div>
          </div>

          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(t) => new Date(t).toLocaleTimeString()}
                  tick={{ fill: darkMode ? '#e2e8f0' : '#64748b' }}
                />
                <YAxis yAxisId="left" tick={{ fill: darkMode ? '#e2e8f0' : '#64748b' }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: darkMode ? '#e2e8f0' : '#64748b' }} />
                <Tooltip 
                  contentStyle={{
                    background: darkMode ? '#334155' : '#f8fafc',
                    borderColor: darkMode ? '#475569' : '#e2e8f0',
                    borderRadius: '0.5rem'
                  }}
                />
                <Legend />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="speed" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={false}
                  name="Hız (%)"
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="distance" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={false}
                  name="Mesafe (cm)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="control-panel">
            <div className="action-buttons">
              <button className="btn start" onClick={handleStart}>
                <FiPower /> Maks Güç
              </button>
              <button className="btn distance" onClick={handleDistanceMode}>
                <MdSensors /> Mesafe Modu
              </button>
              <button className="btn stop" onClick={handleStop}>
                <FiPower /> Durdur
              </button>
            </div>
            
            <div className="angle-control">
              <div className="input-group">
                <input
                  type="number"
                  value={inputAngle}
                  onChange={(e) => setInputAngle(e.target.value)}
                  placeholder="Hedef açı (0-360)"
                  min="0"
                  max="360"
                />
                <button className="btn angle" onClick={handleAngleSubmit}>
                  <FiRotateCw /> Açıya Git
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="app-footer">
        <p>© {new Date().getFullYear()} PID Motor Kontrol Sistemi | Tüm Hakları Saklıdır</p>
      </footer>
    </div>
  );
}

export default PidMotor;