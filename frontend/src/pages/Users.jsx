import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { Users as UsersIcon, Search, X, Edit2, Ban, CheckCircle, Loader2, Info, User, Mail, Phone, Lock, Shield } from 'lucide-react';

// --- Components ---
function StatusChip({ active }) {
  const color = active ? '#34D399' : '#9CA3AF';
  const bg = active ? 'rgba(52, 211, 153, 0.1)' : 'rgba(156, 163, 175, 0.1)';
  const label = active ? 'Activo' : 'Inactivo';
  return (
    <span className="pill" style={{ background: bg, color: color, padding: '4px 8px', fontSize: '10px' }}>
      {label}
    </span>
  );
}

function RoleChip({ role }) {
  const config = {
    admin: { bg: 'rgba(59,130,246,0.1)', color: '#60A5FA', label: 'Administrador' },
    technician: { bg: 'rgba(245,158,11,0.1)', color: '#FBBF24', label: 'Técnico' },
    client: { bg: 'rgba(16,185,129,0.1)', color: '#34D399', label: 'Cliente' },
  };
  const c = config[role] || { bg: 'rgba(107,114,128,0.1)', color: '#9CA3AF', label: role };
  return (
    <span className="pill" style={{ background: c.bg, color: c.color, padding: '4px 8px', fontSize: '10px' }}>
      {c.label}
    </span>
  );
}

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-10)', color: 'var(--color-on-surface-muted)' }}>
      <Loader2 size={32} className="spin" style={{ animation: 'spin 1s linear infinite', color: 'var(--color-primary)' }} />
      <span style={{ marginLeft: 'var(--space-3)' }}>Cargando usuarios...</span>
    </div>
  );
}

// --- Data ---
const rolePermissions = {
  admin: {
    title: 'Permisos de Administrador',
    description: 'Acceso total al sistema. Puede gestionar la configuración, usuarios, roles, contraseñas, eliminar registros, ver reportes financieros, cotizaciones y facturación.',
    color: '#60A5FA',
    bg: 'rgba(59,130,246,0.05)'
  },
  technician: {
    title: 'Permisos de Técnico',
    description: 'Acceso restringido a la parte operativa. Puede ver su agenda, editar órdenes de trabajo, subir evidencias y consultar inventario de equipos. No ve reportes financieros ni configuración.',
    color: '#FBBF24',
    bg: 'rgba(245,158,11,0.05)'
  },
  client: {
    title: 'Permisos de Cliente (Portal)',
    description: 'Acceso exclusivo al portal de cliente. Solo puede ver su propio historial de facturas, aceptar/rechazar cotizaciones y solicitar tickets de servicio.',
    color: '#34D399',
    bg: 'rgba(16,185,129,0.05)'
  }
};

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: '', email: '', phone: '', role: 'technician', password: '', is_active: true
  });

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listUsers();
      setUsers(res.data || []);
    } catch (err) {
      console.error('Error loading users:', err);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingId(user.id);
      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role || 'technician',
        password: '', // Blanco para indicar que si se escribe se actualizará
        is_active: user.is_active !== false
      });
    } else {
      setEditingId(null);
      setFormData({
        full_name: '', email: '', phone: '', role: 'technician', password: '', is_active: true
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        // Update user
        const updateData = {
          full_name: formData.full_name,
          phone: formData.phone,
          is_active: formData.is_active,
          role: formData.role, // Envía el nuevo rol si fue cambiado
        };
        // Si se ingresó una nueva contraseña, la incluimos
        if (formData.password.trim() !== '') {
          updateData.password = formData.password;
        }
        await api.updateUser(editingId, updateData);
      } else {
        // Create user
        await api.createUser(formData);
      }
      setShowModal(false);
      loadUsers();
    } catch (err) {
      alert('Error guardando usuario: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user) => {
    if (!confirm(`¿Estás seguro de que quieres ${user.is_active ? 'desactivar' : 'activar'} a ${user.full_name}?`)) return;
    try {
      await api.updateUser(user.id, { is_active: !user.is_active });
      loadUsers();
    } catch (err) {
      alert('Error actualizando estado: ' + err.message);
    }
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const activeRoleInfo = rolePermissions[formData.role] || rolePermissions['technician'];

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <style>{`
        @keyframes fadeIn { from { opacity:0; transform: scale(0.98); } to { opacity:1; transform: scale(1); } }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .input-with-icon { position: relative; }
        .input-with-icon svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--color-on-surface-muted); }
        .input-with-icon input, .input-with-icon select { padding-left: 36px; }
      `}</style>
      
      <div className="page-header" style={{ marginBottom: 'var(--space-6)' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-on-surface)' }}>
            <UsersIcon size={24} color="var(--color-primary-light)" /> 
            Gestión de Usuarios y Roles
          </h2>
          <p style={{ color: 'var(--color-on-surface-muted)', fontSize: 'var(--font-size-sm)', marginTop: '4px' }}>
            Administra los accesos, permisos y credenciales del personal
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          Nuevo Usuario
        </button>
      </div>

      <div className="glass-card" style={{ border: '1px solid var(--color-outline)' }}>
        <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--color-outline)', display: 'flex', gap: 'var(--space-4)' }}>
          <div style={{ flex: 1, maxWidth: '400px', position: 'relative' }}>
            <Search size={16} color="var(--color-on-surface-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Buscar por nombre o email..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '36px', margin: 0 }}
            />
          </div>
          <select 
            className="form-select" 
            style={{ width: '220px', margin: 0 }}
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
          >
            <option value="all">Todos los roles</option>
            <option value="admin">Administrador</option>
            <option value="technician">Técnico</option>
            <option value="client">Cliente</option>
          </select>
        </div>

        {loading ? <LoadingSpinner /> : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Contacto</th>
                  <th>Rol / Permisos</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? filtered.map(u => (
                  <tr key={u.id} style={!u.is_active ? { opacity: 0.6 } : {}}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <div style={{ 
                          width: 36, height: 36, borderRadius: '50%', 
                          background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-outline)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', 
                          fontSize: '12px', fontWeight: 600, color: 'var(--color-primary-light)' 
                        }}>
                          {u.full_name?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--color-on-surface)' }}>{u.full_name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--color-on-surface-muted)' }}>Creado el {new Date(u.created_at).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-on-surface)' }}>{u.email}</div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-on-surface-variant)' }}>{u.phone || 'Sin teléfono'}</div>
                    </td>
                    <td><RoleChip role={u.role} /></td>
                    <td><StatusChip active={u.is_active} /></td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-outline" style={{ padding: '6px', marginRight: '8px' }} onClick={() => handleOpenModal(u)} title="Configurar Usuario (Roles y Contraseña)">
                        <Edit2 size={14} color="var(--color-warning)" />
                      </button>
                      <button 
                        className="btn btn-outline" 
                        style={{ padding: '6px', borderColor: u.is_active ? 'rgba(239, 68, 68, 0.3)' : 'rgba(52, 211, 153, 0.3)' }}
                        title={u.is_active ? 'Desactivar Cuenta' : 'Activar Cuenta'}
                        onClick={() => handleToggleActive(u)}
                      >
                        {u.is_active ? <Ban size={14} color="#F87171" /> : <CheckCircle size={14} color="#34D399" />}
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-on-surface-variant)' }}>
                      No se encontraron usuarios que coincidan con la búsqueda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Crear/Editar */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowModal(false)}>
          <div className="glass-card" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 580, background: 'var(--color-surface)', border: '1px solid var(--color-outline)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-5)', borderBottom: '1px solid var(--color-outline)' }}>
              <div>
                <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, color: 'var(--color-on-surface)' }}>{editingId ? 'Configuración de Usuario' : 'Nuevo Usuario'}</h3>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-on-surface-variant)', marginTop: 2 }}>
                  {editingId ? 'Edita roles, actualiza información o cambia la contraseña.' : 'Crea un nuevo acceso al sistema.'}
                </p>
              </div>
              <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-on-surface-variant)' }} onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} style={{ padding: 'var(--space-5)' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Nombre Completo *</label>
                  <div className="input-with-icon">
                    <User size={16} />
                    <input type="text" className="form-input" required value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Teléfono</label>
                  <div className="input-with-icon">
                    <Phone size={16} />
                    <input type="tel" className="form-input" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Correo Electrónico (Login) *</label>
                <div className="input-with-icon">
                  <Mail size={16} />
                  <input type="email" className="form-input" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} disabled={!!editingId} style={editingId ? { opacity: 0.6, cursor: 'not-allowed' } : {}} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Rol y Permisos *</label>
                  <div className="input-with-icon">
                    <Shield size={16} />
                    <select className="form-select" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                      <option value="technician">Técnico Operativo</option>
                      <option value="admin">Administrador Total</option>
                      <option value="client">Cliente Externo</option>
                    </select>
                  </div>
                </div>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    {editingId ? 'Forzar Nueva Contraseña' : 'Contraseña de Acceso *'}
                  </label>
                  <div className="input-with-icon">
                    <Lock size={16} />
                    <input type="password" className="form-input" required={!editingId} placeholder={editingId ? "Dejar en blanco para no cambiar" : "Mínimo 6 caracteres"} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                  </div>
                </div>
              </div>

              {/* Panel Informativo de Permisos */}
              <div style={{ 
                background: activeRoleInfo.bg, 
                border: `1px solid ${activeRoleInfo.color}30`, 
                borderRadius: 'var(--radius-md)', 
                padding: 'var(--space-4)', 
                marginBottom: 'var(--space-5)',
                display: 'flex', gap: 'var(--space-3)'
              }}>
                <Info size={20} color={activeRoleInfo.color} style={{ flexShrink: 0 }} />
                <div>
                  <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: activeRoleInfo.color, marginBottom: '4px' }}>
                    {activeRoleInfo.title}
                  </h4>
                  <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-on-surface-variant)', lineHeight: 1.5 }}>
                    {activeRoleInfo.description}
                  </p>
                </div>
              </div>

              {editingId && (
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', background: 'rgba(255,255,255,0.02)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-outline)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--color-on-surface)' }}>Estado de la Cuenta</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-on-surface-variant)' }}>Al desactivar, el usuario no podrá acceder al sistema.</div>
                  </div>
                  <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
                    <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} style={{ opacity: 0, width: 0, height: 0 }} />
                    <span style={{ 
                      position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, 
                      backgroundColor: formData.is_active ? 'var(--color-primary)' : 'var(--color-outline)', 
                      transition: '.4s', borderRadius: '34px' 
                    }}>
                      <span style={{ 
                        position: 'absolute', height: '18px', width: '18px', left: formData.is_active ? '22px' : '3px', bottom: '3px', 
                        backgroundColor: 'white', transition: '.4s', borderRadius: '50%' 
                      }}></span>
                    </span>
                  </label>
                </div>
              )}

              <div style={{ marginTop: 'var(--space-6)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? (
                    <><Loader2 size={16} className="spin" style={{ marginRight: '6px' }} /> Guardando...</>
                  ) : (
                    <><CheckCircle size={16} style={{ marginRight: '6px' }} /> {editingId ? 'Actualizar Usuario' : 'Crear Usuario'}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
