import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { 
  Briefcase, Calendar, Play, CheckCircle, Wrench, Shield, Settings, 
  Plus, X, Loader2, AlertCircle, ArrowUpCircle, AlertOctagon, Check, Search
} from 'lucide-react';

const statusColumns = [
  { id: 'pending', label: 'Pendientes', color: '#94A3B8' },
  { id: 'en_route', label: 'En Camino', color: '#60A5FA' },
  { id: 'in_progress', label: 'En Progreso', color: '#FBBF24' },
  { id: 'completed', label: 'Completadas', color: '#34D399' },
];

const priorityIcons = {
  low: <ArrowUpCircle size={14} color="#34D399" />,
  medium: <AlertCircle size={14} color="#FBBF24" />,
  high: <AlertCircle size={14} color="#FB923C" />,
  urgent: <AlertOctagon size={14} color="#F87171" />,
};

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-10)', color: 'var(--color-on-surface-muted)' }}>
      <Loader2 size={24} className="spin" style={{ animation: 'spin 1s linear infinite', color: 'var(--color-primary)' }} />
    </div>
  );
}

export default function WorkOrders() {
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [statusLoading, setStatusLoading] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [formData, setFormData] = useState({
    client_id: '',
    assigned_to: '',
    work_type: 'preventive',
    specialty: 'hvac',
    priority: 'medium',
    scheduled_date: new Date().toISOString().split('T')[0],
    description: '',
  });

  const [dynamicSpecialties, setDynamicSpecialties] = useState([
    { id: 'hvac', name: 'HVAC' },
    { id: 'electrical', name: 'Electricidad' },
    { id: 'construction', name: 'Construcción' },
    { id: 'plumbing', name: 'Plomería' },
    { id: 'refrigeration', name: 'Refrigeración' },
  ]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        api.listWorkOrders(),
        api.listClients(),
        api.listUsers(),
        api.getSettings(),
      ]);

      const errors = [];
      if (results[0].status === 'fulfilled') setOrders(results[0].value.data || []);
      else errors.push('Órdenes de trabajo');
      
      if (results[1].status === 'fulfilled') setClients(results[1].value.data || []);
      else errors.push('Clientes');
      
      if (results[2].status === 'fulfilled') {
        const loadedUsers = results[2].value.data || [];
        const me = api.getUser();
        if (me && !loadedUsers.some(u => u.id === me.id)) {
          loadedUsers.push({ id: me.id, full_name: me.full_name, role: me.role });
        }
        setUsers(loadedUsers);
      } else {
        errors.push('Técnicos');
        const me = api.getUser();
        setUsers(me ? [{ id: me.id, full_name: me.full_name, role: me.role }] : []);
      }
      
      if (results[3].status === 'fulfilled') {
        const s = results[3].value.data || {};
        setSettings(s);
        if (s.inventory_specialties) {
          try {
            const parsed = JSON.parse(s.inventory_specialties);
            if (Array.isArray(parsed) && parsed.length > 0) setDynamicSpecialties(parsed);
          } catch (e) { console.error('Error parsing dynamic specialties', e); }
        }
      } else errors.push('Configuración');


      if (errors.length > 0) {
        console.warn('Algunos datos no se cargaron:', errors);
        // No bloqueamos todo el UI, pero informamos en consola
      }
    } catch (err) {
      console.error('Error fatal loading work orders:', err);
      setError('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleEdit = (order) => {
    setEditingOrder(order);
    setFormData({
      client_id: order.client_id,
      assigned_to: order.assigned_to,
      work_type: order.work_type,
      specialty: order.specialty,
      priority: order.priority,
      scheduled_date: order.scheduled_date,
      description: order.description || '',
      status: order.status,
    });
    setShowModal(true);
  };

  const handleOpenNew = () => {
    setEditingOrder(null);
    const me = api.getUser();
    setFormData({
      client_id: '',
      assigned_to: me?.id || '',
      work_type: 'preventive',
      specialty: 'hvac',
      priority: 'medium',
      scheduled_date: new Date().toISOString().split('T')[0],
      description: '',
    });
    setShowModal(true);
  };

  const getClientName = (id) => {
    const c = clients.find(cl => cl.id === id);
    return c ? (c.company_name || c.contact_name) : '—';
  };

  const updateStatus = async (e, id, newStatus) => {
    if (e) e.stopPropagation();
    setStatusLoading(id);
    try {
      await api.updateWorkOrder(id, { status: newStatus });
      await loadData();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setStatusLoading(null);
    }
  };

  const getWorkTypeIcon = (type) => {
    switch(type) {
      case 'preventive': return <Shield size={12} />;
      case 'corrective': return <Wrench size={12} />;
      case 'installation': return <Settings size={12} />;
      default: return <Wrench size={12} />;
    }
  };

  return (
    <div style={{ height: 'calc(100vh - 160px)', display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.5s ease-out' }}>
      <style>{`
        @keyframes fadeIn { from { opacity:0; transform: scale(0.98); } to { opacity:1; transform: scale(1); } }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>

      {/* Header */}
      <div className="page-header" style={{ marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-on-surface)' }}>
            <Briefcase size={24} color="var(--color-primary-light)" />
            Órdenes de Trabajo
          </h1>
          <p style={{ color: 'var(--color-on-surface-muted)', fontSize: 'var(--font-size-sm)', marginTop: 4 }}>
            {loading ? 'Sincronizando...' : `Gestión de mantenimiento y servicios técnicos (${orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length} órdenes activas)`}
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenNew}>
          <Plus size={18} /> Nueva Orden
        </button>
      </div>

      {/* Filters (Matching History View) */}
      <div className="glass-card" style={{ display: 'flex', gap: 'var(--space-4)', padding: 'var(--space-4)', marginBottom: 'var(--space-5)', alignItems: 'center', border: '1px solid var(--color-outline)' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={18} color="var(--color-on-surface-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input className="form-input" placeholder="Buscar por número o cliente..." value={search}
            onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '40px', margin: 0 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Settings size={16} color="var(--color-on-surface-muted)" />
          <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 180, margin: 0 }}>
            <option value="all">Todos los estados</option>
            {statusColumns.filter(c => c.id !== 'completed').map(col => (
              <option key={col.id} value={col.id}>{col.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Orders List */}
      <div className="glass-card" style={{ flex: 1, overflowX: 'auto', border: '1px solid var(--color-outline)' }}>
        {loading ? <LoadingSpinner /> : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Nº Orden</th>
                <th>Cliente</th>
                <th>Tipo / Especialidad</th>
                <th>Prioridad</th>
                <th>Programada</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {orders.filter(o => {
                const q = search.toLowerCase();
                const matchesSearch = o.wo_number.toLowerCase().includes(q) || 
                                     getClientName(o.client_id).toLowerCase().includes(q);
                const matchesStatus = filterStatus === 'all' || o.status === filterStatus;
                const isActive = o.status !== 'completed' && o.status !== 'cancelled';
                return matchesSearch && matchesStatus && isActive;
              }).length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: 'var(--space-10)', color: 'var(--color-on-surface-variant)' }}>
                    No se encontraron órdenes de trabajo activas.
                  </td>
                </tr>
              ) : orders.filter(o => {
                const q = search.toLowerCase();
                const matchesSearch = o.wo_number.toLowerCase().includes(q) || 
                                     getClientName(o.client_id).toLowerCase().includes(q);
                const matchesStatus = filterStatus === 'all' || o.status === filterStatus;
                const isActive = o.status !== 'completed' && o.status !== 'cancelled';
                return matchesSearch && matchesStatus && isActive;
              }).map(order => {
                const col = statusColumns.find(c => c.id === order.status) || statusColumns[0];
                return (
                  <tr key={order.id} onClick={() => handleEdit(order)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: 600, color: 'var(--color-primary-light)' }}>{order.wo_number}</td>
                    <td style={{ fontWeight: 500 }}>{getClientName(order.client_id)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {getWorkTypeIcon(order.work_type)}
                        <span style={{ textTransform: 'capitalize' }}>
                          {order.work_type === 'preventive' ? 'Preventivo' : order.work_type === 'corrective' ? 'Correctivo' : 'Instalación'}
                        </span>
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', fontWeight: 600 }}>
                        {dynamicSpecialties.find(s => s.id === order.specialty)?.name || order.specialty}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {priorityIcons[order.priority]}
                        <span style={{ fontSize: 'var(--font-size-xs)', textTransform: 'capitalize' }}>{order.priority}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--color-on-surface-variant)', fontSize: 'var(--font-size-sm)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={14} /> {new Date(order.scheduled_date).toLocaleDateString('es-PA')}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }}></div>
                        <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, textTransform: 'uppercase' }}>{col.label}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
                        {statusLoading === order.id ? (
                          <Loader2 size={16} className="spin" />
                        ) : (
                          <>
                            {order.status === 'pending' && <button className="btn btn-outline" style={{ padding: '6px' }} onClick={(e) => updateStatus(e, order.id, 'en_route')} title="En Camino"><Play size={16} /></button>}
                            {order.status === 'en_route' && <button className="btn btn-outline" style={{ padding: '6px' }} onClick={(e) => updateStatus(e, order.id, 'in_progress')} title="Iniciar"><Wrench size={16} /></button>}
                            {order.status === 'in_progress' && <button className="btn btn-outline" style={{ padding: '6px', color: '#34D399' }} onClick={(e) => updateStatus(e, order.id, 'completed')} title="Completar"><CheckCircle size={16} /></button>}
                            <button className="btn btn-outline" style={{ padding: '6px', color: 'var(--color-error)' }} onClick={(e) => updateStatus(e, order.id, 'cancelled')} title="Cancelar"><X size={16} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Nueva/Editar OT */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowModal(false)}>
          <div className="glass-card" style={{ width: '100%', maxWidth: 550, padding: 'var(--space-6)', background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)', borderBottom: '1px solid var(--color-outline)', paddingBottom: 'var(--space-4)' }}>
              <div>
                <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>
                  {editingOrder ? `Editar Orden: ${editingOrder.wo_number}` : 'Nueva Orden de Trabajo'}
                </h2>
                <p style={{ color: 'var(--color-on-surface-variant)', fontSize: 'var(--font-size-xs)', marginTop: 2 }}>Asignación de servicio técnico</p>
              </div>
              <button style={{ background: 'transparent', border: 'none', color: 'var(--color-on-surface-variant)', cursor: 'pointer' }} onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                if (editingOrder) {
                  await api.updateWorkOrder(editingOrder.id, formData);
                } else {
                  await api.createWorkOrder(formData);
                }
                setShowModal(false);
                loadData();
              } catch (err) { alert(err.message); }
            }}>
              <div className="form-group">
                <label className="form-label">Cliente *</label>
                <select className="form-select" value={formData.client_id} required onChange={e => setFormData({ ...formData, client_id: e.target.value })} disabled={!!editingOrder}>
                  <option value="">Seleccionar cliente...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.company_name || c.contact_name}</option>)}
                </select>
                {clients.length === 0 && !loading && (
                  <p style={{ color: '#F87171', fontSize: '11px', marginTop: '4px' }}>No hay clientes registrados. Crea uno primero.</p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Técnico Asignado *</label>
                <select className="form-select" value={formData.assigned_to} required onChange={e => setFormData({ ...formData, assigned_to: e.target.value })}>
                  <option value="">Seleccionar técnico...</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>)}
                </select>
                {users.length === 0 && !loading && (
                  <p style={{ color: '#F87171', fontSize: '11px', marginTop: '4px' }}>Error cargando técnicos.</p>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div className="form-group">
                  <label className="form-label">Tipo de Trabajo *</label>
                  <select className="form-select" value={formData.work_type} onChange={e => setFormData({ ...formData, work_type: e.target.value })}>
                    <option value="preventive">Preventivo</option>
                    <option value="corrective">Correctivo</option>
                    <option value="installation">Instalación</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Especialidad *</label>
                  <select className="form-select" value={formData.specialty} onChange={e => setFormData({ ...formData, specialty: e.target.value })}>
                    {dynamicSpecialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    <option value="other">Otros</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div className="form-group">
                  <label className="form-label">Fecha Programada *</label>
                  <input className="form-input" type="date" required value={formData.scheduled_date} onChange={e => setFormData({ ...formData, scheduled_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Prioridad *</label>
                  <select className="form-select" value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })}>
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Descripción del Trabajo</label>
                <textarea className="form-input" rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Detalles de la falla, ubicación, notas para el técnico..." />
              </div>

              <div className="form-group">
                <label className="form-label">Estado de la Orden</label>
                <select className="form-select" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                  {statusColumns.map(col => (
                    <option key={col.id} value={col.id}>{col.label}</option>
                  ))}
                  <option value="cancelled">Cancelada</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-6)' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">
                  <Check size={16} style={{ marginRight: '6px' }} /> {editingOrder ? 'Guardar Cambios' : 'Crear Orden'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
