import { useState, useEffect } from 'react'
import { Briefcase } from 'lucide-react'
import { Pie, Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale,
  LinearScale, PointElement, LineElement, Filler
} from 'chart.js'
import ThemeToggle from '../components/ThemeToggle'
import { useTheme } from '../context/ThemeContext'
import { 
  fetchDirectorDashboard, 
  fetchStudentsWithMetrics, 
  fetchStressDistribution, 
  fetchOrgMetrics 
} from '../api/api'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler)

export default function DirectorDashboard() {
  const { isDark } = useTheme()
  const [dashboard, setDashboard] = useState(null)
  const [students, setStudents] = useState([])
  const [stressDist, setStressDist] = useState(null)
  const [orgMetrics, setOrgMetrics] = useState([])

  useEffect(() => {
    Promise.all([
      fetchDirectorDashboard().catch(() => null),
      fetchStudentsWithMetrics().catch(() => []),
      fetchStressDistribution().catch(() => null),
      fetchOrgMetrics().catch(() => [])
    ]).then(([dDash, dStud, dStress, dOrg]) => {
      if (dDash) setDashboard(dDash)
      setStudents(dStud || [])
      if (dStress) setStressDist(dStress)
      setOrgMetrics(dOrg || [])
    })
  }, [])

  const chartText = isDark ? '#A1A1AA' : '#6B7280'
  const chartGrid = isDark ? '#3F3F46' : '#F3F4F6'
  const surfaceColor = isDark ? '#27272A' : '#F9FAFB'

  const KPI_CARDS = [
    { label: 'Общий индекс благополучия', value: dashboard ? `${dashboard.wellbeing_index}%` : '...', delta: 'Средний по школе', deltaClass: 'text-emerald-600' },
    { label: 'Алертов (Крит / Сред)', value: dashboard ? `${dashboard.critical_alerts} / ${dashboard.medium_alerts}` : '...', delta: 'Требуют внимания', deltaClass: 'text-red-600' },
    { label: 'Уровень вовлеченности', value: dashboard ? `${dashboard.engagement_rate}%` : '...', delta: 'В учебный процесс', deltaClass: 'text-zharyq-teal', span: 'sm:col-span-2 xl:col-span-1' },
  ]

  const pieData = {
    labels: ['Низкий', 'Умеренный', 'Высокий', 'Критический'],
    datasets: [{
      data: stressDist ? [stressDist.low, stressDist.medium, stressDist.high, stressDist.critical] : [0,0,0,0],
      backgroundColor: ['#14B8A6', '#60A5FA', '#F59E0B', '#EF4444'],
      borderColor: surfaceColor,
      borderWidth: 2,
    }]
  }

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: chartText, boxWidth: 12, boxHeight: 12, padding: 14, font: { size: 12 } }
      }
    }
  }

  const sortedOrg = [...orgMetrics].reverse()
  const lineData = {
    labels: sortedOrg.length ? sortedOrg.map(m => new Date(m.recorded_at).toLocaleDateString('ru-RU', {month:'short', day:'numeric'})) : ['Нет данных'],
    datasets: [{
      label: 'Индекс благополучия',
      data: sortedOrg.length ? sortedOrg.map(m => m.wellbeing_index) : [0],
      borderColor: '#FF7100',
      backgroundColor: 'rgba(255, 113, 0, 0.12)',
      fill: true,
      tension: 0.35,
      borderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 5,
      pointBorderWidth: 2,
      pointBackgroundColor: '#FFFFFF',
      pointBorderColor: '#FF7100',
    }]
  }

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: chartText, font: { size: 12 } } } },
    scales: {
      x: { ticks: { color: chartText }, grid: { color: chartGrid } },
      y: { min: 0, max: 100, ticks: { color: chartText, stepSize: 20 }, grid: { color: chartGrid } }
    }
  }

  const getRiskProps = (stress) => {
    if (stress >= 80) return { label: 'Критический', cls: 'bg-red-50 text-red-600 border-red-200' };
    if (stress >= 60) return { label: 'Высокий', cls: 'bg-orange-50 text-orange-600 border-orange-200' };
    if (stress >= 40) return { label: 'Средний', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
    return { label: 'Низкий', cls: 'bg-green-50 text-green-700 border-green-200' };
  }

  return (
    <div className="bg-white text-zharyq-dark font-sans min-h-screen">
      <header className="sticky top-0 z-20 bg-white border-b border-zharyq-border">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-zharyq-orange text-white flex items-center justify-center">
              <Briefcase size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.22em] text-zharyq-gray font-semibold">Zharyq Analytics</p>
              <h1 className="text-xl font-semibold truncate">Director Dashboard</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden sm:flex items-center gap-2 text-xs text-zharyq-gray border border-zharyq-border rounded-full px-3 py-1.5">
              <span className="w-2 h-2 rounded-full bg-zharyq-teal" />
              Live
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-4 text-zharyq-dark animate-fade-in-up">
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {KPI_CARDS.map((card, i) => (
            <article key={i} className={`rounded-2xl border border-zharyq-border bg-zharyq-bg p-5 ${card.span || ''}`}>
              <p className="text-[11px] uppercase tracking-[0.18em] text-zharyq-gray font-semibold mb-3">{card.label}</p>
              <div className="flex items-end justify-between gap-2">
                <p className="text-3xl font-semibold">{card.value}</p>
                <span className={`text-xs font-medium ${card.deltaClass}`}>{card.delta}</span>
              </div>
            </article>
          ))}
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <article className="rounded-2xl border border-zharyq-border bg-zharyq-bg p-5 xl:col-span-1">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zharyq-gray mb-4">Уровни стресса</h2>
            <div style={{ height: '280px' }} className="flex items-center justify-center">
              <Pie data={pieData} options={pieOptions} />
            </div>
          </article>
          <article className="rounded-2xl border border-zharyq-border bg-zharyq-bg p-5 xl:col-span-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zharyq-gray mb-4">Эмоциональный фон (по записям)</h2>
            <div style={{ height: '280px' }}>
              <Line data={lineData} options={lineOptions} />
            </div>
          </article>
        </section>

        <section className="grid grid-cols-1 2xl:grid-cols-3 gap-4 text-zharyq-dark">
          <article className="2xl:col-span-2 rounded-2xl border border-zharyq-border bg-zharyq-bg p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zharyq-gray">Управление: Пользователи</h2>
              <div className="flex flex-wrap gap-2">
                <button className="text-sm font-medium px-4 py-2 rounded-xl border border-zharyq-border hover:border-zharyq-orange hover:text-zharyq-orange transition-colors">
                  Добавить пользователей
                </button>
              </div>
            </div>
            <div className="overflow-x-auto rounded-xl border border-zharyq-border">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-white border-b border-zharyq-border">
                  <tr>
                    {['ФИО (анонимизировано)', 'Класс', 'Риск', 'Последний чек-ин'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zharyq-gray">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {students.map((u, i) => {
                    const risk = getRiskProps(u.stress || 0);
                    const d = u.last_checkin_date ? new Date(u.last_checkin_date).toLocaleString('ru-RU') : 'Нет чекинов';
                    return (
                      <tr key={u.id} className={`${i < students.length - 1 ? 'border-b border-zharyq-border' : ''} hover:bg-white transition-colors`}>
                        <td className="px-4 py-3 font-medium">{u.anonymous_id || `User #${u.id}`}</td>
                        <td className="px-4 py-3 text-zharyq-gray">{u.class_name || '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold border ${risk.cls}`}>{risk.label}</span>
                        </td>
                        <td className="px-4 py-3 text-zharyq-gray">{d}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </article>

          <article className="rounded-2xl border border-zharyq-border bg-zharyq-bg p-5 flex flex-col gap-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zharyq-gray">ROI и метрики</h2>
            <div className="rounded-xl border border-zharyq-border bg-white p-4">
              <p className="text-sm leading-relaxed">
                Доступных студентов на платформе: <span className="font-semibold text-zharyq-orange">{dashboard?.total_students || 0}</span> чел.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-zharyq-border p-3 bg-white">
                <p className="text-[11px] text-zharyq-gray mb-1">Вовлеченность</p>
                <p className="text-lg font-semibold">{dashboard?.engagement_rate ? `${dashboard.engagement_rate}%` : '-'}</p>
              </div>
              <div className="rounded-xl border border-zharyq-border p-3 bg-white">
                <p className="text-[11px] text-zharyq-gray mb-1">Индекс</p>
                <p className="text-lg font-semibold text-emerald-600">{dashboard?.wellbeing_index ? dashboard.wellbeing_index : '-'}</p>
              </div>
            </div>
          </article>
        </section>
      </main>
    </div>
  )
}
