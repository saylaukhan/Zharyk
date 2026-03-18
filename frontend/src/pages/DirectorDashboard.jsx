import { useState, useEffect, useRef } from 'react'
import { Briefcase, Download, Upload, FileSpreadsheet, Printer, UserPlus } from 'lucide-react'
import { Pie, Line } from 'react-chartjs-2'
import * as XLSX from 'xlsx'
import CreateUserModal from '../components/CreateUserModal'
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale,
  LinearScale, PointElement, LineElement, Filler
} from 'chart.js'
import ThemeToggle from '../components/ThemeToggle'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { 
  fetchDirectorDashboard, 
  fetchUsersWithMetrics, 
  fetchStressDistribution, 
  fetchOrgMetrics,
  createUsersBatch
} from '../api/api'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler)

export default function DirectorDashboard() {
  const { isDark } = useTheme()
  const { logout } = useAuth()
  const [roleTab, setRoleTab] = useState('all')
  const [dashboard, setDashboard] = useState(null)
  const [usersInfo, setUsersInfo] = useState([])
  const [stressDist, setStressDist] = useState(null)
  const [orgMetrics, setOrgMetrics] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const fileInputRef = useRef(null)

  const loadData = () => {
    Promise.all([
      fetchDirectorDashboard(roleTab).catch(() => null),
      fetchUsersWithMetrics(roleTab).catch(() => []),
      fetchStressDistribution(roleTab).catch(() => null),
      fetchOrgMetrics().catch(() => [])
    ]).then(([dDash, dStud, dStress, dOrg]) => {
      if (dDash) setDashboard(dDash)
      setUsersInfo(dStud || [])
      if (dStress) setStressDist(dStress)
      setOrgMetrics(dOrg || [])
    })
  }

  useEffect(() => {
    loadData()
  }, [roleTab])

  const chartText = isDark ? '#A1A1AA' : '#6B7280'
  const chartGrid = isDark ? '#3F3F46' : '#F3F4F6'
  const surfaceColor = isDark ? '#27272A' : '#F9FAFB'

  const KPI_CARDS = [
    { label: 'Общий индекс благополучия', value: dashboard ? `${dashboard.wellbeing_index}%` : '...', delta: 'По выбранной группе', deltaClass: 'text-emerald-600' },
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
      label: 'Индекс благополучия (Организация)',
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

  const getRoleLabel = (r) => {
    switch(r) {
      case 'student': return 'Ученик';
      case 'employee': return 'Сотрудник';
      case 'psychologist': return 'Психолог';
      case 'director': return 'Директор';
      default: return r;
    }
  }

  const exportToExcel = () => {
    const headers = ['ID пользователя','Логин','Email','Роль','Детали (Класс)','Уровень стресса (0-100)','Мотивация','Бернаут','Тревожность','Пройдено курсов','Сессий проведено','Последний чек-ин']
    const rows = usersInfo.map(u => [
      u.anonymous_id || `User #${u.id}`,
      u.username,
      u.email,
      getRoleLabel(u.role),
      u.class_name || '-',
      u.stress,
      u.motivation,
      u.burnout,
      u.anxiety,
      u.courses_count,
      u.sessions_count,
      u.last_checkin_date ? new Date(u.last_checkin_date).toLocaleString('ru-RU') : 'Нет чекинов',
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Zharyq_Analytics_${roleTab}_${new Date().toLocaleDateString('ru-RU')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportToPDF = () => {
    window.print()
  }

  const handleImportExcel = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const ab = evt.target.result
        const wb = XLSX.read(ab, { type: 'array' })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const data = XLSX.utils.sheet_to_json(ws)
        
        const roleMap = {
          'ученик': 'student',
          'сотрудник': 'employee',
          'психолог': 'psychologist',
          'директор': 'director'
        }
        
        const mappedData = data.map(row => ({
          username: String(row['Логин'] || ''),
          password: String(row['Пароль'] || ''),
          role: roleMap[String(row['Роль'] || '').toLowerCase().trim()] || 'student',
          email: String(row['Email'] || ''),
          class_name: row['Класс'] ? String(row['Класс']) : null
        })).filter(user => user.username && user.password && user.email)
        
        if (mappedData.length === 0) {
          alert("Не найдено валидных строк для импорта (нужны колонки Логин, Пароль, Email)")
          return
        }
        
        const res = await createUsersBatch(mappedData)
        alert(`Импорт завершен.\nУспешно: ${res.successful}\nОшибок: ${res.failed}`)
        loadData()
      } catch (err) {
        console.error(err)
        alert("Ошибка при импорте: " + (err.response?.data?.detail || err.message))
      }
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
    reader.readAsArrayBuffer(file)
  }

  return (
    <div className="bg-white text-zharyq-dark font-sans min-h-screen">
      <header className="sticky top-0 z-20 bg-white border-b border-zharyq-border print:hidden">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-zharyq-orange text-white flex items-center justify-center">
              <Briefcase size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.22em] text-zharyq-gray font-semibold">Zharyq Analytics</p>
              <h1 className="text-xl font-semibold truncate">Панель администратора</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="hidden sm:flex items-center gap-2 text-xs text-zharyq-gray border border-zharyq-border rounded-full px-3 py-1.5">
              <span className="w-2 h-2 rounded-full bg-zharyq-teal" />
              Live
            </span>
            <ThemeToggle />
            <button
              onClick={logout}
              className="text-sm font-medium px-4 py-2 rounded-xl text-white bg-zharyq-orange hover:bg-zharyq-orange-hover transition-colors"
            >
              Выйти
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6 text-zharyq-dark animate-fade-in-up">
        {/* Role Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
            <div className="flex gap-2 p-1 bg-zharyq-bg rounded-xl border border-zharyq-border overflow-x-auto">
              {[
                { id: 'all', label: 'Все группы' },
                { id: 'student', label: 'Ученики' },
                { id: 'employee', label: 'Сотрудники' },
                { id: 'psychologist', label: 'Психологи' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setRoleTab(tab.id)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${roleTab === tab.id ? 'bg-white shadow-sm text-zharyq-dark' : 'text-zharyq-gray hover:text-zharyq-dark'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            
            <div className="flex gap-2">
              <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-zharyq-teal hover:bg-emerald-600 rounded-xl transition-colors shadow-sm">
                <UserPlus size={16} />
                <span className="hidden sm:inline">Создать пользователя</span>
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-zharyq-border hover:bg-zharyq-bg transition-colors">
                <Upload size={16} className="text-emerald-600" />
                <span className="hidden sm:inline">Импорт</span>
              </button>
              <input type="file" accept=".xlsx, .xls" ref={fileInputRef} onChange={handleImportExcel} className="hidden" />
              <button onClick={exportToExcel} className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-zharyq-border hover:bg-zharyq-bg transition-colors">
                <FileSpreadsheet size={16} className="text-emerald-600" />
                <span className="hidden sm:inline">Экспорт</span>
              </button>
              <button onClick={exportToPDF} className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-zharyq-border hover:bg-zharyq-bg transition-colors">
                <Printer size={16} className="text-blue-600" />
                <span className="hidden sm:inline">PDF</span>
              </button>
            </div>
        </div>

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

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-4 print:break-inside-avoid">
          <article className="rounded-2xl border border-zharyq-border bg-zharyq-bg p-5 xl:col-span-1">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zharyq-gray mb-4">Уровни стресса</h2>
            <div style={{ height: '280px' }} className="flex items-center justify-center">
              <Pie data={pieData} options={pieOptions} />
            </div>
          </article>
          <article className="rounded-2xl border border-zharyq-border bg-zharyq-bg p-5 xl:col-span-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zharyq-gray mb-4">Эмоциональный фон (Организация)</h2>
            <div style={{ height: '280px' }}>
              <Line data={lineData} options={lineOptions} />
            </div>
          </article>
        </section>

        <section className="grid grid-cols-1 gap-4 text-zharyq-dark print:break-before-page">
          <article className="rounded-2xl border border-zharyq-border bg-zharyq-bg p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zharyq-gray">Подробная статистика пользователей</h2>
                <p className="text-sm text-zharyq-gray mt-1">Всего пользователей в выборке: {usersInfo.length}</p>
              </div>
              <div className="flex flex-wrap gap-2 print:hidden">
                 <span className="text-xs text-zharyq-gray px-3 py-1 bg-white border border-zharyq-border rounded-lg">Данные обновлены сегодня</span>
              </div>
            </div>
            <div className="overflow-x-auto rounded-xl border border-zharyq-border">
              <table className="w-full min-w-[800px] text-sm">
                <thead className="bg-white border-b border-zharyq-border">
                  <tr>
                    {['Идентификатор', 'Роль/Детали', 'Риск', 'Курсов', 'Сессий', 'Последний чек-ин'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zharyq-gray">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {usersInfo.map((u, i) => {
                    const risk = getRiskProps(u.stress || 0);
                    const d = u.last_checkin_date ? new Date(u.last_checkin_date).toLocaleString('ru-RU') : 'Нет чекинов';
                    return (
                      <tr key={u.id} className={`${i < usersInfo.length - 1 ? 'border-b border-zharyq-border' : ''} hover:bg-zharyq-bg transition-colors`}>
                        <td className="px-4 py-3 font-medium">
                          <div className="flex flex-col">
                           <span>{u.username}</span>
                           <span className="text-xs text-zharyq-gray">{u.anonymous_id || `ID: ${u.id}`}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                           <div className="flex flex-col">
                             <span className="font-medium text-zharyq-dark">{getRoleLabel(u.role)}</span>
                             {u.class_name && <span className="text-xs text-zharyq-gray">{u.class_name}</span>}
                           </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold border ${risk.cls}`}>{risk.label} ({u.stress || 0})</span>
                        </td>
                        <td className="px-4 py-3">{u.courses_count || 0}</td>
                        <td className="px-4 py-3">{u.sessions_count || 0}</td>
                        <td className="px-4 py-3 text-zharyq-gray">{d}</td>
                      </tr>
                    );
                  })}
                  {usersInfo.length === 0 && (
                      <tr>
                          <td colSpan="6" className="px-4 py-8 text-center text-zharyq-gray">Нет данных для отображения</td>
                      </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      </main>

      <CreateUserModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={loadData}
      />

      {/* Print specific styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .bg-zharyq-bg { background-color: #FAFAFA !important; }
        }
      `}} />
    </div>
  )
}
