import React, { useState, useEffect, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { FiPower, FiSun, FiMoon, FiWifi, FiWifiOff, FiRotateCw, FiSettings } from "react-icons/fi";
import { GiProgression } from "react-icons/gi";
import { IoMdSpeedometer } from "react-icons/io";
import { MdSensors } from "react-icons/md";
import { FaAngleRight } from "react-icons/fa";
import { toast, ToastContainer } from 'react-toastify';
import ReactCountryFlag from "react-country-flag";
import 'react-toastify/dist/ReactToastify.css';
import './index.scss';

// Dil dosyaları
const translations = {
  tr: {
    appTitle: "PID Motor Kontrol",
    connectionStatus: {
      connected: "Bağlı",
      disconnected: "Bağlantı Yok",
      ready: "Hazır",
      reconnect: "Yeniden Bağlan"
    },
    cards: {
      status: "Motor Durumu",
      distance: "Mesafe",
      angle: "Açı",
      speed: "Hız",
      units: {
        cm: "cm",
        degree: "°",
        percent: "%"
      }
    },
    buttons: {
      maxPower: "Maks Güç",
      distanceMode: "Mesafe Modu",
      stop: "Durdur",
      setAngle: "Açıya Git"
    },
    placeholders: {
      targetAngle: "Hedef açı (0-360)"
    },
    messages: {
      connectionEstablished: "Bağlantı sağlandı",
      connectionLost: "Bağlantı kesildi",
      maxPowerActive: "Maksimum güç modu aktif",
      distanceModeActive: "Mesafe modu aktif",
      motorStopped: "Motor durduruldu",
      angleSet: "açıya hareket ediliyor",
      invalidAngle: "Geçerli bir açı girin",
      reconnecting: "Yeniden bağlanılıyor...",
      notConnected: "Motor bağlı değil!"
    },
    footer: "© {year} PID Motor Kontrol Sistemi | Tüm Hakları Saklıdır"
  },
  en: {
    appTitle: "PID Motor Control",
    connectionStatus: {
      connected: "Connected",
      disconnected: "Disconnected",
      ready: "Ready",
      reconnect: "Reconnect"
    },
    cards: {
      status: "Motor Status",
      distance: "Distance",
      angle: "Angle",
      speed: "Speed",
      units: {
        cm: "cm",
        degree: "°",
        percent: "%"
      }
    },
    buttons: {
      maxPower: "Max Power",
      distanceMode: "Distance Mode",
      stop: "Stop",
      setAngle: "Set Angle"
    },
    placeholders: {
      targetAngle: "Target angle (0-360)"
    },
    messages: {
      connectionEstablished: "Connection established",
      connectionLost: "Connection lost",
      maxPowerActive: "Maximum power mode active",
      distanceModeActive: "Distance mode active",
      motorStopped: "Motor stopped",
      angleSet: "Moving to angle",
      invalidAngle: "Enter a valid angle",
      reconnecting: "Reconnecting...",
      notConnected: "Motor not connected!"
    },
    footer: "© {year} PID Motor Control System | All Rights Reserved"
  }
};

// Dil context'i
const LanguageContext = React.createContext();

function PidMotor() {
  const [language, setLanguage] = useState('tr');
  const [motorStatus, setMotorStatus] = useState(translations[language].connectionStatus.disconnected);
  const [data, setData] = useState([]);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const [distance, setDistance] = useState(0);
  const [angle, setAngle] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [inputAngle, setInputAngle] = useState("");
  const ws = useRef(null);

  const t = translations[language];

  const toggleLanguage = () => {
    const newLang = language === 'tr' ? 'en' : 'tr';
    setLanguage(newLang);
    setMotorStatus(translations[newLang].connectionStatus.disconnected);
  };

  const connectWebSocket = () => {
    const wsUrl = window.location.hostname === 'localhost' 
      ? 'ws://172.20.10.8:81' 
      : 'wss://pid-controlled-engine.vercel.app/api/ws-proxy';
    
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      setIsConnected(true);
      setMotorStatus(t.connectionStatus.ready);
      showToast(t.messages.connectionEstablished, "success");
      
      if (process.env.NODE_ENV === 'production') {
        ws.current.send(JSON.stringify({
          type: 'INIT_CONNECTION',
          deviceIp: process.env.NEXT_PUBLIC_STM32_IP || '192.168.1.100',
          authToken: process.env.NEXT_PUBLIC_WS_TOKEN
        }));
      }
    };

    ws.current.onmessage = (event) => {
      try {
        const message = typeof event.data === 'string' 
          ? JSON.parse(event.data) 
          : JSON.parse(new TextDecoder().decode(event.data));

        if (message.distance !== undefined) setDistance(parseFloat(message.distance.toFixed(2)));
        if (message.angle !== undefined) setAngle(parseInt(message.angle));
        if (message.speed !== undefined) setSpeed(parseInt(message.speed));
        if (message.status) setMotorStatus(message.status);

        setData(prev => [...prev.slice(-50), {
          timestamp: new Date().toISOString(),
          speed: message.speed || 0,
          distance: message.distance || 0,
          angle: message.angle || 0
        }]);
      } catch (error) {
        console.log("Ham veri:", event.data);
      }
    };

    ws.current.onerror = (error) => {
      console.error("WebSocket error:", error);
      handleDisconnection();
      showToast(t.messages.connectionLost, "error");
    };

    ws.current.onclose = () => {
      handleDisconnection();
    };
  };

  const handleDisconnection = () => {
    if (isConnected) {
      setIsConnected(false);
      setMotorStatus(t.connectionStatus.disconnected);
      setTimeout(() => !isConnected && connectWebSocket(), 3000);
    }
  };

  const showToast = (message, type) => {
    toast[type](message, {
      position: "top-right",
      autoClose: 3000,
      theme: darkMode ? "dark" : "light"
    });
  };

  const sendCommand = (command) => {
    if (!isConnected || !ws.current) {
      showToast(t.messages.notConnected, "error");
      return false;
    }
    ws.current.send(command);
    return true;
  };

  const handleStart = () => {
    if (sendCommand("START")) {
      showToast(t.messages.maxPowerActive, "success");
    }
  };

  const handleDistanceMode = () => {
    if (sendCommand("DISTANCE")) {
      showToast(t.messages.distanceModeActive, "success");
    }
  };

  const handleAngleSubmit = () => {
    if (!inputAngle || isNaN(inputAngle)) {
      showToast(t.messages.invalidAngle, "error");
      return;
    }
    if (sendCommand(`ANGLE:${inputAngle}`)) {
      showToast(`${inputAngle}${t.cards.units.degree} ${t.messages.angleSet}`, "success");
      setInputAngle("");
    }
  };

  const handleStop = () => {
    if (sendCommand("STOP")) {
      showToast(t.messages.motorStopped, "info");
    }
  };

  const toggleTheme = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', newMode);
  };

  const handleReconnect = () => {
    showToast(t.messages.reconnecting, "info");
    connectWebSocket();
  };

  useEffect(() => {
    connectWebSocket();
    return () => ws.current?.close();
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage }}>
      <div className={`app ${darkMode ? 'dark' : 'light'}`}>
        <ToastContainer />
        
        <header className="app-header">
          <div className="header-content">
            <div className="logo">
              <FiSettings className="icon" />
              <h1>{t.appTitle}</h1>
            </div>
            
            <div className="controls">
              <button 
                onClick={toggleLanguage}
                className="language-switcher"
                aria-label={language === 'tr' ? 'Switch to English' : 'Türkçe olarak değiştir'}
              >
                <div className="flag-container">
                  <ReactCountryFlag 
                    countryCode={language === 'tr' ? 'GB' : 'TR'} 
                    svg 
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      objectFit: 'cover'
                    }} 
                  />
                </div>
                <span className="language-text">
                  {language === 'tr' ? 'EN' : 'TR'}
                </span>
              </button>

              <div className={`connection ${isConnected ? 'connected' : 'disconnected'}`}>
                {isConnected ? (
                  <>
                    <FiWifi className="icon" />
                    <span>{t.connectionStatus.connected}</span>
                  </>
                ) : (
                  <button onClick={handleReconnect}>
                    <FiWifiOff className="icon" />
                    <span>{t.connectionStatus.reconnect}</span>
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
                  <h3>{t.cards.status}</h3>
                  <p>{motorStatus}</p>
                </div>
              </div>
              
              <div className="card">
                <div className="card-icon distance">
                  <MdSensors />
                </div>
                <div className="card-content">
                  <h3>{t.cards.distance}</h3>
                  <p>{distance} {t.cards.units.cm}</p>
                </div>
              </div>
              
              <div className="card">
                <div className="card-icon angle">
                  <FaAngleRight />
                </div>
                <div className="card-content">
                  <h3>{t.cards.angle}</h3>
                  <p>{angle}{t.cards.units.degree}</p>
                </div>
              </div>
              
              <div className="card">
                <div className="card-icon speed">
                  <GiProgression />
                </div>
                <div className="card-content">
                  <h3>{t.cards.speed}</h3>
                  <p>{speed}{t.cards.units.percent}</p>
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
                    name={`${t.cards.speed} (${t.cards.units.percent})`}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="distance" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={false}
                    name={`${t.cards.distance} (${t.cards.units.cm})`}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="control-panel">
              <div className="action-buttons">
                <button className="btn start" onClick={handleStart}>
                  <FiPower /> {t.buttons.maxPower}
                </button>
                <button className="btn distance" onClick={handleDistanceMode}>
                  <MdSensors /> {t.buttons.distanceMode}
                </button>
                <button className="btn stop" onClick={handleStop}>
                  <FiPower /> {t.buttons.stop}
                </button>
              </div>
              
              <div className="angle-control">
                <div className="input-group">
                  <input
                    type="number"
                    value={inputAngle}
                    onChange={(e) => setInputAngle(e.target.value)}
                    placeholder={t.placeholders.targetAngle}
                    min="0"
                    max="360"
                  />
                  <button className="btn angle" onClick={handleAngleSubmit}>
                    <FiRotateCw /> {t.buttons.setAngle}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="app-footer">
          <p>{t.footer.replace('{year}', new Date().getFullYear())}</p>
        </footer>
      </div>
    </LanguageContext.Provider>
  );
}

export default PidMotor;