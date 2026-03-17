import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import {
  Sparkles, Plus, MessageSquare, BookOpen, BarChart2, Info, Settings,
  Bell, GraduationCap, Paperclip, Mic, ArrowUp, FileText, Camera,
  ArrowLeft, Search, Video, Clock, Layers, Headphones, Activity,
  Zap, BatteryLow, Heart, Rocket, Brain, SearchX, Flame, Sun,
  BookOpenCheck, Trophy, BarChart, User, MessageCircle, ClipboardList, LogOut, Edit2, Trash2, Check, X,
  ChevronRight, ChevronLeft, CheckCircle, Target, Shield, AlertTriangle, Square
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Line, Radar } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Filler, Tooltip, Legend, RadialLinearScale
} from 'chart.js'
import ThemeToggle from '../components/ThemeToggle'
import { useTheme } from '../context/ThemeContext'
import { fetchUserMetrics, fetchTests, fetchTestDetail, submitTest, fetchMyTestResults } from '../api/api'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend, RadialLinearScale)

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

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

const LEVEL_LABELS = { low: 'Низкий', medium: 'Средний', high: 'Высокий' }
const LEVEL_STYLES = {
  low: 'text-red-600 bg-red-50 border-red-100',
  medium: 'text-amber-600 bg-amber-50 border-amber-100',
  high: 'text-green-700 bg-green-50 border-green-100',
}
const ANSWER_OPTIONS = [
  { value: 0, label: 'Нет' },
  { value: 1, label: 'Скорее нет, чем да' },
  { value: 2, label: 'Скорее да, чем нет' },
  { value: 3, label: 'Да' },
]

function getChartColors(isDark) {
  return {
    text: isDark ? '#A1A1AA' : '#6B7280',
    grid: isDark ? '#3F3F46' : '#E5E7EB',
  }
}

function getDynamicGreeting(metrics, testHistory) {
  const hour = new Date().getHours()
  const day = new Date().getDay() // 0=вс, 1=пн, ..., 5=пт, 6=сб

  let timeGreeting
  if (hour >= 5 && hour < 12) timeGreeting = 'Доброе утро'
  else if (hour >= 12 && hour < 18) timeGreeting = 'Добрый день'
  else if (hour >= 18 && hour < 22) timeGreeting = 'Добрый вечер'
  else timeGreeting = 'Доброй ночи'

  const latest = metrics[metrics.length - 1]
  const latestTest = testHistory[0]

  let subtitle
  if (latest?.stress > 70) {
    subtitle = 'Кажется, последнее время было напряжённым — как вы сейчас?'
  } else if (latest?.motivation < 30) {
    subtitle = 'Мотивация немного упала. Поговорим о том, что происходит?'
  } else if (latestTest?.overall_level === 'low') {
    subtitle = 'Последний тест показал, что вам может быть непросто. Расскажите, как дела?'
  } else if (day === 1 && hour < 14) {
    subtitle = 'Новая неделя — как настрой?'
  } else if (day === 5 && hour >= 14) {
    subtitle = 'Пятница! Как прошла неделя?'
  } else if (day === 0 || day === 6) {
    subtitle = 'Хороших выходных! Как отдыхаете?'
  } else if (hour >= 18) {
    subtitle = 'Как прошёл день?'
  } else if (hour < 9) {
    subtitle = 'Как начинается ваше утро?'
  } else {
    subtitle = 'Как вы себя чувствуете сегодня?'
  }

  return { timeGreeting, subtitle }
}

export default function StudentApp() {
  const navigate = useNavigate()
  const { isDark } = useTheme()
  const { user: authUser, logout, token } = useAuth()
  const [view, setView] = useState('chat')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [metrics, setMetrics] = useState([])
  const [apiCourses, setApiCourses] = useState([])
  const [coursesLoading, setCoursesLoading] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [aiRecommendations, setAiRecommendations] = useState([])
  const [chatSessions, setChatSessions] = useState([])
  const [currentSessionId, setCurrentSessionId] = useState(null)
  const [editingSessionId, setEditingSessionId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [deleteConfirmSession, setDeleteConfirmSession] = useState(null)
  const eventSourceRef = useRef(null)

  // ── Test state ──
  const [availableTests, setAvailableTests] = useState([])
  const [testHistory, setTestHistory] = useState([])
  const [activeTest, setActiveTest] = useState(null)        // full test with questions
  const [testAnswers, setTestAnswers] = useState({})        // { questionId: value }
  const [currentQ, setCurrentQ] = useState(0)               // current question index
  const [testResult, setTestResult] = useState(null)         // result after submit
  const [testLoading, setTestLoading] = useState(false)
  const [testSubmitting, setTestSubmitting] = useState(false)
  
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

  // Load test history on mount for the right sidebar
  useEffect(() => {
    fetchMyTestResults()
      .then(setTestHistory)
      .catch(() => setTestHistory([]))
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
    if (view === 'tests') {
      setTestLoading(true)
      Promise.all([fetchTests(), fetchMyTestResults().catch(() => [])])
        .then(([tests, results]) => {
          setAvailableTests(tests)
          setTestHistory(results)
        })
        .catch(console.error)
        .finally(() => setTestLoading(false))
    }
  }, [view])

  // ── Test flow helpers ──
  const startTest = async (testId) => {
    setTestLoading(true)
    try {
      const detail = await fetchTestDetail(testId)
      setActiveTest(detail)
      setTestAnswers({})
      setCurrentQ(0)
      setTestResult(null)
    } catch (e) {
      console.error(e)
    } finally {
      setTestLoading(false)
    }
  }

  const answerQuestion = (qId, value) => {
    setTestAnswers(prev => ({ ...prev, [qId]: value }))
  }

  const handleSubmitTest = async () => {
    if (!activeTest) return
    setTestSubmitting(true)
    try {
      const result = await submitTest(activeTest.id, testAnswers)
      setTestResult(result)
      // refresh metrics after test
      if (authUser?.id) {
        fetchUserMetrics(authUser.id).then(setMetrics).catch(console.error)
      }
      // refresh test history
      fetchMyTestResults().catch(() => []).then(setTestHistory)
    } catch (e) {
      console.error(e)
    } finally {
      setTestSubmitting(false)
    }
  }

  const exitTest = () => {
    setActiveTest(null)
    setTestResult(null)
    setTestAnswers({})
    setCurrentQ(0)
  }

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
        .then(data => {
          const sorted = [...data].sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));
          setMetrics(sorted);
        })
        .catch(console.error)

      // Pre-load sidebar recommendations from last known metrics
      fetch(`${API}/recommendations/${authUser.id}`)
        .then(r => r.ok ? r.json() : [])
        .then(recs => {
          if (recs.length > 0) {
            setAiRecommendations(recs.map(r => {
              const meta = CATEGORY_META[r.category] || DEFAULT_META
              return { id: r.id, title: r.title, sub: r.category, icon: meta.icon, bg: meta.bg, color: meta.iconColor, courseId: r.id }
            }))
          }
        })
        .catch(console.error)
    }
  }, [authUser])

  // Load chat history on mount
  useEffect(() => {
    if (!authUser?.id) return
    fetch(`${API}/ai/chat/sessions/${authUser.id}`)
      .then(r => r.ok ? r.json() : [])
      .then(sessions => {
        setChatSessions(sessions)
        if (sessions.length > 0) {
          loadSession(sessions[0].id)
        }
      })
      .catch(console.error)
  }, [authUser])

  const loadSession = (sessionId) => {
    if (isStreaming) return
    setCurrentSessionId(sessionId)
    fetch(`${API}/ai/chat/history/${sessionId}`)
      .then(r => r.ok ? r.json() : [])
      .then(history => {
        setMessages(history.map(h => {
          if (h.role === 'recommendation_card') {
            try { return { role: 'recommendation_card', course: JSON.parse(h.content) } }
            catch { return null }
          }
          if (h.role === 'test_recommendation_card') {
            try { return { role: 'test_recommendation_card', test: JSON.parse(h.content) } }
            catch { return null }
          }
          return { role: h.role === 'assistant' ? 'ai' : 'user', text: h.content }
        }).filter(Boolean))
        setView('chat')
      })
      .catch(console.error)
  }

  const refreshMetrics = () => {
    if (authUser?.id) {
      fetchUserMetrics(authUser.id)
        .then(data => {
          const sorted = [...data].sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));
          setMetrics(sorted);
        })
        .catch(console.error)
    }
  }

  const navItems = [
    { id: 'chat', icon: MessageSquare, label: 'AI-Ассистент' },
    { id: 'tests', icon: ClipboardList, label: 'Тесты' },
    { id: 'courses', icon: BookOpen, label: 'База курсов' },
    { id: 'analytics', icon: BarChart2, label: 'Моя аналитика' },
  ]

  const sendMessage = async (text) => {
    const msg = text || input.trim()
    if (!msg || isStreaming) return
    setInput('')

    let activeSessionId = currentSessionId
    if (!activeSessionId) {
      try {
        const res = await fetch(`${API}/ai/chat/sessions?user_id=${authUser?.id || 1}`, { method: 'POST' })
        if (res.ok) {
          const newSession = await res.json()
          setChatSessions(prev => [newSession, ...prev])
          setCurrentSessionId(newSession.id)
          activeSessionId = newSession.id
        }
      } catch (e) {
        console.error(e)
        return
      }
    }

    // Add user message immediately
    setMessages(prev => [...prev, { role: 'user', text: msg }])

    // Add empty AI bubble that will be filled via SSE
    setMessages(prev => [...prev, { role: 'ai', text: '', streaming: true }])
    setIsStreaming(true)

    const url = `${API}/ai/chat/stream?user_id=${authUser?.id || 1}&session_id=${activeSessionId}&message=${encodeURIComponent(msg)}`
    const es = new EventSource(url)
    eventSourceRef.current = es

    es.onmessage = (event) => {
      if (event.data === '[DONE]') {
        es.close()
        setIsStreaming(false)
        // Mark last AI message as no longer streaming
        setMessages(prev => prev.map((m, i) =>
          i === prev.length - 1 && m.role === 'ai' ? { ...m, streaming: false } : m
        ))
        refreshMetrics()
        return
      }
      try {
        const payload = JSON.parse(event.data)
        if (payload.type === 'token') {
          setMessages(prev => {
            const updated = [...prev]
            const last = updated[updated.length - 1]
            if (last && last.role === 'ai') {
              updated[updated.length - 1] = { ...last, text: last.text + payload.content }
            }
            return updated
          })
        } else if (payload.type === 'profile_updated') {
          const m = payload.metrics;
          const now = new Date().toISOString();
          // Agent 2 fired — update radar data directly without refetch
          // Сортировка по времени для гарантии правильного порядка на графике
          // Данные с бэкенда могут приходить от старых к новым
          setMetrics(prev => {
            const newArray = [
              ...prev,
              { stress: m.stress, burnout: m.burnout, anxiety: m.anxiety, motivation: m.motivation, emotion: m.emotion, recorded_at: now }
            ]
            // Отсортируем явно по дате (старые -> новые)
            return newArray.sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at))
          })

          if (m.critical_type && m.critical_type !== 'none') {
            setAiRecommendations(prev => [
              { id: Date.now(), title: 'Экстренная поддержка', sub: `ИИ обнаружил тревожное состояние (${m.critical_type === 'anxiety' ? 'Тревога' : 'Выгорание'}). Рекомендуем курс по управлению состоянием.`, icon: Brain, bg: 'bg-violet-50', color: 'text-violet-500', critical: true },
              ...prev.slice(0, 2)
            ])
          } else if (m.critical_type === 'none') {
            // Remove any existing critical specific recommendations if state improved
            setAiRecommendations(prev => prev.filter(r => !r.critical))
          }

          // Update course recommendations sidebar from Agent 2 analysis
          if (m.recommendations && m.recommendations.length > 0) {
            const courseRecs = m.recommendations.map(r => {
              const meta = CATEGORY_META[r.category] || { icon: BookOpen, bg: 'bg-orange-50', color: 'text-zharyq-orange' }
              return { id: r.id, title: r.title, sub: r.category, icon: meta.icon, bg: meta.bg, color: meta.iconColor, courseId: r.id }
            })
            setAiRecommendations(prev => {
              const critical = prev.filter(r => r.critical)
              return [...critical, ...courseRecs].slice(0, 3)
            })
          }
        } else if (payload.type === 'recommendation_card') {
          // Inline course card in chat
          setMessages(prev => [...prev, { role: 'recommendation_card', course: payload.course }])
        } else if (payload.type === 'test_recommendation_card') {
          // Inline test card in chat
          setMessages(prev => [...prev, { role: 'test_recommendation_card', test: payload.test }])
        } else if (payload.type === 'error') {
          setMessages(prev => prev.map((m, i) =>
            i === prev.length - 1 && m.role === 'ai' ? { ...m, text: payload.content, streaming: false } : m
          ))
          es.close()
          setIsStreaming(false)
        }
      } catch (e) {
        console.error('SSE parse error', e)
      }
    }

    es.onerror = () => {
      es.close()
      setIsStreaming(false)
      setMessages(prev => prev.map((m, i) =>
        i === prev.length - 1 && m.role === 'ai' && m.text === ''
          ? { ...m, text: 'Не удалось подключиться к AI-сервису. Убедитесь, что Ollama запущена.', streaming: false }
          : m
      ))
    }
  }

  const stopGeneration = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }
    setIsStreaming(false)
    setMessages(prev => prev.map((m, i) =>
      i === prev.length - 1 && m.role === 'ai'
        ? { ...m, streaming: false }
        : m
    ))
  }

  const createNewSession = async () => {
    if (isStreaming) return
    if (eventSourceRef.current) eventSourceRef.current.close()
    try {
      const res = await fetch(`${API}/ai/chat/sessions?user_id=${authUser?.id || 1}`, { method: 'POST' })
      if (res.ok) {
        const newSession = await res.json()
        setChatSessions([newSession, ...chatSessions])
        setCurrentSessionId(newSession.id)
        setMessages([])
        setView('chat')
      }
    } catch (e) {
      console.error(e)
    }
  }

  const deleteSession = (session, e) => {
    e.stopPropagation()
    setDeleteConfirmSession(session)
  }

  const confirmDelete = async () => {
    if (!deleteConfirmSession) return
    const sessionId = deleteConfirmSession.id
    try {
      const res = await fetch(`${API}/ai/chat/sessions/${sessionId}`, { method: 'DELETE' })
      if (res.ok) {
        setChatSessions(prev => prev.filter(s => s.id !== sessionId))
        if (currentSessionId === sessionId) {
          setMessages([])
          setCurrentSessionId(null)
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setDeleteConfirmSession(null)
    }
  }

  const startEditingSession = (sessionId, currentTitle, e) => {
    e.stopPropagation()
    setEditingSessionId(sessionId)
    setEditTitle(currentTitle)
  }

  const saveEditedSession = async (sessionId, e) => {
    e.stopPropagation()
    try {
      const res = await fetch(`${API}/ai/chat/sessions/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: editTitle || 'Новый чат' })
      })
      if (res.ok) {
        setChatSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title: editTitle || 'Новый чат' } : s))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setEditingSessionId(null)
    }
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

  // metrics теперь всегда отсортирован (старые -> новые)
  const lineLabels = metrics.length ? metrics.map(m => new Date(m.recorded_at).toLocaleDateString('ru-RU')) : ['Нет данных'];
  const dataStress = metrics.length ? metrics.map(m => m.stress) : [0];
  const dataMotivation = metrics.length ? metrics.map(m => m.motivation) : [0];

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

  const latestMetric = metrics.length ? metrics[metrics.length - 1] : { stress: 0, burnout: 0, anxiety: 0, motivation: 0, emotion: 0 };
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
    plugins: { legend: { display: false }, tooltip: { filter: (_, index) => index === 0 } },
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
        <button onClick={createNewSession} className="w-full bg-zharyq-orange hover:bg-zharyq-orange-hover text-white text-sm font-medium py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 mb-8">
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
        <div className="flex-1 overflow-y-auto pr-1">
          <p className="text-xs font-semibold text-zharyq-gray uppercase tracking-wider mb-2 px-2">История</p>
          <div className="flex flex-col gap-1">
            {chatSessions.map(session => (
              <div key={session.id} className={`group flex items-center justify-between px-3 py-2 text-sm truncate rounded-md cursor-pointer transition-colors ${currentSessionId === session.id ? 'bg-gray-100 text-zharyq-dark font-medium' : 'text-zharyq-gray hover:text-zharyq-dark hover:bg-gray-50'}`} onClick={() => loadSession(session.id)}>
                {editingSessionId === session.id ? (
                  <div className="flex w-full items-center gap-1" onClick={e => e.stopPropagation()}>
                    <input autoFocus value={editTitle} onChange={e => setEditTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveEditedSession(session.id, e)} className="flex-1 text-xs px-1 border border-zharyq-border rounded outine-none focus:ring-1 focus:ring-zharyq-orange" />
                    <button onClick={e => saveEditedSession(session.id, e)} className="text-green-600 hover:text-green-700"><Check size={14}/></button>
                    <button onClick={() => setEditingSessionId(null)} className="text-gray-400 hover:text-gray-600"><X size={14}/></button>
                  </div>
                ) : (
                  <>
                    <span className="truncate flex-1 pr-2">{session.title}</span>
                    <div className={`${currentSessionId === session.id ? 'flex' : 'hidden group-hover:flex'} items-center gap-1 opacity-60`}>
                      <button onClick={e => startEditingSession(session.id, session.title, e)} className="hover:text-zharyq-orange px-1"><Edit2 size={13}/></button>
                      <button onClick={e => deleteSession(session, e)} className="hover:text-red-500 px-1"><Trash2 size={13}/></button>
                    </div>
                  </>
                )}
              </div>
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
      <main className={`flex-1 flex flex-col h-full relative pb-16 md:pb-0 ${isDark ? 'bg-[#18181B] text-zinc-100' : 'bg-white text-zharyq-dark'}`}>
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
            <div id="chat-container" className="flex-1 overflow-y-auto flex flex-col animate-fade-in-up pt-4 md:pt-6">
              {messages.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[400px]">
                  <div className="max-w-lg w-full">
                    <div className="w-12 h-12 rounded-2xl bg-zharyq-orange flex items-center justify-center mx-auto mb-5">
                      <Sparkles size={22} className="text-white" />
                    </div>
                    {(() => { const g = getDynamicGreeting(metrics, testHistory); return <>
                    <h2 className="text-2xl font-semibold mb-2">{g.timeGreeting}, {authUser?.username || 'Студент'}</h2>
                    <p className={`mb-8 text-sm ${isDark ? 'text-zinc-400' : 'text-zharyq-gray'}`}>{g.subtitle}</p>
                    </> })()}
                    <div className="flex flex-wrap justify-center gap-2">
                      <button onClick={() => sendMessage('Хочу пройти тест на уровень стресса')} className={`border text-sm px-4 py-2 rounded-xl transition-colors flex items-center gap-2 hover:border-zharyq-orange ${isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-100' : 'bg-white border-zharyq-border text-zharyq-dark'}`}>
                        <FileText size={16} className="text-zharyq-gray" />Оценить стресс
                      </button>
                      <button onClick={() => sendMessage('Определи мои эмоции')} className={`border text-sm px-4 py-2 rounded-xl transition-colors flex items-center gap-2 hover:border-zharyq-orange ${isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-100' : 'bg-white border-zharyq-border text-zharyq-dark'}`}>
                        <Camera size={16} className="text-zharyq-gray" />Скан по лицу
                      </button>
                      <button onClick={() => sendMessage('Признаки выгорания, устал')} className={`border text-sm px-4 py-2 rounded-xl transition-colors flex items-center gap-2 hover:border-zharyq-orange ${isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-100' : 'bg-white border-zharyq-border text-zharyq-dark'}`}>
                        <Activity size={16} className="text-zharyq-gray" />Выгорание
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {messages.map((msg, i) => {
                // ── Test recommendation card row ─────────────────────────────
                if (msg.role === 'test_recommendation_card') {
                  return (
                    <div key={i} className="px-4 md:px-8 py-4 animate-fade-in-up">
                      <div className="max-w-3xl mx-auto flex gap-4">
                        <div className="w-9 shrink-0" />
                        <div
                          onClick={() => setView('tests')}
                          className={`flex-1 rounded-xl border cursor-pointer group hover:border-zharyq-teal transition-colors duration-150 overflow-hidden ${isDark ? 'bg-[#27272A] border-[#3F3F46]' : 'bg-white border-[#E5E7EB]'}`}
                        >
                          <div className="p-4">
                            <div className="flex items-center mb-3">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-zharyq-teal bg-zharyq-teal/10">
                                <ClipboardList size={8} />ИИ рекомендует тест
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isDark ? 'bg-teal-900/40' : 'bg-teal-50'}`}>
                                <ClipboardList size={20} className="text-zharyq-teal" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-medium text-zharyq-teal mb-0.5">Психологический тест</p>
                                <h4 className={`text-sm font-semibold leading-snug group-hover:text-zharyq-teal transition-colors line-clamp-2 ${isDark ? 'text-zinc-100' : 'text-zharyq-dark'}`}>{msg.test.title}</h4>
                              </div>
                            </div>
                            {msg.test.description && (
                              <p className={`text-xs mt-2 line-clamp-2 ${isDark ? 'text-zinc-400' : 'text-zharyq-gray'}`}>{msg.test.description}</p>
                            )}
                          </div>
                          <div className={`px-4 pb-3 pt-2.5 border-t flex items-center justify-between ${isDark ? 'border-[#3F3F46]' : 'border-[#E5E7EB]'}`}>
                            <span className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zharyq-gray'}`}>
                              {msg.test.duration_minutes} мин · {msg.test.questions_count} вопросов
                            </span>
                            <div className="flex items-center gap-1 text-xs font-semibold text-zharyq-teal group-hover:translate-x-0.5 transition-transform">
                              Пройти тест <ChevronRight size={13} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                }

                // ── Recommendation card row ──────────────────────────────────
                if (msg.role === 'recommendation_card') {
                  const meta = CATEGORY_META[msg.course.category] || { icon: BookOpen, bg: 'bg-orange-50', iconColor: 'text-zharyq-orange', tagColor: 'text-zharyq-orange' }
                  const CardIcon = meta.icon
                  return (
                    <div key={i} className="px-4 md:px-8 py-4 animate-fade-in-up">
                      <div className="max-w-3xl mx-auto flex gap-4">
                        <div className="w-9 shrink-0" />
                        <div
                            onClick={() => navigate(`/course/${msg.course.id}`)}
                            className={`flex-1 rounded-xl border cursor-pointer group hover:border-zharyq-orange transition-colors duration-150 overflow-hidden ${isDark ? 'bg-[#27272A] border-[#3F3F46]' : 'bg-white border-[#E5E7EB]'}`}
                          >
                            <div className="p-4">
                              <div className="flex items-center mb-3">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-zharyq-orange bg-zharyq-orange/10">
                                  <Sparkles size={8} />ИИ рекомендует
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl ${meta.bg} flex items-center justify-center shrink-0`}>
                                  <CardIcon size={20} className={meta.iconColor} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-[11px] font-medium ${meta.iconColor} mb-0.5`}>{msg.course.category}</p>
                                  <h4 className={`text-sm font-semibold leading-snug group-hover:text-zharyq-orange transition-colors line-clamp-2 ${isDark ? 'text-zinc-100' : 'text-zharyq-dark'}`}>{msg.course.title}</h4>
                                </div>
                              </div>
                            </div>
                            <div className={`px-4 pb-3 pt-2.5 border-t flex items-center justify-between ${isDark ? 'border-[#3F3F46]' : 'border-[#E5E7EB]'}`}>
                              <span className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zharyq-gray'}`}>Начать курс</span>
                              <div className="flex items-center gap-1 text-xs font-semibold text-zharyq-teal group-hover:translate-x-0.5 transition-transform">
                                Перейти <ChevronRight size={13} />
                              </div>
                            </div>
                          </div>
                      </div>
                    </div>
                  )
                }

                // ── User message — speech bubble ─────────────────────────────
                if (msg.role === 'user') {
                  return (
                    <div key={i} className="px-4 md:px-8 py-2 animate-fade-in-up">
                      <div className="max-w-3xl mx-auto flex justify-end">
                        <div className="selection-teal rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed max-w-[75%] text-white" style={{ background: 'var(--color-accent)' }}>
                          {msg.text}
                        </div>
                      </div>
                    </div>
                  )
                }

                // ── AI message — flat text row ───────────────────────────────
                return (
                  <div key={i} className="px-4 md:px-8 py-4 animate-fade-in-up">
                    <div className="max-w-3xl mx-auto flex gap-4">
                      <div className="w-9 h-9 rounded-full bg-zharyq-orange flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles size={14} className="text-white" />
                      </div>
                      <div className={`flex-1 text-sm leading-[1.6] prose-sm ${isDark ? 'text-zinc-100 prose-invert' : 'text-zharyq-dark'}`}>
                        {msg.streaming && msg.text === '' ? (
                          <span className="flex gap-1 items-center py-0">
                            <span className={`w-1.5 h-1.5 rounded-full animate-bounce ${isDark ? 'bg-zinc-500' : 'bg-zharyq-gray'}`} style={{ animationDelay: '0ms' }} />
                            <span className={`w-1.5 h-1.5 rounded-full animate-bounce ${isDark ? 'bg-zinc-500' : 'bg-zharyq-gray'}`} style={{ animationDelay: '150ms' }} />
                            <span className={`w-1.5 h-1.5 rounded-full animate-bounce ${isDark ? 'bg-zinc-500' : 'bg-zharyq-gray'}`} style={{ animationDelay: '300ms' }} />
                          </span>
                        ) : (
                          <div className="markdown-content">
                            <ReactMarkdown
                              components={{
                                p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                                strong: ({node, ...props}) => <strong className="font-semibold text-zharyq-orange" {...props} />,
                                em: ({node, ...props}) => <em className="italic opacity-90" {...props} />,
                                ul: ({node, ...props}) => <ul className="list-disc list-inside mb-2 pl-2" {...props} />,
                                ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-2 pl-2" {...props} />,
                                li: ({node, ...props}) => <li className="mb-1" {...props} />,
                                blockquote: ({node, ...props}) => <blockquote className={`border-l-4 border-zharyq-orange pl-3 py-1 my-2 italic ${isDark ? 'text-zinc-300' : 'text-zharyq-gray'}`} {...props} />,
                                code: ({node, inline, ...props}) => inline ?
                                  <code className={`px-1.5 py-0.5 rounded text-xs font-mono ${isDark ? 'bg-zinc-700 text-zinc-200' : 'bg-gray-100 text-zharyq-dark'}`} {...props} /> :
                                  <code className={`block px-3 py-2 rounded text-xs font-mono mb-2 overflow-x-auto ${isDark ? 'bg-zinc-800 text-zinc-200' : 'bg-gray-50 text-zharyq-dark'}`} {...props} />,
                              }}
                            >
                              {msg.text}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className={`border-t p-4 md:p-6 animate-fade-in-up ${isDark ? 'bg-[#18181B] border-[#3F3F46]' : 'bg-white border-[#E5E7EB]'}`} style={{ animationDelay: '50ms' }}>
              <div className="max-w-3xl mx-auto">
                <div className={`relative flex items-center gap-2 border rounded-2xl p-2 focus-within:border-zharyq-orange focus-within:ring-1 focus-within:ring-zharyq-orange transition-all ${isDark ? 'bg-[#27272A] border-[#3F3F46]' : 'bg-white border-zharyq-border'}`}>
                  <button className="p-2 text-zharyq-gray hover:text-zharyq-dark rounded-xl shrink-0 flex items-center justify-center"><Paperclip size={20} /></button>
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Расскажите, как вы себя чувствуете..."
                    className={`w-full bg-transparent border-none focus:ring-0 focus:outline-none resize-none py-2 text-sm max-h-32 scrollbar-hide align-middle ${isDark ? 'text-zinc-100 placeholder:text-zinc-500' : 'text-zharyq-dark'}`}
                    style={{ minHeight: '40px' }}
                  />
                  <div className="flex items-center gap-1 shrink-0 h-fit">
                    <button className="p-2 text-zharyq-gray hover:text-zharyq-orange rounded-xl transition-colors flex items-center justify-center"><Mic size={20} /></button>
                    {isStreaming ? (
                      <button onClick={stopGeneration} className="p-2 text-white bg-zharyq-teal hover:bg-zharyq-teal/90 rounded-xl transition-colors flex items-center justify-center" title="Остановить генерацию"><Square size={20} /></button>
                    ) : (
                      <button onClick={() => sendMessage()} className="p-2 text-white bg-zharyq-orange hover:bg-zharyq-orange-hover rounded-xl transition-colors flex items-center justify-center" title="Отправить сообщение"><ArrowUp size={20} /></button>
                    )}
                  </div>
                </div>
                <p className={`text-center text-[11px] mt-3 hidden md:block ${isDark ? 'text-zinc-500' : 'text-zharyq-gray'}`}>Zharyq AI может допускать ошибки. Результаты тестов конфиденциальны.</p>
              </div>
            </div>
          </>
        )}

        {/* TESTS VIEW */}
        {view === 'tests' && (
          <div className="flex-1 overflow-y-auto p-6 md:p-8 text-zharyq-dark animate-fade-in-up">
            <div className="max-w-3xl mx-auto">

              {/* ── RESULT SCREEN ── */}
              {testResult && (
                <div className="animate-fade-in-up">
                  <div className="flex items-center gap-3 mb-6">
                    <button onClick={exitTest} className="text-zharyq-gray hover:text-zharyq-dark transition-colors"><ArrowLeft size={20} /></button>
                    <h1 className="text-xl font-semibold">Результаты теста</h1>
                  </div>

                  <div className="border border-zharyq-border rounded-2xl p-6 mb-6 bg-zharyq-bg">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-zharyq-teal-light flex items-center justify-center">
                        <CheckCircle size={24} className="text-zharyq-teal" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold">Тест пройден!</h2>
                        <p className="text-xs text-zharyq-gray">{testResult.test_title}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                      <div className="border border-zharyq-border rounded-xl p-3 bg-white">
                        <p className="text-[10px] text-zharyq-gray uppercase tracking-wide mb-1">Общий балл</p>
                        <p className="text-2xl font-bold text-zharyq-dark">{testResult.total_score}</p>
                        <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full border mt-1 ${LEVEL_STYLES[testResult.overall_level] || ''}`}>
                          {LEVEL_LABELS[testResult.overall_level] || testResult.overall_level}
                        </span>
                      </div>
                      {[
                        { label: 'Вовлечённость', score: testResult.involvement_score, level: testResult.involvement_level, icon: Target },
                        { label: 'Контроль', score: testResult.control_score, level: testResult.control_level, icon: Shield },
                        { label: 'Принятие риска', score: testResult.risk_score, level: testResult.risk_level, icon: Zap },
                      ].map(s => (
                        <div key={s.label} className="border border-zharyq-border rounded-xl p-3 bg-white">
                          <p className="text-[10px] text-zharyq-gray uppercase tracking-wide mb-1 flex items-center gap-1">
                            <s.icon size={10} /> {s.label}
                          </p>
                          <p className="text-2xl font-bold text-zharyq-dark">{s.score}</p>
                          <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full border mt-1 ${LEVEL_STYLES[s.level] || ''}`}>
                            {LEVEL_LABELS[s.level] || s.level}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Interpretation */}
                    <div className="border border-zharyq-border rounded-xl p-4 bg-white mb-4">
                      <h3 className="text-sm font-semibold mb-2">Интерпретация</h3>
                      <p className="text-xs text-zharyq-gray leading-relaxed">
                        {testResult.overall_level === 'high' && 'У вас высокий уровень жизнестойкости. Вы хорошо справляетесь со стрессом, уверены в себе и открыты к новому опыту. Продолжайте поддерживать свое психологическое здоровье!'}
                        {testResult.overall_level === 'medium' && 'У вас средний уровень жизнестойкости. Вы в целом неплохо справляетесь со стрессом, но некоторые области можно укрепить. Рекомендуем пройти курсы по управлению стрессом и развитию контроля.'}
                        {testResult.overall_level === 'low' && 'Ваш уровень жизнестойкости ниже среднего. Это означает, что стрессовые ситуации могут быть для вас сложными. Рекомендуем обратиться к психологу и пройти курсы по управлению стрессом и развитию эмоциональной устойчивости.'}
                      </p>
                    </div>

                    {/* Recommendations */}
                    {testResult.recommendations && (() => {
                      try {
                        const recs = JSON.parse(testResult.recommendations)
                        if (recs.length > 0) return (
                          <div>
                            <h3 className="text-sm font-semibold mb-3">Рекомендованные курсы</h3>
                            <div className="flex flex-col gap-2">
                              {recs.map(r => (
                                <div key={r.id} onClick={() => navigate(`/course/${r.id}`)} className="border border-zharyq-border rounded-xl p-3 bg-white flex items-center gap-3 hover:border-zharyq-orange transition-colors cursor-pointer group">
                                  <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                                    <BookOpen size={16} className="text-zharyq-orange" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium group-hover:text-zharyq-orange transition-colors">{r.title}</p>
                                    <p className="text-[10px] text-zharyq-gray">{r.category}</p>
                                  </div>
                                  <ChevronRight size={16} className="text-zharyq-gray" />
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      } catch { return null }
                      return null
                    })()}
                  </div>

                  <button onClick={exitTest} className="w-full py-3 rounded-xl text-white text-sm font-semibold transition-colors" style={{ background: 'var(--color-accent)' }}>
                    Вернуться к тестам
                  </button>
                </div>
              )}

              {/* ── ACTIVE TEST (question by question) ── */}
              {activeTest && !testResult && (
                <div className="animate-fade-in-up">
                  <div className="flex items-center gap-3 mb-6">
                    <button onClick={exitTest} className="text-zharyq-gray hover:text-zharyq-dark transition-colors"><ArrowLeft size={20} /></button>
                    <div className="flex-1">
                      <h1 className="text-lg font-semibold">{activeTest.title}</h1>
                      <p className="text-xs text-zharyq-gray">Вопрос {currentQ + 1} из {activeTest.questions.length}</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-gray-100 rounded-full h-1.5 mb-8">
                    <div className="bg-zharyq-orange h-1.5 rounded-full transition-all duration-300" style={{ width: `${((currentQ + 1) / activeTest.questions.length) * 100}%` }} />
                  </div>

                  {/* Question */}
                  {activeTest.questions[currentQ] && (
                    <div className="border border-zharyq-border rounded-2xl p-6 mb-6 bg-zharyq-bg">
                      <p className="text-xs text-zharyq-gray mb-2">Вопрос {activeTest.questions[currentQ].position}</p>
                      <p className="text-base font-medium mb-6 leading-relaxed">{activeTest.questions[currentQ].text}</p>

                      <div className="flex flex-col gap-2">
                        {ANSWER_OPTIONS.map(opt => {
                          const qId = activeTest.questions[currentQ].id
                          const isSelected = testAnswers[qId] === opt.value
                          return (
                            <button
                              key={opt.value}
                              onClick={() => answerQuestion(qId, opt.value)}
                              className={`w-full text-left px-4 py-3 rounded-xl text-sm border transition-all ${
                                isSelected
                                  ? 'border-zharyq-orange bg-orange-50 text-zharyq-orange font-medium'
                                  : 'border-zharyq-border bg-white hover:border-zharyq-gray text-zharyq-dark'
                              }`}
                            >
                              {opt.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Navigation */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
                      disabled={currentQ === 0}
                      className="flex items-center gap-1 px-4 py-2.5 border border-zharyq-border rounded-xl text-sm text-zharyq-gray hover:text-zharyq-dark hover:border-zharyq-gray disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft size={16} /> Назад
                    </button>
                    <div className="flex-1" />
                    {currentQ < activeTest.questions.length - 1 ? (
                      <button
                        onClick={() => setCurrentQ(currentQ + 1)}
                        disabled={testAnswers[activeTest.questions[currentQ]?.id] === undefined}
                        className="flex items-center gap-1 px-6 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        style={{ background: 'var(--color-accent)' }}
                      >
                        Далее <ChevronRight size={16} />
                      </button>
                    ) : (
                      <button
                        onClick={handleSubmitTest}
                        disabled={Object.keys(testAnswers).length < activeTest.questions.length || testSubmitting}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        style={{ background: 'var(--color-accent)' }}
                      >
                        {testSubmitting ? 'Обработка...' : 'Завершить тест'}
                        <CheckCircle size={16} />
                      </button>
                    )}
                  </div>

                  {/* Question dots */}
                  <div className="flex flex-wrap gap-1.5 mt-6 justify-center">
                    {activeTest.questions.map((q, i) => (
                      <button
                        key={q.id}
                        onClick={() => setCurrentQ(i)}
                        className={`w-6 h-6 rounded-full text-[9px] font-bold border transition-all ${
                          i === currentQ
                            ? 'border-zharyq-orange bg-zharyq-orange text-white'
                            : testAnswers[q.id] !== undefined
                              ? 'border-zharyq-teal bg-zharyq-teal-light text-zharyq-teal'
                              : 'border-zharyq-border bg-white text-zharyq-gray hover:border-zharyq-gray'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── TEST LIST (no active test) ── */}
              {!activeTest && !testResult && (
                <>
                  <div className="flex items-center gap-3 mb-8">
                    <button onClick={() => setView('chat')} className="text-zharyq-gray hover:text-zharyq-dark transition-colors"><ArrowLeft size={20} /></button>
                    <h1 className="text-xl font-semibold">Доступные тесты</h1>
                  </div>

                  {testLoading ? (
                    <div className="text-center py-16 text-zharyq-gray text-sm">Загрузка...</div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                        {availableTests.map(t => (
                          <div key={t.id} className="border border-zharyq-border rounded-2xl p-5 hover:border-zharyq-gray transition-colors cursor-pointer group flex flex-col h-full">
                            <div className="flex items-start gap-3 mb-4">
                              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                                <Zap size={20} className="text-zharyq-orange" />
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold group-hover:text-zharyq-orange transition-colors">{t.title}</h4>
                                <p className="text-xs text-zharyq-gray mt-1 leading-relaxed">{t.description}</p>
                              </div>
                            </div>
                            <div className="mt-auto flex items-center justify-between text-[11px] text-zharyq-gray border-t border-zharyq-border pt-3">
                              <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1"><Clock size={12} /> {t.duration_minutes} мин</span>
                                <span className="flex items-center gap-1"><Layers size={12} /> {t.questions_count} вопросов</span>
                              </div>
                              <button onClick={() => startTest(t.id)} className="text-zharyq-orange font-semibold hover:underline">Пройти</button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Test history */}
                      <div className="border border-zharyq-border rounded-2xl overflow-hidden">
                        <div className="px-5 py-4 border-b border-zharyq-border">
                          <h2 className="text-sm font-semibold">История прохождений</h2>
                        </div>
                        {testHistory.length === 0 ? (
                          <p className="px-5 py-6 text-sm text-center text-zharyq-gray">Вы ещё не прошли ни одного теста</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-zharyq-border bg-zharyq-bg/50 text-zharyq-dark">
                                  {['Дата', 'Тест', 'Балл', 'Уровень'].map(h => (
                                    <th key={h} className="text-left text-[11px] font-semibold text-zharyq-gray uppercase tracking-wide px-5 py-3">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {testHistory.map((row, i) => (
                                  <tr key={i} className="border-b border-zharyq-border hover:bg-zharyq-bg transition-colors">
                                    <td className="px-5 py-3.5 text-zharyq-gray text-xs whitespace-nowrap">{new Date(row.created_at).toLocaleDateString('ru-RU')}</td>
                                    <td className="px-5 py-3.5 font-medium text-xs">{row.test_title}</td>
                                    <td className="px-5 py-3.5 text-xs font-bold">{row.total_score}</td>
                                    <td className="px-5 py-3.5">
                                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold border px-2 py-0.5 rounded-full ${LEVEL_STYLES[row.overall_level] || ''}`}>
                                        {LEVEL_LABELS[row.overall_level] || row.overall_level}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}

            </div>
          </div>
        )}

        {/* COURSES VIEW */}
        {view === 'courses' && (
          <div className="flex-1 overflow-y-auto p-6 md:p-8 text-zharyq-dark animate-fade-in-up">
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
                    <div key={c.id} onClick={() => navigate(`/course/${c.id}`)} className="course-card border border-zharyq-border rounded-2xl overflow-hidden hover:border-zharyq-gray transition-colors cursor-pointer group">
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
          <div className="flex-1 overflow-y-auto p-6 md:p-8 text-zharyq-dark animate-fade-in-up">
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
        {/* Dynamic status banner based on latest test */}
        {(() => {
          const latest = testHistory[0]
          if (!latest) return null
          if (latest.overall_level === 'high') return (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-start gap-3">
              <span className="flex w-3 h-3 rounded-full bg-green-500 mt-0.5 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-green-700 mb-1">Отличный результат!</h3>
                <p className="text-xs text-green-600/80 leading-relaxed">Ваш уровень жизнестойкости высокий. Вы хорошо справляетесь со стрессом. Продолжайте в том же духе!</p>
              </div>
            </div>
          )
          if (latest.overall_level === 'medium') return (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
              <span className="flex w-3 h-3 rounded-full bg-amber-500 mt-0.5 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-amber-700 mb-1">Можно улучшить</h3>
                <p className="text-xs text-amber-600/80 leading-relaxed">У вас средний уровень жизнестойкости. Рекомендуем пройти курсы для укрепления стрессоустойчивости.</p>
              </div>
            </div>
          )
          return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
              <span className="flex w-3 h-3 rounded-full bg-red-500 mt-0.5 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-red-700 mb-1">Требуется внимание</h3>
                <p className="text-xs text-red-600/80 leading-relaxed">Ваш уровень жизнестойкости ниже среднего. Обратитесь к психологу и пройдите рекомендованные курсы.</p>
              </div>
            </div>
          )
        })()}

        {/* Psychological profile radar */}
        <div className="mb-8 text-zharyq-dark">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Психологический профиль</h3>
            <span className="text-[10px] text-zharyq-gray uppercase bg-gray-100 px-2 py-1 rounded">Live</span>
          </div>
          <div className="w-full aspect-square">
            <Radar data={radarData} options={radarOptions} />
          </div>

          {/* Show latest test subscale summary */}
          {testHistory[0] && (
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'Вовлечённость', value: testHistory[0].involvement_score, level: testHistory[0].involvement_level },
                { label: 'Контроль', value: testHistory[0].control_score, level: testHistory[0].control_level },
                { label: 'Принятие риска', value: testHistory[0].risk_score, level: testHistory[0].risk_level },
              ].map(s => (
                <div key={s.label} className="border border-zharyq-border rounded-lg p-2">
                  <p className="text-[9px] text-zharyq-gray">{s.label}</p>
                  <p className="text-lg font-bold">{s.value}</p>
                  <span className={`inline-flex text-[8px] font-semibold px-1.5 py-0.5 rounded-full border ${LEVEL_STYLES[s.level] || ''}`}>
                    {LEVEL_LABELS[s.level] || '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dynamic recommendations from test results */}
        <div className="text-zharyq-dark">
          <h3 className="text-sm font-semibold mb-4">Рекомендации для вас</h3>
          {aiRecommendations.length > 0 && (
            <div className="mb-4">
              {aiRecommendations.map((r) => (
                <div key={r.id} onClick={() => r.courseId && navigate(`/course/${r.courseId}`)} className="border border-zharyq-teal bg-zharyq-bg rounded-xl p-4 mb-3 hover:border-zharyq-teal/80 transition-colors cursor-pointer group relative overflow-hidden animate-fade-in-up">
                  <div className="absolute top-0 right-0 bg-[#0d9488] text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-bl-lg">
                    ИИ Рекомендует
                  </div>
                  <div className="flex items-start gap-3 mb-2 mt-1">
                    <div className={`w-10 h-10 rounded-lg ${r.bg} flex items-center justify-center shrink-0`}>
                      <r.icon size={20} className={r.color} />
                    </div>
                    <div className="flex-1">
                      <h4 className={`text-sm font-medium group-hover:${r.color} transition-colors`}>{r.title}</h4>
                      <p className="text-xs text-zharyq-gray mt-0.5 leading-relaxed">{r.sub}</p>
                    </div>
                    {r.courseId && <ChevronRight size={16} className="text-zharyq-gray mt-1 shrink-0" />}
                  </div>
                </div>
              ))}
            </div>
          )}

          {(() => {
            const latest = testHistory[0]
            let recs = []
            if (latest?.recommendations) {
              try { recs = JSON.parse(latest.recommendations) } catch {}
            }
            if (recs.length > 0) {
              return recs.map(r => (
                <div key={r.id} onClick={() => navigate(`/course/${r.id}`)} className="border border-zharyq-teal bg-zharyq-bg rounded-xl p-4 mb-3 hover:border-zharyq-teal/80 transition-colors cursor-pointer group">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-zharyq-teal-light flex items-center justify-center shrink-0">
                      <BookOpen size={20} className="text-zharyq-teal" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium group-hover:text-zharyq-teal transition-colors">{r.title}</h4>
                      <p className="text-xs text-zharyq-gray mt-0.5">{r.category}</p>
                    </div>
                    <ChevronRight size={16} className="text-zharyq-gray mt-1 shrink-0" />
                  </div>
                </div>
              ))
            }
            return (
              <div className="border border-dashed border-zharyq-border rounded-xl p-4 text-center">
                <ClipboardList size={24} className="mx-auto mb-2 text-zharyq-gray opacity-40" />
                <p className="text-xs text-zharyq-gray">Пройдите тест, чтобы получить персональные рекомендации</p>
                <button onClick={() => setView('tests')} className="text-xs font-semibold text-zharyq-orange mt-2 hover:underline">
                  Перейти к тестам →
                </button>
              </div>
            )
          })()}
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

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmSession && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4 animate-overlay-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-modal-in">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
                <Trash2 size={24} className="text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-zharyq-dark mb-2">Удалить этот чат?</h3>
              <p className="text-sm text-zharyq-gray mb-6 leading-relaxed">
                Вы собираетесь удалить чат «<span className="font-medium text-zharyq-dark">{deleteConfirmSession.title}</span>». Это действие необратимо и вся история сообщений будет стерта.
              </p>
              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setDeleteConfirmSession(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-zharyq-border text-zharyq-dark text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Отмена
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors shadow-sm shadow-red-200"
                >
                  Удалить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
