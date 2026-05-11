import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { 
  FileSignature, Search, Plus, Trash2, X, Calendar, Loader2, Check, Edit2
} from 'lucide-react';


function StatusChip({ status }) {
  const configs = {
    active: { label: 'Activo', color: '#34D399', bg: 'rgba(52, 211, 153, 0.1)' },
    expired: { label: 'Vencido', color: '#F87171', bg: 'rgba(248, 113, 113, 0.1)' },
    pending: { label: 'Pendiente', color: '#FBBF24', bg: 'rgba(245, 158, 11, 0.1)' },
    cancelled: { label: 'Cancelado', color: '#9CA3AF', bg: 'rgba(156, 163, 175, 0.1)' },
  };
  const config = configs[status] || configs.pending;
  return (
    <span className="pill" style={{ background: config.bg, color: config.color }}>
      {config.label}
    </span>
  );
}

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-10)', color: 'var(--color-on-surface-muted)' }}>
      <Loader2 size={32} className="spin" style={{ animation: 'spin 1s linear infinite', color: 'var(--color-primary)' }} />
      <span style={{ marginTop: 'var(--space-3)' }}>Cargando contratos...</span>
    </div>
  );
}

export default function Contracts() {
  const [contracts, setContracts] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [specFilter, setSpecFilter] = useState('all');

  const [specialtyConfig, setSpecialtyConfig] = useState({
    other: { label: 'Otros', color: '#9CA3AF', bg: 'rgba(156, 163, 175, 0.1)' }
  });
  const [dynamicSpecialties, setDynamicSpecialties] = useState([]);

  const [formData, setFormData] = useState({
    client_id: '', specialty: 'hvac', frequency: 'quarterly',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    monthly_price: '', visits_per_period: 4, scope_of_work: '', notes: '',
    generate_schedules: true,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, clRes] = await Promise.all([
        api.listContracts(),
        api.listClients()
      ]);
      setContracts(cRes.data || []);
      setClients(clRes.data || []);

      // Load specialties from settings
      let settingsRes = { data: {} };
      try { settingsRes = await api.getSettings(); } catch (e) {}
      
      let specs = [
        { id: 'hvac', name: 'HVAC', color: '#60A5FA' },
        { id: 'electrical', name: 'Electricidad', color: '#FBBF24' },
        { id: 'construction', name: 'Construcción', color: '#FB923C' },
        { id: 'plumbing', name: 'Plomería', color: '#2DD4BF' },
        { id: 'refrigeration', name: 'Refrigeración', color: '#818CF8' },
      ];

      if (settingsRes.data && settingsRes.data.inventory_specialties) {
        try {
          const parsed = JSON.parse(settingsRes.data.inventory_specialties);
          if (Array.isArray(parsed) && parsed.length > 0) specs = parsed;
        } catch (e) {}
      }

      const config = {
        other: { label: 'Otros', color: '#9CA3AF', bg: 'rgba(156, 163, 175, 0.1)' }
      };
      specs.forEach(s => {
        config[s.id] = { label: s.name, color: s.color, bg: s.color + '1a' };
      });

      setSpecialtyConfig(config);
      setDynamicSpecialties(specs);

      if (formData.specialty === 'hvac' && specs.length > 0 && !specs.find(s => s.id === 'hvac')) {
        setFormData(p => ({...p, specialty: specs[0].id}));
      }

    } catch (err) {
      console.error('Error loading contracts:', err);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const loadDetail = async (id) => {
    setSelected(id);
    setDetailLoading(true);
    try {
      const res = await api.getContract(id);
      setDetail(res.data || res); // Handle both formats
    } catch (err) {
      console.error('Error loading detail:', err);
    } finally { setDetailLoading(false); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...formData,
        monthly_price: parseFloat(formData.monthly_price),
        visits_per_period: parseInt(formData.visits_per_period),
      };

      if (editingId) {
        await api.updateContract(editingId, payload);
      } else {
        await api.createContract(payload);
      }
      
      setShowModal(false);
      setEditingId(null);
      loadData();
      if (editingId) loadDetail(editingId);
    } catch (err) {
      alert('Error: ' + err.message);
    } finally { setSaving(false); }
  };

  const handleEdit = (contract) => {
    setFormData({
      client_id: contract.client_id,
      specialty: contract.specialty,
      frequency: contract.frequency,
      start_date: contract.start_date.split('T')[0],
      end_date: contract.end_date.split('T')[0],
      monthly_price: contract.monthly_price,
      visits_per_period: contract.visits_per_period,
      scope_of_work: contract.scope_of_work || '',
      notes: contract.notes || '',
      generate_schedules: false, // Don't regenerate on edit by default
    });
    setEditingId(contract.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Seguro que deseas eliminar este contrato? Esta acción no se puede deshacer.')) return;
    try {
      await api.deleteContract(id);
      setSelected(null); setDetail(null);
      loadData();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const filtered = contracts.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = c.contract_number.toLowerCase().includes(q) || 
                       c.client_name.toLowerCase().includes(q);
    const matchSpec = specFilter === 'all' || c.specialty === specFilter;
    return matchSearch && matchSpec;
  });

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <style>{`
        @keyframes fadeIn { from { opacity:0; transform: scale(0.98); } to { opacity:1; transform: scale(1); } }
        @keyframes slideIn { from { opacity:0; transform: translateX(24px); } to { opacity:1; transform: translateX(0); } }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-on-surface)' }}>
            <FileSignature size={24} color="var(--color-primary-light)" />
            Contratos de Mantenimiento
          </h1>
          <p style={{ color: 'var(--color-on-surface-muted)', fontSize: 'var(--font-size-sm)', marginTop: 4 }}>
            {loading ? 'Sincronizando...' : `${filtered.length} contratos activos registrados`}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Nuevo Contrato
        </button>
      </div>

      <div className="glass-card" style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center', padding: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={18} color="var(--color-on-surface-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input className="form-input" placeholder="Buscar por número o cliente..." value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '40px', margin: 0 }} />
        </div>
        <select className="form-select" style={{ width: 220, margin: 0 }} value={specFilter} onChange={e => setSpecFilter(e.target.value)}>
          <option value="all">Todas las especialidades</option>
          {dynamicSpecialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          <option value="other">Otros</option>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 420px' : '1fr', gap: 'var(--space-5)', alignItems: 'start' }}>
        {/* Table */}
        <div className="glass-card" style={{ overflowX: 'auto' }}>
          {loading ? <LoadingSpinner /> : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nº Contrato</th>
                  <th>Cliente</th>
                  <th>Especialidad</th>
                  <th>Frecuencia</th>
                  <th>Vencimiento</th>
                  <th style={{ textAlign: 'right' }}>Monto Mensual</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 'var(--space-10)', color: 'var(--color-on-surface-variant)' }}>
                      No se encontraron contratos. Crea el primero.
                    </td>
                  </tr>
                ) : filtered.map(c => (
                  <tr key={c.id} onClick={() => loadDetail(c.id)}
                    style={{ cursor: 'pointer', background: selected === c.id ? 'rgba(59, 130, 246, 0.05)' : undefined }}>
                    <td style={{ fontWeight: 600, color: 'var(--color-on-surface)' }}>{c.contract_number}</td>
                    <td style={{ fontWeight: 500, color: 'var(--color-on-surface)' }}>{c.client_name}</td>
                    <td>
                      <span className="pill" style={{ 
                        background: (specialtyConfig[c.specialty] || specialtyConfig.other).bg,
                        color: (specialtyConfig[c.specialty] || specialtyConfig.other).color
                      }}>
                        {(specialtyConfig[c.specialty] || specialtyConfig.other).label}
                      </span>
                    </td>
                    <td style={{ textTransform: 'capitalize', color: 'var(--color-on-surface-variant)' }}>
                      {c.frequency === 'monthly' ? 'Mensual' : 
                       c.frequency === 'quarterly' ? 'Trimestral' :
                       c.frequency === 'bi-annually' ? 'Semestral' : 'Anual'}
                    </td>
                    <td style={{ color: 'var(--color-on-surface-variant)' }}>
                      {new Date(c.end_date).toLocaleDateString('es-PA')}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>${parseFloat(c.monthly_price).toFixed(2)}</td>
                    <td><StatusChip status={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="glass-card" style={{ padding: 'var(--space-5)', animation: 'slideIn 0.25s ease-out' }}>
            {detailLoading ? <LoadingSpinner /> : detail && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 'var(--space-5)' }}>
                  <div>
                    <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, color: 'var(--color-on-surface)' }}>
                      {detail.contract.contract_number}
                    </h3>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-on-surface-variant)' }}>{detail.client.name}</p>
                  </div>
                    <button className="btn btn-outline" onClick={() => handleEdit(detail.contract)}
                      style={{ padding: '6px', color: 'var(--color-warning)', borderColor: 'rgba(251, 191, 36, 0.3)' }} title="Editar Contrato">
                      <Edit2 size={16} />
                    </button>
                    <button className="btn btn-outline" onClick={() => handleDelete(detail.contract.id)}
                      style={{ padding: '6px', color: 'var(--color-error)', borderColor: 'rgba(239, 68, 68, 0.3)' }} title="Eliminar Contrato">
                      <Trash2 size={16} />
                    </button>
                    <button className="btn btn-outline" onClick={() => { setSelected(null); setDetail(null); }}
                      style={{ padding: '6px' }} title="Cerrar">
                      <X size={16} />
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
                  <InfoRow label="Especialidad" value={(specialtyConfig[detail.contract.specialty] || specialtyConfig.other).label} />
                  <InfoRow label="Frecuencia" value={detail.contract.frequency} />
                  <InfoRow label="Inicio" value={new Date(detail.contract.start_date).toLocaleDateString('es-PA')} />
                  <InfoRow label="Fin" value={new Date(detail.contract.end_date).toLocaleDateString('es-PA')} />
                  <InfoRow label="Precio Mensual" value={`$${detail.contract.monthly_price}`} />
                  <InfoRow label="Visitas Totales" value={detail.contract.visits_per_period} />
                  <InfoRow label="Estado" value={<StatusChip status={detail.contract.status} />} />
                </div>

                <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--space-4)', color: 'var(--color-on-surface)' }}>
                  <Calendar size={16} color="var(--color-primary-light)" /> Visitas Programadas
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {detail.schedules.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--color-on-surface-variant)', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-outline)' }}>
                      Sin visitas programadas
                    </div>
                  ) : detail.schedules.map(s => (
                    <div key={s.id} style={{ 
                      padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.02)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--color-outline)'
                    }}>
                      <div>
                        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--color-on-surface)' }}>{new Date(s.scheduled_date).toLocaleDateString('es-PA')}</div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-on-surface-variant)' }}>Mantenimiento Preventivo</div>
                      </div>
                      <span className="pill" style={{ 
                        background: s.status === 'pending' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(52, 211, 153, 0.1)',
                        color: s.status === 'pending' ? '#FBBF24' : '#34D399', fontSize: '10px'
                      }}>
                        {s.status === 'pending' ? 'PENDIENTE' : 'COMPLETADO'}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={() => setShowModal(false)}>
          <div className="glass-card" onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', padding: 'var(--space-6)', background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)', borderBottom: '1px solid var(--color-outline)', paddingBottom: 'var(--space-4)' }}>
              <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, color: 'var(--color-on-surface)' }}>
                {editingId ? 'Editar Contrato' : 'Nuevo Contrato'}
              </h2>
              <button style={{ background: 'transparent', border: 'none', color: 'var(--color-on-surface-variant)', cursor: 'pointer' }} onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Cliente *</label>
                <select className="form-select" required value={formData.client_id}
                  onChange={e => setFormData(p => ({...p, client_id: e.target.value}))}>
                  <option value="">Seleccionar cliente...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.company_name || c.contact_name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div className="form-group">
                  <label className="form-label">Especialidad</label>
                  <select className="form-select" value={formData.specialty}
                    onChange={e => setFormData(p => ({...p, specialty: e.target.value}))}>
                    {dynamicSpecialties.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                    <option value="other">Otros</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Frecuencia</label>
                  <select className="form-select" value={formData.frequency}
                    onChange={e => setFormData(p => ({...p, frequency: e.target.value}))}>
                    <option value="monthly">Mensual</option>
                    <option value="quarterly">Trimestral</option>
                    <option value="bi-annually">Semestral</option>
                    <option value="annually">Anual</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div className="form-group">
                  <label className="form-label">Fecha de Inicio</label>
                  <input type="date" className="form-input" value={formData.start_date}
                    onChange={e => setFormData(p => ({...p, start_date: e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha de Fin</label>
                  <input type="date" className="form-input" value={formData.end_date}
                    onChange={e => setFormData(p => ({...p, end_date: e.target.value}))} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div className="form-group">
                  <label className="form-label">Monto Mensual ($) *</label>
                  <input type="number" step="0.01" className="form-input" required value={formData.monthly_price}
                    onChange={e => setFormData(p => ({...p, monthly_price: e.target.value}))} placeholder="0.00" />
                </div>
                <div className="form-group">
                  <label className="form-label">Visitas Totales por Periodo</label>
                  <input type="number" className="form-input" value={formData.visits_per_period}
                    onChange={e => setFormData(p => ({...p, visits_per_period: e.target.value}))} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Alcance del Trabajo</label>
                <textarea className="form-input" rows={3} value={formData.scope_of_work}
                  onChange={e => setFormData(p => ({...p, scope_of_work: e.target.value}))} placeholder="Detallar servicios incluidos..." />
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input type="checkbox" checked={formData.generate_schedules} id="gen-sched"
                  onChange={e => setFormData(p => ({...p, generate_schedules: e.target.checked}))} />
                <label htmlFor="gen-sched" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-on-surface-variant)', cursor: 'pointer' }}>
                  Generar calendario de visitas automático
                </label>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-6)' }}>
                <button className="btn btn-outline" type="button" onClick={() => setShowModal(false)}>Cancelar</button>
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  {saving ? <><Loader2 size={16} className="spin" /> Guardando...</> : <><Check size={16} style={{ marginRight: '6px' }} /> {editingId ? 'Guardar Cambios' : 'Crear Contrato'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--color-outline)' }}>
      <span style={{ color: 'var(--color-on-surface-muted)', fontSize: 'var(--font-size-sm)' }}>{label}</span>
      <span style={{ color: 'var(--color-on-surface)', fontSize: 'var(--font-size-sm)', fontWeight: 500, textAlign: 'right' }}>{value}</span>
    </div>
  );
}
