import { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  TrendingUp, FileDown, Loader2, Users, FileText, 
  Briefcase, ShoppingBag, ClipboardList, Search, Eye
} from 'lucide-react';

export default function Reports() {
  const [activeTab, setActiveTab] = useState('clients');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const tabs = [
    { id: 'clients', label: 'Clientes', icon: <Users size={18} />, apiMethod: api.listClients.bind(api), exportMethod: api.exportClients.bind(api), filename: 'reporte_clientes' },
    { id: 'invoices', label: 'Facturas', icon: <FileText size={18} />, apiMethod: api.listInvoices.bind(api), exportMethod: api.exportInvoices.bind(api), filename: 'reporte_facturas' },
    { id: 'quotations', label: 'Cotizaciones', icon: <Eye size={18} />, apiMethod: api.listQuotations.bind(api), exportMethod: api.exportQuotations.bind(api), filename: 'reporte_cotizaciones' },
    { id: 'contracts', label: 'Contratos', icon: <Briefcase size={18} />, apiMethod: api.listContracts.bind(api), exportMethod: api.exportContracts.bind(api), filename: 'reporte_contratos' },
    { id: 'catalog', label: 'Catálogo', icon: <ShoppingBag size={18} />, apiMethod: api.listCatalog.bind(api), exportMethod: api.exportCatalog.bind(api), filename: 'reporte_catalogo' },
    { id: 'ots', label: 'Órdenes (OTs)', icon: <ClipboardList size={18} />, apiMethod: api.listWorkOrders.bind(api), exportMethod: api.exportWorkOrders.bind(api), filename: 'reporte_ots' },
  ];

  useEffect(() => {
    loadTabData();
  }, [activeTab]);

  async function loadTabData() {
    setLoading(true);
    try {
      const currentTab = tabs.find(t => t.id === activeTab);
      const res = await currentTab.apiMethod();
      setData(Array.isArray(res) ? res : (res.data || []));
    } catch (err) {
      console.error("Error loading report data", err);
    } finally {
      setLoading(false);
    }
  }

  const handleExport = async () => {
    const currentTab = tabs.find(t => t.id === activeTab);
    try {
      setExporting(true);
      const blob = await currentTab.exportMethod();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentTab.filename}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Export error", err);
      alert("Error al exportar reporte");
    } finally {
      setExporting(false);
    }
  };

  const filteredData = data.filter(item => {
    const searchStr = searchTerm.toLowerCase();
    return Object.values(item).some(val => 
      String(val).toLowerCase().includes(searchStr)
    );
  });

  const renderTable = () => {
    if (loading) return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12)', color: 'var(--color-on-surface-muted)' }}>
        <Loader2 className="spin" size={32} />
      </div>
    );

    if (filteredData.length === 0) return (
      <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--color-on-surface-muted)' }}>
        No se encontraron registros para previsualizar.
      </div>
    );

    const keys = Object.keys(filteredData[0]).filter(k => k !== 'id' && !k.includes('_id') && k !== 'created_at' && k !== 'updated_at');

    return (
      <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-outline)' }}>
        <table className="data-table">
          <thead>
            <tr>
              {keys.map(k => (
                <th key={k} style={{ textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.slice(0, 15).map((item, idx) => (
              <tr key={idx}>
                {keys.map(k => (
                  <td key={k}>{String(item[k] || '')}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {filteredData.length > 15 && (
          <div style={{ padding: 'var(--space-3)', textAlign: 'center', fontSize: 'var(--font-size-xs)', color: 'var(--color-on-surface-muted)', backgroundColor: 'rgba(0,0,0,0.05)' }}>
            Mostrando previsualización de los primeros 15 registros. Descarga el Excel para ver todo.
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <style>{`
        @keyframes fadeIn { from { opacity:0; transform: translateY(10px); } to { opacity:1; transform: translateY(0); } }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .tab-btn {
          display: flex; alignItems: center; gap: 8px; padding: 12px 20px; border: none; background: none;
          color: var(--color-on-surface-muted); font-weight: 500; cursor: pointer; border-bottom: 2px solid transparent;
          transition: all 0.2s ease;
        }
        .tab-btn.active { color: var(--color-primary); border-bottom-color: var(--color-primary); background: var(--color-primary-light)10; }
        .tab-btn:hover:not(.active) { color: var(--color-on-surface); background: var(--color-surface-hover); }
      `}</style>

      {/* Header */}
      <div className="page-header" style={{ marginBottom: 'var(--space-8)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-on-surface)' }}>
            <TrendingUp size={24} color="var(--color-primary-light)" />
            Centro de Reportes
          </h1>
          <p style={{ color: 'var(--color-on-surface-muted)', fontSize: 'var(--font-size-sm)', marginTop: 4 }}>
            Previsualiza y exporta la información maestra de tu sistema
          </p>
        </div>
        <button 
          className="btn btn-primary" 
          disabled={exporting || loading || data.length === 0}
          onClick={handleExport}
          style={{ gap: 'var(--space-2)' }}>
          {exporting ? <Loader2 className="spin" size={18} /> : <FileDown size={18} />}
          Exportar a Excel
        </button>
      </div>

      {/* Tabs */}
      <div className="glass-card" style={{ padding: 0, marginBottom: 'var(--space-6)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-outline)', overflowX: 'auto' }}>
          {tabs.map(tab => (
            <button 
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => { setActiveTab(tab.id); setSearchTerm(''); }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ padding: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-on-surface-muted)' }} />
            <input 
              type="text" 
              placeholder={`Filtrar ${tabs.find(t => t.id === activeTab).label}...`}
              className="input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: 40, width: '100%' }}
            />
          </div>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-on-surface-muted)', whiteSpace: 'nowrap' }}>
            {filteredData.length} registros encontrados
          </div>
        </div>
      </div>

      {/* Preview Section */}
      <div className="glass-card" style={{ padding: 'var(--space-6)' }}>
        <h3 style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-md)', fontWeight: 600 }}>
          Previsualización de Datos
        </h3>
        {renderTable()}
      </div>
    </div>
  );
}
