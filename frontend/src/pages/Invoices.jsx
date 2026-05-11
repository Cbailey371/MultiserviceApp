import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { 
  Receipt, Download, Send, DollarSign, Eye, X, Loader2 
} from 'lucide-react';

const statusConfig = {
  draft: { bg: 'rgba(148, 163, 184, 0.1)', color: '#94A3B8', label: 'Borrador' },
  sent: { bg: 'rgba(59, 130, 246, 0.1)', color: '#60A5FA', label: 'Enviada' },
  partial: { bg: 'rgba(245, 158, 11, 0.1)', color: '#FBBF24', label: 'Abono Parcial' },
  paid: { bg: 'rgba(52, 211, 153, 0.1)', color: '#34D399', label: 'Pagada' },
  overdue: { bg: 'rgba(248, 113, 113, 0.1)', color: '#F87171', label: 'Vencida' },
};

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-10)', color: 'var(--color-on-surface-muted)' }}>
      <Loader2 size={32} className="spin" style={{ animation: 'spin 1s linear infinite', color: 'var(--color-primary)' }} />
      <span style={{ marginTop: 'var(--space-3)' }}>Cargando facturas...</span>
    </div>
  );
}

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedInvoiceDetail, setSelectedInvoiceDetail] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  
  const [paymentData, setPaymentData] = useState({
    amount: '',
    payment_method: 'transfer',
    reference_number: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [iRes, cRes] = await Promise.all([
        api.listInvoices(),
        api.listClients(),
      ]);
      setInvoices(iRes.data || []);
      setClients(cRes.data || []);
    } catch (err) {
      console.error('Error loading invoices:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleView = async (invoice) => {
    setViewLoading(true);
    try {
      const res = await api.getInvoice(invoice.id);
      setSelectedInvoiceDetail({ ...invoice, items: res.items || [], payments: res.payments || [] });
      setShowViewModal(true);
    } catch (err) {
      alert('Error cargando detalles: ' + err.message);
    } finally {
      setViewLoading(false);
    }
  };

  const handleRegisterPayment = async (e) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    setSaving(true);
    try {
      await api.registerPayment(selectedInvoice.id, {
        ...paymentData,
        amount: parseFloat(paymentData.amount)
      });
      setShowPaymentModal(false);
      setPaymentData({
        amount: '',
        payment_method: 'transfer',
        reference_number: '',
        payment_date: new Date().toISOString().split('T')[0],
        notes: ''
      });
      loadData();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const getClientName = (id) => {
    const c = clients.find(cl => cl.id === id);
    return c ? (c.company_name || c.contact_name) : '—';
  };

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
            <Receipt size={24} color="var(--color-primary-light)" />
            Facturación
          </h1>
          <p style={{ color: 'var(--color-on-surface-muted)', fontSize: 'var(--font-size-sm)', marginTop: 4 }}>
            {loading ? 'Sincronizando...' : `Control de ingresos y cuentas por cobrar (${invoices.length} facturas)`}
          </p>
        </div>
      </div>

      <div className="glass-card" style={{ overflowX: 'auto' }}>
        {loading ? <LoadingSpinner /> : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Número</th>
                <th>Cliente</th>
                <th>Estado</th>
                <th>Fecha de Emisión</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th style={{ textAlign: 'right' }}>Saldo Pendiente</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 'var(--space-10)', color: 'var(--color-on-surface-variant)' }}>
                    No hay facturas registradas. Las facturas se generan a partir de cotizaciones aprobadas.
                  </td>
                </tr>
              ) : invoices.map(inv => {
                const status = statusConfig[inv.status] || statusConfig.draft;
                const balanceDue = parseFloat(inv.balance_due);
                const hasBalance = balanceDue > 0;
                
                return (
                  <tr key={inv.id} onClick={() => handleView(inv)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: 600, color: 'var(--color-on-surface)' }}>{inv.invoice_number}</td>
                    <td>{getClientName(inv.client_id)}</td>
                    <td>
                      <span className="pill" style={{ background: status.bg, color: status.color }}>
                        {status.label}
                      </span>
                    </td>
                    <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-on-surface-variant)' }}>
                      {new Date(inv.issue_date).toLocaleDateString('es-PA')}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-on-surface)' }}>
                      ${parseFloat(inv.total).toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: hasBalance ? 'var(--color-error)' : 'var(--color-success)' }}>
                      ${balanceDue.toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                        <button className="btn btn-outline" style={{ padding: '6px' }} title="Descargar PDF" onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const blob = await api.downloadInvoicePdf(inv.id);
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `Factura_${inv.invoice_number}.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            a.remove();
                          } catch (err) { alert(err.message); }
                        }}>
                          <Download size={14} />
                        </button>
                        
                        <button className="btn btn-outline" style={{ padding: '6px' }} title="Enviar por Email" onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await api.post(`/invoices/${inv.id}/send-email`);
                            alert('Factura enviada al cliente exitosamente');
                          } catch (err) { alert(err.message); }
                        }}>
                          <Send size={14} />
                        </button>
                        
                        {hasBalance && (
                          <button className="btn btn-primary" style={{ padding: '6px 10px', fontSize: '12px', background: 'var(--color-success)' }} 
                            onClick={(e) => { e.stopPropagation(); setSelectedInvoice(inv); setPaymentData(prev => ({ ...prev, amount: inv.balance_due })); setShowPaymentModal(true); }}>
                            <DollarSign size={14} style={{ marginRight: '4px' }} /> Pagar
                          </button>
                        )}
                        
                        <button className="btn btn-outline" style={{ padding: '6px' }} title="Ver Detalles" onClick={(e) => { e.stopPropagation(); handleView(inv); }} disabled={viewLoading}>
                          {viewLoading && selectedInvoiceDetail?.id === inv.id ? <Loader2 size={14} className="spin" /> : <Eye size={14} />}
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

      {/* Modal Registrar Pago */}
      {showPaymentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowPaymentModal(false)}>
          <div className="glass-card" style={{ width: '100%', maxWidth: 500, padding: 'var(--space-6)', background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)', borderBottom: '1px solid var(--color-outline)', paddingBottom: 'var(--space-4)' }}>
              <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>Registrar Pago</h2>
              <button style={{ background: 'transparent', border: 'none', color: 'var(--color-on-surface-variant)', cursor: 'pointer' }} onClick={() => setShowPaymentModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: 'var(--space-4)', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-outline)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-5)' }}>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-on-surface-variant)', marginBottom: '8px' }}>
                Factura aplicable: <strong style={{ color: 'var(--color-on-surface)' }}>{selectedInvoice?.invoice_number}</strong>
              </p>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-on-surface-variant)' }}>
                Saldo actual pendiente: <strong style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-md)' }}>${parseFloat(selectedInvoice?.balance_due).toFixed(2)}</strong>
              </p>
            </div>

            <form onSubmit={handleRegisterPayment}>
              <div className="form-group">
                <label className="form-label">Monto a Pagar *</label>
                <div style={{ position: 'relative' }}>
                  <DollarSign size={16} color="var(--color-on-surface-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                  <input className="form-input" type="number" step="0.01" required value={paymentData.amount} 
                    onChange={e => setPaymentData({ ...paymentData, amount: e.target.value })} max={selectedInvoice?.balance_due} 
                    style={{ paddingLeft: '36px' }} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Método de Pago *</label>
                <select className="form-select" value={paymentData.payment_method} required onChange={e => setPaymentData({ ...paymentData, payment_method: e.target.value })}>
                  <option value="transfer">Transferencia Bancaria (ACH)</option>
                  <option value="cash">Efectivo</option>
                  <option value="card">Tarjeta de Crédito/Débito</option>
                  <option value="check">Cheque</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Número de Referencia / Comprobante</label>
                <input className="form-input" placeholder="Ej: ACH-992384" value={paymentData.reference_number} 
                  onChange={e => setPaymentData({ ...paymentData, reference_number: e.target.value })} />
              </div>

              <div className="form-group">
                <label className="form-label">Fecha del Pago *</label>
                <input className="form-input" type="date" required value={paymentData.payment_date} 
                  onChange={e => setPaymentData({ ...paymentData, payment_date: e.target.value })} />
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-6)' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowPaymentModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><Loader2 size={16} className="spin" /> Procesando...</> : <><DollarSign size={16} style={{ marginRight: '6px' }} /> Registrar Pago</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ver Detalles */}
      {showViewModal && selectedInvoiceDetail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowViewModal(false)}>
          <div className="glass-card" style={{ width: '100%', maxWidth: 850, maxHeight: '90vh', overflowY: 'auto', padding: 'var(--space-6)', background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)', borderBottom: '1px solid var(--color-outline)', paddingBottom: 'var(--space-4)' }}>
              <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>Detalles Factura: {selectedInvoiceDetail.invoice_number}</h2>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button 
                  className="btn btn-outline" 
                  style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}
                  onClick={async () => {
                    try {
                      const blob = await api.downloadInvoicePdf(selectedInvoiceDetail.id);
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `Factura_${selectedInvoiceDetail.invoice_number}.pdf`;
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
                <p style={{ fontWeight: 600, fontSize: 'var(--font-size-md)' }}>{getClientName(selectedInvoiceDetail.client_id)}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-on-surface-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estado</p>
                <span className="pill" style={{ background: statusConfig[selectedInvoiceDetail.status]?.bg, color: statusConfig[selectedInvoiceDetail.status]?.color }}>
                  {statusConfig[selectedInvoiceDetail.status]?.label}
                </span>
              </div>
            </div>

            <h4 style={{ marginBottom: 'var(--space-3)', fontSize: 'var(--font-size-sm)', color: 'var(--color-primary-light)' }}>Items de la Factura</h4>
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
                {selectedInvoiceDetail.items?.map((item, idx) => (
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

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 'var(--space-6)' }}>
              <div>
                <h4 style={{ marginBottom: 'var(--space-3)', fontSize: 'var(--font-size-sm)', color: 'var(--color-primary-light)' }}>Historial de Pagos</h4>
                {selectedInvoiceDetail.payments?.length === 0 ? (
                  <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-on-surface-muted)' }}>No hay pagos registrados aún.</p>
                ) : (
                  <table className="data-table" style={{ width: '100%', fontSize: '12px' }}>
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Método</th>
                        <th>Referencia</th>
                        <th style={{ textAlign: 'right' }}>Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoiceDetail.payments.map((p, idx) => (
                        <tr key={idx}>
                          <td>{new Date(p.payment_date).toLocaleDateString('es-PA')}</td>
                          <td>{p.payment_method}</td>
                          <td>{p.reference_number || '—'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>${parseFloat(p.amount).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start' }}>
                <div style={{ width: '100%', padding: 'var(--space-4)', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-outline)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                    <span style={{ color: 'var(--color-on-surface-muted)' }}>Subtotal</span>
                    <span>${parseFloat(selectedInvoiceDetail.subtotal).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                    <span style={{ color: 'var(--color-on-surface-muted)' }}>ITBMS (7%)</span>
                    <span>${parseFloat(selectedInvoiceDetail.tax_amount).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-outline)', paddingTop: 'var(--space-2)', fontWeight: 700 }}>
                    <span>Total Factura</span>
                    <span>${parseFloat(selectedInvoiceDetail.total).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-2)', color: 'var(--color-success)' }}>
                    <span>Total Pagado</span>
                    <span>-${parseFloat(selectedInvoiceDetail.amount_paid).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid var(--color-primary)', marginTop: 'var(--space-2)', paddingTop: 'var(--space-2)', fontWeight: 700, color: 'var(--color-error)', fontSize: 'var(--font-size-md)' }}>
                    <span>Saldo Pendiente</span>
                    <span>${parseFloat(selectedInvoiceDetail.balance_due).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
