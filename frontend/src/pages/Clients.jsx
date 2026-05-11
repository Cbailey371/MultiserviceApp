import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { 
  Users, Search, Building2, Home, MapPin, Wrench, 
  Trash2, X, Plus, Loader2, Phone, Mail, FileText,
  User, Edit
} from 'lucide-react';

function StatusChip({ type, label }) {
  const isBusiness = type === 'business';
  return (
    <span className="status-chip" style={
      isBusiness 
        ? { borderColor: 'rgba(59, 130, 246, 0.3)', color: '#60A5FA', background: 'rgba(59, 130, 246, 0.1)' } 
        : { borderColor: 'rgba(245, 158, 11, 0.3)', color: '#FBBF24', background: 'rgba(245, 158, 11, 0.1)' }
    }>
      {isBusiness ? <Building2 size={12} style={{ marginRight: '4px' }} /> : <Home size={12} style={{ marginRight: '4px' }} />}
      {label}
    </span>
  );
}

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-10)', color: 'var(--color-on-surface-muted)' }}>
      <Loader2 size={32} className="spin" style={{ animation: 'spin 1s linear infinite', color: 'var(--color-primary)' }} />
      <span style={{ marginLeft: 'var(--space-3)' }}>Cargando clientes...</span>
    </div>
  );
}

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    client_type: 'business', contact_name: '', company_name: '',
    tax_id: '', tax_dv: '', email: '', phone: '', phone_alt: '', notes: '',
  });

  // Load clients
  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listClients();
      setClients(res.data || []);
    } catch (err) {
      console.error('Error loading clients:', err);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadClients(); }, [loadClients]);

  // Load client detail
  const loadDetail = async (id) => {
    setSelected(id);
    setDetailLoading(true);
    setActiveTab('general');
    try {
      const res = await api.getClient(id);
      setDetail(res);
    } catch (err) {
      console.error('Error loading detail:', err);
    } finally { setDetailLoading(false); }
  };

  // Save client (Create/Update)
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await api.updateClient(editingId, formData);
        if (selected === editingId) loadDetail(editingId);
      } else {
        await api.createClient(formData);
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({ client_type:'business', contact_name:'', company_name:'', tax_id:'', tax_dv:'', email:'', phone:'', phone_alt:'', notes:'' });
      loadClients();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally { setSaving(false); }
  };

  const handleEditClick = (clientData) => {
    setFormData({
      client_type: clientData.client_type || 'business',
      contact_name: clientData.contact_name || '',
      company_name: clientData.company_name || '',
      tax_id: clientData.tax_id || '',
      tax_dv: clientData.tax_dv || '',
      email: clientData.email || '',
      phone: clientData.phone || '',
      phone_alt: clientData.phone_alt || '',
      notes: clientData.notes || '',
    });
    setEditingId(clientData.id);
    setShowModal(true);
  };

  // Delete client
  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este cliente?')) return;
    try {
      await api.deleteClient(id);
      setSelected(null); setDetail(null);
      loadClients();
    } catch (err) { alert('Error: ' + err.message); }
  };

  // Filter
  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = c.contact_name?.toLowerCase().includes(q) || c.company_name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.phone?.includes(q);
    const matchType = typeFilter === 'all' || c.client_type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <style>{`
        @keyframes spin { to { transform:rotate(360deg) } }
        @keyframes slideIn { from { opacity:0;transform:translateX(24px) } to { opacity:1;transform:translateX(0) } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
      `}</style>

      {/* Header */}
      <div className="page-header">
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', fontSize: 'var(--font-size-xl)', fontWeight: 600 }}>
            <Users size={24} color="var(--color-primary-light)" /> 
            Clientes
          </h2>
          <p style={{ color: 'var(--color-on-surface-muted)', fontSize: 'var(--font-size-sm)', marginTop: '4px' }}>
            {loading ? 'Cargando directorio...' : `Mostrando ${filtered.length} de ${clients.length} clientes registrados`}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          setEditingId(null);
          setFormData({ client_type:'business', contact_name:'', company_name:'', tax_id:'', tax_dv:'', email:'', phone:'', phone_alt:'', notes:'' });
          setShowModal(true);
        }}>
          <Plus size={18} /> Nuevo Cliente
        </button>
      </div>

      {/* Search & Filters */}
      <div className="glass-card" style={{ display:'flex',gap:'var(--space-4)',alignItems:'center',padding:'var(--space-4)',marginBottom:'var(--space-5)' }}>
        <div style={{ flex:1,position:'relative' }}>
          <Search size={18} color="var(--color-on-surface-muted)" style={{ position:'absolute',left:12,top:'50%',transform:'translateY(-50%)' }} />
          <input className="form-input" placeholder="Buscar por nombre, empresa o teléfono..." value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft:'40px', margin:0 }} />
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {[
            { id: 'all', label: 'Todos' },
            { id: 'business', label: 'Empresas' },
            { id: 'residential', label: 'Hogar' }
          ].map(t => (
            <button key={t.id} className={`btn ${typeFilter===t.id?'btn-primary':'btn-outline'}`}
              onClick={() => setTypeFilter(t.id)} style={{ padding: '6px 16px' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Layout */}
      <div style={{ display:'grid',gridTemplateColumns: selected ? '1fr 420px' : '1fr',gap:'var(--space-5)',alignItems:'start' }}>
        {/* Client Table */}
        <div className="glass-card" style={{ overflowX:'auto' }}>
          {loading ? <LoadingSpinner /> : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Tipo</th>
                  <th>Contacto</th>
                  <th>Teléfono</th>
                  <th>Registrado</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign:'center',padding:'var(--space-10)',color:'var(--color-on-surface-variant)' }}>
                      {clients.length === 0 ? 'No hay clientes registrados. Crea el primero.' : 'No se encontraron resultados.'}
                    </td>
                  </tr>
                ) : filtered.map(c => (
                  <tr key={c.id} onClick={() => loadDetail(c.id)}
                    style={{ cursor:'pointer',background: selected===c.id ? 'rgba(59,130,246,0.05)' : undefined }}>
                    <td>
                      <div style={{ fontWeight:600,color:'var(--color-on-surface)' }}>
                        {c.company_name || c.contact_name}
                      </div>
                      {c.company_name && <div style={{ fontSize:'var(--font-size-xs)',color:'var(--color-on-surface-variant)',marginTop:2 }}>{c.contact_name}</div>}
                    </td>
                    <td><StatusChip type={c.client_type} label={c.client_type === 'business' ? 'Empresa' : 'Hogar'} /></td>
                    <td style={{ color:'var(--color-on-surface-variant)' }}>{c.email || '—'}</td>
                    <td>{c.phone}</td>
                    <td style={{ color:'var(--color-on-surface-variant)',fontSize:'var(--font-size-xs)' }}>
                      {new Date(c.created_at).toLocaleDateString('es-PA')}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-outline" onClick={(e) => { e.stopPropagation(); handleEditClick(c); }} style={{ padding: '6px' }} title="Editar">
                        <Edit size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="glass-card" style={{ padding:'var(--space-5)',animation:'slideIn 0.3s ease-out' }}>
            {detailLoading ? <LoadingSpinner /> : detail && (
              <>
                {/* Detail Header */}
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'var(--space-5)' }}>
                  <div>
                    <h3 style={{ fontSize:'var(--font-size-lg)',fontWeight:600,color:'var(--color-on-surface)', marginBottom: '4px' }}>
                      {detail.data.company_name || detail.data.contact_name}
                    </h3>
                    <StatusChip type={detail.data.client_type} label={detail.data.client_type==='business'?'Empresa':'Hogar'} />
                  </div>
                  <div style={{ display:'flex',gap:'var(--space-2)' }}>
                    <button className="btn btn-outline" onClick={() => handleEditClick(detail.data)}
                      style={{ padding: '6px' }} title="Editar Cliente">
                      <Edit size={16} />
                    </button>
                    <button className="btn btn-outline" onClick={() => handleDelete(detail.data.id)}
                      style={{ padding: '6px', color: 'var(--color-error)', borderColor: 'rgba(239, 68, 68, 0.3)' }} title="Eliminar Cliente">
                      <Trash2 size={16} />
                    </button>
                    <button className="btn btn-outline" onClick={() => { setSelected(null); setDetail(null); }}
                      style={{ padding: '6px' }} title="Cerrar Detalles">
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* Tabs */}
                <div style={{ display:'flex',gap:'var(--space-2)',marginBottom:'var(--space-5)',borderBottom:'1px solid var(--color-outline)' }}>
                  {[
                    {k:'general',l:'General'},
                    {k:'locations',l:'Ubicaciones'},
                    {k:'assets',l:'Equipos'},
                    {k:'history',l:'Historial'}
                  ].map(t => (
                    <button key={t.k} onClick={() => setActiveTab(t.k)}
                      style={{
                        padding:'var(--space-2) var(--space-3)',fontSize:'var(--font-size-sm)',background:'none',
                        border:'none',color: activeTab===t.k?'var(--color-primary-light)':'var(--color-on-surface-muted)',cursor:'pointer',
                        borderBottom: activeTab===t.k?'2px solid var(--color-primary)':'2px solid transparent',
                        fontWeight: activeTab===t.k?600:400,transition:'all 0.2s', marginBottom: '-1px'
                      }}>{t.l}</button>
                  ))}
                </div>

                {/* Tab Content */}
                {activeTab === 'general' && (
                  <div style={{ display:'flex',flexDirection:'column',gap:'var(--space-3)' }}>
                    <InfoRow icon={<User size={14} />} label="Contacto" value={detail.data.contact_name} />
                    <InfoRow icon={<Mail size={14} />} label="Email" value={detail.data.email || '—'} />
                    <InfoRow icon={<Phone size={14} />} label="Teléfono" value={detail.data.phone} />
                    <InfoRow icon={<Phone size={14} />} label="Tel. Alt." value={detail.data.phone_alt || '—'} />
                    {detail.data.company_name && <InfoRow icon={<Building2 size={14} />} label="Empresa" value={detail.data.company_name} />}
                    {detail.data.tax_id && <InfoRow icon={<FileText size={14} />} label="RUC / NIT" value={`${detail.data.tax_id}${detail.data.tax_dv ? ` DV ${detail.data.tax_dv}` : ''}`} />}
                    <InfoRow label="Notas" value={detail.data.notes || '—'} />
                  </div>
                )}

                {activeTab === 'locations' && (
                  <div>
                    {(detail.locations || []).length === 0 ? (
                      <div style={{ color:'var(--color-on-surface-variant)',textAlign:'center',padding:'var(--space-6)', display:'flex', flexDirection:'column', alignItems:'center', gap:'var(--space-2)' }}>
                        <MapPin size={24} style={{ opacity: 0.5 }} />
                        <span>Sin ubicaciones registradas</span>
                      </div>
                    ) : (detail.locations || []).map(loc => (
                      <div key={loc.id} style={{ padding:'var(--space-3)',marginBottom:'var(--space-3)',background:'rgba(255,255,255,0.03)', border: '1px solid var(--color-outline)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                          <strong style={{ color:'var(--color-on-surface)',fontSize:'var(--font-size-sm)' }}>{loc.label}</strong>
                          {loc.is_primary && <span className="pill" style={{ background: 'rgba(52, 211, 153, 0.1)', color: '#34D399', fontSize: '10px' }}>Principal</span>}
                        </div>
                        <p style={{ fontSize:'var(--font-size-xs)',color:'var(--color-on-surface-variant)',marginTop:'4px' }}>{loc.address}</p>
                        {loc.city && <p style={{ fontSize:'var(--font-size-xs)',color:'var(--color-on-surface-variant)' }}>{loc.city}{loc.province?`, ${loc.province}`:''}</p>}
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'assets' && (
                  <div>
                    <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'var(--space-3)' }}>
                      <span style={{ fontSize:'var(--font-size-sm)',color:'var(--color-on-surface-variant)' }}>{detail.asset_count || 0} equipos registrados</span>
                    </div>
                    {(detail.assets || []).length === 0 ? (
                      <div style={{ color:'var(--color-on-surface-variant)',textAlign:'center',padding:'var(--space-6)', display:'flex', flexDirection:'column', alignItems:'center', gap:'var(--space-2)' }}>
                        <Wrench size={24} style={{ opacity: 0.5 }} />
                        <span>Sin equipos registrados</span>
                      </div>
                    ) : (detail.assets || []).map(a => (
                      <div key={a.id} style={{ padding:'var(--space-3)',marginBottom:'var(--space-3)',background:'rgba(255,255,255,0.03)', border: '1px solid var(--color-outline)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start' }}>
                          <div>
                            <strong style={{ color:'var(--color-on-surface)',fontSize:'var(--font-size-sm)' }}>
                              {a.brand || ''} {a.model_name || 'Sin modelo'}
                            </strong>
                            <p style={{ fontSize:'var(--font-size-xs)',color:'var(--color-on-surface-variant)',marginTop:2 }}>
                              {a.specialty} • {a.serial_number || 'S/N'}
                              {a.capacity_btu ? ` • ${a.capacity_btu.toLocaleString()} BTU` : ''}
                            </p>
                          </div>
                          <span className="pill" style={a.status === 'active' ? { background: 'rgba(52, 211, 153, 0.1)', color: '#34D399' } : {}}>
                            {a.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'history' && (
                  <div style={{ color:'var(--color-on-surface-variant)',textAlign:'center',padding:'var(--space-6)', display:'flex', flexDirection:'column', alignItems:'center', gap:'var(--space-2)' }}>
                    <FileText size={24} style={{ opacity: 0.5 }} />
                    <span>El historial se poblará con las órdenes de trabajo</span>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Create Client Modal */}
      {showModal && (
        <div style={{
          position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(4px)',
          display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,
        }} onClick={() => setShowModal(false)}>
          <div className="glass-card" onClick={e => e.stopPropagation()}
            style={{ width:'100%', maxWidth:550, maxHeight:'90vh', overflowY:'auto', background:'var(--color-surface)', border:'1px solid var(--color-outline)' }}>
            
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'var(--space-4)',borderBottom:'1px solid var(--color-outline)' }}>
              <h2 style={{ fontSize:'var(--font-size-lg)',fontWeight:600,color:'var(--color-on-surface)' }}>{editingId ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
              <button style={{ background:'transparent',border:'none',color:'var(--color-on-surface-variant)',cursor:'pointer' }} onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ padding: 'var(--space-4)' }}>
              {/* Type selector */}
              <div className="form-group">
                <label className="form-label">Tipo de Cliente</label>
                <div style={{ display:'flex',gap:'var(--space-3)' }}>
                  {[
                    { id: 'business', label: 'Empresa', icon: <Building2 size={16} /> },
                    { id: 'residential', label: 'Hogar', icon: <Home size={16} /> }
                  ].map(t => (
                    <button key={t.id} type="button"
                      className={`btn ${formData.client_type===t.id?'btn-primary':'btn-outline'}`}
                      onClick={() => setFormData(p => ({...p, client_type:t.id}))}
                      style={{ flex:1,justifyContent:'center', gap: '8px' }}>
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns: formData.client_type === 'business' ? '2fr 1fr 80px' : '1fr 80px', gap:'var(--space-3)' }}>
                {formData.client_type === 'business' && (
                  <div className="form-group">
                    <label className="form-label">Nombre de la Empresa *</label>
                    <input className="form-input" required value={formData.company_name}
                      onChange={e => setFormData(p => ({...p, company_name:e.target.value}))} placeholder="Ej. MultiService Pro S.A." />
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">RUC / NIT</label>
                  <input className="form-input" value={formData.tax_id}
                    onChange={e => setFormData(p => ({...p, tax_id:e.target.value}))} placeholder="155xxxxx" />
                </div>
                <div className="form-group">
                  <label className="form-label">DV</label>
                  <input className="form-input" value={formData.tax_dv} maxLength={2}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 2);
                      setFormData(p => ({...p, tax_dv: val}));
                    }} placeholder="00" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Nombre del Contacto *</label>
                <input className="form-input" value={formData.contact_name} required
                  onChange={e => setFormData(p => ({...p, contact_name:e.target.value}))} placeholder="Ej. Juan Pérez" />
              </div>

              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'var(--space-3)' }}>
                <div className="form-group">
                  <label className="form-label">Teléfono Principal *</label>
                  <input className="form-input" value={formData.phone} required
                    onChange={e => setFormData(p => ({...p, phone:e.target.value}))} placeholder="Ej. 6000-0000" />
                </div>
                <div className="form-group">
                  <label className="form-label">Teléfono Alternativo</label>
                  <input className="form-input" value={formData.phone_alt}
                    onChange={e => setFormData(p => ({...p, phone_alt:e.target.value}))} placeholder="Opcional" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Correo Electrónico</label>
                <input className="form-input" type="email" value={formData.email}
                  onChange={e => setFormData(p => ({...p, email:e.target.value}))} placeholder="ejemplo@correo.com" />
              </div>

              <div className="form-group">
                <label className="form-label">Notas Adicionales</label>
                <textarea className="form-input" rows={3} value={formData.notes}
                  onChange={e => setFormData(p => ({...p, notes:e.target.value}))} placeholder="Observaciones sobre el cliente..." />
              </div>

              <div style={{ display:'flex',gap:'var(--space-3)',justifyContent:'flex-end',marginTop:'var(--space-6)' }}>
                <button className="btn btn-outline" type="button" onClick={() => setShowModal(false)}>Cancelar</button>
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  {saving ? (
                    <><Loader2 size={16} className="spin" /> Guardando...</>
                  ) : (
                    'Guardar Cliente'
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

function InfoRow({ icon, label, value }) {
  return (
    <div style={{ display:'flex',justifyContent:'space-between',padding:'var(--space-2) 0',borderBottom:'1px solid var(--color-outline)' }}>
      <span style={{ color:'var(--color-on-surface-variant)',fontSize:'var(--font-size-sm)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        {icon} {label}
      </span>
      <span style={{ color:'var(--color-on-surface)',fontSize:'var(--font-size-sm)',fontWeight:500,textAlign:'right',maxWidth:'60%' }}>
        {value}
      </span>
    </div>
  );
}
