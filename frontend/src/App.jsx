import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import './index.css';

// Icons
import { 
  LayoutDashboard, Users as UsersIcon, Wrench, 
  FileText, FileArchive, Calendar as CalendarIcon, 
  Settings as SettingsIcon, Tags, UserCog, BarChart3, 
  Sun, Moon, Search, LogOut 
} from 'lucide-react';

// Services
import api from './services/api';

// Pages
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Assets from './pages/Assets';
import Catalog from './pages/Catalog';
import Quotations from './pages/Quotations';
import Invoices from './pages/Invoices';
import WorkOrders from './pages/WorkOrders';
import Contracts from './pages/Contracts';
import Calendar from './pages/Calendar';
import Login from './pages/Login';
import Users from './pages/Users';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import WorkOrderHistory from './pages/WorkOrderHistory';

function App() {
  const [user, setUser] = useState(api.getUser());
  const [ready, setReady] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('ms_theme') || 'dark');

  useEffect(() => {
    // Listen for auth changes
    const unsub = api.onAuthChange((u) => setUser(u));
    setReady(true);
    return unsub;
  }, []);

  useEffect(() => {
    document.body.className = theme;
    localStorage.setItem('ms_theme', theme);
  }, [theme]);

  if (!ready) return null;

  // Not authenticated → Login
  if (!user) return <Login onLogin={setUser} />;

  const handleLogout = () => {
    api.logout();
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/clients', icon: UsersIcon, label: 'Clientes' },
    { path: '/assets', icon: Wrench, label: 'Equipos/Activos' },
    { path: '/quotations', icon: FileText, label: 'Cotizaciones' },
    { path: '/invoices', icon: FileArchive, label: 'Facturas' },
    { path: '/contracts', icon: FileText, label: 'Contratos' },
    { path: '/calendar', icon: CalendarIcon, label: 'Calendario' },
    { path: '/work-orders', icon: Wrench, label: 'Órdenes de Trabajo' },
    { path: '/work-order-history', icon: FileText, label: 'Historial OT' },
    { path: '/reports', icon: BarChart3, label: 'Reportes' },
  ];

  const settingsItems = [
    { path: '/catalog', icon: Tags, label: 'Catálogo' },
    { path: '/users', icon: UserCog, label: 'Usuarios' },
    { path: '/settings', icon: SettingsIcon, label: 'Configuración' },
  ];

  const initials = user.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'MS';
  const roleName = user.role === 'admin' ? 'Administrador' : user.role === 'technician' ? 'Técnico' : 'Cliente';

  return (
    <BrowserRouter>
      <div className={`app-layout ${theme}`}>
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div style={{ padding: '4px', borderRadius: '4px', background: 'var(--color-primary)', color: '#fff', fontSize: '10px', fontWeight: 'bold' }}>MS</div>
            <div>
              <h1>MULTISERVICE PRO</h1>
              <span className="subtitle">Precision ERP</span>
            </div>
          </div>
          
          <nav className="sidebar-nav">
            {navItems.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <item.icon size={20} className="icon" strokeWidth={1.5} />
                <span>{item.label}</span>
              </NavLink>
            ))}
            
            <div style={{ height: '24px' }}></div> {/* Spacer */}
            
            {settingsItems.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <item.icon size={20} className="icon" strokeWidth={1.5} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Main Area */}
        <div style={{ flex: 1 }}>
          {/* Header */}
          <header className="main-header">
            <div className="header-search">
              <Search size={18} color="var(--color-on-surface-muted)" />
              <input type="text" placeholder="Buscar órdenes, clientes, facturas..." />
            </div>
            
            <div className="header-actions">
              {/* Theme Toggle */}
              <button 
                onClick={toggleTheme} 
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-on-surface-muted)', display: 'flex', alignItems: 'center' }} 
                title={theme === 'dark' ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              
              <div className="header-profile">
                <div className="profile-info">
                  <span className="name">{roleName}</span>
                  <span className="role">{user.full_name}</span>
                </div>
                <div style={{ 
                  width: '32px', height: '32px', borderRadius: '50%', 
                  background: 'var(--color-surface)', border: '1px solid var(--color-outline)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: 'bold', color: 'var(--color-primary-light)'
                }}>
                  {initials}
                </div>
              </div>
              
              {/* Logout Button */}
              <button onClick={handleLogout} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-on-surface-muted)' }} title="Cerrar sesión">
                <LogOut size={20} />
              </button>
            </div>
          </header>

          {/* Routes */}
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/assets" element={<Assets />} />
              <Route path="/quotations" element={<Quotations />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/contracts" element={<Contracts />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/work-orders" element={<WorkOrders />} />
              <Route path="/work-order-history" element={<WorkOrderHistory />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/catalog" element={<Catalog />} />
              <Route path="/users" element={<Users />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
