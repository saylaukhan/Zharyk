import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Search, AlertTriangle, Activity, CheckCircle, X, Plus,
  ClipboardList, Clock, Layers, Zap, Brain, BatteryLow, 
  Bell, Users, Calendar, FileText, Settings, ShieldCheck, LogOut, Sparkles, Pencil, Trash2, BookOpen, Eye, Edit3, Image, Upload
} from 'lucide-react'
import { Radar } from 'react-chartjs-2'
import {
  Chart as ChartJS, RadialLinearScale, PointElement, LineElement,
  Filler, Tooltip, Legend
} from 'chart.js'
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { ru } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import ThemeToggle from '../components/ThemeToggle'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import {
  fetchAlertsRich, fetchUsersWithMetrics, fetchSessions, fetchNotes, fetchUserTestResults, fetchTests,
  createSession, updateSession, deleteSession,
  createNote, updateNote, deleteNote,
  resolveAlert
} from '../api/api'
import { getTestLevelInfo } from '../utils/testLevels'
import { useAlertWebSocket } from '../hooks/useAlertWebSocket'
import AlertBanner from '../components/AlertBanner'
import AlertDetailModal from '../components/AlertDetailModal'

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

const locales = { 'ru': ru }
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales })

const calendarMessages = {
  allDay: 'Весь день',
  previous: 'Назад',
  next: 'Вперёд',
  today: 'Сегодня',
  month: 'Месяц',
  week: 'Неделя',
  day: 'День',
  agenda: 'Список',
  date: 'Дата',
  time: 'Время',
  event: 'Событие',
  noEventsInRange: 'Нет событий в этом диапазоне.',
  showMore: (total) => `+ ещё ${total}`,
}

// Helpers
function timeAgo(dateString) {
  if (!dateString) return '';
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 15) return 'Только что';
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  return `${days} дн. назад`;
}

function levelMeta(level) {
  switch (level) {
    case 'critical': return { label: 'Критический', color: 'text-red-500', bg: 'bg-red-50', dot: 'bg-red-500', class: 'text-red-600 bg-red-50 border-red-100' };
    case 'medium': return { label: 'Средний', color: 'text-amber-500', bg: 'bg-amber-50', dot: 'bg-amber-500', class: 'text-amber-600 bg-amber-50 border-amber-100' };
    case 'high': return { label: 'Высокий', color: 'text-orange-500', bg: 'bg-orange-50', dot: 'bg-orange-500', class: 'text-orange-600 bg-orange-50 border-orange-100' };
    default: return { label: 'Низкий', color: 'text-zharyq-teal', bg: 'bg-zharyq-teal-light', dot: 'bg-zharyq-teal', class: 'text-zharyq-teal bg-zharyq-teal-light border-teal-100' };
  }
}

function studentStatus(stress) {
  if (stress >= 80) return { label: 'Алерт', style: { background: '#FEF2F2', color: '#DC2626', border: '1px solid #FEE2E2' }, class: 'bg-red-50 text-red-600 border border-red-100' };
  if (stress >= 60) return { label: 'Риск', style: { background: '#FFFBEB', color: '#D97706', border: '1px solid #FEF3C7' }, class: 'bg-amber-50 text-amber-600 border border-amber-100' };
  return { label: 'Норма', style: { background: 'var(--color-teal-light)', color: 'var(--color-teal)', border: '1px solid rgba(20,184,166,0.2)' }, class: '' };
}

const TESTS_LIB = [
  { id: 'psm25', title: 'Шкала психологического стресса (PSM-25)', desc: 'Оценка уровня стрессовой нагрузки.', duration: '5-7 мин', questions: 25, icon: Zap, color: 'text-zharyq-orange', bg: 'bg-orange-50' },
  { id: 'mbi', title: 'Опросник выгорания (MBI)', desc: 'Диагностика профессионального и учебного выгорания.', duration: '10-15 мин', questions: 22, icon: BatteryLow, color: 'text-amber-500', bg: 'bg-amber-50' },
  { id: 'beck', title: 'Шкала тревожности Бека (BAI)', desc: 'Оценка выраженности тревожных симптомов.', duration: '10 мин', questions: 21, icon: Brain, color: 'text-violet-500', bg: 'bg-violet-50' },
  { id: 'smd', title: 'Опросник мотивации', desc: 'Оценка уровня учебной мотивации.', duration: '10 мин', questions: 20, icon: Activity, color: 'text-blue-500', bg: 'bg-blue-50' },
  { id: 'eq', title: 'Тест на эмоциональный интеллект', desc: 'Оценка эмоционального интеллекта по Холлу.', duration: '15 мин', questions: 30, icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50' }
]

const CATEGORIES = ['Стресс', 'Выгорание', 'Эмоции', 'Мотивация', 'Тревожность']
const CONTENT_TYPES = ['Видео', 'Статья', 'Упражнение', 'Тест']
const CATEGORY_STYLES = {
  'Стресс': { tag: 'text-orange-600 bg-orange-50 border-orange-200' },
  'Выгорание': { tag: 'text-amber-600 bg-amber-50 border-amber-200' },
  'Тревожность': { tag: 'text-violet-600 bg-violet-50 border-violet-200' },
  'Мотивация': { tag: 'text-blue-600 bg-blue-50 border-blue-200' },
  'Эмоции': { tag: 'text-teal-600 bg-teal-50 border-teal-200' }
}
const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

const EMPTY_FORM = {
  title: '',
  description: '',
  category: 'Стресс',
  content_type: 'Видео',
  duration_minutes: 30,
  total_lessons: 5,
  questions: '',
}

// Returns display name: real username if student consented, otherwise anonymous ID
function studentDisplayName(u) {
  if (!u) return 'Неизвестный'
  return u.personalized_mode ? u.username : (u.anonymous_id || `Аноним #${u.id}`)
}

export default function Psychologist() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { isDark } = useTheme()
  const { user: authUser, logout } = useAuth()
  
  const initialView = searchParams.get('tab') || 'alerts'
  const [view, setView] = useState(initialView)

  // Sync active view with URL preserving other query params if any
  useEffect(() => {
    setSearchParams({ tab: view }, { replace: true })
  }, [view, setSearchParams])
  const [profileOpen, setProfileOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)

  const [alerts, setAlerts] = useState([])
  const [students, setStudents] = useState([])
  const [sessions, setSessions] = useState([])
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)

  const [courses, setCourses] = useState([])
  const [coursesLoading, setCoursesLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [userTestResults, setUserTestResults] = useState([])

  // Session calendar state
  const [calendarView, setCalendarView] = useState('month')
  const [calendarDate, setCalendarDate] = useState(new Date())
  const [sessionModalOpen, setSessionModalOpen] = useState(false)
  const [sessionModalMode, setSessionModalMode] = useState('create') // create | view | edit
  const [selectedSession, setSelectedSession] = useState(null)
  const [sessionForm, setSessionForm] = useState({
    user_id: '', title: '', notes: '', scheduled_date: '', scheduled_time: '',
    duration_minutes: 50, session_type: 'individual'
  })
  const [sessionSaving, setSessionSaving] = useState(false)
  const [sessionDeleteConfirm, setSessionDeleteConfirm] = useState(false)
  const [preselectedStudentId, setPreselectedStudentId] = useState(null)
  const [psyTests, setPsyTests] = useState([])
  const [psyTestsLoading, setPsyTestsLoading] = useState(false)
  const [selectedAlert, setSelectedAlert] = useState(null)
  const [liveAlerts, setLiveAlerts] = useState([])
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const refreshStudents = () => {
    fetchUsersWithMetrics('student').then(setStudents).catch(() => {})
  }

  // Notes modal state
  const [noteModalOpen, setNoteModalOpen] = useState(false)
  const [noteModalMode, setNoteModalMode] = useState('create') // create | view | edit
  const [selectedNote, setSelectedNote] = useState(null)
  const [noteForm, setNoteForm] = useState({ title: '', description: '' })
  const [noteImages, setNoteImages] = useState([]) // File objects for new uploads
  const [noteExistingImages, setNoteExistingImages] = useState([]) // existing image URLs to keep
  const [noteSaving, setNoteSaving] = useState(false)
  const [noteDeleteConfirm, setNoteDeleteConfirm] = useState(false)
  const [noteImagePreviews, setNoteImagePreviews] = useState([]) // preview URLs for new uploads

  useEffect(() => {
    Promise.all([
      fetchAlertsRich().catch(() => []),
      fetchUsersWithMetrics('student').catch(() => []),
      fetchSessions().catch(() => []),
      fetchNotes().catch(() => [])
    ]).then(([alertsData, studentsData, sessionsData, notesData]) => {
      setAlerts(alertsData)
      setStudents(studentsData)
      setSessions(sessionsData)
      setNotes(notesData)
      setLoading(false)
    })
  }, [])

  // Reload notes
  const reloadNotes = useCallback(() => {
    fetchNotes().then(setNotes).catch(console.error)
  }, [])

  useEffect(() => {
    if (view === 'notes') reloadNotes()
  }, [view, reloadNotes])

  // Reload sessions when switching to sessions view
  const reloadSessions = useCallback(() => {
    fetchSessions().then(setSessions).catch(console.error)
  }, [])

  useEffect(() => {
    if (view === 'sessions') reloadSessions()
  }, [view, reloadSessions])

  // Poll student metrics every 60s when the users view is active
  useEffect(() => {
    if (view !== 'users') return
    const interval = setInterval(refreshStudents, 60000)
    return () => clearInterval(interval)
  }, [view])

  // Play a short beep using Web Audio API (for Critical alerts)
  const playAlertSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch {
      // AudioContext blocked or unavailable — silent fallback
    }
  };

  // Real-time WebSocket alerts
  useAlertWebSocket(authUser?.id, (alertData) => {
    const id = alertData.alert_id ?? alertData.id;
    setAlerts(prev => {
      if (id && prev.some(a => (a.id ?? a.alert_id) === id)) return prev;
      return [alertData, ...prev];
    });
    setLiveAlerts(prev => {
      if (id && prev.some(a => (a.alert_id ?? a.id) === id)) return prev;
      return [alertData, ...prev];
    });
    if (alertData.level === 'critical' || alertData.level === 'high') {
      playAlertSound();
    }
    // Refresh student metrics since their state may have changed
    refreshStudents();
  });

  // Load tests dynamically when 'tests' view is opened
  useEffect(() => {
    if (view === 'tests' && psyTests.length === 0) {
      setPsyTestsLoading(true)
      fetchTests()
        .then(setPsyTests)
        .catch(console.error)
        .finally(() => setPsyTestsLoading(false))
    }
  }, [view, psyTests.length])

  // Session calendar events
  const calendarEvents = useMemo(() => sessions.map(s => {
    const start = new Date(s.scheduled_at)
    const end = new Date(start.getTime() + (s.duration_minutes || 50) * 60000)
    return { id: s.id, title: s.title, start, end, resource: s }
  }), [sessions])

  const openSessionCreate = (slotInfo) => {
    const d = slotInfo?.start || new Date()
    const dateStr = format(d, 'yyyy-MM-dd')
    const timeStr = format(d, 'HH:mm')
    setSessionForm({
      user_id: preselectedStudentId || '', title: '', notes: '',
      scheduled_date: dateStr, scheduled_time: timeStr,
      duration_minutes: 50, session_type: 'individual'
    })
    setSelectedSession(null)
    setSessionModalMode('create')
    setSessionModalOpen(true)
    setSessionDeleteConfirm(false)
  }

  const openSessionView = (event) => {
    const s = event.resource
    const start = new Date(s.scheduled_at)
    setSelectedSession(s)
    setSessionForm({
      user_id: s.user_id, title: s.title, notes: s.notes || '',
      scheduled_date: format(start, 'yyyy-MM-dd'),
      scheduled_time: format(start, 'HH:mm'),
      duration_minutes: s.duration_minutes || 50,
      session_type: s.session_type || 'individual'
    })
    setSessionModalMode('view')
    setSessionModalOpen(true)
    setSessionDeleteConfirm(false)
  }

  const switchToEdit = () => setSessionModalMode('edit')

  const handleSessionSave = async () => {
    if (!sessionForm.user_id || !sessionForm.title.trim() || !sessionForm.scheduled_date || !sessionForm.scheduled_time) return
    setSessionSaving(true)
    try {
      const scheduled_at = new Date(`${sessionForm.scheduled_date}T${sessionForm.scheduled_time}:00`).toISOString()
      const payload = {
        user_id: Number(sessionForm.user_id),
        psychologist_id: authUser?.user_id || authUser?.id,
        title: sessionForm.title,
        notes: sessionForm.notes || null,
        scheduled_at,
        duration_minutes: Number(sessionForm.duration_minutes),
        session_type: sessionForm.session_type
      }
      if (sessionModalMode === 'edit' && selectedSession) {
        await updateSession(selectedSession.id, payload)
      } else {
        await createSession(payload)
      }
      setSessionModalOpen(false)
      setPreselectedStudentId(null)
      reloadSessions()
    } catch (e) {
      console.error(e)
      alert('Ошибка при сохранении сессии: ' + e.message)
    } finally {
      setSessionSaving(false)
    }
  }

  const handleSessionDelete = async () => {
    if (!selectedSession) return
    try {
      await deleteSession(selectedSession.id)
      setSessionModalOpen(false)
      reloadSessions()
    } catch (e) {
      console.error(e)
      alert('Ошибка при удалении сессии: ' + e.message)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = {
      current_password: form.current_password.value,
      new_password: form.new_password.value,
      confirm_password: form.confirm_password.value
    };
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Неизвестная ошибка');
      }
      alert('Пароль успешно изменен!');
      form.reset();
    } catch (err) {
      alert('Ошибка при смене пароля: ' + err.message);
    }
  }

  // Note handlers
  const openNoteCreate = () => {
    setNoteForm({ title: '', description: '' })
    setNoteImages([])
    setNoteExistingImages([])
    setNoteImagePreviews([])
    setSelectedNote(null)
    setNoteModalMode('create')
    setNoteModalOpen(true)
    setNoteDeleteConfirm(false)
  }

  const openNoteView = (note) => {
    setSelectedNote(note)
    setNoteForm({ title: note.title, description: note.description || '' })
    setNoteExistingImages(note.images || [])
    setNoteImages([])
    setNoteImagePreviews([])
    setNoteModalMode('view')
    setNoteModalOpen(true)
    setNoteDeleteConfirm(false)
  }

  const switchNoteToEdit = () => {
    setNoteModalMode('edit')
  }

  const handleNoteImageAdd = (e) => {
    const files = Array.from(e.target.files)
    setNoteImages(prev => [...prev, ...files])
    const previews = files.map(f => URL.createObjectURL(f))
    setNoteImagePreviews(prev => [...prev, ...previews])
  }

  const removeNoteNewImage = (idx) => {
    setNoteImages(prev => prev.filter((_, i) => i !== idx))
    setNoteImagePreviews(prev => {
      URL.revokeObjectURL(prev[idx])
      return prev.filter((_, i) => i !== idx)
    })
  }

  const removeNoteExistingImage = (idx) => {
    setNoteExistingImages(prev => prev.filter((_, i) => i !== idx))
  }

  const handleNoteSave = async () => {
    if (!noteForm.title.trim()) return
    setNoteSaving(true)
    try {
      const fd = new FormData()
      fd.append('title', noteForm.title)
      fd.append('description', noteForm.description || '')
      fd.append('user_id', String(authUser?.user_id || authUser?.id))

      if (noteModalMode === 'edit' && selectedNote) {
        fd.append('keep_images', JSON.stringify(noteExistingImages))
        noteImages.forEach(img => fd.append('images', img))
        await updateNote(selectedNote.id, fd)
      } else {
        noteImages.forEach(img => fd.append('images', img))
        await createNote(fd)
      }
      setNoteModalOpen(false)
      reloadNotes()
    } catch (e) {
      console.error(e)
      alert('Ошибка при сохранении заметки: ' + e.message)
    } finally {
      setNoteSaving(false)
    }
  }

  const handleNoteDelete = async () => {
    if (!selectedNote) return
    try {
      await deleteNote(selectedNote.id)
      setNoteModalOpen(false)
      reloadNotes()
    } catch (e) {
      console.error(e)
      alert('Ошибка при удалении заметки: ' + e.message)
    }
  }

  const titles = { 
    alerts: ['Алерты', 'Учащиеся, требующие внимания'], 
    users: ['Мои подопечные', 'Назначенные учащиеся'], 
    sessions: ['Сессии', 'Запланированные встречи'], 
    notes: ['Заметки', 'Клинические записи'], 
    tests: ['Тестирование', 'Управление методиками и тестирование'],
    courses: ['Управление курсами', 'Создание и редактирование курсов'],
    settings: ['Настройки', 'Управление профилем']
  }

  const navItems = [
    { id: 'alerts', icon: Bell, label: 'Алерты', badge: alerts.filter(a => !a.is_resolved).length || null },
    { id: 'users', icon: Users, label: 'Мои подопечные' },
    { id: 'sessions', icon: Calendar, label: 'Сессии' },
    { id: 'tests', icon: FileText, label: 'Тестирование' },
    { id: 'notes', icon: ClipboardList, label: 'Заметки' },
    { id: 'courses', icon: BookOpen, label: 'Курсы' },
    { id: 'settings', icon: Settings, label: 'Настройки' },
  ]

  const fetchCourses = async () => {
    setCoursesLoading(true)
    try {
      const res = await fetch(`${API}/courses/?show_all=true`)
      const data = await res.json()
      setCourses(data)
    } catch (e) {
      console.error(e)
    } finally {
      setCoursesLoading(false)
    }
  }

  useEffect(() => {
    if (view === 'courses') fetchCourses()
  }, [view])

  const openCreate = () => {
    setEditingCourse(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  const openEdit = (course) => {
    setEditingCourse(course)
    setForm({
      title: course.title,
      description: course.description,
      category: course.category,
      content_type: course.content_type,
      duration_minutes: course.duration_minutes,
      total_lessons: course.total_lessons,
      questions: course.questions || '',
    })
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingCourse(null)
    setForm(EMPTY_FORM)
  }

  const handleSave = async () => {
    if (!form.title.trim() || !form.description.trim()) return
    setSaving(true)
    try {
      const payload = {
        ...form,
        duration_minutes: Number(form.duration_minutes),
        total_lessons: Number(form.total_lessons),
      }
      let res
      if (editingCourse) {
        res = await fetch(`${API}/courses/${editingCourse.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch(`${API}/courses/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }
      if (res.ok) {
        closeModal()
        fetchCourses()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await fetch(`${API}/courses/${id}`, { method: 'DELETE' })
      setDeleteConfirm(null)
      fetchCourses()
    } catch (e) {
      console.error(e)
    }
  }

  const openProfile = (id) => {
    const student = students.find(s => s.id === id)
    setSelectedUser(student)
    setProfileOpen(true)
    // Load test results for this student
    fetchUserTestResults(id)
      .then(setUserTestResults)
      .catch(() => setUserTestResults([]))
  }
  const closeProfile = () => {
    setProfileOpen(false)
    setSelectedUser(null)
    setUserTestResults([])
  }

  const chartGrid = isDark ? '#3F3F46' : '#E5E7EB'
  const chartText = isDark ? '#A1A1AA' : '#6B7280'

  const radarData = selectedUser ? {
    labels: ['Стресс', 'Выгорание', 'Тревожность', 'Мотивация', 'Эмоции'],
    datasets: [{
      label: 'Профиль',
      data: [selectedUser.stress || 0, selectedUser.burnout || 0, selectedUser.anxiety || 0, selectedUser.motivation || 0, selectedUser.emotion || 0],
      backgroundColor: 'rgba(239,68,68,0.15)',
      borderColor: '#EF4444',
      pointBackgroundColor: '#FFFFFF',
      pointBorderColor: '#EF4444',
      borderWidth: 2,
    }]
  } : { datasets: [] }

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
            <button key={item.id} onClick={() => setView(item.id)} className={`psych-nav ${view === item.id ? 'active-nav' : 'text-zharyq-gray hover:bg-gray-100'} w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors`}>
              <item.icon size={16} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{item.badge}</span>}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="pt-4 border-t border-zharyq-border mt-4 flex items-center gap-3 cursor-pointer" onClick={() => setView('settings')}>
          <div className="w-8 h-8 bg-gradient-to-tr from-zharyq-teal to-blue-400 rounded-full flex items-center justify-center text-white text-xs font-bold">
            {authUser?.username?.[0]?.toUpperCase() || 'P'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{authUser?.username || 'Психолог'}</p>
            <p className="text-[10px] text-zharyq-gray flex items-center gap-1"><ShieldCheck size={12} /> {authUser?.class_name || 'Нет класса'}</p>
          </div>
          <button onClick={(e) => { e.stopPropagation(); logout(); }} className="text-zharyq-gray hover:text-zharyq-dark transition-colors" title="Выйти">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 flex flex-col h-full bg-white overflow-hidden text-zharyq-dark">
        <header className="border-b border-zharyq-border px-6 py-4 flex items-center justify-between text-zharyq-dark bg-white shrink-0">
          <div>
            <h1 className="text-lg font-semibold">{titles[view]?.[0]}</h1>
            <p className="text-xs text-zharyq-gray mt-0.5">{titles[view]?.[1]}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen(prev => !prev)}
                className={`relative transition-colors ${notifOpen ? 'text-zharyq-dark' : 'text-zharyq-gray hover:text-zharyq-dark'}`}
              >
                <Bell size={20} />
                {alerts.filter(a => !a.is_resolved).length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border border-white" />
                )}
              </button>

              {notifOpen && (() => {
                const unresolvedAlerts = alerts.filter(a => !a.is_resolved)
                return (
                  <div className="absolute top-full right-0 mt-3 w-80 bg-white border border-zharyq-border rounded-2xl z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-zharyq-border">
                      <h3 className="text-sm font-semibold text-zharyq-dark">Уведомления</h3>
                      <div className="flex items-center gap-2">
                        {unresolvedAlerts.length > 0 && (
                          <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                            {unresolvedAlerts.length}
                          </span>
                        )}
                        <button onClick={() => setNotifOpen(false)} className="text-zharyq-gray hover:text-zharyq-dark transition-colors">
                          <X size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Content */}
                    {unresolvedAlerts.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-zharyq-teal-light flex items-center justify-center mb-3">
                          <CheckCircle size={22} className="text-zharyq-teal" />
                        </div>
                        <p className="text-sm font-medium text-zharyq-dark mb-1">Пока всё спокойно</p>
                        <p className="text-xs text-zharyq-gray leading-relaxed">Новые алерты появятся здесь автоматически</p>
                      </div>
                    ) : (
                      <>
                        <div className="max-h-72 overflow-y-auto divide-y divide-zharyq-border">
                          {unresolvedAlerts.slice(0, 6).map((a) => {
                            const meta = levelMeta(a.level)
                            const uid = a.user_id ?? a.student_id
                            const studentRecord = students.find(s => s.id === uid)
                            const displayName = studentRecord
                              ? studentDisplayName(studentRecord)
                              : (a.anonymous_id || a.student_name || (uid ? `Студент #${uid}` : 'Неизвестный'))
                            return (
                              <div
                                key={a.id ?? a.alert_id}
                                onClick={() => { setSelectedAlert(a); setNotifOpen(false) }}
                                className="px-4 py-3 hover:bg-zharyq-bg transition-colors cursor-pointer"
                              >
                                <div className="flex items-start gap-3">
                                  <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${meta.dot}`} />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2 mb-0.5">
                                      <p className="text-xs font-semibold text-zharyq-dark truncate">{displayName}</p>
                                      <span className="text-[10px] text-zharyq-gray shrink-0">{timeAgo(a.created_at)}</span>
                                    </div>
                                    <p className="text-xs text-zharyq-gray truncate">{a.alert_type || `AI Alert (${a.level})`}</p>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        <div className="border-t border-zharyq-border">
                          <button
                            onClick={() => { setView('alerts'); setNotifOpen(false) }}
                            className="w-full px-4 py-2.5 text-xs font-semibold text-zharyq-orange hover:bg-orange-50 transition-colors text-center"
                          >
                            Открыть все алерты →
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )
              })()}
            </div>
            {view !== 'courses' && (
              <>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zharyq-gray pointer-events-none" />
                  <input type="text" placeholder="Поиск…" className="border border-zharyq-border rounded-xl text-zharyq-dark pl-9 pr-4 py-2 text-sm bg-white focus:border-zharyq-orange focus:ring-1 focus:ring-zharyq-orange transition-all w-52" />
                </div>
                <select className="border border-zharyq-border rounded-xl px-3 text-zharyq-dark py-2 text-sm bg-white focus:ring-0 cursor-pointer">
                  <option>Все классы</option>
                </select>
              </>
            )}
            {view === 'courses' && (
              <button onClick={() => navigate('/course-builder')} className="flex items-center gap-2 text-sm font-medium text-white px-4 py-2 rounded-xl transition-colors" style={{ background: 'var(--color-accent)' }}>
                <Plus size={16} /> Создать курс
              </button>
            )}
            {view === 'notes' && (
              <button onClick={openNoteCreate} className="flex items-center gap-2 text-sm font-medium text-white px-4 py-2 rounded-xl transition-colors" style={{ background: 'var(--color-accent)' }}>
                <Plus size={16} /> Создать заметку
              </button>
            )}
          </div>
        </header>

        {loading ? (
          <div className="flex items-center justify-center p-12 text-zharyq-gray"><Activity className="animate-pulse" /></div>
        ) : (
          <>
            {/* ALERTS VIEW */}
            {view === 'alerts' && (
              <div className="flex-1 overflow-y-auto p-6 animate-fade-in-up">
                <div className="max-w-4xl mx-auto">
                  {/* Real-time live alert banner */}
                  {liveAlerts.length > 0 && (
                    <AlertBanner
                      alerts={liveAlerts}
                      isDark={isDark}
                      onSelect={setSelectedAlert}
                      onDismiss={async (alertId) => {
                        try { await resolveAlert(alertId); } catch { /* already resolved or gone */ }
                        setLiveAlerts(prev => prev.filter(a => (a.alert_id ?? a.id) !== alertId));
                        setAlerts(prev => prev.filter(a => (a.id ?? a.alert_id) !== alertId));
                      }}
                    />
                  )}
                  {(() => {
                    const unresolvedAlerts = alerts.filter(a => !a.is_resolved);
                    const unresolvedStudentIds = new Set(unresolvedAlerts.map(a => a.user_id ?? a.student_id).filter(Boolean));
                    const statsCards = [
                      { icon: AlertTriangle, bg: 'bg-red-50', color: 'text-red-500', count: unresolvedAlerts.filter(a => a.level === 'critical').length, label: 'Критических' },
                      { icon: Activity, bg: 'bg-amber-50', color: 'text-amber-500', count: unresolvedAlerts.filter(a => a.level === 'medium' || a.level === 'high').length, label: 'Средних' },
                      { icon: CheckCircle, bg: 'bg-zharyq-teal-light', color: 'text-zharyq-teal', count: students.filter(s => !unresolvedStudentIds.has(s.id)).length, label: 'В норме' },
                    ];
                    return (
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    {statsCards.map((s, i) => (
                      <div key={i} className="border border-zharyq-border rounded-2xl p-4 flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                          <s.icon size={20} className={s.color} />
                        </div>
                        <div>
                          <p className="text-xl font-bold">{Math.max(0, s.count)}</p>
                          <p className="text-xs text-zharyq-gray">{s.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                    );
                  })()}
                  <div className="border border-zharyq-border rounded-2xl overflow-hidden text-zharyq-dark">
                    <div className="px-5 py-4 border-b border-zharyq-border flex items-center justify-between">
                      <h2 className="text-sm font-semibold">Активные алерты</h2>
                      <span className="text-[11px] text-zharyq-gray">Синхронизировано</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-zharyq-border bg-zharyq-bg text-zharyq-dark">
                            {['Пользователь', 'Класс', 'Тип алерта', 'Уровень', 'Время', 'Действие'].map(h => (
                              <th key={h} className="text-left text-[11px] font-semibold text-zharyq-gray uppercase tracking-wide px-5 py-3">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {alerts.filter(a => !a.is_resolved).map((a, i) => {
                            const meta = levelMeta(a.level);
                            // Support both REST alerts (user_id/anonymous_id) and WS alerts (student_id/student_name)
                            const uid = a.user_id ?? a.student_id;
                            const alertTypeLabel = a.alert_type || `AI Alert (${a.level})`;
                            const studentRecord = students.find(s => s.id === uid);
                            const displayName = studentRecord
                              ? studentDisplayName(studentRecord)
                              : (a.anonymous_id || a.student_name || (uid ? `Студент #${uid}` : 'Неизвестный'));
                            const className = a.class_name || studentRecord?.class_name || '-';
                            return (
                              <tr key={a.id ?? a.alert_id ?? i} className="border-b border-zharyq-border hover:bg-zharyq-bg transition-colors">
                                <td className="px-5 py-3.5">
                                  <div className="flex items-center gap-2.5">
                                    <div className={`w-7 h-7 rounded-full ${meta.bg} flex items-center justify-center text-xs font-bold ${meta.color}`}>
                                      {displayName[0]?.toUpperCase() || 'U'}
                                    </div>
                                    <span className="text-sm font-medium">{displayName}</span>
                                  </div>
                                </td>
                                <td className="px-5 py-3.5 text-zharyq-gray text-xs">{className}</td>
                                <td className="px-5 py-3.5 text-xs font-medium">{alertTypeLabel}</td>
                                <td className="px-5 py-3.5">
                                  <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${meta.class} border px-2 py-0.5 rounded-full`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} /> {meta.label}
                                  </span>
                                </td>
                                <td className="px-5 py-3.5 text-zharyq-gray text-xs whitespace-nowrap" title={timeAgo(a.created_at)}>
                                  {a.created_at ? new Date(a.created_at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                                </td>
                                <td className="px-5 py-3.5 flex items-center gap-3">
                                  <button onClick={() => setSelectedAlert(a)} className="text-xs font-medium text-zharyq-orange hover:underline">Алерт</button>
                                  {uid && <button onClick={() => openProfile(uid)} className="text-xs font-medium text-zharyq-gray hover:underline">Профиль</button>}
                                </td>
                              </tr>
                            )
                          })}
                          {alerts.filter(a => !a.is_resolved).length === 0 && (
                            <tr><td colSpan="6" className="text-center py-6 text-sm text-zharyq-gray">Нет активных алертов</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* USERS VIEW */}
            {view === 'users' && (
              <div className="flex-1 overflow-y-auto p-6 animate-fade-in-up">
                <div className="max-w-4xl mx-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-zharyq-dark">
                    {students.map(u => {
                      const stat = studentStatus(u.stress);
                      return (
                        <div key={u.id} onClick={() => openProfile(u.id)} className="border border-zharyq-border rounded-2xl p-4 hover:border-zharyq-gray transition-colors cursor-pointer group">
                          <div className="flex items-center gap-3 mb-4">
                            <div className={`w-9 h-9 rounded-full bg-gradient-to-tr from-zharyq-teal to-blue-400 flex items-center justify-center text-white text-xs font-bold shrink-0`}>U{u.id}</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold group-hover:text-zharyq-orange transition-colors">{studentDisplayName(u)}</p>
                              <p className="text-xs text-zharyq-gray">{u.class_name || 'Нет класса'} · {u.last_checkin_date ? timeAgo(u.last_checkin_date) : 'Нет чекинов'}</p>
                            </div>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${stat.class}`} style={stat.style}>{stat.label}</span>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-zharyq-gray w-16 shrink-0">Стресс</span>
                              <div className="flex-1 bg-gray-100 rounded-full h-1">
                                <div className="h-1 rounded-full" style={{ width: `${Math.min(100, Math.max(0, u.stress))}%`, background: u.stress > 60 ? '#F87171' : 'var(--color-accent)' }} />
                              </div>
                              <span className="text-zharyq-gray w-5 text-right">{u.stress || 0}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-zharyq-gray w-16 shrink-0">Мотивация</span>
                              <div className="flex-1 bg-gray-100 rounded-full h-1">
                                <div className="h-1 rounded-full" style={{ width: `${Math.min(100, Math.max(0, u.motivation))}%`, background: u.motivation < 40 ? '#FBBF24' : 'var(--color-teal)' }} />
                              </div>
                              <span className="text-zharyq-gray w-5 text-right">{u.motivation || 0}</span>
                            </div>
                          </div>
                          <p className="text-[11px] text-zharyq-gray mt-3 flex items-center gap-1">
                            <span>{u.sessions_count || 0} сессий · {u.courses_count || 0} курсов</span>
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* SESSIONS VIEW — FULL CALENDAR */}
            {view === 'sessions' && (
              <div className="flex-1 overflow-hidden p-0 text-zharyq-dark animate-fade-in-up flex flex-col" style={{ height: 'calc(100vh - 73px)' }}>
                <div className="flex items-center justify-between px-6 py-3 border-b border-zharyq-border shrink-0 bg-white">
                  <p className="text-xs text-zharyq-gray">Нажмите на дату для создания сессии, или на событие для просмотра</p>
                  <button
                    onClick={() => openSessionCreate({ start: new Date() })}
                    className="flex items-center gap-2 text-sm font-medium text-white px-4 py-2 rounded-xl transition-colors"
                    style={{ background: 'var(--color-accent)' }}
                  >
                    <Plus size={16} /> Назначить сессию
                  </button>
                </div>
                <div className="flex-1 px-4 pb-4 pt-2 overflow-auto zharyq-calendar">
                  <BigCalendar
                    localizer={localizer}
                    events={calendarEvents}
                    startAccessor="start"
                    endAccessor="end"
                    culture="ru"
                    messages={calendarMessages}
                    views={['month', 'week', 'day']}
                    view={calendarView}
                    onView={setCalendarView}
                    date={calendarDate}
                    onNavigate={setCalendarDate}
                    selectable
                    onSelectSlot={openSessionCreate}
                    onSelectEvent={openSessionView}
                    style={{ height: '100%', minHeight: '600px' }}
                    eventPropGetter={(event) => {
                      const s = event.resource
                      const bg = s.is_completed ? '#14B8A6' : '#F97316'
                      return {
                        style: {
                          backgroundColor: bg,
                          borderRadius: '8px',
                          border: 'none',
                          color: '#fff',
                          fontSize: '12px',
                          fontWeight: 600,
                          padding: '2px 6px'
                        }
                      }
                    }}
                    dayPropGetter={(date) => {
                      const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                      return isToday ? { style: { backgroundColor: 'rgba(249,115,22,0.04)' } } : {}
                    }}
                  />
                </div>
              </div>
            )}

            {/* TESTS VIEW */}
            {view === 'tests' && (
              <div className="flex-1 overflow-y-auto p-6 text-zharyq-dark animate-fade-in-up">
                <div className="max-w-4xl mx-auto">
                  <div className="flex items-center justify-between mb-6">
                    <div className="relative flex-1 max-w-md">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zharyq-gray pointer-events-none" />
                      <input type="text" placeholder="Поиск методики..." className="w-full text-zharyq-dark border border-zharyq-border rounded-xl pl-9 pr-4 py-2 text-sm bg-white focus:border-zharyq-orange focus:ring-1 focus:ring-zharyq-orange transition-all" />
                    </div>
                  </div>

                  {psyTestsLoading ? (
                    <div className="text-center py-16 text-zharyq-gray text-sm">Загрузка тестов...</div>
                  ) : psyTests.length === 0 ? (
                    <div className="text-center py-16 text-zharyq-gray text-sm">Нет доступных тестов в базе</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {psyTests.map(t => (
                        <div key={t.id} className="border border-zharyq-border rounded-2xl p-4 hover:border-zharyq-gray transition-colors cursor-pointer group flex flex-col h-full">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                              <Zap size={20} className="text-zharyq-orange" />
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold group-hover:text-zharyq-orange transition-colors leading-tight mb-1">{t.title}</h4>
                              <p className="text-[11px] text-zharyq-gray leading-relaxed">{t.description}</p>
                            </div>
                          </div>
                          <div className="mt-auto pt-3 border-t border-zharyq-border">
                            <div className="flex items-center justify-between mb-3 text-[11px] text-zharyq-gray">
                              <span className="flex items-center gap-1"><Clock size={12} /> {t.duration_minutes} мин</span>
                              <span className="flex items-center gap-1"><Layers size={12} /> {t.questions_count} вопр.</span>
                            </div>
                            <button className="w-full py-1.5 text-[11px] font-semibold text-zharyq-dark border border-zharyq-border rounded-lg hover:bg-gray-50 transition-colors">
                              Назначить классу
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* NOTES VIEW */}
            {view === 'notes' && (
              <div className="flex-1 overflow-y-auto p-6 text-zharyq-dark animate-fade-in-up">
                <div className="max-w-4xl mx-auto">
                  {notes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-zharyq-gray">
                      <ClipboardList size={36} className="opacity-30" />
                      <p className="text-sm">Заметок пока нет. Создайте первую!</p>
                      <button onClick={openNoteCreate} className="text-sm font-medium text-white px-4 py-2 rounded-xl mt-2" style={{ background: 'var(--color-accent)' }}>
                        <Plus size={14} className="inline mr-1" /> Создать заметку
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {notes.map(n => {
                        const hasImages = n.images && n.images.length > 0
                        return (
                          <div key={n.id} onClick={() => openNoteView(n)} className="border border-zharyq-border rounded-2xl overflow-hidden hover:border-zharyq-gray transition-all cursor-pointer group hover:shadow-sm">
                            {/* Image preview */}
                            {hasImages ? (
                              <div className="h-36 bg-zharyq-bg relative overflow-hidden">
                                <img src={`http://localhost:8000${n.images[0]}`} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                {n.images.length > 1 && (
                                  <span className="absolute bottom-2 right-2 text-[10px] font-semibold bg-black/50 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <Image size={10} /> +{n.images.length - 1}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="h-20 bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
                                <FileText size={24} className="text-zharyq-orange opacity-30" />
                              </div>
                            )}
                            <div className="p-4">
                              <h4 className="text-sm font-semibold mb-1 truncate group-hover:text-zharyq-orange transition-colors">{n.title}</h4>
                              {n.description && <p className="text-xs text-zharyq-gray mb-3 line-clamp-2">{n.description}</p>}
                              <div className="flex items-center justify-between text-[11px] text-zharyq-gray pt-2 border-t border-zharyq-border">
                                <span className="flex items-center gap-1">
                                  <Clock size={11} />
                                  {new Date(n.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                                <span>{new Date(n.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                      {/* Add new note card */}
                      <div
                        onClick={openNoteCreate}
                        className="border border-dashed border-zharyq-border rounded-2xl p-4 hover:border-zharyq-orange transition-colors cursor-pointer opacity-60 hover:opacity-100 flex flex-col items-center justify-center gap-2 text-zharyq-gray hover:text-zharyq-orange min-h-[200px]"
                      >
                        <Plus size={24} />
                        <span className="text-xs">Новая заметка</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SETTINGS VIEW */}
            {view === 'settings' && (
              <div className="flex-1 overflow-y-auto p-6 bg-zharyq-bg/30 text-zharyq-dark animate-fade-in-up">
                <div className="max-w-2xl mx-auto space-y-6">
                  <div className="bg-white border text-zharyq-dark border-zharyq-border rounded-2xl p-6">
                    <h3 className="text-sm font-semibold mb-4">Информация о профиле</h3>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-zharyq-teal to-blue-400 flex items-center justify-center text-white text-xl font-bold">
                        {authUser?.username?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <p className="font-semibold text-lg">{authUser?.username}</p>
                        <p className="text-sm text-zharyq-gray">{authUser?.role}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-zharyq-gray mb-1">Email</p>
                        <p className="text-sm font-medium">{authUser?.email || 'Не указан'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-zharyq-gray mb-1">Класс</p>
                        <p className="text-sm font-medium">{authUser?.class_name || 'Все'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border text-zharyq-dark border-zharyq-border rounded-2xl p-6">
                    <h3 className="text-sm font-semibold mb-4">Смена пароля</h3>
                    <form className="space-y-4" onSubmit={handlePasswordChange}>
                      <div>
                        <label className="block text-xs text-zharyq-gray mb-1">Текущий пароль</label>
                        <input type="password" name="current_password" required className="w-full text-zharyq-dark border border-zharyq-border rounded-xl px-3 py-2 text-sm bg-white focus:border-zharyq-orange focus:ring-1 focus:ring-zharyq-orange transition-all outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs text-zharyq-gray mb-1">Новый пароль</label>
                        <input type="password" name="new_password" required className="w-full text-zharyq-dark border border-zharyq-border rounded-xl px-3 py-2 text-sm bg-white focus:border-zharyq-orange focus:ring-1 focus:ring-zharyq-orange transition-all outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs text-zharyq-gray mb-1">Подтверждение пароля</label>
                        <input type="password" name="confirm_password" required className="w-full text-zharyq-dark border border-zharyq-border rounded-xl px-3 py-2 text-sm bg-white focus:border-zharyq-orange focus:ring-1 focus:ring-zharyq-orange transition-all outline-none" />
                      </div>
                      <button type="submit" className="px-4 py-2 bg-zharyq-orange text-white text-sm font-semibold rounded-xl hover:bg-orange-600 transition-colors">Обновить пароль</button>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* COURSES VIEW */}
        {view === 'courses' && (
          <div className="flex-1 overflow-y-auto p-6 animate-fade-in-up">
            <div className="max-w-4xl mx-auto">
              {coursesLoading ? (
                <div className="flex items-center justify-center py-20 text-zharyq-gray text-sm">Загрузка...</div>
              ) : courses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-zharyq-gray">
                  <BookOpen size={36} className="opacity-30" />
                  <p className="text-sm">Курсов пока нет. Создайте первый!</p>
                  <button onClick={() => navigate('/course-builder')} className="text-sm font-medium text-white px-4 py-2 rounded-xl mt-2" style={{ background: 'var(--color-accent)' }}>
                    <Plus size={14} className="inline mr-1" /> Создать курс
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {courses.map(c => {
                    const tagStyle = CATEGORY_STYLES[c.category] || { tag: 'text-gray-600 bg-gray-50 border-gray-200' }
                    const isDraft = c.status === 'draft'
                    return (
                      <div key={c.id} className="course-card border border-zharyq-border rounded-2xl overflow-hidden hover:border-zharyq-gray transition-colors group">
                        <div className="h-24 bg-zharyq-bg flex items-center justify-center relative">
                          {c.cover_image_url
                            ? <img src={c.cover_image_url} alt="" className="w-full h-full object-cover" />
                            : <BookOpen size={28} className="text-zharyq-gray opacity-20" />
                          }
                          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                            {c.category && (
                              <span className={`text-[10px] font-semibold border px-2 py-0.5 rounded-full ${tagStyle.tag}`}>{c.category}</span>
                            )}
                            <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full border ${isDraft ? 'text-zharyq-gray bg-white border-zharyq-border' : 'text-teal-700 bg-teal-50 border-teal-200'}`}>
                              {isDraft ? 'Черновик' : 'Опубликован'}
                            </span>
                          </div>
                        </div>
                        <div className="p-4">
                          <h4 className="text-sm font-semibold mb-1 truncate">{c.title}</h4>
                          <p className="text-xs text-zharyq-gray mb-3 line-clamp-2">{c.description || 'Описание не добавлено'}</p>
                          <div className="flex items-center gap-3 text-[11px] text-zharyq-gray mb-4">
                            <span className="flex items-center gap-1"><Layers size={11} /> {c.module_count} {c.module_count === 1 ? 'модуль' : c.module_count < 5 ? 'модуля' : 'модулей'}</span>
                          </div>
                          <div className="flex items-center gap-2 pt-2 border-t border-zharyq-border">
                            <button
                              onClick={() => navigate(`/course-builder?id=${c.id}`)}
                              className="flex items-center gap-1.5 text-xs font-medium text-zharyq-gray hover:text-zharyq-orange transition-colors px-2 py-1 rounded-lg hover:bg-orange-50"
                            >
                              <Pencil size={12} /> Редактировать
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(c)}
                              className="flex items-center gap-1.5 text-xs font-medium text-zharyq-gray hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50 ml-auto"
                            >
                              <Trash2 size={12} /> Удалить
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div
                    onClick={() => navigate('/course-builder')}
                    className="border border-dashed border-zharyq-border rounded-2xl p-4 hover:border-zharyq-orange transition-colors cursor-pointer opacity-60 hover:opacity-100 flex flex-col items-center justify-center gap-2 text-zharyq-gray hover:text-zharyq-orange min-h-[220px]"
                  >
                    <Plus size={24} />
                    <span className="text-xs">Создать курс</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* PROFILE DRAWER */}
      <div className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-200 ${profileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={closeProfile} />
      <aside className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white text-zharyq-dark border-l border-zharyq-border z-50 transition-transform duration-300 overflow-y-auto flex flex-col ${profileOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {selectedUser && (
          <>
            <div className="p-5 border-b border-zharyq-border flex items-center justify-between">
              <h2 className="text-sm font-semibold">Профиль учащегося</h2>
              <button onClick={closeProfile} className="text-zharyq-gray hover:text-zharyq-dark transition-colors"><X size={20} /></button>
            </div>
            <div className="p-5 flex-1">
              <div className="flex items-center gap-3 mb-5 pb-5 border-b border-zharyq-border">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-orange-300 to-red-400 flex items-center justify-center text-white text-sm font-bold">U{selectedUser.id}</div>
                <div>
                  <p className="font-semibold">{studentDisplayName(selectedUser)}</p>
                  <p className="text-xs text-zharyq-gray">{selectedUser.class_name} · Последний чек-ин: {selectedUser.last_checkin_date ? timeAgo(selectedUser.last_checkin_date) : 'никогда'}</p>
                </div>
                <span className={`ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full ${studentStatus(selectedUser.stress).class}`} style={studentStatus(selectedUser.stress).style}>{studentStatus(selectedUser.stress).label}</span>
              </div>
              <p className="text-xs font-semibold text-zharyq-gray uppercase tracking-wider mb-3">Психологический профиль</p>
              <div className="w-full aspect-square max-w-[240px] mx-auto mb-5">
                <Radar data={radarData} options={radarOptions} />
              </div>
              <div className="grid grid-cols-2 gap-3 mb-5">
                {[{ label: 'Стресс', value: selectedUser.stress || 0, color: 'text-red-500' }, { label: 'Мотивация', value: selectedUser.motivation || 0, color: 'text-amber-500' }, { label: 'Тревожность', value: selectedUser.anxiety || 0, color: 'text-orange-500' }, { label: 'Курсов', value: selectedUser.courses_count || 0, color: 'text-blue-500' }].map(m => (
                  <div key={m.label} className="border border-zharyq-border rounded-xl p-3">
                    <p className="text-xs text-zharyq-gray mb-1">{m.label}</p>
                    <div className="flex items-end gap-2">
                      <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  setPreselectedStudentId(selectedUser.id)
                  closeProfile()
                  setView('sessions')
                  setTimeout(() => {
                    openSessionCreate({ start: new Date() })
                  }, 300)
                }}
                className="w-full py-2.5 rounded-xl text-white text-sm font-semibold transition-colors mb-5"
                style={{ background: 'var(--color-accent)' }}
              >
                <Calendar size={16} className="inline mr-2" />
                Назначить сессию
              </button>

              {/* Test Results */}
              <div className="border-t border-zharyq-border pt-5">
                <p className="text-xs font-semibold text-zharyq-gray uppercase tracking-wider mb-3">Результаты тестов</p>
                {userTestResults.length === 0 ? (
                  <p className="text-xs text-zharyq-gray text-center py-3">Нет результатов</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {userTestResults.map(r => {
                      const { label: levelLabel, style: levelStyle } = getTestLevelInfo(r.test_slug, r.overall_level);
                      return (
                        <div key={r.id} className="border border-zharyq-border rounded-xl p-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-medium">{r.test_title}</p>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${levelStyle}`}>{levelLabel}</span>
                          </div>
                          {r.test_slug === 'hardiness-maddi' ? (
                            <div className="grid grid-cols-4 gap-1 text-center">
                              <div>
                                <p className="text-[9px] text-zharyq-gray">Общий</p>
                                <p className="text-sm font-bold">{r.total_score}</p>
                              </div>
                              <div>
                                <p className="text-[9px] text-zharyq-gray">Вовлеч.</p>
                                <p className="text-sm font-bold">{r.involvement_score}</p>
                              </div>
                              <div>
                                <p className="text-[9px] text-zharyq-gray">Контроль</p>
                                <p className="text-sm font-bold">{r.control_score}</p>
                              </div>
                              <div>
                                <p className="text-[9px] text-zharyq-gray">Риск</p>
                                <p className="text-sm font-bold">{r.risk_score}</p>
                              </div>
                            </div>
                          ) : (
                            <div>
                               <p className="text-[10px] text-zharyq-gray"><span className="font-semibold text-zharyq-dark">{r.total_score}</span> баллов</p>
                            </div>
                          )}
                          <p className="text-[10px] text-zharyq-gray mt-2">{new Date(r.created_at).toLocaleDateString('ru-RU')}</p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </aside>

      {/* COURSE MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zharyq-border">
              <h2 className="text-sm font-semibold">{editingCourse ? 'Редактировать курс' : 'Создать курс'}</h2>
              <button onClick={closeModal} className="text-zharyq-gray hover:text-zharyq-dark transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-zharyq-gray mb-1.5">Название</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Управление стрессом"
                  className="w-full border border-zharyq-border rounded-xl px-3 py-2.5 text-sm bg-white text-zharyq-dark focus:border-zharyq-orange focus:ring-1 focus:ring-zharyq-orange transition-all outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zharyq-gray mb-1.5">Описание</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Краткое описание курса..."
                  rows={3}
                  className="w-full border border-zharyq-border rounded-xl px-3 py-2.5 text-sm bg-white text-zharyq-dark focus:border-zharyq-orange focus:ring-1 focus:ring-zharyq-orange transition-all outline-none resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zharyq-gray mb-1.5">Категория</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full border border-zharyq-border rounded-xl px-3 py-2.5 text-sm bg-white text-zharyq-dark focus:border-zharyq-orange focus:ring-1 focus:ring-zharyq-orange transition-all outline-none"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zharyq-gray mb-1.5">Тип контента</label>
                  <select
                    value={form.content_type}
                    onChange={e => setForm(f => ({ ...f, content_type: e.target.value }))}
                    className="w-full border border-zharyq-border rounded-xl px-3 py-2.5 text-sm bg-white text-zharyq-dark focus:border-zharyq-orange focus:ring-1 focus:ring-zharyq-orange transition-all outline-none"
                  >
                    {CONTENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zharyq-gray mb-1.5">Время прохождения (мин)</label>
                  <input
                    type="number"
                    min={1}
                    value={form.duration_minutes}
                    onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))}
                    className="w-full border border-zharyq-border rounded-xl px-3 py-2.5 text-sm bg-white text-zharyq-dark focus:border-zharyq-orange focus:ring-1 focus:ring-zharyq-orange transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zharyq-gray mb-1.5">Количество уроков</label>
                  <input
                    type="number"
                    min={1}
                    value={form.total_lessons}
                    onChange={e => setForm(f => ({ ...f, total_lessons: e.target.value }))}
                    className="w-full border border-zharyq-border rounded-xl px-3 py-2.5 text-sm bg-white text-zharyq-dark focus:border-zharyq-orange focus:ring-1 focus:ring-zharyq-orange transition-all outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zharyq-gray mb-1.5">Вопросы курса</label>
                <textarea
                  value={form.questions}
                  onChange={e => setForm(f => ({ ...f, questions: e.target.value }))}
                  placeholder="Введите вопросы курса (каждый с новой строки)..."
                  rows={4}
                  className="w-full border border-zharyq-border rounded-xl px-3 py-2.5 text-sm bg-white text-zharyq-dark focus:border-zharyq-orange focus:ring-1 focus:ring-zharyq-orange transition-all outline-none resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={closeModal} className="flex-1 border border-zharyq-border rounded-xl py-2.5 text-sm font-medium text-zharyq-gray bg-white hover:bg-zharyq-bg transition-colors">
                  Отмена
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.title.trim() || !form.description.trim()}
                  className="flex-1 rounded-xl py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-50"
                  style={{ background: 'var(--color-accent)' }}
                >
                  {saving ? 'Сохранение...' : editingCourse ? 'Сохранить' : 'Создать'}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* SESSION MODAL */}
      {sessionModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSessionModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto text-zharyq-dark" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-zharyq-border">
              <h2 className="text-sm font-semibold">
                {sessionModalMode === 'create' ? 'Назначить сессию' : sessionModalMode === 'edit' ? 'Редактировать сессию' : 'Просмотр сессии'}
              </h2>
              <button onClick={() => setSessionModalOpen(false)} className="text-zharyq-gray hover:text-zharyq-dark transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              {/* Student select */}
              <div>
                <label className="block text-xs font-semibold text-zharyq-gray mb-1.5">Учащийся</label>
                {sessionModalMode === 'view' ? (
                  <p className="text-sm font-medium py-2">{studentDisplayName(students.find(s => s.id === sessionForm.user_id)) || selectedSession?.student_name || `Студент #${sessionForm.user_id}`}</p>
                ) : (
                  <select
                    value={sessionForm.user_id}
                    onChange={e => setSessionForm(f => ({ ...f, user_id: e.target.value }))}
                    className="w-full border border-zharyq-border rounded-xl px-3 py-2.5 text-sm bg-white text-zharyq-dark focus:border-zharyq-orange focus:ring-1 focus:ring-zharyq-orange transition-all outline-none"
                  >
                    <option value="">Выберите учащегося...</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{studentDisplayName(s)} — {s.class_name || 'Нет класса'}</option>
                    ))}
                  </select>
                )}
              </div>
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-zharyq-gray mb-1.5">Тема сессии</label>
                {sessionModalMode === 'view' ? (
                  <p className="text-sm font-medium py-2">{sessionForm.title}</p>
                ) : (
                  <input
                    type="text" value={sessionForm.title}
                    onChange={e => setSessionForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Например: Консультация по стрессу"
                    className="w-full border border-zharyq-border rounded-xl px-3 py-2.5 text-sm bg-white text-zharyq-dark focus:border-zharyq-orange focus:ring-1 focus:ring-zharyq-orange transition-all outline-none"
                  />
                )}
              </div>
              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zharyq-gray mb-1.5">Дата</label>
                  {sessionModalMode === 'view' ? (
                    <p className="text-sm font-medium py-2">{sessionForm.scheduled_date ? new Date(sessionForm.scheduled_date + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</p>
                  ) : (
                    <input
                      type="date" value={sessionForm.scheduled_date}
                      onChange={e => setSessionForm(f => ({ ...f, scheduled_date: e.target.value }))}
                      className="w-full border border-zharyq-border rounded-xl px-3 py-2.5 text-sm bg-white text-zharyq-dark focus:border-zharyq-orange focus:ring-1 focus:ring-zharyq-orange transition-all outline-none"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zharyq-gray mb-1.5">Время</label>
                  {sessionModalMode === 'view' ? (
                    <p className="text-sm font-medium py-2">{sessionForm.scheduled_time || '-'}</p>
                  ) : (
                    <input
                      type="time" value={sessionForm.scheduled_time}
                      onChange={e => setSessionForm(f => ({ ...f, scheduled_time: e.target.value }))}
                      className="w-full border border-zharyq-border rounded-xl px-3 py-2.5 text-sm bg-white text-zharyq-dark focus:border-zharyq-orange focus:ring-1 focus:ring-zharyq-orange transition-all outline-none"
                    />
                  )}
                </div>
              </div>
              {/* Duration & Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zharyq-gray mb-1.5">Длительность (мин)</label>
                  {sessionModalMode === 'view' ? (
                    <p className="text-sm font-medium py-2">{sessionForm.duration_minutes} мин</p>
                  ) : (
                    <input
                      type="number" min={10} max={180} value={sessionForm.duration_minutes}
                      onChange={e => setSessionForm(f => ({ ...f, duration_minutes: e.target.value }))}
                      className="w-full border border-zharyq-border rounded-xl px-3 py-2.5 text-sm bg-white text-zharyq-dark focus:border-zharyq-orange focus:ring-1 focus:ring-zharyq-orange transition-all outline-none"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zharyq-gray mb-1.5">Тип</label>
                  {sessionModalMode === 'view' ? (
                    <p className="text-sm font-medium py-2">{sessionForm.session_type === 'individual' ? 'Индивидуальная' : sessionForm.session_type === 'group' ? 'Групповая' : sessionForm.session_type}</p>
                  ) : (
                    <select
                      value={sessionForm.session_type}
                      onChange={e => setSessionForm(f => ({ ...f, session_type: e.target.value }))}
                      className="w-full border border-zharyq-border rounded-xl px-3 py-2.5 text-sm bg-white text-zharyq-dark focus:border-zharyq-orange focus:ring-1 focus:ring-zharyq-orange transition-all outline-none"
                    >
                      <option value="individual">Индивидуальная</option>
                      <option value="group">Групповая</option>
                      <option value="consultation">Консультация</option>
                    </select>
                  )}
                </div>
              </div>
              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-zharyq-gray mb-1.5">Заметки</label>
                {sessionModalMode === 'view' ? (
                  <p className="text-sm py-2 text-zharyq-gray">{sessionForm.notes || 'Нет заметок'}</p>
                ) : (
                  <textarea
                    value={sessionForm.notes}
                    onChange={e => setSessionForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Заметки к сессии..."
                    rows={3}
                    className="w-full border border-zharyq-border rounded-xl px-3 py-2.5 text-sm bg-white text-zharyq-dark focus:border-zharyq-orange focus:ring-1 focus:ring-zharyq-orange transition-all outline-none resize-none"
                  />
                )}
              </div>
              {/* Status for view */}
              {sessionModalMode === 'view' && selectedSession && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zharyq-gray">Статус:</span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                    selectedSession.is_completed
                      ? 'border-teal-100 text-teal-600 bg-teal-50'
                      : 'border-orange-100 text-orange-600 bg-orange-50'
                  }`}>
                    {selectedSession.is_completed ? 'Завершена' : 'Запланирована'}
                  </span>
                </div>
              )}
              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                {sessionModalMode === 'view' ? (
                  <>
                    <button onClick={switchToEdit} className="flex-1 flex items-center justify-center gap-2 border border-zharyq-border rounded-xl py-2.5 text-sm font-medium text-zharyq-dark hover:bg-zharyq-bg transition-colors">
                      <Edit3 size={14} /> Редактировать
                    </button>
                    {!sessionDeleteConfirm ? (
                      <button onClick={() => setSessionDeleteConfirm(true)} className="flex-1 rounded-xl py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center gap-2">
                        <Trash2 size={14} /> Удалить
                      </button>
                    ) : (
                      <button onClick={handleSessionDelete} className="flex-1 rounded-xl py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors animate-pulse">
                        Подтвердить удаление
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button onClick={() => setSessionModalOpen(false)} className="flex-1 border border-zharyq-border rounded-xl py-2.5 text-sm font-medium text-zharyq-gray bg-white hover:bg-zharyq-bg transition-colors">
                      Отмена
                    </button>
                    <button
                      onClick={handleSessionSave}
                      disabled={sessionSaving || !sessionForm.title.trim() || !sessionForm.user_id || !sessionForm.scheduled_date || !sessionForm.scheduled_time}
                      className="flex-1 rounded-xl py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-50"
                      style={{ background: 'var(--color-accent)' }}
                    >
                      {sessionSaving ? 'Сохранение...' : sessionModalMode === 'edit' ? 'Сохранить' : 'Назначить'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NOTE MODAL */}
      {noteModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setNoteModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto text-zharyq-dark" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-zharyq-border">
              <h2 className="text-sm font-semibold">
                {noteModalMode === 'create' ? 'Новая заметка' : noteModalMode === 'edit' ? 'Редактировать заметку' : 'Просмотр заметки'}
              </h2>
              <button onClick={() => setNoteModalOpen(false)} className="text-zharyq-gray hover:text-zharyq-dark transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-zharyq-gray mb-1.5">Заголовок</label>
                {noteModalMode === 'view' ? (
                  <p className="text-sm font-medium py-2">{noteForm.title}</p>
                ) : (
                  <input
                    type="text" value={noteForm.title}
                    onChange={e => setNoteForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Заголовок заметки..."
                    className="w-full border border-zharyq-border rounded-xl px-3 py-2.5 text-sm bg-white text-zharyq-dark focus:border-zharyq-orange focus:ring-1 focus:ring-zharyq-orange transition-all outline-none"
                  />
                )}
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-zharyq-gray mb-1.5">Содержание</label>
                {noteModalMode === 'view' ? (
                  <div className="text-sm py-2 text-zharyq-gray whitespace-pre-wrap">{noteForm.description || 'Нет описания'}</div>
                ) : (
                  <textarea
                    value={noteForm.description}
                    onChange={e => setNoteForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Текст вашей заметки..."
                    rows={6}
                    className="w-full border border-zharyq-border rounded-xl px-3 py-2.5 text-sm bg-white text-zharyq-dark focus:border-zharyq-orange focus:ring-1 focus:ring-zharyq-orange transition-all outline-none resize-none"
                  />
                )}
              </div>

              {/* Images Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-zharyq-gray">Фотографии</label>
                  {noteModalMode !== 'view' && (
                    <div>
                      <input type="file" id="note-images-upload" multiple accept="image/*" className="hidden" onChange={handleNoteImageAdd} />
                      <label htmlFor="note-images-upload" className="cursor-pointer text-xs font-medium text-zharyq-orange hover:text-orange-600 flex items-center gap-1 bg-orange-50 px-2 py-1 rounded-lg">
                        <Upload size={12} /> Добавить
                      </label>
                    </div>
                  )}
                </div>
                
                {(noteExistingImages.length > 0 || noteImagePreviews.length > 0) ? (
                  <div className="grid grid-cols-4 gap-2">
                    {noteExistingImages.map((imgUrl, i) => (
                      <div key={`exist-${i}`} className="relative aspect-square bg-zharyq-bg rounded-lg overflow-hidden border border-zharyq-border group">
                        <img src={`http://localhost:8000${imgUrl}`} alt="preview" className="w-full h-full object-cover" />
                        {noteModalMode !== 'view' && (
                          <button onClick={() => removeNoteExistingImage(i)} className="absolute top-1 right-1 w-5 h-5 bg-black/50 hover:bg-red-500 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all">
                            <X size={12} />
                          </button>
                        )}
                        {noteModalMode === 'view' && (
                           <a href={`http://localhost:8000${imgUrl}`} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-all flex items-center justify-center opacity-0 hover:opacity-100">
                             <Eye size={20} className="text-white drop-shadow-md" />
                           </a>
                        )}
                      </div>
                    ))}
                    {noteImagePreviews.map((preview, i) => (
                      <div key={`new-${i}`} className="relative aspect-square bg-zharyq-bg rounded-lg overflow-hidden border border-zharyq-border group ring-2 ring-zharyq-teal/30">
                        <img src={preview} alt="preview" className="w-full h-full object-cover" />
                        {noteModalMode !== 'view' && (
                          <button onClick={() => removeNoteNewImage(i)} className="absolute top-1 right-1 w-5 h-5 bg-black/50 hover:bg-red-500 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all">
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-zharyq-gray italic">Нет прикрепленных фото</div>
                )}
              </div>

              {/* Timestamp for view */}
              {noteModalMode === 'view' && selectedNote && (
                 <div className="flex items-center gap-2 mt-2 pt-4 border-t border-zharyq-border">
                   <Clock size={12} className="text-zharyq-gray" />
                   <span className="text-xs text-zharyq-gray">Создано: {new Date(selectedNote.created_at).toLocaleString('ru-RU')}</span>
                 </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-4 border-t border-zharyq-border">
                {noteModalMode === 'view' ? (
                  <>
                    <button onClick={switchNoteToEdit} className="flex-1 flex items-center justify-center gap-2 border border-zharyq-border rounded-xl py-2.5 text-sm font-medium text-zharyq-dark hover:bg-zharyq-bg transition-colors">
                      <Edit3 size={14} /> Редактировать
                    </button>
                    {!noteDeleteConfirm ? (
                      <button onClick={() => setNoteDeleteConfirm(true)} className="flex-1 rounded-xl py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center gap-2">
                        <Trash2 size={14} /> Удалить
                      </button>
                    ) : (
                      <button onClick={handleNoteDelete} className="flex-1 rounded-xl py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors animate-pulse">
                        Подтвердить удаление
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button onClick={() => setNoteModalOpen(false)} className="flex-1 border border-zharyq-border rounded-xl py-2.5 text-sm font-medium text-zharyq-gray bg-white hover:bg-zharyq-bg transition-colors">
                      Отмена
                    </button>
                    <button
                      onClick={handleNoteSave}
                      disabled={noteSaving || !noteForm.title.trim()}
                      className="flex-1 rounded-xl py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-50"
                      style={{ background: 'var(--color-accent)' }}
                    >
                      {noteSaving ? 'Сохранение...' : noteModalMode === 'edit' ? 'Сохранить' : 'Создать'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ALERT DETAIL MODAL */}
      {selectedAlert && (
        <AlertDetailModal
          alert={selectedAlert}
          isDark={isDark}
          onClose={() => setSelectedAlert(null)}
          onResolved={(alertId) => {
            setLiveAlerts(prev => prev.filter(a => (a.alert_id ?? a.id) !== alertId));
            setAlerts(prev => prev.filter(a => (a.id ?? a.alert_id) !== alertId));
          }}
        />
      )}

      {/* DELETE CONFIRM */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-sm font-semibold mb-2">Удалить курс?</h2>
            <p className="text-xs text-zharyq-gray mb-5">«{deleteConfirm.title}» будет удалён без возможности восстановления.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 border border-zharyq-border rounded-xl py-2.5 text-sm font-medium text-zharyq-gray hover:bg-zharyq-bg transition-colors">
                Отмена
              </button>
              <button onClick={() => handleDelete(deleteConfirm.id)} className="flex-1 rounded-xl py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors">
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
