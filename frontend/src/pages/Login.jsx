import { useState } from 'react';
import api from '../services/api';

export default function Login({ onLogin }) {
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

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--color-background)',
      backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(59,130,246,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(99,102,241,0.08) 0%, transparent 50%)',
    }}>
      <div className="glass-card" style={{
        width: 420, padding: 'var(--space-10)',
        background: 'rgba(29, 32, 39, 0.9)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <div style={{
            width: 60, height: 60, margin: '0 auto var(--space-4)',
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
            borderRadius: 'var(--radius-lg)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', fontWeight: 700, color: 'white',
          }}>MS</div>
          <h1 style={{
            fontSize: 'var(--font-size-xl)', fontWeight: 700,
            background: 'linear-gradient(135deg, var(--color-primary-light), var(--color-primary))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>MultiService Pro</h1>
          <p style={{ color: 'var(--color-outline)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-1)' }}>
            Gestión de Mantenimiento Multidisciplinario
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{
              background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)',
              borderRadius: 'var(--radius-sm)', padding: 'var(--space-3)',
              marginBottom: 'var(--space-5)', fontSize: 'var(--font-size-sm)', color: 'var(--color-error)',
            }}>⚠️ {error}</div>
          )}

          <div className="form-group">
            <label className="form-label">Correo Electrónico</label>
            <input className="form-input" type="email" value={email}
              onChange={e => setEmail(e.target.value)} placeholder="admin@multiservice.com" required />
          </div>
          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input className="form-input" type="password" value={password}
              onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>

          <button className="btn btn-primary btn-lg" type="submit"
            disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 'var(--space-4)' }}>
            {loading ? '⏳ Iniciando sesión...' : '🔐 Iniciar Sesión'}
          </button>
        </form>

        <div style={{
          marginTop: 'var(--space-6)', paddingTop: 'var(--space-4)',
          borderTop: '1px solid var(--glass-border)', textAlign: 'center',
        }}>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-outline)' }}>
            Demo: admin@multiservice.com / Admin2026!
          </p>
        </div>
      </div>
    </div>
  );
}
