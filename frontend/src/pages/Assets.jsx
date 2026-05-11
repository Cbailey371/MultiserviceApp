import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { 
  Wrench, Search, Plus, X, Loader2, FileText, Edit2
} from 'lucide-react';



function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-10)', color: 'var(--color-on-surface-muted)' }}>
      <Loader2 size={32} className="spin" style={{ animation: 'spin 1s linear infinite', color: 'var(--color-primary)' }} />
      <span style={{ marginTop: 'var(--space-3)' }}>Cargando inventario...</span>
    </div>
  );
}

export default function Assets() {
  const [assets, setAssets] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [specFilter, setSpecFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [historyModal, setHistoryModal] = useState({ show: false, data: [], assetName: '' });
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    client_id: '', specialty: 'hvac', asset_type: '', brand: '',
    model: '', serial_number: '', capacity_btu: '', notes: '',
  });

  const [specialtyConfig, setSpecialtyConfig] = useState({
    other: { label: 'Otros', color: '#9CA3AF', bg: 'rgba(156, 163, 175, 0.1)' }
  });
  const [dynamicSpecialties, setDynamicSpecialties] = useState([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Execute assets and clients first so settings don't block them
      const [assetsRes, clientsRes] = await Promise.all([
        api.listAssets(),
        api.listClients(),
      ]);
      setAssets(assetsRes.data || []);
      setClients(clientsRes.data || []);
      
      let settingsRes = { data: {} };
      try {
        settingsRes = await api.getSettings();
      } catch (e) {
        console.warn('Could not load settings for specialties', e);
      }
      
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
        } catch (e) { console.error('Error parsing dynamic specialties', e); }
      }

      const config = {
        other: { label: 'Otros', color: '#9CA3AF', bg: 'rgba(156, 163, 175, 0.1)' }
      };
      
      specs.forEach(s => {
        config[s.id] = { 
          label: s.name, 
          color: s.color, 
          bg: s.color + '1a' // 10% opacity hex
        };
      });

      setSpecialtyConfig(config);
      setDynamicSpecialties(specs);
      
      if (formData.specialty === 'hvac' && specs.length > 0 && !specs.find(s => s.id === 'hvac')) {
         setFormData(p => ({...p, specialty: specs[0].id}));
      }

    } catch (err) {
      console.error('Error loading assets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.client_id) return alert('Selecciona un cliente');
    setSaving(true);
    try {
      const payload = {
        ...formData,
        capacity_btu: formData.capacity_btu ? parseInt(formData.capacity_btu) : null,
      };
      if (editingId) {
        await api.updateAsset(editingId, payload);
      } else {
        await api.createAsset(payload);
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({ client_id: '', specialty: 'hvac', asset_type: '', brand: '', model: '', serial_number: '', capacity_btu: '', notes: '' });
      loadData();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (asset) => {
    setFormData({
      client_id: asset.client_id || '',
      specialty: asset.specialty || 'hvac',
      asset_type: asset.asset_type || '',
      brand: asset.brand || '',
      model: asset.model_name || '',
      serial_number: asset.serial_number || '',
      capacity_btu: asset.capacity_btu || '',
      notes: asset.notes || '',
    });
    setEditingId(asset.id);
    setShowModal(true);
  };

  const loadHistory = async (asset) => {
    try {
      const res = await api.getAssetHistory(asset.id);
      setHistoryModal({ show: true, data: res.data || [], assetName: `${asset.brand || ''} ${asset.model_name || ''}`.trim() });
    } catch (err) {
      alert('Error cargando historial: ' + err.message);
    }
  };

  const filteredAssets = assets.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = (a.brand || '').toLowerCase().includes(q) || 
                       (a.model_name || '').toLowerCase().includes(q) || 
                       (a.serial_number || '').toLowerCase().includes(q);
    const matchSpec = specFilter === 'all' || a.specialty === specFilter;
    return matchSearch && matchSpec;
  });

  const getClientName = (id) => {
    const client = clients.find(c => c.id === id);
    return client ? (client.company_name || client.contact_name) : 'Desconocido';
  };

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
            <Wrench size={24} color="var(--color-primary-light)" />
            Inventario de Equipos
          </h1>
          <p style={{ color: 'var(--color-on-surface-muted)', fontSize: 'var(--font-size-sm)', marginTop: 4 }}>
            {loading ? 'Sincronizando...' : `${filteredAssets.length} activos registrados en total`}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          setEditingId(null);
          setFormData({ client_id: '', specialty: 'hvac', asset_type: '', brand: '', model: '', serial_number: '', capacity_btu: '', notes: '' });
          setShowModal(true);
        }}>
          <Plus size={18} /> Agregar Equipo
        </button>
      </div>

      <div className="glass-card" style={{ border: '1px solid var(--color-outline)' }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: 'var(--space-4)', padding: 'var(--space-4)', borderBottom: '1px solid var(--color-outline)', alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative', maxWidth: '400px' }}>
            <Search size={16} color="var(--color-on-surface-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input className="form-input" placeholder="Buscar por marca, modelo o número de serie..." value={search}
              onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '36px', margin: 0 }} />
          </div>
          <select className="form-select" style={{ width: 220, margin: 0 }} value={specFilter} onChange={e => setSpecFilter(e.target.value)}>
            <option value="all">Todas las especialidades</option>
            {dynamicSpecialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            <option value="other">Otros</option>
          </select>
        </div>

        {/* Lista de Equipos */}
        {loading ? <LoadingSpinner /> : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Equipo (Marca / Modelo)</th>
                  <th>N° de Serie</th>
                  <th>Cliente Asignado</th>
                  <th>Especialidad</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-on-surface-variant)' }}>
                      No se encontraron equipos que coincidan con la búsqueda.
                    </td>
                  </tr>
                ) : filteredAssets.map(asset => {
                  const spec = specialtyConfig[asset.specialty] || specialtyConfig.other;
                  const isActive = asset.status === 'active';
                  
                  return (
                    <tr key={asset.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--color-on-surface)' }}>
                          {asset.brand} {asset.model_name}
                        </div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-on-surface-variant)', textTransform: 'capitalize' }}>
                          {asset.asset_type || 'General'}
                          {asset.capacity_btu && ` • ${asset.capacity_btu.toLocaleString()} BTU`}
                        </div>
                      </td>
                      <td style={{ color: 'var(--color-on-surface-variant)', fontFamily: 'monospace' }}>
                        {asset.serial_number || 'N/A'}
                      </td>
                      <td style={{ fontWeight: 500, color: 'var(--color-on-surface)' }}>
                        {getClientName(asset.client_id)}
                      </td>
                      <td>
                        <span className="pill" style={{ background: spec.bg, color: spec.color }}>
                          {spec.label}
                        </span>
                      </td>
                      <td>
                        <span className="pill" style={isActive ? { background: 'rgba(52, 211, 153, 0.1)', color: '#34D399' } : { background: 'rgba(156, 163, 175, 0.1)', color: '#9CA3AF' }}>
                          {isActive ? 'Operativo' : 'Inactivo'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-outline" style={{ padding: '6px', marginRight: '8px' }} title="Ver Historial"
                          onClick={() => loadHistory(asset)}>
                          <FileText size={14} color="var(--color-on-surface-muted)" />
                        </button>
                        <button className="btn btn-outline" style={{ padding: '6px' }} title="Editar Equipo"
                          onClick={() => handleEdit(asset)}>
                          <Edit2 size={14} color="var(--color-warning)" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Agregar Equipo */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowModal(false)}>
          <div className="glass-card" style={{ width: '100%', maxWidth: 550, maxHeight: '90vh', overflowY: 'auto', background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-4)', borderBottom: '1px solid var(--color-outline)' }}>
              <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>{editingId ? 'Editar Equipo' : 'Nuevo Equipo'}</h2>
              <button style={{ background: 'transparent', border: 'none', color: 'var(--color-on-surface-variant)', cursor: 'pointer' }} onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} style={{ padding: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label">Cliente Propietario *</label>
                <select className="form-select" value={formData.client_id} required onChange={e => setFormData({...formData, client_id: e.target.value})}>
                  <option value="">Seleccionar cliente...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.company_name || c.contact_name}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div className="form-group">
                  <label className="form-label">Especialidad</label>
                  <select className="form-select" value={formData.specialty} onChange={e => setFormData({...formData, specialty: e.target.value})}>
                    {dynamicSpecialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    <option value="other">Otros</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Tipo de Equipo</label>
                  <input className="form-input" value={formData.asset_type} onChange={e => setFormData({...formData, asset_type: e.target.value})} placeholder="Ej: Split, Central..." />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div className="form-group">
                  <label className="form-label">Marca</label>
                  <input className="form-input" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} placeholder="Carrier, LG, etc." />
                </div>
                <div className="form-group">
                  <label className="form-label">Modelo</label>
                  <input className="form-input" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} placeholder="ASW-H12..." />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Número de Serie</label>
                <input className="form-input" value={formData.serial_number} onChange={e => setFormData({...formData, serial_number: e.target.value})} placeholder="SN12345678" />
              </div>

              {formData.specialty === 'hvac' && (
                <div className="form-group">
                  <label className="form-label">Capacidad (BTU) <span style={{ color: 'var(--color-on-surface-muted)', fontWeight: 'normal' }}>(Opcional)</span></label>
                  <input type="number" className="form-input" value={formData.capacity_btu} onChange={e => setFormData({...formData, capacity_btu: e.target.value})} placeholder="Ej: 12000" />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Notas Adicionales</label>
                <textarea className="form-input" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} rows={2} placeholder="Condición inicial, ubicación física..." />
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-6)' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><Loader2 size={16} className="spin" style={{ marginRight: 6 }} /> Guardando...</> : 'Guardar Equipo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Historial */}
      {historyModal.show && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setHistoryModal({ show: false, data: [], assetName: '' })}>
          <div className="glass-card" style={{ width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto', background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-4)', borderBottom: '1px solid var(--color-outline)' }}>
              <div>
                <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>Historial de Mantenimiento</h2>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-on-surface-muted)' }}>{historyModal.assetName || 'Equipo'}</p>
              </div>
              <button style={{ background: 'transparent', border: 'none', color: 'var(--color-on-surface-variant)', cursor: 'pointer' }} onClick={() => setHistoryModal({ show: false, data: [], assetName: '' })}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: 'var(--space-4)' }}>
              {historyModal.data.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--color-on-surface-variant)' }}>
                  <FileText size={32} style={{ opacity: 0.3, marginBottom: 'var(--space-2)' }} />
                  <p>No hay registros de mantenimiento para este equipo.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {historyModal.data.map((record, i) => (
                    <div key={i} style={{ padding: 'var(--space-3)', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-outline)', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
                        <strong style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-on-surface)' }}>{record.action || 'Servicio de Mantenimiento'}</strong>
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-on-surface-variant)' }}>{new Date(record.date || record.created_at).toLocaleDateString()}</span>
                      </div>
                      <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-on-surface-muted)' }}>{record.notes || record.description || 'Sin detalles'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
