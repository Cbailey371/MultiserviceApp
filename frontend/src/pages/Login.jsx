import { useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import api from '../services/api';

export default function Login({ onLogin, theme, toggleTheme }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.login(email, password);
      onLogin(api.getUser());
    } catch (err) {
      setError(err.message || 'Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  const isDark = theme === 'dark';

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: isDark ? 'var(--color-background)' : '#f8fafc',
      backgroundImage: isDark 
        ? 'radial-gradient(circle at 20% 50%, rgba(59,130,246,0.05) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(99,102,241,0.05) 0%, transparent 50%)'
        : 'radial-gradient(circle at 20% 50%, rgba(59,130,246,0.03) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(99,102,241,0.03) 0%, transparent 50%)',
    }}>
      <div className={isDark ? "glass-card" : ""} style={{
        width: 400, padding: 'var(--space-10)',
        background: isDark ? 'rgba(29, 32, 39, 0.7)' : '#ffffff',
        backdropFilter: isDark ? 'blur(12px)' : 'none',
        border: isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid #e2e8f0',
        borderRadius: 'var(--radius-xl)',
        boxShadow: isDark ? 'none' : '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <div style={{
            width: 64, height: 64, margin: '0 auto var(--space-5)',
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
            borderRadius: 'var(--radius-lg)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: '1.75rem', fontWeight: 800, color: 'white',
            boxShadow: '0 10px 20px -5px rgba(59, 130, 246, 0.5)',
          }}>MS</div>
          <h1 style={{
            fontSize: 'var(--font-size-2xl)', fontWeight: 800,
            color: isDark ? 'white' : '#1e293b', 
            letterSpacing: '-0.025em',
            marginBottom: 'var(--space-1)',
          }}>MultiService Pro</h1>
          <p style={{ 
            color: isDark ? 'var(--color-on-surface-variant)' : '#64748b', 
            fontSize: 'var(--font-size-sm)', fontWeight: 500 
          }}>
            Acceso al Sistema de Gestión
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{
              background: isDark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2', 
              border: isDark ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid #fee2e2',
              borderRadius: 'var(--radius-md)', padding: 'var(--space-3)',
              marginBottom: 'var(--space-6)', fontSize: 'var(--font-size-sm)', 
              color: isDark ? '#f87171' : '#dc2626',
              display: 'flex', alignItems: 'center', gap: 'var(--space-2)'
            }}><span>⚠️</span> {error}</div>
          )}

          <div className="form-group" style={{ marginBottom: 'var(--space-5)' }}>
            <label className="form-label" style={{ 
              color: isDark ? 'var(--color-on-surface-variant)' : '#475569', 
              fontWeight: 600 
            }}>Correo Electrónico</label>
            <input className="form-input" type="email" value={email}
              onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com" required 
              style={{ 
                background: isDark ? 'rgba(0,0,0,0.2)' : '#f1f5f9', 
                height: '48px',
                color: isDark ? 'white' : '#1e293b',
                border: isDark ? '1px solid var(--glass-border)' : '1px solid #cbd5e1'
              }}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 'var(--space-6)' }}>
            <label className="form-label" style={{ 
              color: isDark ? 'var(--color-on-surface-variant)' : '#475569', 
              fontWeight: 600 
            }}>Contraseña</label>
            <input className="form-input" type="password" value={password}
              onChange={e => setPassword(e.target.value)} placeholder="••••••••" required 
              style={{ 
                background: isDark ? 'rgba(0,0,0,0.2)' : '#f1f5f9', 
                height: '48px',
                color: isDark ? 'white' : '#1e293b',
                border: isDark ? '1px solid var(--glass-border)' : '1px solid #cbd5e1'
              }}
            />
          </div>

          <button className="btn btn-primary" type="submit"
            disabled={loading} style={{ 
              width: '100%', justifyContent: 'center', height: '50px', 
              fontSize: 'var(--font-size-base)', fontWeight: 600,
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
            }}>
            {loading ? '⏳ Iniciando...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div style={{
          marginTop: 'var(--space-8)', textAlign: 'center'
        }}>
          <button 
            onClick={toggleTheme} 
            className="btn"
            style={{ 
              background: 'transparent', 
              border: 'none',
              color: isDark ? 'var(--color-on-surface-variant)' : '#64748b', 
              gap: 'var(--space-2)',
              fontSize: 'var(--font-size-xs)', padding: 'var(--space-2) var(--space-4)',
              margin: '0 auto', display: 'flex', alignItems: 'center',
              cursor: 'pointer'
            }}
          >
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
            {isDark ? 'Modo Claro' : 'Modo Oscuro'}
          </button>
        </div>
      </div>
    </div>
  );
}
