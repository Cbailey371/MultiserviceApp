import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { Settings as SettingsIcon, Building2, Monitor, Loader2, Save, CheckCircle, ShieldAlert, Wrench, X, Plus, Mail, Send } from 'lucide-react';

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-10)', color: 'var(--color-on-surface-muted)' }}>
      <Loader2 size={32} className="spin" style={{ animation: 'spin 1s linear infinite', color: 'var(--color-primary)' }} />
      <span style={{ marginTop: 'var(--space-3)', fontSize: 'var(--font-size-sm)' }}>Cargando configuración...</span>
    </div>
  );
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState('company');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [testRecipient, setTestRecipient] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  const [formData, setFormData] = useState({
    company_name: '',
    legal_name: '',
    tax_id: '',
    phone: '',
    email: '',
    address: '',
    logo_url: '',
    tax_rate: '7',
    currency: 'USD',
    default_quotation_terms: '',
    inventory_specialties: '',
    // SMTP Settings
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_password: '',
    smtp_from_email: '',
    smtp_from_name: '',
    smtp_encryption: 'STARTTLS',
  });
  
  const [specialties, setSpecialties] = useState([
    { id: 'hvac', name: 'HVAC', color: '#60A5FA' },
    { id: 'electrical', name: 'Electricidad', color: '#FBBF24' },
    { id: 'construction', name: 'Construcción', color: '#FB923C' },
    { id: 'plumbing', name: 'Plomería', color: '#2DD4BF' },
    { id: 'refrigeration', name: 'Refrigeración', color: '#818CF8' },
  ]);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getSettings();
      const settingsMap = res.data || {};
      
      setFormData(prev => ({
        company_name: settingsMap.company_name || prev.company_name,
        legal_name: settingsMap.legal_name || prev.legal_name,
        tax_id: settingsMap.tax_id || prev.tax_id,
        phone: settingsMap.phone || prev.phone,
        email: settingsMap.email || prev.email,
        address: settingsMap.address || prev.address,
        logo_url: settingsMap.logo_url || prev.logo_url,
        tax_rate: settingsMap.tax_rate || prev.tax_rate,
        currency: settingsMap.currency || prev.currency,
        default_quotation_terms: settingsMap.default_quotation_terms || prev.default_quotation_terms,
        inventory_specialties: settingsMap.inventory_specialties || '',
        smtp_host: settingsMap.smtp_host || '',
        smtp_port: settingsMap.smtp_port || '587',
        smtp_user: settingsMap.smtp_user || '',
        smtp_password: settingsMap.smtp_password || '',
        smtp_from_email: settingsMap.smtp_from_email || '',
        smtp_from_name: settingsMap.smtp_from_name || '',
        smtp_encryption: settingsMap.smtp_encryption || 'STARTTLS',
      }));

      if (settingsMap.inventory_specialties) {
        try {
          const parsed = JSON.parse(settingsMap.inventory_specialties);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSpecialties(parsed);
          }
        } catch (e) { console.error('Error parsing specialties', e); }
      }

    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    
    try {
      const payload = {
        ...formData,
        inventory_specialties: JSON.stringify(specialties)
      };
      await api.updateSettings({ settings: payload });
      setMessage('¡Configuración guardada correctamente!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      alert('Error guardando configuración: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSaving(true);
    try {
      const res = await api.uploadLogo(file);
      setFormData(prev => ({ ...prev, logo_url: res.url }));
      setMessage('Logo actualizado correctamente');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      alert('Error subiendo logo: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Tab Styles
  const tabBaseStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-4) var(--space-6)',
    background: 'transparent',
    border: 'none',
    borderBottomWidth: '2px',
    borderBottomStyle: 'solid',
    borderBottomColor: 'transparent',
    color: 'var(--color-on-surface-variant)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  };

  const tabActiveStyle = {
    ...tabBaseStyle,
    color: 'var(--color-primary-light)',
    borderBottomColor: 'var(--color-primary-light)',
    background: 'rgba(59, 130, 246, 0.05)'
  };

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <style>{`
        @keyframes fadeIn { from { opacity:0; transform: scale(0.98); } to { opacity:1; transform: scale(1); } }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>

      <div className="page-header" style={{ marginBottom: 'var(--space-6)' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-on-surface)' }}>
            <SettingsIcon size={24} color="var(--color-primary-light)" /> 
            Configuración del Sistema
          </h2>
          <p style={{ color: 'var(--color-on-surface-muted)', fontSize: 'var(--font-size-sm)', marginTop: '4px' }}>
            Administra los datos globales y preferencias de la plataforma
          </p>
        </div>
      </div>

      <div className="glass-card" style={{ overflow: 'hidden', border: '1px solid var(--color-outline)' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-outline)', background: 'rgba(0,0,0,0.2)' }}>
          <button 
            style={activeTab === 'company' ? tabActiveStyle : tabBaseStyle}
            onClick={() => setActiveTab('company')}
          >
            <Building2 size={16} />
            Perfil de la Empresa
          </button>
          <button 
            style={activeTab === 'system' ? tabActiveStyle : tabBaseStyle}
            onClick={() => setActiveTab('system')}
          >
            <Monitor size={16} />
            Sistema y Finanzas
          </button>
          <button 
            style={activeTab === 'smtp' ? tabActiveStyle : tabBaseStyle}
            onClick={() => setActiveTab('smtp')}
          >
            <Mail size={16} />
            Configuración SMTP
          </button>
        </div>

        {loading ? <LoadingSpinner /> : (
          <form onSubmit={handleSave} style={{ padding: 'var(--space-8)' }}>
            
            {activeTab === 'company' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-6)' }}>
                <div className="form-group">
                  <label className="form-label">Nombre Comercial</label>
                  <input type="text" className="form-input" name="company_name" value={formData.company_name} onChange={handleChange} placeholder="Ej. MultiService Pro" />
                </div>
                <div className="form-group">
                  <label className="form-label">Razón Social (Legal)</label>
                  <input type="text" className="form-input" name="legal_name" value={formData.legal_name} onChange={handleChange} placeholder="Ej. MultiService Pro S.A." />
                </div>
                <div className="form-group">
                  <label className="form-label">RUC / NIT</label>
                  <input type="text" className="form-input" name="tax_id" value={formData.tax_id} onChange={handleChange} placeholder="1234567-89-10" />
                </div>
                <div className="form-group">
                  <label className="form-label">Teléfono Principal</label>
                  <input type="tel" className="form-input" name="phone" value={formData.phone} onChange={handleChange} placeholder="+507 8888-8888" />
                </div>
                <div className="form-group">
                  <label className="form-label">Correo Electrónico Principal</label>
                  <input type="email" className="form-input" name="email" value={formData.email} onChange={handleChange} placeholder="contacto@empresa.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">Logo de la Empresa</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginTop: 'var(--space-1)' }}>
                    {formData.logo_url && (
                      <div style={{ position: 'relative', background: 'white', padding: '4px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-outline)' }}>
                        <img 
                          src={formData.logo_url} 
                          alt="Logo Preview" 
                          style={{ height: '48px', maxWidth: '120px', objectFit: 'contain' }} 
                        />
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <input 
                        type="file" 
                        accept="image/*" 
                        style={{ display: 'none' }} 
                        id="logo-upload" 
                        onChange={handleLogoUpload}
                      />
                      <label htmlFor="logo-upload" className="btn btn-outline" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 12px', fontSize: '13px' }}>
                        <Plus size={14} /> {formData.logo_url ? 'Cambiar Logo' : 'Subir Logo'}
                      </label>
                      <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-on-surface-muted)', marginTop: '4px' }}>
                        PNG o JPG (Recomendado 300x100px)
                      </p>
                    </div>
                  </div>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Dirección Física</label>
                  <textarea className="form-input" name="address" value={formData.address} onChange={handleChange} rows="3" placeholder="Av. Principal, Edificio Central..."></textarea>
                </div>
              </div>
            )}

            {activeTab === 'system' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-6)' }}>
                <div className="form-group">
                  <label className="form-label">Impuesto por Defecto (ITBMS %)</label>
                  <input type="number" step="0.01" className="form-input" name="tax_rate" value={formData.tax_rate} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Moneda Principal</label>
                  <select className="form-select" name="currency" value={formData.currency} onChange={handleChange}>
                    <option value="USD">Dólar Estadounidense (USD)</option>
                    <option value="EUR">Euro (EUR)</option>
                    <option value="PAB">Balboa Panameño (PAB)</option>
                  </select>
                </div>
                
                <div style={{ gridColumn: '1 / -1', background: 'rgba(59,130,246,0.05)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', gap: 'var(--space-3)' }}>
                  <ShieldAlert size={20} color="#60A5FA" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: '#60A5FA', marginBottom: '4px' }}>Facturación Electrónica (DGI)</h4>
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-on-surface-variant)', lineHeight: 1.5 }}>
                      Los parámetros de facturación electrónica se encuentran pre-configurados para operar con el PAC (Digifact).
                      Cualquier modificación a las credenciales PAC debe realizarse a través del equipo de soporte para evitar interrupciones en la facturación.
                    </p>
                  </div>
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Términos y Condiciones (Por defecto para Cotizaciones)</label>
                  <textarea className="form-input" name="default_quotation_terms" value={formData.default_quotation_terms} onChange={handleChange} rows="5" placeholder="Términos comerciales estándar que aparecerán al final de las cotizaciones..."></textarea>
                </div>

                <div style={{ gridColumn: '1 / -1', marginTop: 'var(--space-4)' }}>
                  <h4 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, color: 'var(--color-on-surface)', marginBottom: 'var(--space-4)', paddingBottom: 'var(--space-2)', borderBottom: '1px solid var(--color-outline)' }}>
                    Gestión de Especialidades de Inventario
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {specialties.map((spec, index) => (
                      <div key={index} style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                        <input type="text" className="form-input" style={{ margin: 0 }} 
                          value={spec.name} 
                          onChange={e => {
                            const next = [...specialties];
                            next[index].name = e.target.value;
                            setSpecialties(next);
                          }} 
                          placeholder="Nombre de la especialidad" />
                        <input type="color" style={{ width: 40, height: 40, padding: 2, borderRadius: 4, background: 'transparent', border: '1px solid var(--color-outline)', cursor: 'pointer' }}
                          value={spec.color}
                          onChange={e => {
                            const next = [...specialties];
                            next[index].color = e.target.value;
                            setSpecialties(next);
                          }} />
                        <button type="button" className="btn btn-outline" style={{ padding: '8px', color: 'var(--color-error)' }} 
                          onClick={() => setSpecialties(specialties.filter((_, i) => i !== index))}>
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                    <button type="button" className="btn btn-outline" style={{ width: 'fit-content', marginTop: 'var(--space-2)' }}
                      onClick={() => setSpecialties([...specialties, { id: Date.now().toString(), name: '', color: '#9CA3AF' }])}>
                      <Plus size={16} style={{ marginRight: 8 }} /> Agregar Especialidad
                    </button>
                  </div>
                </div>

              </div>
            )}

            {activeTab === 'smtp' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-6)' }}>
                <div style={{ gridColumn: '1 / -1', background: 'rgba(59,130,246,0.05)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
                  <Mail size={20} color="#60A5FA" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: '#60A5FA', marginBottom: '4px' }}>Configuración de Correo Saliente</h4>
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-on-surface-variant)', lineHeight: 1.5 }}>
                      Configura los parámetros SMTP para que el sistema pueda enviar cotizaciones y facturas directamente a tus clientes. 
                      Recomendamos usar servicios profesionales como SendGrid, Mailgun o Amazon SES.
                    </p>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Servidor SMTP (Host)</label>
                  <input type="text" className="form-input" name="smtp_host" value={formData.smtp_host} onChange={handleChange} placeholder="smtp.ejemplo.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">Puerto SMTP</label>
                  <input type="text" className="form-input" name="smtp_port" value={formData.smtp_port} onChange={handleChange} placeholder="587" />
                </div>
                <div className="form-group">
                  <label className="form-label">Usuario SMTP</label>
                  <input type="text" className="form-input" name="smtp_user" value={formData.smtp_user} onChange={handleChange} placeholder="usuario@ejemplo.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">Contraseña SMTP</label>
                  <input type="password" className="form-input" name="smtp_password" value={formData.smtp_password} onChange={handleChange} placeholder="••••••••••••" />
                </div>
                <div className="form-group">
                  <label className="form-label">Correo del Remitente</label>
                  <input type="email" className="form-input" name="smtp_from_email" value={formData.smtp_from_email} onChange={handleChange} placeholder="no-reply@tuempresa.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">Nombre del Remitente</label>
                  <input type="text" className="form-input" name="smtp_from_name" value={formData.smtp_from_name} onChange={handleChange} placeholder="MultiService Pro" />
                </div>
                <div className="form-group">
                  <label className="form-label">Tipo de Cifrado</label>
                  <select className="form-select" name="smtp_encryption" value={formData.smtp_encryption} onChange={handleChange}>
                    <option value="None">Ninguno</option>
                    <option value="SSL/TLS">SSL / TLS (Puerto 465)</option>
                    <option value="STARTTLS">STARTTLS (Puerto 587)</option>
                  </select>
                </div>

                <div style={{ gridColumn: '1 / -1', marginTop: 'var(--space-4)', paddingTop: 'var(--space-6)', borderTop: '1px dashed var(--color-outline)' }}>
                  <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-on-surface)', marginBottom: 'var(--space-2)' }}>Probar Configuración</h4>
                  <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-on-surface-variant)', marginBottom: 'var(--space-4)' }}>
                    Envía un correo de prueba para verificar que los datos ingresados son correctos antes de guardar.
                  </p>
                  <div style={{ display: 'flex', gap: 'var(--space-3)', maxWidth: '500px' }}>
                    <input 
                      type="email" 
                      className="form-input" 
                      style={{ margin: 0 }} 
                      placeholder="Correo de destino" 
                      value={testRecipient}
                      onChange={e => setTestRecipient(e.target.value)}
                    />
                    <button 
                      type="button" 
                      className="btn btn-outline" 
                      style={{ whiteSpace: 'nowrap' }}
                      disabled={testingSmtp || !testRecipient || !formData.smtp_host}
                      onClick={async () => {
                        setTestingSmtp(true);
                        try {
                          const res = await api.testEmail(formData, testRecipient);
                          alert(res.message);
                        } catch (err) {
                          alert(`Error de prueba: ${err.message}`);
                        } finally {
                          setTestingSmtp(false);
                        }
                      }}
                    >
                      {testingSmtp ? <Loader2 size={16} className="spin" /> : <Send size={16} style={{ marginRight: 8 }} />}
                      Enviar Prueba
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div style={{ marginTop: 'var(--space-8)', paddingTop: 'var(--space-6)', borderTop: '1px solid var(--color-outline)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 'var(--space-4)' }}>
              {message && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: '#34D399', fontWeight: 500, fontSize: 'var(--font-size-sm)', animation: 'fadeIn 0.3s' }}>
                  <CheckCircle size={16} /> {message}
                </span>
              )}
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? (
                  <><Loader2 size={16} className="spin" style={{ marginRight: '8px' }} /> Guardando...</>
                ) : (
                  <><Save size={16} style={{ marginRight: '8px' }} /> Guardar Configuración</>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
