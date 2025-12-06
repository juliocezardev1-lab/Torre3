import { useState, useEffect } from 'react';
import './App-tower.css';

const ESP32_IP = '192.168.4.1';
const ESP32_URL = `http://${ESP32_IP}`;

function App() {
  const [color, setColor] = useState('#fbbf24');
  const [brightness, setBrightness] = useState(100);
  const [effect, setEffect] = useState('solid');
  const [speed, setSpeed] = useState(50);
  const [status, setStatus] = useState('Desconectado');
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  // Testar conexão com ESP32
  useEffect(() => {
    testConnection();
    const interval = setInterval(testConnection, 5000);
    return () => clearInterval(interval);
  }, []);

  const testConnection = async () => {
    try {
      const response = await fetch(`${ESP32_URL}/status`, {
        mode: 'no-cors',
        method: 'GET'
      });
      setConnected(true);
      setStatus('Conectado ✓');
    } catch (error) {
      setConnected(false);
      setStatus('Desconectado ✗');
    }
  };

  // Enviar cor para ESP32
  const sendColor = async (hexColor) => {
    if (!connected) {
      alert('ESP32 não está conectado!');
      return;
    }

    setLoading(true);
    const rgb = hexToRgb(hexColor);

    try {
      await fetch(`${ESP32_URL}/color`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          r: rgb.r,
          g: rgb.g,
          b: rgb.b,
          brightness: brightness
        }),
        mode: 'no-cors'
      });
      setColor(hexColor);
    } catch (error) {
      console.error('Erro ao enviar cor:', error);
    } finally {
      setLoading(false);
    }
  };

  // Enviar efeito
  const sendEffect = async (effectName) => {
    if (!connected) {
      alert('ESP32 não está conectado!');
      return;
    }

    setLoading(true);
    try {
      await fetch(`${ESP32_URL}/effect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          effect: effectName,
          speed: speed,
          brightness: brightness
        }),
        mode: 'no-cors'
      });
      setEffect(effectName);
    } catch (error) {
      console.error('Erro ao enviar efeito:', error);
    } finally {
      setLoading(false);
    }
  };

  // Enviar brilho
  const sendBrightness = async (value) => {
    if (!connected) return;

    setLoading(true);
    try {
      await fetch(`${ESP32_URL}/brightness`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brightness: value }),
        mode: 'no-cors'
      });
      setBrightness(value);
    } catch (error) {
      console.error('Erro ao enviar brilho:', error);
    } finally {
      setLoading(false);
    }
  };

  // Enviar velocidade
  const sendSpeed = async (value) => {
    if (!connected) return;

    setLoading(true);
    try {
      await fetch(`${ESP32_URL}/speed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speed: value }),
        mode: 'no-cors'
      });
      setSpeed(value);
    } catch (error) {
      console.error('Erro ao enviar velocidade:', error);
    } finally {
      setLoading(false);
    }
  };

  // Desligar LEDs
  const turnOff = async () => {
    if (!connected) return;

    setLoading(true);
    try {
      await fetch(`${ESP32_URL}/off`, {
        method: 'POST',
        mode: 'no-cors'
      });
      setEffect('off');
      setBrightness(0);
    } catch (error) {
      console.error('Erro ao desligar:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className="app-header">
        <h1>🗼 Torre Eiffel 3D - Controle</h1>
        <div className={`status-badge ${connected ? 'connected' : 'disconnected'}`}>
          {status}
        </div>
      </div>

      <div className="app-content">
        
        {/* SEÇÃO DE CORES */}
        <section className="control-section">
          <h2>🎨 Cores</h2>
          
          <div className="color-picker-container">
            <input
              type="color"
              value={color}
              onChange={(e) => sendColor(e.target.value)}
              className="color-input"
              disabled={loading || !connected}
            />
            <span className="color-label">Selecione uma cor</span>
          </div>

          <div className="preset-colors">
            {[
              { name: 'Ouro', hex: '#fbbf24' },
              { name: 'Vermelho', hex: '#ff0000' },
              { name: 'Verde', hex: '#00ff00' },
              { name: 'Azul', hex: '#0099ff' },
              { name: 'Magenta', hex: '#ff00ff' },
              { name: 'Ciano', hex: '#00ffff' },
              { name: 'Branco', hex: '#ffffff' }
            ].map(({ name, hex }) => (
              <button
                key={hex}
                className="color-preset"
                style={{ backgroundColor: hex }}
                onClick={() => sendColor(hex)}
                disabled={loading || !connected}
                title={name}
              />
            ))}
          </div>
        </section>

        {/* SEÇÃO DE BRILHO */}
        <section className="control-section">
          <h2>💡 Brilho</h2>
          <div className="slider-container">
            <input
              type="range"
              min="0"
              max="255"
              value={brightness}
              onChange={(e) => sendBrightness(Number(e.target.value))}
              className="slider"
              disabled={loading || !connected}
            />
            <span className="slider-value">{Math.round((brightness / 255) * 100)}%</span>
          </div>
        </section>

        {/* SEÇÃO DE EFEITOS */}
        <section className="control-section">
          <h2>✨ Efeitos</h2>
          <div className="effects-grid">
            {[
              { name: 'Sólido', id: 'solid', emoji: '⬛' },
              { name: 'Fade', id: 'fade', emoji: '💫' },
              { name: 'Piscada', id: 'blink', emoji: '💥' },
              { name: 'Rainbow', id: 'rainbow', emoji: '🌈' },
              { name: 'Pulso', id: 'pulse', emoji: '💓' },
              { name: 'Corrida', id: 'chase', emoji: '🏃' },
              { name: 'Onda', id: 'wave', emoji: '🌊' },
              { name: 'Aleatório', id: 'random', emoji: '🎲' }
            ].map(({ name, id, emoji }) => (
              <button
                key={id}
                className={`effect-btn ${effect === id ? 'active' : ''}`}
                onClick={() => sendEffect(id)}
                disabled={loading || !connected}
                title={name}
              >
                <span className="emoji">{emoji}</span>
                <span className="effect-name">{name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* SEÇÃO DE VELOCIDADE */}
        <section className="control-section">
          <h2>⚡ Velocidade</h2>
          <div className="slider-container">
            <input
              type="range"
              min="1"
              max="255"
              value={speed}
              onChange={(e) => sendSpeed(Number(e.target.value))}
              className="slider"
              disabled={loading || !connected}
            />
            <span className="slider-value">{speed}</span>
          </div>
        </section>

        {/* BOTÃO DESLIGAR */}
        <section className="control-section">
          <button
            className="btn-off"
            onClick={turnOff}
            disabled={loading || !connected}
          >
            🔴 Desligar LEDs
          </button>
        </section>

      </div>

      {loading && <div className="loading-spinner">Enviando...</div>}
    </div>
  );
}

// Converter hex para RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

export default App;
