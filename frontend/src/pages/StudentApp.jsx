import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Sparkles, Plus, MessageSquare, BookOpen, BarChart2, Info, Settings,
  Bell, GraduationCap, Paperclip, Mic, ArrowUp, FileText, Camera,
  ArrowLeft, Search, Video, Clock, Layers, Headphones, Activity,
  Zap, BatteryLow, Heart, Rocket, Brain, SearchX, Flame, Sun,
  BookOpenCheck, Trophy, BarChart, User, MessageCircle, ClipboardList, LogOut
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Line, Radar } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Filler, Tooltip, Legend, RadialLinearScale
} from 'chart.js'
import ThemeToggle from '../components/ThemeToggle'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { fetchUserMetrics } from '../api/api'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend, RadialLinearScale)

const API = 'http://localhost:8000/api/v1'

const CATEGORY_META = {
  'Стресс': { icon: Zap, iconColor: 'text-zharyq-orange', bg: 'bg-orange-50', tagColor: 'text-zharyq-orange', progressColor: 'bg-zharyq-teal' },
  'Выгорание': { icon: BatteryLow, iconColor: 'text-amber-500', bg: 'bg-amber-50', tagColor: 'text-amber-600', progressColor: 'bg-zharyq-teal' },
  'Эмоции': { icon: Heart, iconColor: 'text-zharyq-teal', bg: 'bg-zharyq-teal-light', tagColor: 'text-zharyq-teal', progressColor: 'bg-zharyq-teal' },
  'Мотивация': { icon: Rocket, iconColor: 'text-blue-500', bg: 'bg-blue-50', tagColor: 'text-blue-500', progressColor: 'bg-blue-400' },
  'Тревожность': { icon: Brain, iconColor: 'text-violet-500', bg: 'bg-violet-50', tagColor: 'text-violet-500', progressColor: 'bg-zharyq-teal' },
}

const DEFAULT_META = { icon: BookOpen, iconColor: 'text-zharyq-gray', bg: 'bg-gray-50', tagColor: 'text-zharyq-gray', progressColor: 'bg-zharyq-teal' }

const FILTERS = ['all', 'Стресс', 'Выгорание', 'Эмоции', 'Мотивация', 'Тревожность']
const FILTER_LABELS = { all: 'Все', 'Стресс': 'Стресс', 'Выгорание': 'Выгорание', 'Эмоции': 'Эмоции', 'Мотивация': 'Мотивация', 'Тревожность': 'Тревожность' }

const AVAILABLE_TESTS = [
  { id: 'psm25', title: 'Уровень стресса (PSM-25)', desc: 'Оценка уровня психологического стресса.', duration: '5-7 мин', questions: 25, icon: Zap, color: 'text-zharyq-orange', bg: 'bg-orange-50' },
  { id: 'beck', title: 'Шкала тревожности Бека', desc: 'Клиническая оценка уровня тревожности.', duration: '10 мин', questions: 21, icon: Brain, color: 'text-violet-500', bg: 'bg-violet-50' },
  { id: 'burnout', title: 'Тест на выгорание (MBI)', desc: 'Анализ эмоционального истощения.', duration: '10-15 мин', questions: 22, icon: BatteryLow, color: 'text-amber-500', bg: 'bg-amber-50' },
]

const AVAILABLE_TESTS = [
  { id: 'psm25', title: 'Уровень стресса (PSM-25)', desc: 'Оценка уровня психологического стресса.', duration: '5-7 мин', questions: 25, icon: Zap, color: 'text-zharyq-orange', bg: 'bg-orange-50' },
  { id: 'beck', title: 'Шкала тревожности Бека', desc: 'Клиническая оценка уровня тревожности.', duration: '10 мин', questions: 21, icon: Brain, color: 'text-violet-500', bg: 'bg-violet-50' },
  { id: 'burnout', title: 'Тест на выгорание (MBI)', desc: 'Анализ эмоционального истощения.', duration: '10-15 мин', questions: 22, icon: BatteryLow, color: 'text-amber-500', bg: 'bg-amber-50' },
]

const TEST_HISTORY = [
  { date: '13 мар 2025', test: 'Уровень стресса', result: 'Средний', resultClass: 'text-amber-600 bg-amber-50 border-amber-100', rec: 'Курс «Управление стрессом»' },
  { date: '10 мар 2025', test: 'Тест на выгорание', result: 'Норма', resultClass: 'text-green-700 bg-green-50 border-green-100', rec: 'Продолжайте отдыхать' },
  { date: '5 мар 2025', test: 'Уровень тревожности', result: 'Высокий', resultClass: 'text-red-600 bg-red-50 border-red-100', rec: 'Дыхательные практики' },
  { date: '28 фев 2025', test: 'Мотивация', result: 'Высокая', resultClass: 'text-zharyq-teal bg-zharyq-teal-light border-teal-100', rec: 'Поддерживайте ритм' },
  { date: '20 фев 2025', test: 'Эмоциональный фон', result: 'Средний', resultClass: 'text-amber-600 bg-amber-50 border-amber-100', rec: 'Курс «Эмоц. интеллект»' },
]

function getChartColors(isDark) {
  return {
    text: isDark ? '#A1A1AA' : '#6B7280',
    grid: isDark ? '#3F3F46' : '#E5E7EB',
  }
}

export default function StudentApp() {
  const { isDark } = useTheme()
  const { user: authUser, logout } = useAuth()
  const [view, setView] = useState('chat')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [metrics, setMetrics] = useState([])
  
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  const accountMenuRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target)) {
        setAccountMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (view === 'courses') {
      setCoursesLoading(true)
      fetch(`${API}/courses/`)
        .then(r => r.json())
        .then(data => setApiCourses(data))
        .catch(console.error)
        .finally(() => setCoursesLoading(false))
    }
  }, [view])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (authUser?.id) {
      fetchUserMetrics(authUser.id)
        .then(setMetrics)
        .catch(console.error)
    }
  }, [authUser])

  const navItems = [
    { id: 'chat', icon: MessageSquare, label: 'AI-Ассистент' },
    { id: 'tests', icon: ClipboardList, label: 'Тесты' },
    { id: 'courses', icon: BookOpen, label: 'База курсов' },
    { id: 'analytics', icon: BarChart2, label: 'Моя аналитика' },
  ]

  const sendMessage = (text) => {
    const msg = text || input.trim()
    if (!msg) return
    setMessages(prev => [...prev, { role: 'user', text: msg }])
    setInput('')
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'ai',
        text: 'Я слышу вас. Расскажите подробнее — что именно вас беспокоит прямо сейчас?'
      }])
    }, 1200)
  }

  const resetChat = () => {
    setMessages([])
    setView('chat')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const filteredCourses = apiCourses.filter(c => {
    const matchFilter = filter === 'all' || c.category === filter
    const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const { text: chartText, grid: chartGrid } = getChartColors(isDark)

  const sortedMetrics = [...metrics].reverse();
  const lineLabels = sortedMetrics.length ? sortedMetrics.map(m => new Date(m.recorded_at).toLocaleDateString('ru-RU')) : ['Нет данных'];
  const dataStress = sortedMetrics.length ? sortedMetrics.map(m => m.stress) : [0];
  const dataMotivation = sortedMetrics.length ? sortedMetrics.map(m => m.motivation) : [0];

  const lineData = {
    labels: lineLabels,
    datasets: [
      { label: 'Стресс', data: dataStress, borderColor: '#FF7100', backgroundColor: 'rgba(255,113,0,0.1)', fill: true, tension: 0.35, pointRadius: 3, pointBorderWidth: 2, pointBackgroundColor: '#FFFFFF', pointBorderColor: '#FF7100' },
      { label: 'Мотивация', data: dataMotivation, borderColor: '#14B8A6', backgroundColor: 'rgba(20,184,166,0.1)', fill: true, tension: 0.35, pointRadius: 3, pointBorderWidth: 2, pointBackgroundColor: '#FFFFFF', pointBorderColor: '#14B8A6' },
    ]
  }

  const lineOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: chartText, font: { size: 11 } } } },
    scales: {
      x: { ticks: { color: chartText }, grid: { color: chartGrid } },
      y: { min: 0, max: 100, ticks: { color: chartText, stepSize: 20 }, grid: { color: chartGrid } }
    }
  }

  const latestMetric = sortedMetrics[sortedMetrics.length - 1] || { stress: 0, burnout: 0, anxiety: 0, motivation: 0, emotion: 0 };
  const radarData = {
    labels: ['Стресс', 'Выгорание', 'Тревожность', 'Мотивация', 'Эмоции'],
    datasets: [{
      label: 'Текущее состояние',
      data: [latestMetric.stress, latestMetric.burnout, latestMetric.anxiety, latestMetric.motivation, latestMetric.emotion],
      backgroundColor: 'rgba(20,184,166,0.15)',
      borderColor: '#14B8A6',
      pointBackgroundColor: '#FFFFFF',
      pointBorderColor: '#14B8A6',
      borderWidth: 2,
    }]
  }

  const radarOptions = {
    responsive: true, maintainAspectRatio: true,
    plugins: { legend: { display: false } },
    scales: {
      r: {
        min: 0, max: 100,
        ticks: { display: false },
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
          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <button className="relative text-zharyq-gray hover:text-zharyq-dark transition-colors">
              <Bell size={20} />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border border-white" />
            </button>
          </div>
        </div>
        <button onClick={resetChat} className="w-full bg-zharyq-orange hover:bg-zharyq-orange-hover text-white text-sm font-medium py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 mb-8">
          <Plus size={16} />
          Новый чек-ин
        </button>
        <div className="flex flex-col gap-1 mb-8">
          <p className="text-xs font-semibold text-zharyq-gray uppercase tracking-wider mb-2 px-2">Пространство</p>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`nav-item ${view === item.id ? 'active-nav' : ''}`}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
          <a href="#" className="nav-item"><Info size={16} />О платформе</a>
        </div>
        <div className="flex-1 overflow-y-auto">
          <p className="text-xs font-semibold text-zharyq-gray uppercase tracking-wider mb-2 px-2">История</p>
          <div className="flex flex-col gap-1">
            {['Тест на выгорание', 'Утренняя практика дыхания', 'Обсуждение стресса перед ЕНТ'].map(h => (
              <a key={h} href="#" className="block px-3 py-2 text-sm text-zharyq-gray hover:text-zharyq-dark truncate rounded-md hover:bg-gray-100">{h}</a>
            ))}
          </div>
        </div>
        <div className="pt-4 border-t border-zharyq-border mt-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-tr from-zharyq-teal to-blue-400 rounded-full flex justify-center items-center text-white font-bold text-xs relative">
            {authUser?.username?.[0]?.toUpperCase() || 'S'}
            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
              <div className="bg-orange-100 text-zharyq-orange text-[8px] font-bold px-1 rounded-full border border-orange-200">🔥 5</div>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zharyq-dark truncate">{authUser?.username || 'Студент'}</p>
            <p className="text-[10px] text-zharyq-gray truncate flex items-center gap-1">
              <GraduationCap size={12} /> {authUser?.class_name || 'Не указан'}
            </p>
          </div>
          <button onClick={logout} className="text-zharyq-gray hover:text-zharyq-dark transition-colors" title="Выйти">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 flex flex-col h-full bg-white relative pb-16 md:pb-0 text-zharyq-dark">
        {/* Mobile header */}
        <header className="md:hidden border-b border-zharyq-border p-4 flex items-center justify-between bg-white z-10">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-zharyq-orange flex items-center justify-center">
              <Sparkles size={12} className="text-white" />
            </div>
            <span className="font-semibold">Zharyq</span>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative text-zharyq-gray"><Bell size={20} /><span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border border-white" /></button>
            <div className="bg-zharyq-teal-light border border-teal-200 text-zharyq-teal text-xs font-medium px-3 py-1 rounded-full flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-zharyq-teal" />В норме
            </div>
            <button onClick={logout} className="text-zharyq-gray hover:text-zharyq-dark transition-colors" title="Выйти">
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* CHAT VIEW */}
        {view === 'chat' && (
          <>
            <div id="chat-container" className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col gap-6">
              {messages.length === 0 && (
                <div className="mt-8 mb-4 text-center max-w-lg mx-auto w-full">
                  <h2 className="text-2xl font-semibold mb-2">Доброе утро, {authUser?.username || 'Студент'}</h2>
                  <p className="text-zharyq-gray mb-8">Как ваш настрой перед контрольной?</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <button onClick={() => sendMessage('Хочу пройти тест на уровень стресса')} className="bg-white border text-zharyq-dark border-zharyq-border hover:border-zharyq-orange text-sm px-4 py-2 rounded-xl transition-colors flex items-center gap-2 shadow-sm">
                      <FileText size={16} className="text-zharyq-gray" />Оценить стресс
                    </button>
                    <button onClick={() => sendMessage('Определи мои эмоции')} className="bg-white border text-zharyq-dark border-zharyq-border hover:border-zharyq-orange text-sm px-4 py-2 rounded-xl transition-colors flex items-center gap-2 shadow-sm">
                      <Camera size={16} className="text-zharyq-gray" />Скан по лицу
                    </button>
                    <button onClick={() => sendMessage('Признаки выгорания, устал')} className="bg-white border text-zharyq-dark border-zharyq-border hover:border-zharyq-orange text-sm px-4 py-2 rounded-xl transition-colors flex items-center gap-2 shadow-sm">
                      <Activity size={16} className="text-zharyq-gray" />Выгорание
                    </button>
                  </div>
                </div>
              )}
              <div id="messages-wrapper" className="flex flex-col gap-6 w-full max-w-3xl mx-auto pb-4">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'items-start'}`}>
                    {msg.role === 'ai' && (
                      <div className="w-8 h-8 rounded-full bg-zharyq-orange flex items-center justify-center shrink-0 mt-1">
                        <Sparkles size={14} className="text-white" />
                      </div>
                    )}
                    <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed max-w-[75%] ${msg.role === 'ai' ? 'bg-zharyq-bg border border-zharyq-border rounded-tl-sm' : 'text-white rounded-tr-sm'}`} style={msg.role === 'user' ? { background: 'var(--color-accent)' } : {}}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>
            <div className="p-4 md:p-6 bg-white w-full max-w-3xl mx-auto">
              <div className="relative flex items-end gap-2 border border-zharyq-border rounded-2xl bg-white p-2 focus-within:border-zharyq-orange focus-within:ring-1 focus-within:ring-zharyq-orange transition-all">
                <button className="p-2 text-zharyq-gray hover:text-zharyq-dark rounded-xl shrink-0"><Paperclip size={20} /></button>
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Расскажите, как вы себя чувствуете..."
                  className="w-full bg-transparent border-none text-zharyq-dark focus:ring-0 resize-none py-2 text-sm max-h-32"
                  style={{ minHeight: '40px' }}
                />
                <div className="flex items-center gap-1 shrink-0">
                  <button className="p-2 text-zharyq-gray hover:text-zharyq-orange rounded-xl transition-colors"><Mic size={20} /></button>
                  <button onClick={() => sendMessage()} className="p-2 bg-zharyq-orange text-white rounded-xl hover:bg-zharyq-orange-hover transition-colors"><ArrowUp size={20} /></button>
                </div>
              </div>
              <p className="text-center text-[11px] text-zharyq-gray mt-3 hidden md:block">Zharyq AI может допускать ошибки. Результаты тестов конфиденциальны.</p>
            </div>
          </>
        )}

        {/* TESTS VIEW */}
        {view === 'tests' && (
          <div className="flex-1 overflow-y-auto p-6 md:p-8 text-zharyq-dark">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center gap-3 mb-8">
                <button onClick={() => setView('chat')} className="text-zharyq-gray hover:text-zharyq-dark transition-colors"><ArrowLeft size={20} /></button>
                <h1 className="text-xl font-semibold">Доступные тесты</h1>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {AVAILABLE_TESTS.map(t => (
                  <div key={t.id} className="border border-zharyq-border rounded-2xl p-5 hover:border-zharyq-gray transition-colors cursor-pointer group flex flex-col h-full">
                    <div className="flex items-start gap-3 mb-4">
                      <div className={`w-10 h-10 rounded-xl ${t.bg} flex items-center justify-center shrink-0`}>
                        <t.icon size={20} className={t.color} />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold group-hover:text-zharyq-orange transition-colors">{t.title}</h4>
                        <p className="text-xs text-zharyq-gray mt-1 leading-relaxed">{t.desc}</p>
                      </div>
                    </div>
                    <div className="mt-auto flex items-center justify-between text-[11px] text-zharyq-gray border-t border-zharyq-border pt-3">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1"><Clock size={12} /> {t.duration}</span>
                        <span className="flex items-center gap-1"><Layers size={12} /> {t.questions} вопросов</span>
                      </div>
                      <button className="text-zharyq-orange font-semibold hover:underline">Пройти</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border border-zharyq-border rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-zharyq-border">
                  <h2 className="text-sm font-semibold">История прохождений</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zharyq-border bg-zharyq-bg/50 text-zharyq-dark">
                        {['Дата', 'Тест', 'Результат'].map(h => (
                          <th key={h} className="text-left text-[11px] font-semibold text-zharyq-gray uppercase tracking-wide px-5 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {TEST_HISTORY.map((row, i) => (
                        <tr key={i} className="border-b border-zharyq-border hover:bg-zharyq-bg transition-colors">
                          <td className="px-5 py-3.5 text-zharyq-gray text-xs whitespace-nowrap">{row.date}</td>
                          <td className="px-5 py-3.5 font-medium text-xs">{row.test}</td>
                          <td className="px-5 py-3.5"><span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${row.resultClass} border px-2 py-0.5 rounded-full`}>{row.result}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* COURSES VIEW */}
        {view === 'courses' && (
          <div className="flex-1 overflow-y-auto p-6 md:p-8 text-zharyq-dark">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center gap-3 mb-6">
                <button onClick={() => setView('chat')} className="text-zharyq-gray hover:text-zharyq-dark transition-colors"><ArrowLeft size={20} /></button>
                <h1 className="text-xl font-semibold">База курсов</h1>
              </div>
              <div className="relative mb-4">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zharyq-gray pointer-events-none" />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по названию или теме..." className="w-full text-zharyq-dark border border-zharyq-border rounded-xl pl-9 pr-4 py-2.5 text-sm bg-white focus:border-zharyq-orange focus:ring-1 focus:ring-zharyq-orange transition-all" />
              </div>
              <div className="flex flex-wrap gap-2 mb-8">
                {FILTERS.map(f => (
                  <button key={f} onClick={() => setFilter(f)} className={`text-sm px-4 py-1.5 rounded-xl border transition-colors ${filter === f ? 'active-filter' : 'border-zharyq-border text-zharyq-gray hover:border-zharyq-orange'}`}>
                    {FILTER_LABELS[f]}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {coursesLoading ? (
                  <div className="col-span-2 text-center py-16 text-zharyq-gray text-sm">Загрузка...</div>
                ) : filteredCourses.length === 0 ? (
                  <div className="col-span-2 text-center py-16 text-zharyq-gray">
                    <SearchX size={32} className="mx-auto mb-3 opacity-40" />
                    <p className="text-sm">Ничего не найдено</p>
                  </div>
                ) : filteredCourses.map(c => {
                  const meta = CATEGORY_META[c.category] || DEFAULT_META
                  const IconComp = meta.icon
                  return (
                    <div key={c.id} className="course-card border border-zharyq-border rounded-2xl overflow-hidden hover:border-zharyq-gray transition-colors cursor-pointer group">
                      <div className={`h-28 ${meta.bg} flex items-center justify-center relative`}>
                        <IconComp size={24} className={meta.iconColor} />
                        <span className={`absolute top-3 right-3 text-[10px] font-semibold ${meta.tagColor} bg-white border border-zharyq-border px-2 py-0.5 rounded-full`}>{c.category}</span>
                      </div>
                      <div className="p-4">
                        <h4 className="text-sm font-semibold mb-1">{c.title}</h4>
                        <p className="text-xs text-zharyq-gray mb-3">{c.description}</p>
                        <div className="flex items-center gap-3 text-[11px] text-zharyq-gray mb-3">
                          <span className="flex items-center gap-1"><Video size={12} /> {c.content_type}</span>
                          <span className="flex items-center gap-1"><Clock size={12} /> {c.duration_minutes} мин</span>
                          <span className="flex items-center gap-1"><Layers size={12} /> {c.total_lessons} уроков</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1 mb-1">
                          <div className={`${meta.progressColor} h-1 rounded-full`} style={{ width: '0%' }} />
                        </div>
                        <p className="text-[10px] text-zharyq-gray text-right">Не начато</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ANALYTICS VIEW */}
        {view === 'analytics' && (
          <div className="flex-1 overflow-y-auto p-6 md:p-8 text-zharyq-dark">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center gap-3 mb-8">
                <button onClick={() => setView('chat')} className="text-zharyq-gray hover:text-zharyq-dark transition-colors"><ArrowLeft size={20} /></button>
                <div>
                  <h1 className="text-xl font-semibold">Моя аналитика</h1>
                  <p className="text-xs text-zharyq-gray mt-0.5">Личные показатели</p>
                </div>
              </div>
              <div className="border border-zharyq-border rounded-2xl p-5 mb-6 bg-zharyq-bg">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-sm font-semibold">Стресс и Мотивация</h2>
                  <div className="flex items-center gap-4 text-[11px] text-zharyq-gray">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded-full bg-zharyq-orange inline-block" />Стресс</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded-full bg-zharyq-teal inline-block" />Мотивация</span>
                  </div>
                </div>
                <p className="text-xs text-zharyq-gray mb-4">Изменение показателей за период</p>
                <div style={{ height: '200px' }}>
                  <Line data={lineData} options={lineOptions} />
                </div>
              </div>
              <div className="border border-zharyq-border rounded-2xl p-5 mb-6 bg-zharyq-bg">
                <h2 className="text-sm font-semibold mb-4">Достижения</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { icon: Flame, bg: 'bg-orange-50', color: 'text-zharyq-orange', title: 'Серия 5 дней', desc: 'Вы заботитесь о себе всю неделю. Так держать!' },
                    { icon: Sun, bg: 'bg-zharyq-teal-light', color: 'text-zharyq-teal', title: 'Первый чек-ин', desc: 'Вы сделали первый шаг к осознанности.' },
                    { icon: BookOpenCheck, bg: 'bg-blue-50', color: 'text-blue-500', title: 'Первый курс завершён', desc: '«Эмоциональный интеллект» пройден полностью.' },
                    { icon: Trophy, bg: 'bg-gray-100', color: 'text-zharyq-gray', title: 'Серия 30 дней', desc: 'Заходите каждый день в течение месяца.', locked: true },
                  ].map((a, i) => (
                    <div key={i} className={`achievement-card flex items-start gap-3 border border-zharyq-border bg-white rounded-xl p-3 ${a.locked ? 'opacity-40' : ''}`}>
                      <div className={`w-10 h-10 rounded-xl ${a.bg} flex items-center justify-center shrink-0`}>
                        <a.icon size={20} className={a.color} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{a.title}</p>
                        <p className="text-xs text-zharyq-gray mt-0.5 leading-relaxed">{a.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* RIGHT SIDEBAR */}
      <aside className="hidden lg:flex flex-col w-[30%] min-w-[300px] max-w-[360px] bg-white border-l border-zharyq-border p-6 h-full overflow-y-auto">
        <div className="bg-zharyq-teal-light border border-teal-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <span className="flex w-3 h-3 rounded-full bg-zharyq-teal mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-zharyq-teal mb-1">
              Держитесь молодцом!
            </h3>
            <p className="text-xs text-teal-700/80 leading-relaxed">
              Ваш профиль обновляется по мере чекинов. Продолжайте в том же духе.
            </p>
          </div>
        </div>
        <div className="mb-8 text-zharyq-dark">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Психологический профиль</h3>
            <span className="text-[10px] text-zharyq-gray uppercase bg-gray-100 px-2 py-1 rounded">Live</span>
          </div>
          <div className="w-full aspect-square">
            <Radar data={radarData} options={radarOptions} />
          </div>
        </div>
        <div className="text-zharyq-dark">
          <h3 className="text-sm font-semibold mb-4">Рекомендации для вас</h3>
          {[
            { icon: Zap, bg: 'bg-orange-50', color: 'text-zharyq-orange', title: 'Управление стрессом', sub: 'Видео • 5 минут', progress: 40 },
            { icon: Brain, bg: 'bg-blue-50', color: 'text-blue-500', title: 'Фокус и концентрация', sub: 'Упражнение • 3 минуты', progress: 0 },
          ].map((r, i) => (
            <div key={i} className="border border-zharyq-border rounded-xl p-4 mb-3 hover:border-zharyq-gray transition-colors cursor-pointer group">
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg ${r.bg} flex items-center justify-center shrink-0`}>
                  <r.icon size={20} className={r.color} />
                </div>
                <div>
                  <h4 className={`text-sm font-medium group-hover:${r.color} transition-colors`}>{r.title}</h4>
                  <p className="text-xs text-zharyq-gray mt-0.5">{r.sub}</p>
                </div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1">
                <div className="bg-zharyq-teal h-1.5 rounded-full" style={{ width: `${r.progress}%` }} />
              </div>
              <p className="text-[10px] text-zharyq-gray text-right">{r.progress === 0 ? 'Не начато' : `Пройдено ${r.progress}%`}</p>
            </div>
          ))}
        </div>
      </aside>

      {/* MOBILE BOTTOM NAV */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-zharyq-border pt-2 pb-4 px-4 flex justify-between z-20">
        {[
          { id: 'chat', icon: MessageSquare, label: 'Чат' },
          { id: 'tests', icon: ClipboardList, label: 'Тесты' },
          { id: 'analytics', icon: BarChart2, label: 'Аналитика' },
          { id: 'courses', icon: BookOpen, label: 'Курсы' },
        ].map(item => (
          <button key={item.id} onClick={() => setView(item.id)} className={`flex flex-col items-center gap-1 p-2 transition-colors ${view === item.id ? 'text-zharyq-orange' : 'text-zharyq-gray'}`}>
            <item.icon size={20} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
