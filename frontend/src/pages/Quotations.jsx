import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { 
  FileText, Download, Send, CheckCircle, XCircle, FilePlus, 
  Eye, Plus, X, Trash2, Loader2, FileCheck, Search, ChevronDown, Pencil
} from 'lucide-react';

function SearchableSelect({ options, value, onChange, placeholder, style }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const selectedOption = options.find(o => o.id === value);
  const filteredOptions = options.filter(o => 
    (o.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ position: 'relative', ...style }}>
      <div 
        className="form-input" 
        style={{ 
          cursor: 'pointer', display: 'flex', justifyContent: 'space-between', 
          alignItems: 'center', margin: 0, padding: '10px 14px',
          borderColor: isOpen ? 'var(--color-primary)' : 'var(--color-outline)'
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span style={{ 
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          color: selectedOption ? 'inherit' : 'var(--color-on-surface-muted)'
        }}>
          {selectedOption ? selectedOption.name : placeholder}
        </span>
        <ChevronDown size={16} style={{ flexShrink: 0, marginLeft: 8, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </div>
      
      {isOpen && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 1050 }} onClick={() => setIsOpen(false)} />
          <div className="glass-card" style={{ 
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1100, 
            marginTop: 4, maxHeight: 300, overflowY: 'auto', padding: 8,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)', border: '1px solid var(--color-outline)'
          }}>
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-on-surface-muted)' }} />
              <input 
                className="form-input" 
                autoFocus
                placeholder="Buscar..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ margin: 0, paddingLeft: 32, fontSize: 'var(--font-size-sm)' }}
                onClick={e => e.stopPropagation()}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {filteredOptions.length === 0 ? (
                <div style={{ padding: '12px', textAlign: 'center', color: 'var(--color-on-surface-muted)', fontSize: 'var(--font-size-sm)' }}>No se encontraron resultados</div>
              ) : filteredOptions.map(opt => (
                <div 
                  key={opt.id} 
                  className="select-option"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(opt.id);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  style={{ 
                    padding: '10px 12px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                    background: value === opt.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                    color: value === opt.id ? 'var(--color-primary-light)' : 'inherit',
                    fontSize: 'var(--font-size-sm)', transition: 'background 0.2s'
                  }}
                >
                  {opt.name}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}


const statusConfig = {
  draft: { bg: 'rgba(148, 163, 184, 0.1)', color: '#94A3B8', label: 'Borrador' },
  sent: { bg: 'rgba(59, 130, 246, 0.1)', color: '#60A5FA', label: 'Enviada' },
  approved: { bg: 'rgba(52, 211, 153, 0.1)', color: '#34D399', label: 'Aprobada' },
  rejected: { bg: 'rgba(248, 113, 113, 0.1)', color: '#F87171', label: 'Rechazada' },
  invoiced: { bg: 'rgba(167, 139, 250, 0.1)', color: '#A78BFA', label: 'Facturada' },
};

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-10)', color: 'var(--color-on-surface-muted)' }}>
      <Loader2 size={32} className="spin" style={{ animation: 'spin 1s linear infinite', color: 'var(--color-primary)' }} />
      <span style={{ marginTop: 'var(--space-3)' }}>Cargando cotizaciones...</span>
    </div>
  );
}

export default function Quotations() {
  const [quotes, setQuotes] = useState([]);
  const [clients, setClients] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    client_id: '', 
    notes: '', 
    items: [],
    apply_tax: false, 
    status: 'draft',
  });
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [tempStatus, setTempStatus] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [qRes, cRes, catRes, sRes] = await Promise.all([
        api.listQuotations(),
        api.listClients(),
        api.listCatalog(),
        api.getSettings(),
      ]);
      setQuotes(qRes.data || []);
      setClients(cRes.data || []);
      setCatalog(catRes.data || []);
      setSettings(sRes.data || {});
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const addItem = (catalogItem) => {
    const newItem = {
      catalog_item_id: catalogItem.id,
      description: catalogItem.name,
      quantity: 1,
      unit: catalogItem.unit,
      unit_price: catalogItem.unit_price,
      cost_price: catalogItem.cost_price,
      discount_percent: 0,
      scope: '',
    };
    setFormData(prev => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const removeItem = (index) => {
    setFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((acc, item) => {
      const line = item.quantity * item.unit_price * (1 - (item.discount_percent / 100));
      return acc + line;
    }, 0);
    const taxRate = parseFloat(settings.tax_rate || '7') / 100;
    const tax = formData.apply_tax ? subtotal * taxRate : 0;
    return { subtotal, tax, total: subtotal + tax };
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (formData.items.length === 0) return alert('Agrega al menos un ítem a la cotización');
    setSaving(true);
    try {
      if (isEditing) {
        await api.updateQuotation(editingId, formData);
      } else {
        await api.createQuotation(formData);
      }
      setShowModal(false);
      setIsEditing(false);
      setEditingId(null);
      setFormData({ client_id: '', notes: '', items: [], apply_tax: false });
      loadData();
    } catch (err) {
      alert('Error guardando cotización: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (quote) => {
    setLoading(true);
    try {
      const res = await api.getQuotation(quote.id);
      const quoteData = res.data;
      const items = res.items || [];
      
      setFormData({
        client_id: quoteData.client_id,
        notes: quoteData.notes || '',
        items: items.map(i => ({
          catalog_item_id: i.catalog_item_id,
          description: i.description,
          quantity: parseFloat(i.quantity),
          unit: i.unit,
          unit_price: parseFloat(i.unit_price),
          cost_price: parseFloat(i.cost_price),
          discount_percent: parseFloat(i.discount_percent || 0),
          scope: i.scope || '',
        })),
        apply_tax: parseFloat(quoteData.tax_amount) > 0,
        status: quoteData.status,
      });
      
      setEditingId(quote.id);
      setIsEditing(true);
      setShowModal(true);
    } catch (err) {
      alert('Error cargando datos para edición: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, action) => {
    try {
      if (action === 'approve') await api.approveQuotation(id);
      else await api.rejectQuotation(id);
      loadData();
    } catch (err) {
      alert('Error actualizando estado: ' + err.message);
    }
  };

  const handleView = async (quote) => {
    setViewLoading(true);
    try {
      const res = await api.getQuotation(quote.id);
      setSelectedQuote({ ...quote, items: res.items || [] });
      setTempStatus(quote.status);
      setShowViewModal(true);
    } catch (err) {
      alert('Error cargando detalles: ' + err.message);
    } finally {
      setViewLoading(false);
    }
  };

  const handleConvertToInvoice = async (id) => {
    try {
      await api.convertToInvoice(id);
      loadData();
    } catch (err) {
      alert('Error convirtiendo a factura: ' + err.message);
    }
  };

  const getClientName = (id) => {
    const c = clients.find(cl => cl.id === id);
    return c ? (c.company_name || c.contact_name) : '—';
  };

  const totals = calculateTotals();

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <style>{`
        @keyframes fadeIn { from { opacity:0; transform: scale(0.98); } to { opacity:1; transform: scale(1); } }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-on-surface)' }}>
            <FileText size={24} color="var(--color-primary-light)" />
            Cotizaciones
          </h1>
          <p style={{ color: 'var(--color-on-surface-muted)', fontSize: 'var(--font-size-sm)', marginTop: 4 }}>
            {loading ? 'Sincronizando...' : `Gestión comercial y presupuestos (${quotes.length} registradas)`}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Nueva Cotización
        </button>
      </div>

      <div className="glass-card" style={{ overflowX: 'auto' }}>
        {loading ? <LoadingSpinner /> : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Número</th>
                <th>Cliente</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {quotes.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-10)', color: 'var(--color-on-surface-variant)' }}>
                    No hay cotizaciones registradas en el sistema.
                  </td>
                </tr>
              ) : quotes.map(q => {
                const status = statusConfig[q.status] || statusConfig.draft;
                return (
                  <tr key={q.id} onClick={() => handleView(q)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: 600, color: 'var(--color-on-surface)' }}>{q.quote_number}</td>
                    <td>{getClientName(q.client_id)}</td>
                    <td>
                      <span className="pill" style={{ background: status.bg, color: status.color }}>
                        {status.label}
                      </span>
                    </td>
                    <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-on-surface-variant)' }}>
                      {new Date(q.created_at).toLocaleDateString('es-PA')}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-on-surface)' }}>
                      ${parseFloat(q.total).toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 'var(--space-2)', justifyItems: 'flex-end', justifyContent: 'flex-end' }}>
                        <button className="btn btn-outline" style={{ padding: '6px' }} title="Descargar PDF" onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const blob = await api.downloadQuotationPdf(q.id);
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `Cotizacion_${q.quote_number}.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            a.remove();
                          } catch (err) { alert(err.message); }
                        }}>
                          <Download size={14} />
                        </button>
                        
                        <button className="btn btn-outline" style={{ padding: '6px' }} title="Editar" onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(q);
                        }} disabled={q.status === 'invoiced'}>
                          <Pencil size={14} />
                        </button>

                        <button className="btn btn-outline" style={{ padding: '6px' }} title="Enviar por Email" onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await api.post(`/quotations/${q.id}/send-email`);
                            alert('Cotización enviada al cliente exitosamente');
                          } catch (err) { alert(err.message); }
                        }}>
                          <Send size={14} />
                        </button>

                        {(q.status === 'draft' || q.status === 'sent') && (
                          <>
                            <button className="btn btn-outline" style={{ padding: '6px', color: 'var(--color-success)', borderColor: 'rgba(52, 211, 153, 0.3)' }} title="Aprobar" onClick={(e) => { e.stopPropagation(); handleStatusChange(q.id, 'approve'); }}>
                              <CheckCircle size={14} />
                            </button>
                            <button className="btn btn-outline" style={{ padding: '6px', color: 'var(--color-error)', borderColor: 'rgba(239, 68, 68, 0.3)' }} title="Rechazar" onClick={(e) => { e.stopPropagation(); handleStatusChange(q.id, 'reject'); }}>
                              <XCircle size={14} />
                            </button>
                          </>
                        )}
                        
                        {q.status === 'approved' && (
                          <button className="btn btn-primary" style={{ padding: '6px 10px', fontSize: '12px' }} title="Convertir a Factura" onClick={(e) => { e.stopPropagation(); handleConvertToInvoice(q.id); }}>
                            <FilePlus size={14} style={{ marginRight: '4px' }} /> Facturar
                          </button>
                        )}
                        
                        <button className="btn btn-outline" style={{ padding: '6px' }} title="Ver Detalles" onClick={(e) => { e.stopPropagation(); handleView(q); }} disabled={viewLoading}>
                          {viewLoading && selectedQuote?.id === q.id ? <Loader2 size={14} className="spin" /> : <Eye size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Nueva Cotización */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowModal(false)}>
          <div className="glass-card" style={{ width: '100%', maxWidth: 900, maxHeight: '95vh', overflowY: 'auto', padding: 'var(--space-6)', background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)', borderBottom: '1px solid var(--color-outline)', paddingBottom: 'var(--space-4)' }}>
              <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>{isEditing ? 'Editar Cotización' : 'Nueva Cotización'}</h2>
              <button style={{ background: 'transparent', border: 'none', color: 'var(--color-on-surface-variant)', cursor: 'pointer' }} onClick={() => { setShowModal(false); setIsEditing(false); setEditingId(null); }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-5)', marginBottom: 'var(--space-6)' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Cliente *</label>
                  <SearchableSelect 
                    options={clients.map(c => ({ id: c.id, name: c.company_name || c.contact_name }))}
                    value={formData.client_id}
                    onChange={id => setFormData({ ...formData, client_id: id })}
                    placeholder="Seleccionar cliente..."
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Catálogo (Agregar Ítem rápido)</label>
                  <SearchableSelect 
                    options={catalog.map(i => ({ id: i.id, name: `${i.name} - $${i.unit_price}` }))}
                    value=""
                    onChange={id => {
                      const item = catalog.find(i => i.id === id);
                      if (item) addItem(item);
                    }}
                    placeholder="Seleccionar producto o servicio..."
                  />
                </div>
                {isEditing && (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Estado de la Cotización</label>
                    <select 
                      className="form-input" 
                      value={formData.status} 
                      onChange={e => setFormData({ ...formData, status: e.target.value })}
                      style={{ height: '44px' }}
                    >
                      {Object.entries(statusConfig).map(([key, config]) => (
                        <option key={key} value={key}>{config.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div style={{ marginBottom: 'var(--space-6)', border: '1px solid var(--color-outline)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <table className="data-table" style={{ width: '100%', fontSize: 'var(--font-size-sm)' }}>
                  <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <tr>
                      <th style={{ width: '40%' }}>Descripción</th>
                      <th>Cant.</th>
                      <th>Precio Unit.</th>
                      <th>Dcto %</th>
                      <th style={{ textAlign: 'right' }}>Subtotal</th>
                      <th style={{ width: '50px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.length === 0 ? (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--color-on-surface-variant)' }}>No hay ítems agregados. Usa el catálogo o añade manualmente.</td></tr>
                    ) : formData.items.map((item, idx) => (
                      <tr key={idx}>
                        <td>
                          <input className="form-input" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} style={{ margin: 0, padding: '6px 12px', fontWeight: 600 }} />
                          <textarea 
                            className="form-input" 
                            value={item.scope || ''} 
                            onChange={e => updateItem(idx, 'scope', e.target.value)} 
                            placeholder="Alcances del servicio..." 
                            style={{ marginTop: 'var(--space-2)', fontSize: '11px', height: '50px', resize: 'none', background: 'rgba(255,255,255,0.01)' }} 
                          />
                        </td>
                        <td style={{ verticalAlign: 'top', paddingTop: '10px' }}><input className="form-input" type="number" value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value))} style={{ width: '100%', margin: 0, padding: '6px 12px' }} min="1" /></td>
                        <td style={{ verticalAlign: 'top', paddingTop: '10px' }}><input className="form-input" type="number" step="0.01" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value))} style={{ width: '100%', margin: 0, padding: '6px 12px' }} min="0" /></td>
                        <td style={{ verticalAlign: 'top', paddingTop: '10px' }}><input className="form-input" type="number" value={item.discount_percent} onChange={e => updateItem(idx, 'discount_percent', parseFloat(e.target.value))} style={{ width: '100%', margin: 0, padding: '6px 12px' }} min="0" max="100" /></td>
                        <td style={{ textAlign: 'right', fontWeight: 600, verticalAlign: 'top', paddingTop: '16px' }}>
                          ${(item.quantity * item.unit_price * (1 - (item.discount_percent / 100))).toFixed(2)}
                        </td>
                        <td style={{ verticalAlign: 'top', paddingTop: '10px', textAlign: 'center' }}>
                          <button type="button" className="btn btn-outline" style={{ padding: '6px', color: 'var(--color-error)', borderColor: 'transparent' }} onClick={() => removeItem(idx)}>
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals & Notes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 'var(--space-6)' }}>
                <div className="form-group">
                  <label className="form-label">Notas / Términos de la oferta</label>
                  <textarea className="form-input" rows={5} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Ej: Válido por 15 días, 50% abono requerido..." style={{ resize: 'none' }} />
                </div>
                
                <div style={{ padding: 'var(--space-4)', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-outline)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                    <span style={{ color: 'var(--color-on-surface-variant)' }}>Subtotal</span>
                    <span style={{ fontWeight: 500 }}>${totals.subtotal.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', color: 'var(--color-on-surface-variant)', fontSize: 'var(--font-size-sm)' }}>
                      <input 
                        type="checkbox" 
                        checked={formData.apply_tax} 
                        onChange={e => setFormData({ ...formData, apply_tax: e.target.checked })}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                      ITBMS ({settings.tax_rate || '7'}%)
                    </label>
                    <span style={{ fontWeight: 500, color: formData.apply_tax ? 'inherit' : 'var(--color-on-surface-muted)' }}>
                      ${totals.tax.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-outline)', paddingTop: 'var(--space-3)', fontWeight: 700, fontSize: 'var(--font-size-lg)', color: 'var(--color-primary-light)' }}>
                    <span>Total Estimado</span>
                    <span>${totals.total.toFixed(2)}</span>
                  </div>

                </div>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-6)' }}>
                <button type="button" className="btn btn-outline" onClick={() => { setShowModal(false); setIsEditing(false); setEditingId(null); }}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><Loader2 size={16} className="spin" /> Guardando...</> : <><FileCheck size={16} style={{ marginRight: '6px' }} /> {isEditing ? 'Guardar Cambios' : 'Crear Cotización'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Ver Detalles */}
      {showViewModal && selectedQuote && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowViewModal(false)}>
          <div className="glass-card" style={{ width: '100%', maxWidth: 800, maxHeight: '90vh', overflowY: 'auto', padding: 'var(--space-6)', background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)', borderBottom: '1px solid var(--color-outline)', paddingBottom: 'var(--space-4)' }}>
              <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>Detalles Cotización: {selectedQuote.quote_number}</h2>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button 
                  className="btn btn-outline" 
                  style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}
                  onClick={async () => {
                    try {
                      const blob = await api.downloadQuotationPdf(selectedQuote.id);
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `Cotizacion_${selectedQuote.quote_number}.pdf`;
                      document.body.appendChild(a);
                      a.click();
                      window.URL.revokeObjectURL(url);
                      a.remove();
                    } catch (err) { alert(err.message); }
                  }}
                >
                  <Download size={16} /> PDF
                </button>
                <button style={{ background: 'transparent', border: 'none', color: 'var(--color-on-surface-variant)', cursor: 'pointer' }} onClick={() => setShowViewModal(false)}>
                  <X size={20} />
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
              <div>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-on-surface-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cliente</p>
                <p style={{ fontWeight: 600, fontSize: 'var(--font-size-md)' }}>{getClientName(selectedQuote.client_id)}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-on-surface-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estado</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                  <select 
                    className="form-input" 
                    value={tempStatus} 
                    onChange={(e) => setTempStatus(e.target.value)}
                    style={{ 
                      padding: '4px 8px', height: 'auto', width: 'auto', display: 'inline-block',
                      background: statusConfig[tempStatus]?.bg, 
                      color: statusConfig[tempStatus]?.color,
                      border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 600
                    }}
                  >
                    {Object.entries(statusConfig).map(([key, config]) => (
                      <option key={key} value={key} style={{ background: 'var(--color-surface)', color: 'var(--color-on-surface)' }}>{config.label}</option>
                    ))}
                  </select>
                  
                  {tempStatus !== selectedQuote.status && (
                    <button 
                      className="btn btn-primary" 
                      style={{ padding: '4px 10px', fontSize: '11px' }}
                      onClick={async () => {
                        console.log('Intentando actualizar estado:', selectedQuote.id, tempStatus);
                        try {
                          await api.updateQuotationStatus(selectedQuote.id, tempStatus);
                          
                          // Actualizar estado local inmediatamente para evitar discrepancias visuales
                          setQuotes(prev => prev.map(q => q.id === selectedQuote.id ? { ...q, status: tempStatus } : q));
                          setSelectedQuote({ ...selectedQuote, status: tempStatus });
                          
                          // Recargar datos en segundo plano
                          const qRes = await api.listQuotations();
                          setQuotes(qRes.data || []);
                        } catch (err) { 
                          console.error('Error al actualizar estado:', err);
                          alert('Error al actualizar estado: ' + err.message); 
                        }
                      }}
                    >
                      Guardar
                    </button>
                  )}
                </div>
              </div>
            </div>

            <table className="data-table" style={{ width: '100%', marginBottom: 'var(--space-6)' }}>
              <thead>
                <tr>
                  <th>Descripción / Alcances</th>
                  <th style={{ textAlign: 'right' }}>Cantidad</th>
                  <th style={{ textAlign: 'right' }}>P. Unitario</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {selectedQuote.items?.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.description}</div>
                      {item.scope && <div style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)', marginTop: '4px', whiteSpace: 'pre-wrap' }}>{item.scope}</div>}
                    </td>
                    <td style={{ textAlign: 'right' }}>{item.quantity} {item.unit}</td>
                    <td style={{ textAlign: 'right' }}>${parseFloat(item.unit_price).toFixed(2)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>${parseFloat(item.line_total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ width: '250px', padding: 'var(--space-4)', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-outline)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                  <span style={{ color: 'var(--color-on-surface-muted)' }}>Subtotal</span>
                  <span>${parseFloat(selectedQuote.subtotal).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                  <span style={{ color: 'var(--color-on-surface-muted)' }}>ITBMS (7%)</span>
                  <span>${parseFloat(selectedQuote.tax_amount).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-outline)', paddingTop: 'var(--space-2)', fontWeight: 700, color: 'var(--color-primary-light)' }}>
                  <span>Total</span>
                  <span>${parseFloat(selectedQuote.total).toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            {selectedQuote.notes && (
              <div style={{ marginTop: 'var(--space-6)', padding: 'var(--space-4)', background: 'rgba(255,255,255,0.01)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--color-primary)' }}>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-on-surface-muted)', marginBottom: '4px' }}>Notas / Términos:</p>
                <p style={{ fontSize: 'var(--font-size-sm)' }}>{selectedQuote.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
