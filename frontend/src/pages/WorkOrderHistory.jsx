import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { 
  Briefcase, Calendar, CheckCircle, XCircle, Search, 
  FileText, Loader2, Filter, Download, X, Check, Save, Settings
} from 'lucide-react';

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-10)', color: 'var(--color-on-surface-muted)' }}>
      <Loader2 size={32} className="spin" style={{ animation: 'spin 1s linear infinite', color: 'var(--color-primary)' }} />
      <span style={{ marginTop: 'var(--space-3)' }}>Cargando historial...</span>
    </div>
  );
}

const ALL_STATUSES = [
  { id: 'pending', label: 'Pendiente' },
  { id: 'en_route', label: 'En Camino' },
  { id: 'in_progress', label: 'En Progreso' },
  { id: 'completed', label: 'Completada' },
  { id: 'cancelled', label: 'Cancelada' },
];

export default function WorkOrderHistory() {
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [formData, setFormData] = useState({ status: '' });
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [woRes, clRes] = await Promise.all([
        api.listWorkOrders(),
        api.listClients()
      ]);
      const allOrders = woRes.data || [];
      // Keep all for filtering logic but initially show history
      setOrders(allOrders);
      setClients(clRes.data || []);
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const getClientName = (id) => {
    const c = clients.find(cl => cl.id === id);
    return c ? (c.company_name || c.contact_name) : '—';
  };

  const handleEdit = (order) => {
    setEditingOrder(order);
    setFormData({ status: order.status });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateWorkOrder(editingOrder.id, { status: formData.status });
      setShowModal(false);
      await loadData();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    const matchesSearch = o.wo_number.toLowerCase().includes(q) || 
                         getClientName(o.client_id).toLowerCase().includes(q);
    
    // Default filter for this page: completed or cancelled
    // UNLESS the user explicitly searches for another status
    if (filterStatus === 'all') {
        const isHistory = o.status === 'completed' || o.status === 'cancelled';
        return matchesSearch && isHistory;
    }
    
    return matchesSearch && o.status === filterStatus;
  });

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <style>{`
        @keyframes fadeIn { from { opacity:0; transform: scale(0.98); } to { opacity:1; transform: scale(1); } }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>

      {/* Header */}
      <div className="page-header" style={{ marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-on-surface)' }}>
            <FileText size={24} color="var(--color-primary-light)" />
            Historial de Órdenes
          </h1>
          <p style={{ color: 'var(--color-on-surface-muted)', fontSize: 'var(--font-size-sm)', marginTop: 4 }}>
            Consulta de órdenes de trabajo finalizadas y canceladas
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <button className="btn btn-outline" onClick={() => window.print()}>
                <Download size={18} /> Exportar
            </button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card" style={{ display: 'flex', gap: 'var(--space-4)', padding: 'var(--space-4)', marginBottom: 'var(--space-5)', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={18} color="var(--color-on-surface-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input className="form-input" placeholder="Buscar por número o cliente..." value={search}
            onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '40px', margin: 0 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Filter size={16} color="var(--color-on-surface-muted)" />
          <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 180, margin: 0 }}>
            <option value="all">Ver Historial (Comp/Can)</option>
            {ALL_STATUSES.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* List */}
      <div className="glass-card" style={{ overflowX: 'auto' }}>
        {loading ? <LoadingSpinner /> : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Nº Orden</th>
                <th>Cliente</th>
                <th>Tipo / Especialidad</th>
                <th>Fecha Ejecución</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: 'var(--space-10)', color: 'var(--color-on-surface-variant)' }}>
                    No se encontraron órdenes en esta vista.
                  </td>
                </tr>
              ) : filtered.map(order => (
                <tr key={order.id} onClick={() => handleEdit(order)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 600, color: 'var(--color-on-surface)' }}>{order.wo_number}</td>
                  <td style={{ fontWeight: 500, color: 'var(--color-on-surface)' }}>{getClientName(order.client_id)}</td>
                  <td>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-on-surface)' }}>
                      {order.work_type === 'preventive' ? 'Preventivo' : order.work_type === 'corrective' ? 'Correctivo' : 'Instalación'}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-on-surface-variant)', textTransform: 'uppercase' }}>
                        {order.specialty}
                    </div>
                  </td>
                  <td style={{ color: 'var(--color-on-surface-variant)' }}>
                    {new Date(order.scheduled_date).toLocaleDateString('es-PA')}
                  </td>
                  <td>
                    <span className="pill" style={{ 
                      background: order.status === 'completed' ? 'rgba(52, 211, 153, 0.1)' : 
                                 order.status === 'cancelled' ? 'rgba(248, 113, 113, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                      color: order.status === 'completed' ? '#34D399' : 
                             order.status === 'cancelled' ? '#F87171' : '#60A5FA'
                    }}>
                      {order.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-outline" style={{ padding: '6px' }} title="Editar Estado">
                      <Settings size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Status Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowModal(false)}>
          <div className="glass-card" style={{ width: '100%', maxWidth: 400, padding: 'var(--space-6)', background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
              <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>Cambiar Estado</h2>
              <button style={{ background: 'transparent', border: 'none', color: 'var(--color-on-surface-variant)', cursor: 'pointer' }} onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Nuevo Estado para {editingOrder.wo_number}</label>
                <select className="form-select" value={formData.status} onChange={e => setFormData({ status: e.target.value })}>
                  {ALL_STATUSES.map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
                <p style={{ fontSize: '11px', color: 'var(--color-on-surface-muted)', marginTop: '8px' }}>
                    Nota: Si cambias el estado a uno activo (ej. Pendiente), la orden regresará al módulo principal.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-6)' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} style={{ marginRight: '6px' }} />}
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
