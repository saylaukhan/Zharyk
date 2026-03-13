import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles, ShieldCheck, Bell, Users, Calendar, FileText, LogOut,
  Search, AlertTriangle, Activity, CheckCircle, X, Plus
} from 'lucide-react'
import { Radar } from 'react-chartjs-2'
import {
  Chart as ChartJS, RadialLinearScale, PointElement, LineElement,
  Filler, Tooltip, Legend
} from 'chart.js'
import ThemeToggle from '../components/ThemeToggle'
import { useTheme } from '../context/ThemeContext'

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

const ALERTS = [
  { id: '12', anon: 'Аноним #12', class: '10А', type: 'Высокий стресс', level: 'Критический', time: 'Только что', levelClass: 'text-red-600 bg-red-50 border-red-100', dot: 'bg-red-500', avatarBg: 'bg-red-100', avatarColor: 'text-red-500' },
  { id: '5', anon: 'Аноним #5', class: '11А', type: 'Признаки выгорания', level: 'Критический', time: '15 мин назад', levelClass: 'text-red-600 bg-red-50 border-red-100', dot: 'bg-red-500', avatarBg: 'bg-red-100', avatarColor: 'text-red-500' },
  { id: '19', anon: 'Аноним #19', class: '10Б', type: 'Тревожность', level: 'Критический', time: '1 ч назад', levelClass: 'text-red-600 bg-red-50 border-red-100', dot: 'bg-red-500', avatarBg: 'bg-red-100', avatarColor: 'text-red-500' },
  { id: '7', anon: 'Аноним #7', class: '10А', type: 'Снижение мотивации', level: 'Средний', time: '2 ч назад', levelClass: 'text-amber-600 bg-amber-50 border-amber-100', dot: 'bg-amber-500', avatarBg: 'bg-amber-100', avatarColor: 'text-amber-600' },
  { id: '21', anon: 'Аноним #21', class: '11А', type: 'Эмоциональный спад', level: 'Средний', time: '3 ч назад', levelClass: 'text-amber-600 bg-amber-50 border-amber-100', dot: 'bg-amber-500', avatarBg: 'bg-amber-100', avatarColor: 'text-amber-600' },
]

const USERS = [
  { id: '3', gradient: 'from-zharyq-teal to-blue-400', stress: 35, motivation: 78, status: 'Норма', statusStyle: { background: 'var(--color-teal-light)', color: 'var(--color-teal)', border: '1px solid rgba(20,184,166,0.2)' }, sessions: 12, courses: 4, lastSeen: 'сегодня' },
  { id: '8', gradient: 'from-orange-300 to-red-400', stress: 72, motivation: 42, status: 'Риск', statusClass: 'bg-amber-50 text-amber-600 border border-amber-100', sessions: 5, courses: 1, lastSeen: 'вчера' },
  { id: '14', gradient: 'from-violet-300 to-blue-400', stress: 28, motivation: 85, status: 'Норма', statusStyle: { background: 'var(--color-teal-light)', color: 'var(--color-teal)', border: '1px solid rgba(20,184,166,0.2)' }, sessions: 8, courses: 3, lastSeen: '3 дн. назад' },
  { id: '2', gradient: 'from-green-300 to-teal-400', stress: 88, motivation: 25, status: 'Алерт', statusClass: 'bg-red-50 text-red-600 border border-red-100', sessions: 2, courses: 0, lastSeen: 'сегодня' },
  { id: '17', gradient: 'from-blue-300 to-indigo-400', stress: 45, motivation: 65, status: 'Норма', statusStyle: { background: 'var(--color-teal-light)', color: 'var(--color-teal)', border: '1px solid rgba(20,184,166,0.2)' }, sessions: 7, courses: 2, lastSeen: '2 дн. назад' },
]

const SESSIONS = [
  { month: 'МАР', day: 14, title: 'Сессия с Аноним #12', sub: '14:00 — 14:50 · Высокий стресс', badge: 'Срочная', badgeClass: 'bg-red-50 text-red-600 border border-red-100', bg: 'bg-orange-50', textColor: 'text-zharyq-orange' },
  { month: 'МАР', day: 15, title: 'Групповая работа 10А', sub: '11:00 — 12:00 · Техники релаксации', badge: 'Групповая', badgeStyle: { background: 'var(--color-teal-light)', color: 'var(--color-teal)', border: '1px solid rgba(20,184,166,0.2)' }, bg: 'bg-zharyq-teal-light', textColor: 'text-zharyq-teal' },
  { month: 'МАР', day: 17, title: 'Сессия с Аноним #5', sub: '15:30 — 16:20 · Выгорание', badge: 'Плановая', badgeClass: 'bg-amber-50 text-amber-600 border border-amber-100', bg: 'bg-blue-50', textColor: 'text-blue-500' },
]

const NOTES = [
  { id: '12', avatarBg: 'bg-red-100', avatarColor: 'text-red-500', date: '13 мар 2025', text: 'Наблюдается значительное повышение уровня стресса, связанное с приближением ЕНТ. Рекомендованы техники дыхания 4-7-8 и ограничение времени подготовки до 4 часов в день.', tags: [{ label: 'Стресс', cls: 'text-zharyq-orange bg-orange-50 border border-orange-100' }, { label: 'ЕНТ', cls: 'text-zharyq-gray bg-gray-100' }] },
  { id: '5', avatarBg: 'bg-amber-100', avatarColor: 'text-amber-600', date: '10 мар 2025', text: 'Признаки профессионального выгорания. Потеря интереса к учёбе, сонливость, раздражительность. Назначен курс «Профилактика выгорания». Следующая встреча через 5 дней.', tags: [{ label: 'Выгорание', cls: 'text-amber-600 bg-amber-50 border border-amber-100' }] },
]

export default function Psychologist() {
  const { isDark } = useTheme()
  const [view, setView] = useState('alerts')
  const [profileOpen, setProfileOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)

  const titles = { alerts: ['Алерты', 'Учащиеся, требующие внимания'], users: ['Мои подопечные', 'Назначенные учащиеся'], sessions: ['Сессии', 'Запланированные встречи'], notes: ['Заметки', 'Клинические записи'] }

  const navItems = [
    { id: 'alerts', icon: Bell, label: 'Алерты', badge: 3 },
    { id: 'users', icon: Users, label: 'Мои подопечные' },
    { id: 'sessions', icon: Calendar, label: 'Сессии' },
    { id: 'notes', icon: FileText, label: 'Заметки' },
  ]

  const openProfile = (id) => {
    setSelectedUser(id)
    setProfileOpen(true)
  }
  const closeProfile = () => {
    setProfileOpen(false)
    setSelectedUser(null)
  }

  const chartGrid = isDark ? '#3F3F46' : '#E5E7EB'
  const chartText = isDark ? '#A1A1AA' : '#6B7280'

  const radarData = {
    labels: ['Стресс', 'Выгорание', 'Тревожность', 'Мотивация', 'Эмоции'],
    datasets: [{
      label: 'Профиль',
      data: [82, 65, 74, 31, 45],
      backgroundColor: 'rgba(239,68,68,0.15)',
      borderColor: '#EF4444',
      pointBackgroundColor: '#FFFFFF',
      pointBorderColor: '#EF4444',
      borderWidth: 2,
    }]
  }
  const radarOptions = {
    responsive: true, maintainAspectRatio: true,
    plugins: { legend: { display: false } },
    scales: {
      r: {
        min: 0, max: 100, ticks: { display: false },
        grid: { color: chartGrid },
        pointLabels: { color: chartText, font: { size: 11 } },
        angleLines: { color: chartGrid },
      }
    }
  }

  return (
    <div className="bg-white text-zharyq-dark font-sans h-screen flex overflow-hidden selection:bg-zharyq-orange selection:text-white">
      {/* SIDEBAR */}
      <aside className="hidden md:flex flex-col w-1/5 min-w-[260px] max-w-[300px] bg-zharyq-bg border-r border-zharyq-border p-5 h-full">
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-zharyq-orange flex items-center justify-center">
              <Sparkles size={12} className="text-white" />
            </div>
            <span className="font-semibold text-lg tracking-tight">Zharyq</span>
          </Link>
          <ThemeToggle />
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-6" style={{ background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.2)' }}>
          <ShieldCheck size={16} className="text-zharyq-teal shrink-0" />
          <span className="text-xs font-semibold text-zharyq-teal">Роль: Психолог</span>
        </div>
        <div className="flex flex-col gap-1 mb-8">
          <p className="text-xs font-semibold text-zharyq-gray uppercase tracking-wider mb-2 px-2">Рабочее пространство</p>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setView(item.id)} className={`psych-nav ${view === item.id ? 'active-nav' : 'text-zharyq-gray hover:bg-gray-100'}`}>
              <item.icon size={16} />
              {item.label}
              {item.badge && <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{item.badge}</span>}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="pt-4 border-t border-zharyq-border mt-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-tr from-zharyq-teal to-blue-400 rounded-full flex items-center justify-center text-white text-xs font-bold">АК</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Айгуль К.</p>
            <p className="text-[10px] text-zharyq-gray flex items-center gap-1"><ShieldCheck size={12} /> Психолог</p>
          </div>
          <Link to="/app" className="text-zharyq-gray hover:text-zharyq-dark transition-colors" title="Выйти">
            <LogOut size={16} />
          </Link>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 flex flex-col h-full bg-white overflow-hidden">
        <header className="border-b border-zharyq-border px-6 py-4 flex items-center justify-between bg-white shrink-0">
          <div>
            <h1 className="text-lg font-semibold">{titles[view][0]}</h1>
            <p className="text-xs text-zharyq-gray mt-0.5">{titles[view][1]}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zharyq-gray pointer-events-none" />
              <input type="text" placeholder="Поиск…" className="border border-zharyq-border rounded-xl pl-9 pr-4 py-2 text-sm bg-white focus:border-zharyq-orange focus:ring-1 focus:ring-zharyq-orange transition-all w-52" />
            </div>
            <select className="border border-zharyq-border rounded-xl px-3 py-2 text-sm bg-white text-zharyq-gray focus:ring-0 cursor-pointer">
              <option>Все классы</option><option>10А</option><option>10Б</option><option>11А</option>
            </select>
          </div>
        </header>

        {/* ALERTS VIEW */}
        {view === 'alerts' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { icon: AlertTriangle, bg: 'bg-red-50', color: 'text-red-500', count: 3, label: 'Критических' },
                  { icon: Activity, bg: 'bg-amber-50', color: 'text-amber-500', count: 7, label: 'Средних' },
                  { icon: CheckCircle, bg: 'bg-zharyq-teal-light', color: 'text-zharyq-teal', count: 24, label: 'В норме' },
                ].map((s, i) => (
                  <div key={i} className="border border-zharyq-border rounded-2xl p-4 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                      <s.icon size={20} className={s.color} />
                    </div>
                    <div>
                      <p className="text-xl font-bold">{s.count}</p>
                      <p className="text-xs text-zharyq-gray">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border border-zharyq-border rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-zharyq-border flex items-center justify-between">
                  <h2 className="text-sm font-semibold">Активные алерты</h2>
                  <span className="text-[11px] text-zharyq-gray">Обновлено 2 мин назад</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zharyq-border bg-zharyq-bg">
                        {['Пользователь', 'Класс', 'Тип алерта', 'Уровень', 'Время', 'Действие'].map(h => (
                          <th key={h} className="text-left text-[11px] font-semibold text-zharyq-gray uppercase tracking-wide px-5 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ALERTS.map((a, i) => (
                        <tr key={i} className="border-b border-zharyq-border hover:bg-zharyq-bg transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-7 h-7 rounded-full ${a.avatarBg} flex items-center justify-center text-xs font-bold ${a.avatarColor}`}>U{a.id}</div>
                              <span className="text-sm font-medium">{a.anon}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-zharyq-gray text-xs">{a.class}</td>
                          <td className="px-5 py-3.5 text-xs font-medium">{a.type}</td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${a.levelClass} border px-2 py-0.5 rounded-full`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${a.dot}`} /> {a.level}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-zharyq-gray text-xs whitespace-nowrap">{a.time}</td>
                          <td className="px-5 py-3.5">
                            <button onClick={() => openProfile(a.id)} className="text-xs font-medium text-zharyq-orange hover:underline">Просмотреть</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* USERS VIEW */}
        {view === 'users' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
              <div className="flex gap-1 p-1 bg-zharyq-bg border border-zharyq-border rounded-xl w-fit mb-6">
                {['10А', '10Б', '11А'].map((cls, i) => (
                  <button key={cls} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${i === 0 ? 'text-white' : 'text-zharyq-gray hover:text-zharyq-dark'}`} style={i === 0 ? { background: 'var(--color-accent)' } : {}}>{cls}</button>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {USERS.map(u => (
                  <div key={u.id} onClick={() => openProfile(u.id)} className="border border-zharyq-border rounded-2xl p-4 hover:border-zharyq-gray transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-9 h-9 rounded-full bg-gradient-to-tr ${u.gradient} flex items-center justify-center text-white text-xs font-bold shrink-0`}>U{u.id}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold group-hover:text-zharyq-orange transition-colors">Аноним #{u.id}</p>
                        <p className="text-xs text-zharyq-gray">10А · Последний вход: {u.lastSeen}</p>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${u.statusClass || ''}`} style={u.statusStyle || {}}>{u.status}</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-zharyq-gray w-16 shrink-0">Стресс</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-1">
                          <div className="h-1 rounded-full" style={{ width: `${u.stress}%`, background: u.stress > 60 ? '#F87171' : 'var(--color-accent)' }} />
                        </div>
                        <span className="text-zharyq-gray w-5 text-right">{u.stress}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-zharyq-gray w-16 shrink-0">Мотивация</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-1">
                          <div className="h-1 rounded-full" style={{ width: `${u.motivation}%`, background: u.motivation < 50 ? '#FBBF24' : 'var(--color-teal)' }} />
                        </div>
                        <span className="text-zharyq-gray w-5 text-right">{u.motivation}</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-zharyq-gray mt-3 flex items-center gap-1">
                      <span>{u.sessions} сессий · {u.courses} {u.courses === 1 ? 'курс' : 'курса'}</span>
                    </p>
                  </div>
                ))}
                <div className="border border-zharyq-border rounded-2xl p-4 hover:border-zharyq-gray transition-colors cursor-pointer border-dashed opacity-60">
                  <div className="flex flex-col items-center justify-center h-full py-6 gap-2 text-zharyq-gray">
                    <Users size={24} />
                    <span className="text-xs">Назначить ещё</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SESSIONS VIEW */}
        {view === 'sessions' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto">
              <div className="border border-zharyq-border rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-zharyq-border">
                  <h2 className="text-sm font-semibold">Запланированные сессии</h2>
                </div>
                <div className="divide-y divide-zharyq-border">
                  {SESSIONS.map((s, i) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-4 hover:bg-zharyq-bg transition-colors">
                      <div className={`w-10 h-10 rounded-xl ${s.bg} flex flex-col items-center justify-center shrink-0`}>
                        <span className={`text-[10px] ${s.textColor} font-semibold`}>{s.month}</span>
                        <span className={`text-sm font-bold ${s.textColor} leading-tight`}>{s.day}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{s.title}</p>
                        <p className="text-xs text-zharyq-gray">{s.sub}</p>
                      </div>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${s.badgeClass || ''}`} style={s.badgeStyle || {}}>{s.badge}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* NOTES VIEW */}
        {view === 'notes' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold">Клинические заметки</h2>
                <button className="text-xs font-medium text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors" style={{ background: 'var(--color-accent)' }}>
                  <Plus size={14} /> Новая заметка
                </button>
              </div>
              <div className="flex flex-col gap-3">
                {NOTES.map(n => (
                  <div key={n.id} className="border border-zharyq-border rounded-2xl p-4 hover:border-zharyq-gray transition-colors cursor-pointer">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full ${n.avatarBg} flex items-center justify-center text-[10px] font-bold ${n.avatarColor}`}>U{n.id}</div>
                        <span className="text-sm font-semibold">Аноним #{n.id}</span>
                      </div>
                      <span className="text-[11px] text-zharyq-gray shrink-0">{n.date}</span>
                    </div>
                    <p className="text-xs text-zharyq-gray leading-relaxed">{n.text}</p>
                    <div className="flex gap-2 mt-3">
                      {n.tags.map(t => <span key={t.label} className={`text-[10px] px-2 py-0.5 rounded-full ${t.cls}`}>{t.label}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* PROFILE DRAWER */}
      <div className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-200 ${profileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={closeProfile} />
      <aside className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white border-l border-zharyq-border z-50 transition-transform duration-300 overflow-y-auto flex flex-col ${profileOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-5 border-b border-zharyq-border flex items-center justify-between">
          <h2 className="text-sm font-semibold">Профиль учащегося</h2>
          <button onClick={closeProfile} className="text-zharyq-gray hover:text-zharyq-dark transition-colors"><X size={20} /></button>
        </div>
        <div className="p-5 flex-1">
          <div className="flex items-center gap-3 mb-5 pb-5 border-b border-zharyq-border">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-orange-300 to-red-400 flex items-center justify-center text-white text-sm font-bold">U{selectedUser}</div>
            <div>
              <p className="font-semibold">Аноним #{selectedUser}</p>
              <p className="text-xs text-zharyq-gray">10А · Последний чек-ин: сегодня</p>
            </div>
            <span className="ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">Критический</span>
          </div>
          <p className="text-xs font-semibold text-zharyq-gray uppercase tracking-wider mb-3">Психологический профиль</p>
          <div className="w-full aspect-square max-w-[240px] mx-auto mb-5">
            <Radar data={radarData} options={radarOptions} />
          </div>
          <div className="grid grid-cols-2 gap-3 mb-5">
            {[{ label: 'Стресс', value: 82, color: 'text-red-500', delta: '↑ +12', deltaColor: 'text-red-400' }, { label: 'Мотивация', value: 31, color: 'text-amber-500', delta: '↓ -18', deltaColor: 'text-amber-400' }, { label: 'Тревожность', value: 74, color: 'text-red-500', delta: '↑ +8', deltaColor: 'text-red-400' }, { label: 'Курсов пройдено', value: 1, color: '', delta: 'из 5', deltaColor: 'text-zharyq-gray' }].map(m => (
              <div key={m.label} className="border border-zharyq-border rounded-xl p-3">
                <p className="text-xs text-zharyq-gray mb-1">{m.label}</p>
                <div className="flex items-end gap-2">
                  <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
                  <span className={`text-[10px] ${m.deltaColor} mb-0.5`}>{m.delta}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="border border-zharyq-border rounded-xl p-3.5 mb-5" style={{ background: 'var(--color-accent-light)', borderColor: 'rgba(255,113,0,0.2)' }}>
            <div className="flex items-start gap-2">
              <Sparkles size={16} className="shrink-0 mt-0.5" style={{ color: 'var(--color-accent)' }} />
              <div>
                <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-accent)' }}>Рекомендация AI</p>
                <p className="text-xs text-zharyq-gray leading-relaxed">Уровень стресса критически высок. Рекомендуется немедленная личная консультация и назначение курса «Управление стрессом».</p>
              </div>
            </div>
          </div>
          <button className="w-full py-2.5 rounded-xl text-white text-sm font-semibold transition-colors" style={{ background: 'var(--color-accent)' }}>
            <Calendar size={16} className="inline mr-2" />
            Назначить сессию
          </button>
        </div>
      </aside>
    </div>
  )
}
