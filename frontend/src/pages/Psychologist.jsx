import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Search, AlertTriangle, Activity, CheckCircle, X, Plus,
  ClipboardList, Clock, Layers, Zap, Brain, BatteryLow,
  Bell, Users, Calendar, FileText, Settings, ShieldCheck, LogOut, Sparkles, Pencil, Trash2, BookOpen, Eye, Edit3, Image, Upload, BarChart2, Megaphone
} from 'lucide-react'
import { Radar, Pie, Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, RadialLinearScale, PointElement, LineElement,
  Filler, Tooltip, Legend, ArcElement, CategoryScale, LinearScale
} from 'chart.js'
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { ru } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import ThemeToggle from '../components/ThemeToggle'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import {
  fetchAlertsRich, fetchUsersWithMetrics, fetchSessions, fetchNotes, fetchUserTestResults, fetchTests,
  createSession, updateSession, deleteSession,
  createNote, updateNote, deleteNote,
  resolveAlert,
  fetchOrgMetrics
} from '../api/api'
import { getTestLevelInfo } from '../utils/testLevels'
import { useAlertWebSocket } from '../hooks/useAlertWebSocket'
import AlertBanner from '../components/AlertBanner'
import AlertDetailModal from '../components/AlertDetailModal'
import CohortComparison from '../components/CohortComparison'
import CampaignHub from '../components/CampaignHub'

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend, ArcElement, CategoryScale, LinearScale)

const locales = { 'ru': ru }
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales })

// calendarMessages is now computed inside the component to support i18n

// Helpers
function timeAgo(dateString, t) {
  if (!dateString) return '';
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 15) return t('psychologist.timeJustNow');
  if (minutes < 60) return t('psychologist.timeMinutesAgo', { minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('psychologist.timeHoursAgo', { hours });
  const days = Math.floor(hours / 24);
  return t('psychologist.timeDaysAgo', { days });
}

function levelMeta(level, t) {
  switch (level) {
    case 'critical': return { label: t('psychologist.levelCritical'), color: 'text-red-500', bg: 'bg-red-50', dot: 'bg-red-500', class: 'text-red-600 bg-red-50 border-red-100' };
    case 'medium': return { label: t('psychologist.levelMedium'), color: 'text-amber-500', bg: 'bg-amber-50', dot: 'bg-amber-500', class: 'text-amber-600 bg-amber-50 border-amber-100' };
    case 'high': return { label: t('psychologist.levelHigh'), color: 'text-orange-500', bg: 'bg-orange-50', dot: 'bg-orange-500', class: 'text-orange-600 bg-orange-50 border-orange-100' };
    default: return { label: t('psychologist.levelLow'), color: 'text-zharyq-teal', bg: 'bg-zharyq-teal-light', dot: 'bg-zharyq-teal', class: 'text-zharyq-teal bg-zharyq-teal-light border-teal-100' };
  }
}

function studentStatus(stress, t) {
  if (stress >= 80) return { label: t('psychologist.statusAlert'), style: { background: '#FEF2F2', color: '#DC2626', border: '1px solid #FEE2E2' }, class: 'bg-red-50 text-red-600 border border-red-100' };
  if (stress >= 60) return { label: t('psychologist.statusRisk'), style: { background: '#FFFBEB', color: '#D97706', border: '1px solid #FEF3C7' }, class: 'bg-amber-50 text-amber-600 border border-amber-100' };
  return { label: t('psychologist.statusNormal'), style: { background: 'var(--color-teal-light)', color: 'var(--color-teal)', border: '1px solid rgba(20,184,166,0.2)' }, class: '' };
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
const API = import.meta.env.VITE_API_URL || '/api/v1'

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
function studentDisplayName(u, t) {
  if (!u) return t ? t('psychologist.unknownUser') : '?'
  return u.personalized_mode ? u.username : (u.anonymous_id || `${t ? t('common.anonymous') : 'Anon'} #${u.id}`)
}

export default function Psychologist() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { isDark } = useTheme()
  const { user: authUser, logout } = useAuth()

  const calendarMessages = {
    allDay: t('psychologist.calendarAllDay'),
    previous: t('psychologist.calendarPrevious'),
    next: t('psychologist.calendarNext'),
    today: t('psychologist.calendarToday'),
    month: t('psychologist.calendarMonth'),
    week: t('psychologist.calendarWeek'),
    day: t('psychologist.calendarDay'),
    agenda: t('psychologist.calendarAgenda'),
    date: t('psychologist.calendarDate'),
    time: t('psychologist.calendarTime'),
    event: t('psychologist.calendarEvent'),
    noEventsInRange: t('psychologist.calendarNoEvents'),
    showMore: (total) => t('psychologist.calendarShowMore', { count: total }),
  }

  const initialView = searchParams.get('tab') || 'alerts'
  const [view, setView] = useState(initialView)

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

  const [searchQuery, setSearchQuery] = useState('')
  const [filterClass, setFilterClass] = useState('Все классы')

  const uniqueClasses = useMemo(() => {
    const classes = new Set()
    students.forEach(s => { if (s.class_name) classes.add(s.class_name) })
    alerts.forEach(a => {
      const className = a.class_name || (students.find(s => s.id === (a.user_id ?? a.student_id))?.class_name)
      if (className) classes.add(className)
    })
    return Array.from(classes).sort()
  }, [students, alerts])

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesSearch = studentDisplayName(s).toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (s.class_name && s.class_name.toLowerCase().includes(searchQuery.toLowerCase()))
      const matchesClass = filterClass === 'Все классы' || s.class_name === filterClass
      return matchesSearch && matchesClass
    })
  }, [students, searchQuery, filterClass])

  const filteredAlerts = useMemo(() => {
    return alerts.filter(a => {
      const uid = a.user_id ?? a.student_id;
      const studentRecord = students.find(s => s.id === uid);
      const displayName = studentRecord ? studentDisplayName(studentRecord) : (a.anonymous_id || a.student_name || (uid ? `Студент #${uid}` : 'Неизвестный'));
      const className = a.class_name || studentRecord?.class_name || '-';

      const matchesSearch = displayName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            className.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (a.alert_type && a.alert_type.toLowerCase().includes(searchQuery.toLowerCase()))
      
      const matchesClass = filterClass === 'Все классы' || className === filterClass
      return matchesSearch && matchesClass
    })
  }, [alerts, students, searchQuery, filterClass])

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

  // Analytics state
  const [analyticsOrg, setAnalyticsOrg] = useState([])

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

  // Load org metrics for analytics line chart
  useEffect(() => {
    if (view !== 'analytics') return
    fetchOrgMetrics().then(setAnalyticsOrg).catch(() => {})
  }, [view])

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
      alert(t('psychologist.errorSaveSession', { error: e.message }))
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
      alert(t('psychologist.errorDeleteSession', { error: e.message }))
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
      const res = await fetch(`${import.meta.env.VITE_API_URL || '/api/v1'}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || t('psychologist.unknownError'));
      }
      alert(t('psychologist.passwordChanged'));
      form.reset();
    } catch (err) {
      alert(t('psychologist.errorChangePassword', { error: err.message }));
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
      alert(t('psychologist.errorSaveNote', { error: e.message }))
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
      alert(t('psychologist.errorDeleteNote', { error: e.message }))
    }
  }

  const titles = {
    alerts: [t('psychologist.titlesAlerts'), t('psychologist.titlesAlertsDesc')],
    users: [t('psychologist.titlesUsers'), t('psychologist.titlesUsersDesc')],
    sessions: [t('psychologist.titlesSessions'), t('psychologist.titlesSessionsDesc')],
    notes: [t('psychologist.titlesNotes'), t('psychologist.titlesNotesDesc')],
    tests: [t('psychologist.titlesTests'), t('psychologist.titlesTestsDesc')],
    courses: [t('psychologist.titlesCourses'), t('psychologist.titlesCoursesDesc')],
    analytics: [t('psychologist.titlesAnalytics'), t('psychologist.titlesAnalyticsDesc')],
    campaigns: [t('campaign.title'), t('campaign.subtitle')],
    settings: [t('psychologist.titlesSettings'), t('psychologist.titlesSettingsDesc')]
  }

  const navItems = [
    { id: 'alerts', icon: Bell, label: t('psychologist.navAlerts'), badge: alerts.filter(a => !a.is_resolved).length || null },
    { id: 'users', icon: Users, label: t('psychologist.navUsers') },
    { id: 'sessions', icon: Calendar, label: t('psychologist.navSessions') },
    { id: 'tests', icon: FileText, label: t('psychologist.navTests') },
    { id: 'notes', icon: ClipboardList, label: t('psychologist.navNotes') },
    { id: 'courses', icon: BookOpen, label: t('psychologist.navCourses') },
    { id: 'campaigns', icon: Megaphone, label: t('campaign.navLabel') },
    { id: 'analytics', icon: BarChart2, label: t('psychologist.navAnalytics') },
    { id: 'settings', icon: Settings, label: t('psychologist.navSettings') },
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
    labels: [t('psychologist.categoryStress'), t('psychologist.categoryBurnout'), t('psychologist.categoryAnxiety'), t('psychologist.categoryMotivation'), t('psychologist.categoryEmotions')],
    datasets: [{
      label: t('student.psyProfileTitle'),
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
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-6" style={{ background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.2)' }}>
          <ShieldCheck size={16} className="text-zharyq-teal shrink-0" />
          <span className="text-xs font-semibold text-zharyq-teal">{t('psychologist.rolePsychologist')}</span>
        </div>
        <div className="flex flex-col gap-1 mb-8">
          <p className="text-xs font-semibold text-zharyq-gray uppercase tracking-wider mb-2 px-2">{t('psychologist.workspace')}</p>
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
            <p className="text-sm font-medium truncate">{authUser?.username || t('psychologist.psychologistLabel')}</p>
            <p className="text-[10px] text-zharyq-gray flex items-center gap-1"><ShieldCheck size={12} /> {authUser?.class_name || t('psychologist.noClass')}</p>
          </div>
          <button onClick={(e) => { e.stopPropagation(); logout(); }} className="text-zharyq-gray hover:text-zharyq-dark transition-colors" title={t('common.logout')}>
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
                      <h3 className="text-sm font-semibold text-zharyq-dark">{t('psychologist.notifications')}</h3>
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
                        <p className="text-sm font-medium text-zharyq-dark mb-1">{t('psychologist.notifAllQuiet')}</p>
                        <p className="text-xs text-zharyq-gray leading-relaxed">{t('psychologist.notifNewAlerts')}</p>
                      </div>
                    ) : (
                      <>
                        <div className="max-h-72 overflow-y-auto divide-y divide-zharyq-border">
                          {unresolvedAlerts.slice(0, 6).map((a) => {
                            const meta = levelMeta(a.level, t)
                            const uid = a.user_id ?? a.student_id
                            const studentRecord = students.find(s => s.id === uid)
                            const displayName = studentRecord
                              ? studentDisplayName(studentRecord, t)
                              : (a.anonymous_id || a.student_name || (uid ? `${t('psychologist.studentPrefix')}${uid}` : t('psychologist.unknownUser')))
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
                                      <span className="text-[10px] text-zharyq-gray shrink-0">{timeAgo(a.created_at, t)}</span>
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
                            {t('psychologist.openAllAlerts')}
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
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('psychologist.searchPlaceholder')}
                    className="border border-zharyq-border rounded-xl text-zharyq-dark pl-9 pr-4 py-2 text-sm bg-white focus:border-zharyq-orange focus:ring-1 focus:ring-zharyq-orange transition-all w-52"
                  />
                </div>
                <select
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
                  className="border border-zharyq-border rounded-xl px-3 text-zharyq-dark py-2 text-sm bg-white focus:ring-0 cursor-pointer"
                >
                  <option value="Все классы">{t('psychologist.allClasses')}</option>
                  {uniqueClasses.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </>
            )}
            {view === 'courses' && (
              <button onClick={() => navigate('/course-builder')} className="flex items-center gap-2 text-sm font-medium text-white px-4 py-2 rounded-xl transition-colors" style={{ background: 'var(--color-accent)' }}>
                <Plus size={16} /> {t('psychologist.courseCreateNew')}
              </button>
            )}
            {view === 'notes' && (
              <button onClick={openNoteCreate} className="flex items-center gap-2 text-sm font-medium text-white px-4 py-2 rounded-xl transition-colors" style={{ background: 'var(--color-accent)' }}>
                <Plus size={16} /> {t('psychologist.noteModalCreate')}
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
                    const unresolvedAlerts = filteredAlerts.filter(a => !a.is_resolved);
                    const unresolvedStudentIds = new Set(unresolvedAlerts.map(a => a.user_id ?? a.student_id).filter(Boolean));
                    const statsCards = [
                      { icon: AlertTriangle, bg: 'bg-red-50', color: 'text-red-500', count: unresolvedAlerts.filter(a => a.level === 'critical').length, label: t('psychologist.alertCountCritical') },
                      { icon: Activity, bg: 'bg-amber-50', color: 'text-amber-500', count: unresolvedAlerts.filter(a => a.level === 'medium' || a.level === 'high').length, label: t('psychologist.alertCountMedium') },
                      { icon: CheckCircle, bg: 'bg-zharyq-teal-light', color: 'text-zharyq-teal', count: students.filter(s => !unresolvedStudentIds.has(s.id)).length, label: t('psychologist.alertCountNormal') },
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
                      <h2 className="text-sm font-semibold">{t('psychologist.activeAlerts')}</h2>
                      <span className="text-[11px] text-zharyq-gray">{t('psychologist.synced')}</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-zharyq-border bg-zharyq-bg text-zharyq-dark">
                            {[t('psychologist.alertColUser'), t('psychologist.alertColClass'), t('psychologist.alertColType'), t('psychologist.alertColLevel'), t('psychologist.alertColTime'), t('psychologist.alertColAction')].map(h => (
                              <th key={h} className="text-left text-[11px] font-semibold text-zharyq-gray uppercase tracking-wide px-5 py-3">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredAlerts.filter(a => !a.is_resolved).map((a, i) => {
                            const meta = levelMeta(a.level, t);
                            // Support both REST alerts (user_id/anonymous_id) and WS alerts (student_id/student_name)
                            const uid = a.user_id ?? a.student_id;
                            const alertTypeLabel = a.alert_type || `AI Alert (${a.level})`;
                            const studentRecord = students.find(s => s.id === uid);
                            const displayName = studentRecord
                              ? studentDisplayName(studentRecord, t)
                              : (a.anonymous_id || a.student_name || (uid ? `${t('psychologist.studentPrefix')}${uid}` : t('psychologist.unknownUser')));
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
                                <td className="px-5 py-3.5 text-zharyq-gray text-xs whitespace-nowrap" title={timeAgo(a.created_at, t)}>
                                  {a.created_at ? new Date(a.created_at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                                </td>
                                <td className="px-5 py-3.5 flex items-center gap-3">
                                  <button onClick={() => setSelectedAlert(a)} className="text-xs font-medium text-zharyq-orange hover:underline">{t('psychologist.alertAction')}</button>
                                  {uid && <button onClick={() => openProfile(uid)} className="text-xs font-medium text-zharyq-gray hover:underline">{t('psychologist.profileAction')}</button>}
                                </td>
                              </tr>
                            )
                          })}
                          {filteredAlerts.filter(a => !a.is_resolved).length === 0 && (
                            <tr><td colSpan="6" className="text-center py-6 text-sm text-zharyq-gray">{t('psychologist.noActiveAlerts')}</td></tr>
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
                    {filteredStudents.map(u => {
                      const stat = studentStatus(u.stress, t);
                      return (
                        <div key={u.id} onClick={() => openProfile(u.id)} className="border border-zharyq-border rounded-2xl p-4 hover:border-zharyq-gray transition-colors cursor-pointer group">
                          <div className="flex items-center gap-3 mb-4">
                            <div className={`w-9 h-9 rounded-full bg-gradient-to-tr from-zharyq-teal to-blue-400 flex items-center justify-center text-white text-xs font-bold shrink-0`}>U{u.id}</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold group-hover:text-zharyq-orange transition-colors">{studentDisplayName(u, t)}</p>
                              <p className="text-xs text-zharyq-gray">{u.class_name || t('psychologist.noClass')} · {u.last_checkin_date ? timeAgo(u.last_checkin_date, t) : t('director.noCheckins')}</p>
                            </div>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${stat.class}`} style={stat.style}>{stat.label}</span>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-zharyq-gray w-16 shrink-0">{t('psychologist.stressLabel')}</span>
                              <div className="flex-1 bg-gray-100 rounded-full h-1">
                                <div className="h-1 rounded-full" style={{ width: `${Math.min(100, Math.max(0, u.stress))}%`, background: u.stress > 60 ? '#F87171' : 'var(--color-accent)' }} />
                              </div>
                              <span className="text-zharyq-gray w-5 text-right">{u.stress || 0}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-zharyq-gray w-16 shrink-0">{t('psychologist.motivationLabel')}</span>
                              <div className="flex-1 bg-gray-100 rounded-full h-1">
                                <div className="h-1 rounded-full" style={{ width: `${Math.min(100, Math.max(0, u.motivation))}%`, background: u.motivation < 40 ? '#FBBF24' : 'var(--color-teal)' }} />
                              </div>
                              <span className="text-zharyq-gray w-5 text-right">{u.motivation || 0}</span>
                            </div>
                          </div>
                          <p className="text-[11px] text-zharyq-gray mt-3 flex items-center gap-1">
                            <span>{t('psychologist.sessionsCount', { count: u.sessions_count || 0, courses: u.courses_count || 0 })}</span>
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
                  <p className="text-xs text-zharyq-gray">{t('psychologist.sessionsClickHint')}</p>
                  <button
                    onClick={() => openSessionCreate({ start: new Date() })}
                    className="flex items-center gap-2 text-sm font-medium text-white px-4 py-2 rounded-xl transition-colors"
                    style={{ background: 'var(--color-accent)' }}
                  >
                    <Plus size={16} /> {t('psychologist.sessionsCreate')}
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
                      <input type="text" placeholder={t('psychologist.searchTests')} className="w-full text-zharyq-dark border border-zharyq-border rounded-xl pl-9 pr-4 py-2 text-sm bg-white focus:border-zharyq-orange focus:ring-1 focus:ring-zharyq-orange transition-all" />
                    </div>
                  </div>

                  {psyTestsLoading ? (
                    <div className="text-center py-16 text-zharyq-gray text-sm">{t('psychologist.loadingTests')}</div>
                  ) : psyTests.length === 0 ? (
                    <div className="text-center py-16 text-zharyq-gray text-sm">{t('psychologist.noTestsAvailable')}</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {psyTests.map(test => (
                        <div key={test.id} className="border border-zharyq-border rounded-2xl p-4 hover:border-zharyq-gray transition-colors cursor-pointer group flex flex-col h-full">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                              <Zap size={20} className="text-zharyq-orange" />
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold group-hover:text-zharyq-orange transition-colors leading-tight mb-1">{test.title}</h4>
                              <p className="text-[11px] text-zharyq-gray leading-relaxed">{test.description}</p>
                            </div>
                          </div>
                          <div className="mt-auto pt-3 border-t border-zharyq-border">
                            <div className="flex items-center justify-between mb-3 text-[11px] text-zharyq-gray">
                              <span className="flex items-center gap-1"><Clock size={12} /> {test.duration_minutes} {t('student.testDurationMin')}</span>
                              <span className="flex items-center gap-1"><Layers size={12} /> {test.questions_count} {t('psychologist.questionsShort')}</span>
                            </div>
                            <button className="w-full py-1.5 text-[11px] font-semibold text-zharyq-dark border border-zharyq-border rounded-lg hover:bg-gray-50 transition-colors">
                              {t('psychologist.assignToClass')}
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
                      <p className="text-sm">{t('psychologist.notesEmpty')}</p>
                      <button onClick={openNoteCreate} className="text-sm font-medium text-white px-4 py-2 rounded-xl mt-2" style={{ background: 'var(--color-accent)' }}>
                        <Plus size={14} className="inline mr-1" /> {t('psychologist.noteModalCreate')}
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
                        <span className="text-xs">{t('psychologist.noteModalCreate')}</span>
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
                    <h3 className="text-sm font-semibold mb-4">{t('psychologist.settingsProfileInfo')}</h3>
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
                        <p className="text-xs text-zharyq-gray mb-1">{t('psychologist.settingsEmailLabel')}</p>
                        <p className="text-sm font-medium">{authUser?.email || t('psychologist.settingsNotSpecified')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-zharyq-gray mb-1">{t('psychologist.settingsClassLabel')}</p>
                        <p className="text-sm font-medium">{authUser?.class_name || t('psychologist.settingsAllClasses')}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border text-zharyq-dark border-zharyq-border rounded-2xl p-6">
                    <h3 className="text-sm font-semibold mb-4">{t('psychologist.settingsChangePassword')}</h3>
                    <form className="space-y-4" onSubmit={handlePasswordChange}>
                      <div>
                        <label className="block text-xs text-zharyq-gray mb-1">{t('psychologist.settingsCurrentPassword')}</label>
                        <input type="password" name="current_password" required className="w-full text-zharyq-dark border border-zharyq-border rounded-xl px-3 py-2 text-sm bg-white focus:border-zharyq-orange focus:ring-1 focus:ring-zharyq-orange transition-all outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs text-zharyq-gray mb-1">{t('psychologist.settingsNewPassword')}</label>
                        <input type="password" name="new_password" required className="w-full text-zharyq-dark border border-zharyq-border rounded-xl px-3 py-2 text-sm bg-white focus:border-zharyq-orange focus:ring-1 focus:ring-zharyq-orange transition-all outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs text-zharyq-gray mb-1">{t('psychologist.settingsConfirmPassword')}</label>
                        <input type="password" name="confirm_password" required className="w-full text-zharyq-dark border border-zharyq-border rounded-xl px-3 py-2 text-sm bg-white focus:border-zharyq-orange focus:ring-1 focus:ring-zharyq-orange transition-all outline-none" />
                      </div>
                      <button type="submit" className="px-4 py-2 bg-zharyq-orange text-white text-sm font-semibold rounded-xl hover:bg-orange-600 transition-colors">{t('psychologist.settingsUpdatePassword')}</button>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ANALYTICS VIEW */}
        {view === 'analytics' && (() => {
          const chartText = isDark ? '#A1A1AA' : '#6B7280'
          const chartGrid = isDark ? '#3F3F46' : '#F3F4F6'
          const surfaceColor = isDark ? '#27272A' : '#F9FAFB'

          // Compute KPIs from already-loaded data
          const activeAlerts = alerts.filter(a => !a.is_resolved)
          const criticalCount = activeAlerts.filter(a => a.level === 'critical').length
          const mediumCount = activeAlerts.filter(a => a.level === 'medium' || a.level === 'high').length
          const wellbeing = students.length
            ? Math.round(students.reduce((sum, u) => sum + (100 - (u.stress || 0)), 0) / students.length)
            : 0
          const engaged = students.filter(u => u.last_checkin_date).length
          const engagementRate = students.length ? Math.round((engaged / students.length) * 100) : 0

          // Stress distribution from students
          const stressLow = students.filter(u => (u.stress || 0) < 40).length
          const stressMed = students.filter(u => (u.stress || 0) >= 40 && (u.stress || 0) < 60).length
          const stressHigh = students.filter(u => (u.stress || 0) >= 60 && (u.stress || 0) < 80).length
          const stressCrit = students.filter(u => (u.stress || 0) >= 80).length

          const pieData = {
            labels: [t('psychologist.riskLow'), t('director.pieModerate'), t('psychologist.riskHigh'), t('psychologist.riskCritical')],
            datasets: [{
              data: [stressLow, stressMed, stressHigh, stressCrit],
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

          const sortedOrg = [...analyticsOrg].reverse()
          const lineData = {
            labels: sortedOrg.length
              ? sortedOrg.map(m => new Date(m.recorded_at).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }))
              : [t('director.noData')],
            datasets: [{
              label: t('director.wellbeingChart'),
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

          return (
            <div className="flex-1 overflow-y-auto p-6 animate-fade-in-up space-y-6">
              {/* KPI Cards */}
              <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: t('psychologist.analyticsWellbeingLabel'), value: `${wellbeing}%`, sub: t('psychologist.analyticsWellbeingSub'), subCls: 'text-emerald-600' },
                  { label: t('psychologist.analyticsAlertsLabel'), value: `${criticalCount} / ${mediumCount}`, sub: t('psychologist.analyticsAlertsSub'), subCls: 'text-red-600' },
                  { label: t('psychologist.analyticsEngagementLabel'), value: `${engagementRate}%`, sub: t('psychologist.analyticsEngagementSub'), subCls: 'text-zharyq-teal' },
                ].map((card, i) => (
                  <article key={i} className="rounded-2xl border border-zharyq-border bg-zharyq-bg p-5">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-zharyq-gray font-semibold mb-3">{card.label}</p>
                    <div className="flex items-end justify-between gap-2">
                      <p className="text-3xl font-semibold">{card.value}</p>
                      <span className={`text-xs font-medium ${card.subCls}`}>{card.sub}</span>
                    </div>
                  </article>
                ))}
              </section>

              {/* Charts */}
              <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <article className="rounded-2xl border border-zharyq-border bg-zharyq-bg p-5 xl:col-span-1">
                  <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zharyq-gray mb-4">{t('psychologist.analyticsStressLevels')}</h2>
                  <div style={{ height: '280px' }} className="flex items-center justify-center">
                    <Pie data={pieData} options={pieOptions} />
                  </div>
                </article>
                <article className="rounded-2xl border border-zharyq-border bg-zharyq-bg p-5 xl:col-span-2">
                  <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zharyq-gray mb-4">{t('psychologist.analyticsEmotionalBg')}</h2>
                  <div style={{ height: '280px' }}>
                    <Line data={lineData} options={lineOptions} />
                  </div>
                </article>
              </section>

              {/* Cohort Comparison */}
              <section>
                <CohortComparison />
              </section>

              {/* Users table */}
              <section>
                <article className="rounded-2xl border border-zharyq-border bg-zharyq-bg p-5">
                  <div className="mb-4">
                    <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zharyq-gray">{t('psychologist.analyticsDetailedTitle')}</h2>
                    <p className="text-sm text-zharyq-gray mt-1">{t('psychologist.analyticsTotalInSample', { count: students.length })}</p>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-zharyq-border">
                    <table className="w-full min-w-[700px] text-sm">
                      <thead className="bg-white border-b border-zharyq-border">
                        <tr>
                          {[t('director.colId'), t('director.colRoleDetails'), t('director.colRisk'), t('director.colCourses'), t('director.colSessions'), t('director.colLastCheckin')].map(h => (
                            <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zharyq-gray">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {students.map((u, i) => {
                          const stress = u.stress || 0
                          const riskLabel = stress >= 80 ? t('psychologist.riskCritical') : stress >= 60 ? t('psychologist.riskHigh') : stress >= 40 ? t('psychologist.riskMedium') : t('psychologist.riskLow')
                          const riskCls = stress >= 80 ? 'bg-red-50 text-red-600 border-red-200' : stress >= 60 ? 'bg-orange-50 text-orange-600 border-orange-200' : stress >= 40 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-green-50 text-green-700 border-green-200'
                          const checkin = u.last_checkin_date ? new Date(u.last_checkin_date).toLocaleString('ru-RU') : t('director.noCheckins')
                          return (
                            <tr key={u.id} className={`${i < students.length - 1 ? 'border-b border-zharyq-border' : ''} hover:bg-zharyq-bg transition-colors`}>
                              <td className="px-4 py-3 font-medium">
                                <div className="flex flex-col">
                                  <span>{studentDisplayName(u, t)}</span>
                                  <span className="text-xs text-zharyq-gray">{u.anonymous_id || `ID: ${u.id}`}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-zharyq-gray text-xs">{u.class_name || '—'}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold border ${riskCls}`}>{riskLabel} ({stress})</span>
                              </td>
                              <td className="px-4 py-3">{u.courses_count || 0}</td>
                              <td className="px-4 py-3">{u.sessions_count || 0}</td>
                              <td className="px-4 py-3 text-zharyq-gray">{checkin}</td>
                            </tr>
                          )
                        })}
                        {students.length === 0 && (
                          <tr><td colSpan="6" className="px-4 py-8 text-center text-zharyq-gray">{t('director.noData')}</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </article>
              </section>
            </div>
          )
        })()}

        {/* COURSES VIEW */}
        {view === 'courses' && (
          <div className="flex-1 overflow-y-auto p-6 animate-fade-in-up">
            <div className="max-w-4xl mx-auto">
              {coursesLoading ? (
                <div className="flex items-center justify-center py-20 text-zharyq-gray text-sm">{t('psychologist.loading')}</div>
              ) : courses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-zharyq-gray">
                  <BookOpen size={36} className="opacity-30" />
                  <p className="text-sm">{t('psychologist.courseNone')}</p>
                  <button onClick={() => navigate('/course-builder')} className="text-sm font-medium text-white px-4 py-2 rounded-xl mt-2" style={{ background: 'var(--color-accent)' }}>
                    <Plus size={14} className="inline mr-1" /> {t('psychologist.courseCreateNew')}
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
                              {isDraft ? t('psychologist.courseDraft') : t('psychologist.coursePublished')}
                            </span>
                          </div>
                        </div>
                        <div className="p-4">
                          <h4 className="text-sm font-semibold mb-1 truncate">{c.title}</h4>
                          <p className="text-xs text-zharyq-gray mb-3 line-clamp-2">{c.description || t('psychologist.courseNoDescription')}</p>
                          <div className="flex items-center gap-3 text-[11px] text-zharyq-gray mb-4">
                            <span className="flex items-center gap-1"><Layers size={11} /> {c.module_count} {c.module_count === 1 ? t('psychologist.courseModuleOne') : c.module_count < 5 ? t('psychologist.courseModuleFew') : t('psychologist.courseModuleMany')}</span>
                          </div>
                          <div className="flex items-center gap-2 pt-2 border-t border-zharyq-border">
                            <button
                              onClick={() => navigate(`/course-builder?id=${c.id}`)}
                              className="flex items-center gap-1.5 text-xs font-medium text-zharyq-gray hover:text-zharyq-orange transition-colors px-2 py-1 rounded-lg hover:bg-orange-50"
                            >
                              <Pencil size={12} /> {t('psychologist.courseEdit')}
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(c)}
                              className="flex items-center gap-1.5 text-xs font-medium text-zharyq-gray hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50 ml-auto"
                            >
                              <Trash2 size={12} /> {t('psychologist.courseDelete')}
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
                    <span className="text-xs">{t('psychologist.courseCreateNew')}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CAMPAIGNS VIEW */}
        {view === 'campaigns' && (
          <div className="flex-1 overflow-y-auto p-6 animate-fade-in-up">
            <div className="max-w-5xl mx-auto">
              <CampaignHub />
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
              <h2 className="text-sm font-semibold">{t('psychologist.profileDrawerTitle')}</h2>
              <button onClick={closeProfile} className="text-zharyq-gray hover:text-zharyq-dark transition-colors"><X size={20} /></button>
            </div>
            <div className="p-5 flex-1">
              <div className="flex items-center gap-3 mb-5 pb-5 border-b border-zharyq-border">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-orange-300 to-red-400 flex items-center justify-center text-white text-sm font-bold">U{selectedUser.id}</div>
                <div>
                  <p className="font-semibold">{studentDisplayName(selectedUser, t)}</p>
                  <p className="text-xs text-zharyq-gray">{selectedUser.class_name} · {t('psychologist.lastCheckin')}: {selectedUser.last_checkin_date ? timeAgo(selectedUser.last_checkin_date, t) : t('psychologist.never')}</p>
                </div>
                <span className={`ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full ${studentStatus(selectedUser.stress, t).class}`} style={studentStatus(selectedUser.stress, t).style}>{studentStatus(selectedUser.stress, t).label}</span>
              </div>
              <p className="text-xs font-semibold text-zharyq-gray uppercase tracking-wider mb-3">{t('psychologist.psychProfile')}</p>
              <div className="w-full aspect-square max-w-[240px] mx-auto mb-5">
                <Radar data={radarData} options={radarOptions} />
              </div>
              <div className="grid grid-cols-2 gap-3 mb-5">
                {[{ label: t('psychologist.profileMetricStress'), value: selectedUser.stress || 0, color: 'text-red-500' }, { label: t('psychologist.profileMetricMotivation'), value: selectedUser.motivation || 0, color: 'text-amber-500' }, { label: t('psychologist.profileMetricAnxiety'), value: selectedUser.anxiety || 0, color: 'text-orange-500' }, { label: t('psychologist.profileMetricCourses'), value: selectedUser.courses_count || 0, color: 'text-blue-500' }].map(m => (
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
                {t('psychologist.scheduleSession')}
              </button>

              {/* Test Results */}
              <div className="border-t border-zharyq-border pt-5">
                <p className="text-xs font-semibold text-zharyq-gray uppercase tracking-wider mb-3">{t('psychologist.testResultsTitle')}</p>
                {userTestResults.length === 0 ? (
                  <p className="text-xs text-zharyq-gray text-center py-3">{t('psychologist.noResults')}</p>
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
                                <p className="text-[9px] text-zharyq-gray">{t('psychologist.totalScoreLabel')}</p>
                                <p className="text-sm font-bold">{r.total_score}</p>
                              </div>
                              <div>
                                <p className="text-[9px] text-zharyq-gray">{t('psychologist.involvementLabel')}</p>
                                <p className="text-sm font-bold">{r.involvement_score}</p>
                              </div>
                              <div>
                                <p className="text-[9px] text-zharyq-gray">{t('psychologist.controlLabel')}</p>
                                <p className="text-sm font-bold">{r.control_score}</p>
                              </div>
                              <div>
                                <p className="text-[9px] text-zharyq-gray">{t('psychologist.riskLabel')}</p>
                                <p className="text-sm font-bold">{r.risk_score}</p>
                              </div>
                            </div>
                          ) : (
                            <div>
                               <p className="text-[10px] text-zharyq-gray"><span className="font-semibold text-zharyq-dark">{r.total_score}</span> {t('psychologist.pointsLabel')}</p>
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
              <h2 className="text-sm font-semibold">{editingCourse ? t('psychologist.courseModalEdit') : t('psychologist.courseModalCreate')}</h2>
              <button onClick={closeModal} className="text-zharyq-gray hover:text-zharyq-dark transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-zharyq-gray mb-1.5">{t('psychologist.courseFieldTitle')}</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder={t('psychologist.courseTitlePlaceholder')}
                  className="w-full border border-zharyq-border rounded-xl px-3 py-2.5 text-sm bg-white text-zharyq-dark focus:border-zharyq-orange focus:ring-1 focus:ring-zharyq-orange transition-all outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zharyq-gray mb-1.5">{t('psychologist.courseFieldDesc')}</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder={t('psychologist.courseDescPlaceholder')}
                  rows={3}
                  className="w-full border border-zharyq-border rounded-xl px-3 py-2.5 text-sm bg-white text-zharyq-dark focus:border-zharyq-orange focus:ring-1 focus:ring-zharyq-orange transition-all outline-none resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zharyq-gray mb-1.5">{t('psychologist.courseFieldCategory')}</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full border border-zharyq-border rounded-xl px-3 py-2.5 text-sm bg-white text-zharyq-dark focus:border-zharyq-orange focus:ring-1 focus:ring-zharyq-orange transition-all outline-none"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zharyq-gray mb-1.5">{t('psychologist.courseFieldContentType')}</label>
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
                  <label className="block text-xs font-semibold text-zharyq-gray mb-1.5">{t('psychologist.courseFieldDuration')}</label>
                  <input
                    type="number"
                    min={1}
                    value={form.duration_minutes}
                    onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))}
                    className="w-full border border-zharyq-border rounded-xl px-3 py-2.5 text-sm bg-white text-zharyq-dark focus:border-zharyq-orange focus:ring-1 focus:ring-zharyq-orange transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zharyq-gray mb-1.5">{t('psychologist.courseFieldLessons')}</label>
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
                <label className="block text-xs font-semibold text-zharyq-gray mb-1.5">{t('psychologist.courseFieldQuestions')}</label>
                <textarea
                  value={form.questions}
                  onChange={e => setForm(f => ({ ...f, questions: e.target.value }))}
                  placeholder={t('psychologist.courseQuestionsPlaceholder')}
                  rows={4}
                  className="w-full border border-zharyq-border rounded-xl px-3 py-2.5 text-sm bg-white text-zharyq-dark focus:border-zharyq-orange focus:ring-1 focus:ring-zharyq-orange transition-all outline-none resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={closeModal} className="flex-1 border border-zharyq-border rounded-xl py-2.5 text-sm font-medium text-zharyq-gray bg-white hover:bg-zharyq-bg transition-colors">
                  {t('psychologist.cancel')}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.title.trim() || !form.description.trim()}
                  className="flex-1 rounded-xl py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-50"
                  style={{ background: 'var(--color-accent)' }}
                >
                  {saving ? t('psychologist.saving') : editingCourse ? t('psychologist.save') : t('psychologist.create')}
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
                {sessionModalMode === 'create' ? t('psychologist.sessionModalCreate') : sessionModalMode === 'edit' ? t('psychologist.sessionModalEdit') : t('psychologist.sessionModalView')}
              </h2>
              <button onClick={() => setSessionModalOpen(false)} className="text-zharyq-gray hover:text-zharyq-dark transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              {/* Student select */}
              <div>
                <label className="block text-xs font-semibold text-zharyq-gray mb-1.5">{t('psychologist.sessionFieldStudent')}</label>
                {sessionModalMode === 'view' ? (
                  <p className="text-sm font-medium py-2">{studentDisplayName(students.find(s => s.id === sessionForm.user_id), t) || selectedSession?.student_name || `${t('psychologist.studentPrefix')}${sessionForm.user_id}`}</p>
                ) : (
                  <select
                    value={sessionForm.user_id}
                    onChange={e => setSessionForm(f => ({ ...f, user_id: e.target.value }))}
                    className="w-full border border-zharyq-border rounded-xl px-3 py-2.5 text-sm bg-white text-zharyq-dark focus:border-zharyq-orange focus:ring-1 focus:ring-zharyq-orange transition-all outline-none"
                  >
                    <option value="">{t('psychologist.sessionSelectStudent')}</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{studentDisplayName(s, t)} — {s.class_name || t('psychologist.noClass')}</option>
                    ))}
                  </select>
                )}
              </div>
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-zharyq-gray mb-1.5">{t('psychologist.sessionFieldTitle')}</label>
                {sessionModalMode === 'view' ? (
                  <p className="text-sm font-medium py-2">{sessionForm.title}</p>
                ) : (
                  <input
                    type="text" value={sessionForm.title}
                    onChange={e => setSessionForm(f => ({ ...f, title: e.target.value }))}
                    placeholder={t('psychologist.sessionTitlePlaceholder')}
                    className="w-full border border-zharyq-border rounded-xl px-3 py-2.5 text-sm bg-white text-zharyq-dark focus:border-zharyq-orange focus:ring-1 focus:ring-zharyq-orange transition-all outline-none"
                  />
                )}
              </div>
              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zharyq-gray mb-1.5">{t('psychologist.sessionFieldDate')}</label>
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
                  <label className="block text-xs font-semibold text-zharyq-gray mb-1.5">{t('psychologist.sessionFieldTime')}</label>
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
                  <label className="block text-xs font-semibold text-zharyq-gray mb-1.5">{t('psychologist.sessionFieldDuration')}</label>
                  {sessionModalMode === 'view' ? (
                    <p className="text-sm font-medium py-2">{t('psychologist.sessionDurationMin', { minutes: sessionForm.duration_minutes })}</p>
                  ) : (
                    <input
                      type="number" min={10} max={180} value={sessionForm.duration_minutes}
                      onChange={e => setSessionForm(f => ({ ...f, duration_minutes: e.target.value }))}
                      className="w-full border border-zharyq-border rounded-xl px-3 py-2.5 text-sm bg-white text-zharyq-dark focus:border-zharyq-orange focus:ring-1 focus:ring-zharyq-orange transition-all outline-none"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zharyq-gray mb-1.5">{t('psychologist.sessionFieldType')}</label>
                  {sessionModalMode === 'view' ? (
                    <p className="text-sm font-medium py-2">{sessionForm.session_type === 'individual' ? t('psychologist.sessionTypeIndividual') : sessionForm.session_type === 'group' ? t('psychologist.sessionTypeGroup') : sessionForm.session_type}</p>
                  ) : (
                    <select
                      value={sessionForm.session_type}
                      onChange={e => setSessionForm(f => ({ ...f, session_type: e.target.value }))}
                      className="w-full border border-zharyq-border rounded-xl px-3 py-2.5 text-sm bg-white text-zharyq-dark focus:border-zharyq-orange focus:ring-1 focus:ring-zharyq-orange transition-all outline-none"
                    >
                      <option value="individual">{t('psychologist.sessionTypeIndividual')}</option>
                      <option value="group">{t('psychologist.sessionTypeGroup')}</option>
                      <option value="consultation">{t('psychologist.sessionTypeConsultation')}</option>
                    </select>
                  )}
                </div>
              </div>
              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-zharyq-gray mb-1.5">{t('psychologist.sessionFieldNotes')}</label>
                {sessionModalMode === 'view' ? (
                  <p className="text-sm py-2 text-zharyq-gray">{sessionForm.notes || t('psychologist.sessionNoNotes')}</p>
                ) : (
                  <textarea
                    value={sessionForm.notes}
                    onChange={e => setSessionForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder={t('psychologist.sessionNotesPlaceholder')}
                    rows={3}
                    className="w-full border border-zharyq-border rounded-xl px-3 py-2.5 text-sm bg-white text-zharyq-dark focus:border-zharyq-orange focus:ring-1 focus:ring-zharyq-orange transition-all outline-none resize-none"
                  />
                )}
              </div>
              {/* Status for view */}
              {sessionModalMode === 'view' && selectedSession && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zharyq-gray">{t('psychologist.sessionStatus')}</span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                    selectedSession.is_completed
                      ? 'border-teal-100 text-teal-600 bg-teal-50'
                      : 'border-orange-100 text-orange-600 bg-orange-50'
                  }`}>
                    {selectedSession.is_completed ? t('psychologist.sessionCompleted') : t('psychologist.sessionPlanned')}
                  </span>
                </div>
              )}
              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                {sessionModalMode === 'view' ? (
                  <>
                    <button onClick={switchToEdit} className="flex-1 flex items-center justify-center gap-2 border border-zharyq-border rounded-xl py-2.5 text-sm font-medium text-zharyq-dark hover:bg-zharyq-bg transition-colors">
                      <Edit3 size={14} /> {t('psychologist.editBtn')}
                    </button>
                    {!sessionDeleteConfirm ? (
                      <button onClick={() => setSessionDeleteConfirm(true)} className="flex-1 rounded-xl py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center gap-2">
                        <Trash2 size={14} /> {t('psychologist.deleteBtn')}
                      </button>
                    ) : (
                      <button onClick={handleSessionDelete} className="flex-1 rounded-xl py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors animate-pulse">
                        {t('psychologist.confirmDelete')}
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button onClick={() => setSessionModalOpen(false)} className="flex-1 border border-zharyq-border rounded-xl py-2.5 text-sm font-medium text-zharyq-gray bg-white hover:bg-zharyq-bg transition-colors">
                      {t('psychologist.cancel')}
                    </button>
                    <button
                      onClick={handleSessionSave}
                      disabled={sessionSaving || !sessionForm.title.trim() || !sessionForm.user_id || !sessionForm.scheduled_date || !sessionForm.scheduled_time}
                      className="flex-1 rounded-xl py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-50"
                      style={{ background: 'var(--color-accent)' }}
                    >
                      {sessionSaving ? t('psychologist.saving') : sessionModalMode === 'edit' ? t('psychologist.save') : t('psychologist.sessionsCreate')}
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
                {noteModalMode === 'create' ? t('psychologist.noteModalCreate') : noteModalMode === 'edit' ? t('psychologist.noteModalEdit') : t('psychologist.noteModalView')}
              </h2>
              <button onClick={() => setNoteModalOpen(false)} className="text-zharyq-gray hover:text-zharyq-dark transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-zharyq-gray mb-1.5">{t('psychologist.noteFieldTitle')}</label>
                {noteModalMode === 'view' ? (
                  <p className="text-sm font-medium py-2">{noteForm.title}</p>
                ) : (
                  <input
                    type="text" value={noteForm.title}
                    onChange={e => setNoteForm(f => ({ ...f, title: e.target.value }))}
                    placeholder={t('psychologist.noteTitlePlaceholder')}
                    className="w-full border border-zharyq-border rounded-xl px-3 py-2.5 text-sm bg-white text-zharyq-dark focus:border-zharyq-orange focus:ring-1 focus:ring-zharyq-orange transition-all outline-none"
                  />
                )}
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-zharyq-gray mb-1.5">{t('psychologist.noteFieldContent')}</label>
                {noteModalMode === 'view' ? (
                  <div className="text-sm py-2 text-zharyq-gray whitespace-pre-wrap">{noteForm.description || t('psychologist.noteNoContent')}</div>
                ) : (
                  <textarea
                    value={noteForm.description}
                    onChange={e => setNoteForm(f => ({ ...f, description: e.target.value }))}
                    placeholder={t('psychologist.noteContentPlaceholder')}
                    rows={6}
                    className="w-full border border-zharyq-border rounded-xl px-3 py-2.5 text-sm bg-white text-zharyq-dark focus:border-zharyq-orange focus:ring-1 focus:ring-zharyq-orange transition-all outline-none resize-none"
                  />
                )}
              </div>

              {/* Images Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-zharyq-gray">{t('psychologist.noteFieldPhotos')}</label>
                  {noteModalMode !== 'view' && (
                    <div>
                      <input type="file" id="note-images-upload" multiple accept="image/*" className="hidden" onChange={handleNoteImageAdd} />
                      <label htmlFor="note-images-upload" className="cursor-pointer text-xs font-medium text-zharyq-orange hover:text-orange-600 flex items-center gap-1 bg-orange-50 px-2 py-1 rounded-lg">
                        <Upload size={12} /> {t('psychologist.noteAddPhoto')}
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
                  <div className="text-[11px] text-zharyq-gray italic">{t('psychologist.noteNoPhotos')}</div>
                )}
              </div>

              {/* Timestamp for view */}
              {noteModalMode === 'view' && selectedNote && (
                 <div className="flex items-center gap-2 mt-2 pt-4 border-t border-zharyq-border">
                   <Clock size={12} className="text-zharyq-gray" />
                   <span className="text-xs text-zharyq-gray">{t('psychologist.noteCreated')} {new Date(selectedNote.created_at).toLocaleString('ru-RU')}</span>
                 </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-4 border-t border-zharyq-border">
                {noteModalMode === 'view' ? (
                  <>
                    <button onClick={switchNoteToEdit} className="flex-1 flex items-center justify-center gap-2 border border-zharyq-border rounded-xl py-2.5 text-sm font-medium text-zharyq-dark hover:bg-zharyq-bg transition-colors">
                      <Edit3 size={14} /> {t('psychologist.editBtn')}
                    </button>
                    {!noteDeleteConfirm ? (
                      <button onClick={() => setNoteDeleteConfirm(true)} className="flex-1 rounded-xl py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center gap-2">
                        <Trash2 size={14} /> {t('psychologist.deleteBtn')}
                      </button>
                    ) : (
                      <button onClick={handleNoteDelete} className="flex-1 rounded-xl py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors animate-pulse">
                        {t('psychologist.confirmDelete')}
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button onClick={() => setNoteModalOpen(false)} className="flex-1 border border-zharyq-border rounded-xl py-2.5 text-sm font-medium text-zharyq-gray bg-white hover:bg-zharyq-bg transition-colors">
                      {t('psychologist.cancel')}
                    </button>
                    <button
                      onClick={handleNoteSave}
                      disabled={noteSaving || !noteForm.title.trim()}
                      className="flex-1 rounded-xl py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-50"
                      style={{ background: 'var(--color-accent)' }}
                    >
                      {noteSaving ? t('psychologist.saving') : noteModalMode === 'edit' ? t('psychologist.save') : t('psychologist.create')}
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
            <h2 className="text-sm font-semibold mb-2">{t('psychologist.deleteCourseTitle')}</h2>
            <p className="text-xs text-zharyq-gray mb-5">{t('psychologist.deleteCourseBody', { title: deleteConfirm.title })}</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 border border-zharyq-border rounded-xl py-2.5 text-sm font-medium text-zharyq-gray hover:bg-zharyq-bg transition-colors">
                {t('psychologist.cancel')}
              </button>
              <button onClick={() => handleDelete(deleteConfirm.id)} className="flex-1 rounded-xl py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors">
                {t('psychologist.deleteBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
