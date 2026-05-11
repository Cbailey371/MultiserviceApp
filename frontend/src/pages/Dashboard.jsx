import { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { Banknote, FileText, Calendar as CalendarIcon, Users } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card" style={{ padding: 'var(--space-3)', background: 'var(--color-surface)', border: '1px solid var(--color-outline)', fontSize: 'var(--font-size-xs)' }}>
        <p style={{ fontWeight: 600, marginBottom: 'var(--space-1)', color: 'var(--color-on-surface)' }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color, fontWeight: 500 }}>{p.name}: ${p.value.toLocaleString()}</p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [kpis, setKpis] = useState({
    monthly_revenue: 0,
    total_receivables: 0,
    pending_work_orders: 0,
    active_work_orders: 0,
    growth: '+0%',
  });
  const [specialtyDistribution, setSpecialtyDistribution] = useState([]);
  const [revenueHistory, setRevenueHistory] = useState([]);
  const [upcomingVisits, setUpcomingVisits] = useState([]);
  const [overdueInvoices, setOverdueInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [kpiRes, settingsRes] = await Promise.all([
          api.getKpis(),
          api.getSettings()
        ]);

        // Parse specialties from settings for mapping
        const specialtiesSetting = settingsRes.data?.find(s => s.key === 'specialties');
        let specialtyMap = {};
        if (specialtiesSetting && specialtiesSetting.value) {
          try {
            const parsed = JSON.parse(specialtiesSetting.value);
            parsed.forEach(s => { specialtyMap[s.id] = s.name; });
          } catch (e) { console.error('Error parsing specialties:', e); }
        }

        if (kpiRes) {
          setKpis({
            monthly_revenue: kpiRes.monthly_revenue || 0,
            total_receivables: kpiRes.total_receivables || 0,
            pending_work_orders: kpiRes.pending_work_orders || 0,
            active_work_orders: kpiRes.active_work_orders || 0,
            growth: kpiRes.growth || '+0%',
          });

          setRevenueHistory(kpiRes.revenue_history || []);
          setUpcomingVisits(kpiRes.upcoming_visits || []);
          setOverdueInvoices(kpiRes.overdue_invoices || []);

          const colors = ['#3b82f6', '#f59e0b', '#10b981', '#6366f1', '#ec4899', '#cbd5e1'];
          const dist = (kpiRes.specialty_distribution || []).map((item, index) => ({
            name: specialtyMap[item.name] || (item.name.charAt(0).toUpperCase() + item.name.slice(1)),
            value: item.value,
            color: colors[index % colors.length]
          }));
          
          setSpecialtyDistribution(dist.length > 0 ? dist : [
            { name: 'Sin datos', value: 100, color: '#cbd5e1' }
          ]);
        }
      } catch (err) {
        console.error('Error loading Dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const getStatusLabel = (status) => {
    const config = {
      pending: { label: 'Pendiente', class: 'scheduled' },
      en_route: { label: 'En Camino', class: 'in-transit' },
      in_progress: { label: 'En Proceso', class: 'in-progress' },
      completed: { label: 'Completado', class: 'completed' },
    };
    return config[status] || { label: status, class: 'scheduled' };
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--color-on-surface-muted)' }}>
        Cargando datos del sistema...
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div className="page-header" style={{ marginBottom: 'var(--space-8)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 500 }}>Resumen General</h2>
          <p style={{ color: 'var(--color-on-surface-muted)', fontSize: 'var(--font-size-sm)' }}>
            Panel de control de operaciones en tiempo real
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="glass-card kpi-card" style={{ animation: 'slideUp 0.4s ease-out 0.1s both', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
            <span className="kpi-label">INGRESOS DEL MES</span>
            <Banknote size={20} color="var(--color-outline)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)' }}>
            <span className="kpi-value">${kpis.monthly_revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            <span className="pill pill-success">{kpis.growth}</span>
          </div>
        </div>
        
        <div className="glass-card kpi-card" style={{ animation: 'slideUp 0.4s ease-out 0.2s both', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
            <span className="kpi-label">ORDENES PENDIENTES</span>
            <FileText size={20} color="var(--color-outline)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)' }}>
            <span className="kpi-value">{kpis.pending_work_orders}</span>
            <span className="pill pill-warning">Acción Requerida</span>
          </div>
        </div>

        <div className="glass-card kpi-card" style={{ animation: 'slideUp 0.4s ease-out 0.3s both', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
            <span className="kpi-label">VISITAS AGENDADAS</span>
            <CalendarIcon size={20} color="var(--color-outline)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)' }}>
            <span className="kpi-value">{upcomingVisits.length}</span>
            <span className="pill pill-info" style={{ background: 'transparent', color: 'var(--color-primary-light)' }}>Próximos días</span>
          </div>
        </div>

        <div className="glass-card kpi-card" style={{ animation: 'slideUp 0.4s ease-out 0.4s both', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
            <span className="kpi-label">TÉCNICOS ACTIVOS</span>
            <Users size={20} color="var(--color-outline)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)' }}>
            <span className="kpi-value">{kpis.active_work_orders}/4</span>
            <span className="pill pill-success" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: 4, height: 4, background: '#34d399', borderRadius: '50%' }}></span>
              En Campo
            </span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
        {/* Sales vs Collections Chart */}
        <div className="glass-card" style={{ padding: 'var(--space-6)', animation: 'fadeIn 0.6s ease-out 0.5s both', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-8)' }}>
            <div>
              <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, color: 'var(--color-on-surface)' }}>Ventas vs Cobros</h3>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-on-surface-muted)' }}>Comparativa semestral de rendimiento</p>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: 'var(--font-size-xs)', color: 'var(--color-on-surface)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: 12, height: 12, background: 'var(--color-primary)', borderRadius: '2px' }}></span> Ventas
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: 12, height: 12, background: 'var(--color-outline)', borderRadius: '2px' }}></span> Cobros
              </span>
            </div>
          </div>
          <div style={{ width: '100%', flex: 1, minHeight: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueHistory} barGap={4} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="month" stroke="var(--color-outline)" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                <RechartsTooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.02)'}} />
                <Bar dataKey="ventas" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={30} />
                <Bar dataKey="cobros" fill="var(--color-outline)" radius={[4, 4, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Specialty Breakdown */}
        <div className="glass-card" style={{ padding: 'var(--space-6)', animation: 'fadeIn 0.6s ease-out 0.6s both', display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, color: 'var(--color-on-surface)' }}>Servicios por Especialidad</h3>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-on-surface-muted)' }}>Distribución operativa actual</p>
          </div>
          <div style={{ position: 'relative', height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={specialtyDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {specialtyDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ position: 'absolute', textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, lineHeight: 1 }}>{specialtyDistribution.reduce((a, b) => a + (b.value || 0), 0) > 0 ? '100%' : '0%'}</div>
              <div style={{ fontSize: '9px', fontWeight: 600, color: 'var(--color-on-surface-muted)', letterSpacing: '0.1em', marginTop: '4px' }}>ACTIVIDAD</div>
            </div>
          </div>
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {specialtyDistribution.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--font-size-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }}></span>
                  <span style={{ color: 'var(--color-on-surface)' }}>{item.name}</span>
                </div>
                <span style={{ fontWeight: 600 }}>{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-6)' }}>
        {/* Upcoming Visits */}
        <div className="glass-card" style={{ padding: 'var(--space-6)', animation: 'fadeIn 0.6s ease-out 0.7s both' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>Próximas Visitas</h3>
            <a href="/work-orders" style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-primary-light)' }}>Ver Agenda Completa</a>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Servicio</th>
                <th>Fecha</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {upcomingVisits.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-on-surface-muted)' }}>No hay visitas programadas próximamente.</td></tr>
              ) : upcomingVisits.map((v, i) => {
                const status = getStatusLabel(v.status);
                return (
                  <tr key={v.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--color-on-surface)' }}>{v.client}</div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>{v.service}</span>
                    </td>
                    <td>{new Date(v.date).toLocaleDateString('es-PA')}</td>
                    <td><span className={`status-chip ${status.class}`}>{status.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Overdue Invoices */}
        <div className="glass-card" style={{ padding: 'var(--space-6)', animation: 'fadeIn 0.6s ease-out 0.8s both', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--space-6)' }}>
            Facturas Vencidas
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', flex: 1 }}>
            {overdueInvoices.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-on-surface-muted)', fontSize: 'var(--font-size-sm)' }}>No hay facturas vencidas.</div>
            ) : overdueInvoices.map((inv, i) => (
              <div key={inv.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: 'var(--space-4)', borderRadius: 'var(--radius-md)',
                background: 'var(--color-background)',
                border: '1px solid var(--color-outline)',
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--color-on-surface)' }}>{inv.client}</div>
                  <div style={{ fontSize: '10px', color: '#f87171', marginTop: '2px' }}>{inv.days_late} días de retraso ({inv.invoice_number})</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: 'var(--color-on-surface)', fontSize: 'var(--font-size-sm)' }}>${inv.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                  <div style={{ fontSize: '10px', color: 'var(--color-primary-light)', fontWeight: 600, marginTop: '2px', cursor: 'pointer' }} onClick={() => window.location.href='/invoices'}>Ver Factura</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 'var(--space-6)', paddingTop: 'var(--space-6)', textAlign: 'center', background: 'var(--color-background)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)' }}>
            <span style={{ display: 'block', fontSize: '11px', color: 'var(--color-on-surface-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Monto total adeudado</span>
            <span style={{ display: 'block', fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: '#f87171', marginTop: 'var(--space-1)' }}>${kpis.total_receivables.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      ` }} />
    </div>
  );
}
