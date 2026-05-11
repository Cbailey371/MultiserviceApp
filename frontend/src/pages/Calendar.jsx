import { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { 
  CalendarDays, ChevronLeft, ChevronRight, X, Clock, MapPin, Loader2, ArrowRight,
  Calendar as CalendarIcon, LayoutGrid, List
} from 'lucide-react';

const specialtyColors = {
  hvac: { color: '#60A5FA', label: 'HVAC' },
  electrical: { color: '#FBBF24', label: 'Electricidad' },
  plumbing: { color: '#34D399', label: 'Plomería' },
  construction: { color: '#FB923C', label: 'Construcción' },
  other: { color: '#9CA3AF', label: 'Otros' },
};

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-10)', color: 'var(--color-on-surface-muted)', flex: 1 }}>
      <Loader2 size={32} className="spin" style={{ animation: 'spin 1s linear infinite', color: 'var(--color-primary)' }} />
      <span style={{ marginTop: 'var(--space-3)' }}>Cargando eventos...</span>
    </div>
  );
}

export default function Calendar() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month'); // 'month', 'week', 'day'
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await api.listEvents();
        setEvents(res.data || []);
      } catch (err) {
        console.error('Error loading events:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  // Calendar logic
  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); 
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ day: prevMonthLastDay - i, month: month - 1, year, current: false });
    }
    for (let i = 1; i <= totalDays; i++) {
      days.push({ day: i, month, year, current: true });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, month: month + 1, year, current: false });
    }
    return days;
  }, [currentDate]);

  const weekDays = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push({ day: d.getDate(), month: d.getMonth(), year: d.getFullYear(), date: d });
    }
    return days;
  }, [currentDate]);

  const monthName = currentDate.toLocaleString('es-PA', { month: 'long', year: 'numeric' });

  const handlePrev = () => {
    const d = new Date(currentDate);
    if (view === 'month') d.setMonth(d.getMonth() - 1);
    else if (view === 'week') d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (view === 'month') d.setMonth(d.getMonth() + 1);
    else if (view === 'week') d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  const handleToday = () => setCurrentDate(new Date());

  const getEventsForDay = (day, month, year) => {
    const targetDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => {
      if (!e.start_date) return false;
      const eDate = e.start_date.split('T')[0];
      return eDate === targetDate;
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', animation: 'fadeIn 0.5s ease-out' }}>
      <style>{`
        @keyframes fadeIn { from { opacity:0; transform: scale(0.98); } to { opacity:1; transform: scale(1); } }
        @keyframes slideIn { from { opacity:0; transform: translateX(24px); } to { opacity:1; transform: translateX(0); } }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 1px;
          background: var(--color-outline);
          border: 1px solid var(--color-outline);
          border-radius: var(--radius-lg);
          overflow: hidden;
          flex: 1;
        }
        .calendar-day {
          background: var(--color-surface);
          min-height: 100px;
          padding: 8px;
          transition: background 0.2s;
        }
        .calendar-day.not-current {
          background: rgba(255, 255, 255, 0.02);
          opacity: 0.5;
        }
        .calendar-day:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        .day-number {
          font-size: 14px;
          font-weight: 600;
          color: var(--color-on-surface-muted);
          margin-bottom: 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 50%;
        }
        .calendar-day.is-today .day-number {
          background: var(--color-primary);
          color: white;
        }
        .event-item {
          font-size: 11px;
          padding: 4px 8px;
          border-radius: 4px;
          margin-bottom: 4px;
          cursor: pointer;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-weight: 600;
          transition: transform 0.1s;
        }
        .event-item:hover {
          transform: scale(1.02);
          filter: brightness(1.2);
        }
        .header-day {
          text-align: center;
          padding: 12px;
          font-size: 12px;
          font-weight: 600;
          color: var(--color-on-surface-variant);
          text-transform: uppercase;
          background: rgba(255, 255, 255, 0.02);
        }
        .view-btn {
            padding: 6px 12px;
            font-size: 12px;
            font-weight: 600;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
            background: transparent;
            border: 1px solid transparent;
            color: var(--color-on-surface-muted);
        }
        .view-btn.active {
            background: rgba(59, 130, 246, 0.1);
            color: var(--color-primary-light);
            border-color: rgba(59, 130, 246, 0.2);
        }
      `}</style>

      {/* Header */}
      <div className="page-header" style={{ marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-on-surface)', textTransform: 'capitalize' }}>
            <CalendarDays size={24} color="var(--color-primary-light)" />
            {view === 'day' ? currentDate.toLocaleDateString('es-PA', { dateStyle: 'full' }) : monthName}
          </h1>
          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            {Object.entries(specialtyColors).map(([key, cfg]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px', color: 'var(--color-on-surface-variant)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color }} />
                {cfg.label}
              </div>
            ))}
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
          {/* View Selector */}
          <div className="glass-card" style={{ display: 'flex', padding: 4, gap: 2 }}>
            <button className={`view-btn ${view === 'day' ? 'active' : ''}`} onClick={() => setView('day')}>Día</button>
            <button className={`view-btn ${view === 'week' ? 'active' : ''}`} onClick={() => setView('week')}>Semana</button>
            <button className={`view-btn ${view === 'month' ? 'active' : ''}`} onClick={() => setView('month')}>Mes</button>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <button className="btn btn-outline" onClick={handleToday}>Hoy</button>
            <div className="glass-card" style={{ display: 'flex', padding: 4, gap: 4, alignItems: 'center' }}>
                <button className="btn btn-ghost" style={{ padding: '6px' }} onClick={handlePrev}>
                <ChevronLeft size={20} />
                </button>
                <button className="btn btn-ghost" style={{ padding: '6px' }} onClick={handleNext}>
                <ChevronRight size={20} />
                </button>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar View */}
      {loading ? <LoadingSpinner /> : (
        <div style={{ display: 'flex', gap: 'var(--space-5)', flex: 1 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            
            {view === 'month' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                  {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
                    <div key={d} className="header-day">{d}</div>
                  ))}
                </div>
                <div className="calendar-grid">
                  {daysInMonth.map((d, i) => {
                    const dayEvents = getEventsForDay(d.day, d.month, d.year);
                    const isToday = d.day === new Date().getDate() && d.month === new Date().getMonth() && d.year === new Date().getFullYear();
                    return (
                      <div key={i} className={`calendar-day ${!d.current ? 'not-current' : ''} ${isToday ? 'is-today' : ''}`}>
                        <div className="day-number">{d.day}</div>
                        {dayEvents.map(e => (
                          <EventItem key={e.id} event={e} onClick={() => setSelectedEvent(e)} />
                        ))}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {view === 'week' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 1, gap: 1, background: 'var(--color-outline)', border: '1px solid var(--color-outline)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                  {weekDays.map((d, i) => {
                    const dayEvents = getEventsForDay(d.day, d.month, d.year);
                    const isToday = d.day === new Date().getDate() && d.month === new Date().getMonth() && d.year === new Date().getFullYear();
                    const dayName = d.date.toLocaleString('es-PA', { weekday: 'short' });
                    return (
                      <div key={i} className={`calendar-day ${isToday ? 'is-today' : ''}`} style={{ height: '100%' }}>
                        <div style={{ textAlign: 'center', marginBottom: 12 }}>
                            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-on-surface-muted)', fontWeight: 600 }}>{dayName}</div>
                            <div className="day-number" style={{ marginTop: 4 }}>{d.day}</div>
                        </div>
                        {dayEvents.map(e => (
                          <EventItem key={e.id} event={e} onClick={() => setSelectedEvent(e)} />
                        ))}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {view === 'day' && (
              <div className="glass-card" style={{ flex: 1, padding: 'var(--space-6)', overflowY: 'auto' }}>
                <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--space-6)', color: 'var(--color-on-surface)' }}>Eventos del día</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {getEventsForDay(currentDate.getDate(), currentDate.getMonth(), currentDate.getFullYear()).length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 'var(--space-10)', color: 'var(--color-on-surface-muted)' }}>No hay eventos programados para hoy.</div>
                  ) : getEventsForDay(currentDate.getDate(), currentDate.getMonth(), currentDate.getFullYear()).map(e => (
                    <div key={e.id} className="glass-card" style={{ padding: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', border: '1px solid var(--color-outline)' }} onClick={() => setSelectedEvent(e)}>
                        <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
                            <div style={{ width: 4, height: 40, borderRadius: 2, background: specialtyColors[e.specialty?.toLowerCase()]?.color || e.color || '#9CA3AF' }} />
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '15px' }}>{e.title}</div>
                                <div style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)', marginTop: 2 }}>{e.category} • {e.specialty}</div>
                            </div>
                        </div>
                        <ChevronRight size={18} color="var(--color-on-surface-muted)" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Detail */}
          {selectedEvent && (
            <div className="glass-card" style={{ width: 340, padding: 'var(--space-6)', animation: 'slideIn 0.2s ease-out', border: '1px solid var(--color-outline)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-6)' }}>
                <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, color: 'var(--color-on-surface)' }}>Detalle del Evento</h3>
                <button style={{ background: 'transparent', border: 'none', color: 'var(--color-on-surface-variant)', cursor: 'pointer' }} onClick={() => setSelectedEvent(null)}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div>
                  <span className="pill" style={{ 
                    background: `${specialtyColors[selectedEvent.specialty?.toLowerCase()]?.color || '#3B82F6'}20`, 
                    color: specialtyColors[selectedEvent.specialty?.toLowerCase()]?.color || '#60A5FA', 
                    textTransform: 'uppercase', fontSize: '10px'
                  }}>
                    {selectedEvent.type.replace('_', ' ')}
                  </span>
                  <h4 style={{ fontSize: '18px', fontWeight: 600, marginTop: '12px', color: 'var(--color-on-surface)' }}>{selectedEvent.title}</h4>
                </div>

                <div style={{ padding: 'var(--space-4)', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-outline)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  <InfoItem icon={<Clock size={14} />} label="Fecha" value={new Date(selectedEvent.start_date).toLocaleDateString('es-PA', { dateStyle: 'full' })} />
                  <InfoItem icon={<MapPin size={14} />} label="Especialidad" value={specialtyColors[selectedEvent.specialty?.toLowerCase()]?.label || selectedEvent.specialty} />
                  <InfoItem label="Categoría" value={selectedEvent.category} />
                  <InfoItem label="Estado" value={selectedEvent.status} />
                </div>
                
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: '12px', color: 'var(--color-on-surface-muted)', marginBottom: 8 }}>Descripción del Trabajo</div>
                  <div style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)', lineHeight: 1.5, background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-outline)' }}>
                    {selectedEvent.description || 'Sin descripción adicional documentada.'}
                  </div>
                </div>

                <button className="btn btn-primary" style={{ marginTop: 'var(--space-4)', width: '100%', justifyContent: 'center' }}>
                  Ver OT Completa <ArrowRight size={16} style={{ marginLeft: 4 }} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EventItem({ event, onClick }) {
    const specColor = specialtyColors[event.specialty?.toLowerCase()]?.color || event.color || '#9CA3AF';
    return (
        <div className="event-item" 
            style={{ background: `${specColor}20`, color: specColor, borderLeft: `3px solid ${specColor}` }}
            onClick={onClick}>
            {event.title}
        </div>
    );
}

function InfoItem({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
      {icon && <div style={{ color: 'var(--color-on-surface-muted)', marginTop: '2px' }}>{icon}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: '11px', color: 'var(--color-on-surface-muted)' }}>{label}</span>
        <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-on-surface)', textTransform: 'capitalize' }}>{value}</span>
      </div>
    </div>
  );
}
