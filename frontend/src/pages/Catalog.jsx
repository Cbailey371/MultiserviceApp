import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export default function Catalog() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    item_type: 'service', 
    name: '', 
    description: '', 
    specialty: 'hvac', 
    unit_price: '', 
    cost_price: '', 
    margin: '0.20', // Default 20%
    unit: 'unidad'
  });

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listCatalog();
      setItems(res.data || []);
    } catch (err) {
      console.error('Error loading catalog:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);

  const calculatePrice = useCallback((cost, margin) => {
    const c = parseFloat(cost) || 0;
    const m = parseFloat(margin) || 0;
    if (m >= 1) return c.toFixed(2);
    return (c / (1 - m)).toFixed(2);
  }, []);

  const handleCostMarginChange = (field, value) => {
    const nextData = { ...formData, [field]: value };
    const newPrice = calculatePrice(
      field === 'cost_price' ? value : formData.cost_price,
      field === 'margin' ? value : formData.margin
    );
    setFormData({ ...nextData, unit_price: newPrice });
  };


  const filteredItems = items.filter(item => {
    const q = search.toLowerCase();
    const matchSearch = item.name.toLowerCase().includes(q) || (item.description || '').toLowerCase().includes(q);
    const matchType = typeFilter === 'all' || item.item_type === typeFilter;
    return matchSearch && matchType;
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...formData,
        unit_price: parseFloat(formData.unit_price),
        cost_price: parseFloat(formData.cost_price || 0),
      };
      await api.createCatalogItem(payload);
      setShowModal(false);
      setFormData({ 
        item_type: 'service', 
        name: '', 
        description: '', 
        specialty: 'hvac', 
        unit_price: '', 
        cost_price: '', 
        margin: '0.20',
        unit: 'unidad' 
      });
      loadItems();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (

    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-on-surface)' }}>Catálogo de Servicios</h1>
          <p style={{ color: 'var(--color-outline)', fontSize: 'var(--font-size-sm)', marginTop: 2 }}>
            {loading ? 'Cargando...' : `${filteredItems.length} ítems en catálogo`}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>＋ Nuevo Item</button>
      </div>

      <div className="glass-card" style={{ display: 'flex', gap: 'var(--space-3)', padding: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
        <input className="form-input" placeholder="Buscar por nombre o descripción..." value={search}
          onChange={e => setSearch(e.target.value)} style={{ flex: 1, margin: 0 }} />
        <select className="form-input" style={{ width: 180, margin: 0 }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="all">Todos los tipos</option>
          <option value="service">Servicios</option>
          <option value="product">Productos</option>
          <option value="labor">Mano de Obra</option>
        </select>
      </div>

      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <table className="data-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Nombre / Descripción</th>
              <th>Tipo</th>
              <th>Especialidad</th>
              <th>Unidad</th>
              <th style={{ textAlign: 'right' }}>Precio Unit.</th>
              <th style={{ textAlign: 'right' }}>Costo</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-10)' }}>Cargando catálogo...</td></tr>
            ) : filteredItems.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-10)' }}>No se encontraron ítems.</td></tr>
            ) : filteredItems.map(item => (
              <tr key={item.id}>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--color-on-surface)' }}>{item.name}</div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-outline)' }}>{item.description}</div>
                </td>
                <td>
                  <span className="status-chip" style={{ '--chip-color': item.item_type === 'service' ? 'var(--color-primary)' : 'var(--color-warning)' }}>
                    {item.item_type}
                  </span>
                </td>
                <td style={{ textTransform: 'capitalize' }}>{item.specialty}</td>
                <td>{item.unit}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>${parseFloat(item.unit_price).toFixed(2)}</td>
                <td style={{ textAlign: 'right', color: 'var(--color-outline)' }}>${parseFloat(item.cost_price).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowModal(false)}>
          <div className="glass-card" style={{ width: 500, padding: 'var(--space-8)' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: 'var(--space-6)' }}>Nuevo Item de Catálogo</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Tipo *</label>
                <select className="form-input" value={formData.item_type} required onChange={e => setFormData({...formData, item_type: e.target.value})}>
                  <option value="service">Servicio</option>
                  <option value="product">Producto / Repuesto</option>
                  <option value="labor">Mano de Obra</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Nombre *</label>
                <input className="form-input" value={formData.name} required onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ej: Mantenimiento Preventivo" />
              </div>
              <div className="form-group">
                <label className="form-label">Descripción</label>
                <textarea className="form-input" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={2} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    COSTO UNITARIO ($)
                  </label>
                  <input className="form-input" type="number" step="0.01" 
                    value={formData.cost_price} 
                    onChange={e => handleCostMarginChange('cost_price', e.target.value)} 
                    placeholder="0.00" 
                    style={{ fontWeight: 600, fontSize: 'var(--font-size-md)', padding: '12px' }} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    MARGEN DE GANANCIA
                    <span style={{ color: 'var(--color-primary-light)', fontWeight: 700 }}>{(parseFloat(formData.margin || 0) * 100).toFixed(0)}%</span>
                  </label>
                  <input className="form-input" type="number" step="0.01" 
                    value={formData.margin} 
                    onChange={e => handleCostMarginChange('margin', e.target.value)} 
                    placeholder="0.30" 
                    style={{ fontWeight: 600, fontSize: 'var(--font-size-md)', padding: '12px' }} />
                  <span style={{ fontSize: '10px', color: 'var(--color-on-surface-muted)', marginTop: 4, display: 'block' }}>Ej: 0.30 equivale a 30%</span>
                </div>
              </div>

              <div style={{ 
                background: 'rgba(59, 130, 246, 0.05)', 
                border: '1px solid rgba(59, 130, 246, 0.2)', 
                borderRadius: 'var(--radius-lg)', 
                padding: 'var(--space-6)',
                textAlign: 'center',
                marginBottom: 'var(--space-6)'
              }}>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary-light)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 'var(--space-2)' }}>
                  PRECIO DE VENTA SUGERIDO
                </p>
                <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, color: 'var(--color-primary-light)', marginBottom: 'var(--space-2)' }}>
                  ${formData.unit_price || '0.00'}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--color-on-surface-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <span>📋</span> Cálculo: Costo / (1 - Margen)
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Precio Final Confirmado ($) *</label>
                <input className="form-input" type="number" step="0.01" 
                  value={formData.unit_price} required 
                  onChange={e => setFormData({...formData, unit_price: e.target.value})} 
                  placeholder="0.00" 
                  style={{ background: 'rgba(255,255,255,0.02)', fontWeight: 700 }} />
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-8)' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '12px 24px' }} disabled={saving}>
                  {saving ? 'Guardando...' : '✓ Crear Item de Catálogo'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
