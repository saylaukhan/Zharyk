import { Briefcase } from 'lucide-react'
import { Pie, Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale,
  LinearScale, PointElement, LineElement, Filler
} from 'chart.js'
import ThemeToggle from '../components/ThemeToggle'
import { useTheme } from '../context/ThemeContext'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler)

const USERS_TABLE = [
  { id: 'user_7ab2', class: '10-А', risk: 'Средний', riskClass: 'bg-amber-50 text-amber-700 border-amber-200', time: 'Сегодня, 09:15' },
  { id: 'user_f31c', class: '9-Б', risk: 'Критический', riskClass: 'bg-red-50 text-red-600 border-red-200', time: 'Сегодня, 08:40' },
  { id: 'user_19de', class: '11-В', risk: 'Низкий', riskClass: 'bg-green-50 text-green-700 border-green-200', time: 'Вчера, 16:22' },
  { id: 'user_a8f0', class: '8-Г', risk: 'Средний', riskClass: 'bg-amber-50 text-amber-700 border-amber-200', time: 'Вчера, 11:03' },
]

const KPI_CARDS = [
  { label: 'Общий индекс благополучия', value: '82%', delta: '+4.1% за месяц', deltaClass: 'text-emerald-600' },
  { label: 'Количество критических алертов', value: '7', delta: '-2 за неделю', deltaClass: 'text-red-600' },
  { label: 'Уровень вовлеченности', value: '76%', delta: 'Курсы пройдены', deltaClass: 'text-zharyq-teal', span: 'sm:col-span-2 xl:col-span-1' },
]

export default function DirectorDashboard() {
  const { isDark } = useTheme()

  const chartText = isDark ? '#A1A1AA' : '#6B7280'
  const chartGrid = isDark ? '#3F3F46' : '#F3F4F6'
  const surfaceColor = isDark ? '#27272A' : '#F9FAFB'

  const pieData = {
    labels: ['Низкий', 'Умеренный', 'Высокий', 'Критический'],
    datasets: [{
      data: [38, 34, 20, 8],
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

  const lineData = {
    labels: ['Сен', 'Окт', 'Ноя', 'Дек', 'Янв', 'Фев', 'Мар'],
    datasets: [{
      label: 'Индекс эмоционального фона',
      data: [64, 67, 63, 69, 71, 74, 78],
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
      y: { min: 50, max: 85, ticks: { color: chartText, stepSize: 5 }, grid: { color: chartGrid } }
    }
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
              Обновлено 2 мин назад
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-4">
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
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zharyq-gray mb-4">Эмоциональный фон по месяцам</h2>
            <div style={{ height: '280px' }}>
              <Line data={lineData} options={lineOptions} />
            </div>
          </article>
        </section>

        <section className="grid grid-cols-1 2xl:grid-cols-3 gap-4">
          <article className="2xl:col-span-2 rounded-2xl border border-zharyq-border bg-zharyq-bg p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zharyq-gray">Управление: Пользователи</h2>
              <div className="flex flex-wrap gap-2">
                <button className="text-sm font-medium px-4 py-2 rounded-xl border border-zharyq-border hover:border-zharyq-orange hover:text-zharyq-orange transition-colors">
                  Добавить пользователей
                </button>
                <button className="text-sm font-medium px-4 py-2 rounded-xl bg-zharyq-orange text-white hover:bg-zharyq-orange-hover transition-colors">
                  Назначить психолога
                </button>
              </div>
            </div>
            <div className="overflow-x-auto rounded-xl border border-zharyq-border">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-zharyq-bg border-b border-zharyq-border">
                  <tr>
                    {['ФИО (анонимизировано)', 'Класс', 'Риск', 'Последний чек-ин'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zharyq-gray">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {USERS_TABLE.map((u, i) => (
                    <tr key={u.id} className={`${i < USERS_TABLE.length - 1 ? 'border-b border-zharyq-border' : ''} hover:bg-white transition-colors`}>
                      <td className="px-4 py-3 font-medium">{u.id}</td>
                      <td className="px-4 py-3 text-zharyq-gray">{u.class}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold border ${u.riskClass}`}>{u.risk}</span>
                      </td>
                      <td className="px-4 py-3 text-zharyq-gray">{u.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="rounded-2xl border border-zharyq-border bg-zharyq-bg p-5 flex flex-col gap-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zharyq-gray">ROI и метрики</h2>
            <div className="rounded-xl border border-zharyq-border bg-white p-4">
              <p className="text-sm leading-relaxed">
                Внедрение курса по мотивации снизило общий уровень тревожности на{' '}
                <span className="font-semibold text-zharyq-orange">12%</span> за месяц.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-zharyq-border p-3">
                <p className="text-[11px] text-zharyq-gray mb-1">Снижение пропусков</p>
                <p className="text-lg font-semibold">-8.6%</p>
              </div>
              <div className="rounded-xl border border-zharyq-border p-3">
                <p className="text-[11px] text-zharyq-gray mb-1">Вовлеченность родителей</p>
                <p className="text-lg font-semibold">+15%</p>
              </div>
            </div>
          </article>
        </section>
      </main>
    </div>
  )
}
