import { useState, useEffect, useRef, useCallback } from 'react'
import { Briefcase, Download, Upload, FileSpreadsheet, Printer, UserPlus, ShieldCheck, RefreshCw, ChevronDown, ChevronUp, Clock, AlertTriangle, CheckCircle2, Users2, BarChart2, TrendingUp, GitCompare, Users, Megaphone } from 'lucide-react'
import { Pie, Line } from 'react-chartjs-2'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import CreateUserModal from '../components/CreateUserModal'
import CohortComparison from '../components/CohortComparison'
import CampaignHub from '../components/CampaignHub'
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale,
  LinearScale, PointElement, LineElement, Filler
} from 'chart.js'
import ThemeToggle from '../components/ThemeToggle'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from 'react-i18next'
import {
  fetchDirectorDashboard,
  fetchUsersWithMetrics,
  fetchStressDistribution,
  fetchOrgMetrics,
  createUsersBatch,
  fetchAuditLogs,
  fetchAuditActions,
  fetchSlaData,
} from '../api/api'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler)

export default function DirectorDashboard() {
  const { t } = useTranslation()
  const { isDark } = useTheme()
  const { logout } = useAuth()
  const [roleTab, setRoleTab] = useState('all')
  const [dashboard, setDashboard] = useState(null)
  const [usersInfo, setUsersInfo] = useState([])
  const [stressDist, setStressDist] = useState(null)
  const [orgMetrics, setOrgMetrics] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const fileInputRef = useRef(null)

  // Collapsible section states (default open)
  const [kpiOpen, setKpiOpen] = useState(true)
  const [chartsOpen, setChartsOpen] = useState(false)
  const [cohortOpen, setCohortOpen] = useState(false)
  const [usersOpen, setUsersOpen] = useState(false)

  // Users table filter state
  const [userSearch, setUserSearch] = useState('')
  const [userFilterClass, setUserFilterClass] = useState('')
  const [userFilterRisk, setUserFilterRisk] = useState('')
  const [userFilterRole, setUserFilterRole] = useState('')

  // SLA state
  const [slaOpen, setSlaOpen] = useState(false)
  const [slaData, setSlaData] = useState(null)
  const [slaLoading, setSlaLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [slaTickNow, setSlaTickNow] = useState(Date.now())

  // Campaign Hub state
  const [campaignOpen, setCampaignOpen] = useState(false)

  // Audit trail state
  const [auditOpen, setAuditOpen] = useState(false)
  const [auditLogs, setAuditLogs] = useState([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditActions, setAuditActions] = useState([])
  const [auditFilter, setAuditFilter] = useState({ action: '', dateFrom: '', dateTo: '' })
  const auditFilterRef = useRef({ action: '', dateFrom: '', dateTo: '' })
  const [auditOffset, setAuditOffset] = useState(0)
  const AUDIT_LIMIT = 50

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

  const loadSlaData = useCallback(() => {
    setSlaLoading(true)
    fetchSlaData().then(setSlaData).catch(() => {}).finally(() => setSlaLoading(false))
  }, [])

  useEffect(() => {
    if (slaOpen) loadSlaData()
  }, [slaOpen, loadSlaData])

  // Live timer tick every second when SLA panel is open
  useEffect(() => {
    if (!slaOpen) return
    const id = setInterval(() => setSlaTickNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [slaOpen])

  // Keep ref in sync with state so loadAuditLogs always reads the latest filter
  // even when called from a stale closure (e.g. useEffect, pagination buttons)
  auditFilterRef.current = auditFilter

  const loadAuditLogs = useCallback((offset = 0) => {
    const f = auditFilterRef.current
    setAuditLoading(true)
    fetchAuditLogs({
      limit: AUDIT_LIMIT,
      offset,
      action: f.action || undefined,
      dateFrom: f.dateFrom ? new Date(f.dateFrom).toISOString() : undefined,
      dateTo: f.dateTo ? new Date(f.dateTo + 'T23:59:59').toISOString() : undefined,
    }).then(data => {
      setAuditLogs(data)
      setAuditOffset(offset)
    }).catch(() => setAuditLogs([])).finally(() => setAuditLoading(false))
  }, []) // stable — reads filter from ref, not from closure

  useEffect(() => {
    if (auditOpen && auditActions.length === 0) {
      fetchAuditActions().then(setAuditActions).catch(() => {})
    }
    if (auditOpen) loadAuditLogs(0)
  }, [auditOpen])

  const chartText = isDark ? '#A1A1AA' : '#6B7280'
  const chartGrid = isDark ? '#3F3F46' : '#F3F4F6'
  const surfaceColor = isDark ? '#27272A' : '#F9FAFB'

  const KPI_CARDS = [
    { label: t('director.wellbeingIndex'), value: dashboard ? `${dashboard.wellbeing_index}%` : '...', delta: t('director.byGroup'), deltaClass: 'text-emerald-600' },
    { label: t('director.alerts'), value: dashboard ? `${dashboard.critical_alerts} / ${dashboard.medium_alerts}` : '...', delta: t('director.requireAttention'), deltaClass: 'text-red-600' },
    { label: t('director.engagementLevel'), value: dashboard ? `${dashboard.engagement_rate}%` : '...', delta: t('director.inLearning'), deltaClass: 'text-zharyq-teal', span: 'sm:col-span-2 xl:col-span-1' },
  ]

  const pieData = {
    labels: [t('director.pielow'), t('director.pieModerate'), t('director.pieHigh'), t('director.pieCritical')],
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
    labels: sortedOrg.length ? sortedOrg.map(m => new Date(m.recorded_at).toLocaleDateString('ru-RU', {month:'short', day:'numeric'})) : [t('director.noData')],
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

  const formatDuration = (seconds) => {
    if (seconds == null) return '—'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}ч ${String(m).padStart(2,'0')}м`
    if (m > 0) return `${m}м ${String(s).padStart(2,'0')}с`
    return `${s}с`
  }

  const getRiskProps = (stress) => {
    if (stress >= 80) return { label: t('director.riskCritical'), cls: 'bg-red-50 text-red-600 border-red-200' };
    if (stress >= 60) return { label: t('director.riskHigh'), cls: 'bg-orange-50 text-orange-600 border-orange-200' };
    if (stress >= 40) return { label: t('director.riskMedium'), cls: 'bg-amber-50 text-amber-700 border-amber-200' };
    return { label: t('director.riskLow'), cls: 'bg-green-50 text-green-700 border-green-200' };
  }

  const getRoleLabel = (r) => {
    switch(r) {
      case 'student': return t('director.roleStudent');
      case 'employee': return t('director.roleEmployee');
      case 'psychologist': return t('director.rolePsychologist');
      case 'director': return t('director.roleDirector');
      default: return r;
    }
  }

  const uniqueClasses = [...new Set(usersInfo.map(u => u.class_name).filter(Boolean))].sort()

  const getRiskKey = (stress) => {
    if (stress >= 80) return 'critical'
    if (stress >= 60) return 'high'
    if (stress >= 40) return 'medium'
    return 'low'
  }

  const filteredUsers = usersInfo.filter(u => {
    if (userSearch) {
      const q = userSearch.toLowerCase()
      if (!u.username.toLowerCase().includes(q) && !(u.anonymous_id || '').toLowerCase().includes(q)) return false
    }
    if (userFilterClass && u.class_name !== userFilterClass) return false
    if (userFilterRisk && getRiskKey(u.stress || 0) !== userFilterRisk) return false
    if (userFilterRole && u.role !== userFilterRole) return false
    return true
  })

  const exportToExcel = () => {
    const headers = [
      t('director.exportHeaders.userId'),
      t('director.exportHeaders.login'),
      t('director.exportHeaders.email'),
      t('director.exportHeaders.role'),
      t('director.exportHeaders.details'),
      t('director.exportHeaders.stress'),
      t('director.exportHeaders.motivation'),
      t('director.exportHeaders.burnout'),
      t('director.exportHeaders.anxiety'),
      t('director.exportHeaders.courses'),
      t('director.exportHeaders.sessions'),
      t('director.exportHeaders.lastCheckin'),
    ]
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
      u.last_checkin_date ? new Date(u.last_checkin_date).toLocaleString('ru-RU') : t('director.noCheckins'),
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

  const exportToPDF = async () => {
    setPdfLoading(true)
    try {
    // ── Load Cyrillic-capable fonts ───────────────────────────────
    const loadFont = async (url) => {
      const res = await fetch(url)
      const buf = await res.arrayBuffer()
      const bytes = new Uint8Array(buf)
      let binary = ''
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
      return btoa(binary)
    }
    const [fontNormal, fontBold] = await Promise.all([
      loadFont('/fonts/Roboto-Regular.ttf'),
      loadFont('/fonts/Roboto-Bold.ttf'),
    ])

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    doc.addFileToVFS('Roboto-Regular.ttf', fontNormal)
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal')
    doc.addFileToVFS('Roboto-Bold.ttf', fontBold)
    doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold')
    doc.setFont('Roboto', 'normal')

    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const m = 15
    const orange  = [255, 113, 0]
    const dark    = [22, 22, 46]
    const gray    = [107, 114, 128]
    const lightBg = [249, 250, 251]
    const border  = [229, 231, 235]

    const setR = (style = 'normal') => doc.setFont('Roboto', style)

    // ── HEADER BAR ────────────────────────────────────────────────
    doc.setFillColor(...orange)
    doc.rect(0, 0, pageW, 20, 'F')

    setR('bold')
    doc.setFontSize(14)
    doc.setTextColor(255, 255, 255)
    doc.text('ZHARYQ ANALYTICS', m, 13)

    setR('normal')
    doc.setFontSize(8)
    doc.text(t('director.adminPanel'), pageW - m, 13, { align: 'right' })

    // ── REPORT TITLE ──────────────────────────────────────────────
    let y = 30
    doc.setTextColor(...dark)
    setR('bold')
    doc.setFontSize(18)
    doc.text(t('director.pdfReportTitle'), m, y)
    y += 7

    setR('normal')
    doc.setFontSize(9)
    doc.setTextColor(...gray)
    const roleLabel = roleTab === 'all' ? t('director.allGroups') : getRoleLabel(roleTab)
    doc.text(
      `${t('director.pdfGroup')}: ${roleLabel}   ·   ${t('director.pdfGenerated')}: ${new Date().toLocaleString('ru-RU')}`,
      m, y
    )
    y += 3

    doc.setDrawColor(...orange)
    doc.setLineWidth(0.4)
    doc.line(m, y, pageW - m, y)
    y += 8

    // ── KPI CARDS ─────────────────────────────────────────────────
    if (dashboard) {
      setR('bold')
      doc.setFontSize(8)
      doc.setTextColor(...gray)
      doc.text(t('director.sectionKpi').toUpperCase(), m, y)
      y += 4

      const kpiDefs = [
        { label: t('director.wellbeingIndex'), value: `${dashboard.wellbeing_index}%` },
        { label: t('director.alerts'),         value: `${dashboard.critical_alerts} / ${dashboard.medium_alerts}` },
        { label: t('director.engagementLevel'),value: `${dashboard.engagement_rate}%` },
      ]
      const cardW = (pageW - m * 2 - 8) / 3
      kpiDefs.forEach((card, i) => {
        const x = m + i * (cardW + 4)
        doc.setFillColor(...lightBg)
        doc.setDrawColor(...border)
        doc.setLineWidth(0.3)
        doc.roundedRect(x, y, cardW, 22, 2, 2, 'FD')
        setR('normal')
        doc.setFontSize(7)
        doc.setTextColor(...gray)
        doc.text(card.label.toUpperCase(), x + 4, y + 6)
        setR('bold')
        doc.setFontSize(16)
        doc.setTextColor(...dark)
        doc.text(card.value, x + 4, y + 17)
      })
      y += 30
    }

    // ── STRESS DISTRIBUTION TABLE ─────────────────────────────────
    if (stressDist) {
      setR('bold')
      doc.setFontSize(8)
      doc.setTextColor(...gray)
      doc.text(t('director.stressLevels').toUpperCase(), m, y)
      y += 2

      const stressColors = {
        [t('director.pielow')]:      [20, 184, 166],
        [t('director.pieModerate')]: [96, 165, 250],
        [t('director.pieHigh')]:     [245, 158, 11],
        [t('director.pieCritical')]: [239, 68, 68],
      }
      const stressRows = [
        [t('director.pielow'),      stressDist.low],
        [t('director.pieModerate'), stressDist.medium],
        [t('director.pieHigh'),     stressDist.high],
        [t('director.pieCritical'), stressDist.critical],
      ]
      const distTotal = (stressDist.low + stressDist.medium + stressDist.high + stressDist.critical) || 1

      autoTable(doc, {
        startY: y,
        margin: { left: m, right: m },
        tableWidth: 90,
        head: [[t('director.pdfStressLevel'), t('director.pdfCount'), '%']],
        body: stressRows.map(([lbl, cnt]) => [lbl, cnt, `${Math.round(cnt / distTotal * 100)}%`]),
        styles: { font: 'Roboto', fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: orange, textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: lightBg },
        didParseCell: (d) => {
          if (d.section === 'body' && d.column.index === 0) {
            const col = stressColors[d.cell.raw]
            if (col) d.cell.styles.textColor = col
          }
        },
      })
      y = doc.lastAutoTable.finalY + 10
    }

    // ── USERS TABLE ───────────────────────────────────────────────
    setR('bold')
    doc.setFontSize(8)
    doc.setTextColor(...gray)
    doc.text(`${t('director.detailedStats').toUpperCase()}  (${usersInfo.length})`, m, y)
    y += 2

    const stressLabel = (s) => {
      if (s >= 80) return t('director.riskCritical')
      if (s >= 60) return t('director.riskHigh')
      if (s >= 40) return t('director.riskMedium')
      return t('director.riskLow')
    }
    const stressTextColor = (s) => {
      if (s >= 80) return [220, 38, 38]
      if (s >= 60) return [234, 88, 12]
      if (s >= 40) return [161, 98, 7]
      return [22, 101, 52]
    }

    autoTable(doc, {
      startY: y,
      margin: { left: m, right: m },
      head: [[
        t('director.colId'),
        t('director.exportHeaders.login'),
        t('director.colRoleDetails'),
        t('director.exportHeaders.stress'),
        t('director.exportHeaders.motivation'),
        t('director.exportHeaders.burnout'),
        t('director.exportHeaders.anxiety'),
        t('director.colCourses'),
        t('director.colSessions'),
        t('director.colLastCheckin'),
      ]],
      body: usersInfo.map(u => [
        u.anonymous_id || `#${u.id}`,
        u.username,
        `${getRoleLabel(u.role)}${u.class_name ? ` / ${u.class_name}` : ''}`,
        `${u.stress || 0} – ${stressLabel(u.stress || 0)}`,
        u.motivation ?? '—',
        u.burnout ?? '—',
        u.anxiety ?? '—',
        u.courses_count || 0,
        u.sessions_count || 0,
        u.last_checkin_date
          ? new Date(u.last_checkin_date).toLocaleDateString('ru-RU')
          : t('director.noCheckins'),
      ]),
      styles: { font: 'Roboto', fontSize: 7, cellPadding: 2.5, overflow: 'ellipsize' },
      headStyles: { fillColor: dark, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
      alternateRowStyles: { fillColor: lightBg },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 22 },
        2: { cellWidth: 28 },
        3: { cellWidth: 28 },
        9: { cellWidth: 22 },
      },
      didParseCell: (d) => {
        if (d.section === 'body' && d.column.index === 3) {
          const stress = usersInfo[d.row.index]?.stress || 0
          d.cell.styles.textColor = stressTextColor(stress)
          d.cell.styles.fontStyle = 'bold'
        }
      },
    })

    // ── FOOTER on every page ──────────────────────────────────────
    const totalPages = doc.internal.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setDrawColor(...orange)
      doc.setLineWidth(0.4)
      doc.line(m, pageH - 13, pageW - m, pageH - 13)
      setR('normal')
      doc.setFontSize(7)
      doc.setTextColor(...gray)
      doc.text(
        `Zharyq Analytics  ·  ${new Date().toLocaleString('ru-RU')}`,
        m, pageH - 8
      )
      doc.text(
        `${i} / ${totalPages}`,
        pageW - m, pageH - 8, { align: 'right' }
      )
    }

    doc.save(`Zharyq_Report_${roleTab}_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.pdf`)
    } catch (err) {
      console.error('PDF export failed:', err)
      alert(`Ошибка при генерации PDF: ${err.message}`)
    } finally {
      setPdfLoading(false)
    }
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
          alert(t('director.importNoValidRows'))
          return
        }

        const res = await createUsersBatch(mappedData)
        alert(t('director.importCompleted', { successful: res.successful, failed: res.failed }))
        loadData()
      } catch (err) {
        console.error(err)
        alert(t('director.importError', { error: err.response?.data?.detail || err.message }))
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
              <h1 className="text-xl font-semibold truncate">{t('director.adminPanel')}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="hidden sm:flex items-center gap-2 text-xs text-zharyq-gray border border-zharyq-border rounded-full px-3 py-1.5">
              <span className="w-2 h-2 rounded-full bg-zharyq-teal" />
              Live
            </span>
            <LanguageSwitcher />
            <ThemeToggle />
            <button
              onClick={logout}
              className="text-sm font-medium px-4 py-2 rounded-xl text-white bg-zharyq-orange hover:bg-zharyq-orange-hover transition-colors"
            >
              {t('nav.logout')}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6 text-zharyq-dark animate-fade-in-up">
        {/* Role Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
            <div className="flex gap-2 p-1 bg-zharyq-bg rounded-xl border border-zharyq-border overflow-x-auto">
              {[
                { id: 'all', label: t('director.allGroups') },
                { id: 'student', label: t('director.students') },
                { id: 'employee', label: t('director.employees') },
                { id: 'psychologist', label: t('director.psychologists') }
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
                <span className="hidden sm:inline">{t('director.createUser')}</span>
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-zharyq-border hover:bg-zharyq-bg transition-colors">
                <Upload size={16} className="text-emerald-600" />
                <span className="hidden sm:inline">{t('director.import')}</span>
              </button>
              <input type="file" accept=".xlsx, .xls" ref={fileInputRef} onChange={handleImportExcel} className="hidden" />
              <button onClick={exportToExcel} className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-zharyq-border hover:bg-zharyq-bg transition-colors">
                <FileSpreadsheet size={16} className="text-emerald-600" />
                <span className="hidden sm:inline">{t('director.export')}</span>
              </button>
              <button onClick={exportToPDF} disabled={pdfLoading} className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-zharyq-border hover:bg-zharyq-bg transition-colors disabled:opacity-60 disabled:cursor-wait">
                <Printer size={16} className={pdfLoading ? 'animate-pulse text-zharyq-orange' : 'text-blue-600'} />
                <span className="hidden sm:inline">{pdfLoading ? '...' : t('director.pdf')}</span>
              </button>
            </div>
        </div>

        <section className="rounded-2xl border border-zharyq-border bg-zharyq-bg overflow-hidden">
          <button onClick={() => setKpiOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-4 text-left">
            <div className="flex items-center gap-2">
              <BarChart2 size={16} className="text-zharyq-orange flex-shrink-0" />
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zharyq-gray">{t('director.sectionKpi')}</h2>
            </div>
            {kpiOpen ? <ChevronUp size={16} className="text-zharyq-gray" /> : <ChevronDown size={16} className="text-zharyq-gray" />}
          </button>
          {kpiOpen && (
            <div className="border-t border-zharyq-border px-5 pb-5 pt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {KPI_CARDS.map((card, i) => (
                <article key={i} className={`rounded-2xl border border-zharyq-border bg-white p-5 ${card.span || ''}`}>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-zharyq-gray font-semibold mb-3">{card.label}</p>
                  <div className="flex items-end justify-between gap-2">
                    <p className="text-3xl font-semibold">{card.value}</p>
                    <span className={`text-xs font-medium ${card.deltaClass}`}>{card.delta}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-zharyq-border bg-zharyq-bg overflow-hidden print:break-inside-avoid">
          <button onClick={() => setChartsOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-4 text-left">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-zharyq-orange flex-shrink-0" />
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zharyq-gray">{t('director.sectionCharts')}</h2>
            </div>
            {chartsOpen ? <ChevronUp size={16} className="text-zharyq-gray" /> : <ChevronDown size={16} className="text-zharyq-gray" />}
          </button>
          {chartsOpen && (
            <div className="border-t border-zharyq-border px-5 pb-5 pt-4 grid grid-cols-1 xl:grid-cols-3 gap-4">
              <article className="rounded-2xl border border-zharyq-border bg-white p-5 xl:col-span-1">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zharyq-gray mb-4">{t('director.stressLevels')}</h2>
                <div style={{ height: '280px' }} className="flex items-center justify-center">
                  <Pie data={pieData} options={pieOptions} />
                </div>
              </article>
              <article className="rounded-2xl border border-zharyq-border bg-white p-5 xl:col-span-2">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zharyq-gray mb-4">{t('director.emotionalBg')}</h2>
                <div style={{ height: '280px' }}>
                  <Line data={lineData} options={lineOptions} />
                </div>
              </article>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-zharyq-border bg-zharyq-bg overflow-hidden print:hidden">
          <button onClick={() => setCohortOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-4 text-left">
            <div className="flex items-center gap-2">
              <GitCompare size={16} className="text-zharyq-orange flex-shrink-0" />
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zharyq-gray">{t('director.sectionCohort')}</h2>
            </div>
            {cohortOpen ? <ChevronUp size={16} className="text-zharyq-gray" /> : <ChevronDown size={16} className="text-zharyq-gray" />}
          </button>
          {cohortOpen && (
            <div className="border-t border-zharyq-border px-5 pb-5 pt-4">
              <CohortComparison embedded />
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-zharyq-border bg-zharyq-bg overflow-hidden text-zharyq-dark print:break-before-page">
          <button onClick={() => setUsersOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-4 text-left">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-zharyq-orange flex-shrink-0" />
              <div>
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zharyq-gray">{t('director.detailedStats')}</h2>
                <p className="text-xs text-zharyq-gray mt-0.5">{t('director.totalUsersInSample')} {usersInfo.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden sm:block text-xs text-zharyq-gray px-3 py-1 bg-white border border-zharyq-border rounded-lg print:hidden">{t('director.dataUpdatedToday')}</span>
              {usersOpen ? <ChevronUp size={16} className="text-zharyq-gray" /> : <ChevronDown size={16} className="text-zharyq-gray" />}
            </div>
          </button>
          {usersOpen && (
            <div className="border-t border-zharyq-border px-5 pb-5 pt-4 space-y-3">
              {/* Filter bar */}
              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative flex-1 min-w-[160px]">
                  <input
                    type="text"
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    placeholder={t('director.filterSearch')}
                    className="w-full text-sm border border-zharyq-border rounded-xl px-3 py-2 pl-8 bg-white text-zharyq-dark focus:outline-none focus:ring-2 focus:ring-zharyq-orange/30"
                  />
                  <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zharyq-gray" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                </div>
                <select
                  value={userFilterClass}
                  onChange={e => setUserFilterClass(e.target.value)}
                  className="text-sm border border-zharyq-border rounded-xl px-3 py-2 bg-white text-zharyq-dark focus:outline-none focus:ring-2 focus:ring-zharyq-orange/30"
                >
                  <option value="">{t('director.filterAllClasses')}</option>
                  {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select
                  value={userFilterRisk}
                  onChange={e => setUserFilterRisk(e.target.value)}
                  className="text-sm border border-zharyq-border rounded-xl px-3 py-2 bg-white text-zharyq-dark focus:outline-none focus:ring-2 focus:ring-zharyq-orange/30"
                >
                  <option value="">{t('director.filterAllRisks')}</option>
                  <option value="critical">{t('director.riskCritical')}</option>
                  <option value="high">{t('director.riskHigh')}</option>
                  <option value="medium">{t('director.riskMedium')}</option>
                  <option value="low">{t('director.riskLow')}</option>
                </select>
                <select
                  value={userFilterRole}
                  onChange={e => setUserFilterRole(e.target.value)}
                  className="text-sm border border-zharyq-border rounded-xl px-3 py-2 bg-white text-zharyq-dark focus:outline-none focus:ring-2 focus:ring-zharyq-orange/30"
                >
                  <option value="">{t('director.filterAllRoles')}</option>
                  <option value="student">{t('director.roleStudent')}</option>
                  <option value="employee">{t('director.roleEmployee')}</option>
                  <option value="psychologist">{t('director.rolePsychologist')}</option>
                </select>
                {(userSearch || userFilterClass || userFilterRisk || userFilterRole) && (
                  <button
                    onClick={() => { setUserSearch(''); setUserFilterClass(''); setUserFilterRisk(''); setUserFilterRole('') }}
                    className="text-xs text-zharyq-gray hover:text-zharyq-dark px-3 py-2 border border-zharyq-border rounded-xl bg-white transition-colors"
                  >
                    {t('director.filterReset')}
                  </button>
                )}
                <span className="text-xs text-zharyq-gray ml-auto">
                  {filteredUsers.length} / {usersInfo.length}
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-zharyq-border">
                <table className="w-full min-w-[800px] text-sm">
                  <thead className="bg-white border-b border-zharyq-border">
                    <tr>
                      {[t('director.colId'), t('director.colRoleDetails'), t('director.colRisk'), t('director.colCourses'), t('director.colSessions'), t('director.colLastCheckin')].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zharyq-gray">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {filteredUsers.map((u, i) => {
                      const risk = getRiskProps(u.stress || 0);
                      const d = u.last_checkin_date ? new Date(u.last_checkin_date).toLocaleString('ru-RU') : t('director.noCheckins');
                      return (
                        <tr key={u.id} className={`${i < filteredUsers.length - 1 ? 'border-b border-zharyq-border' : ''} hover:bg-zharyq-bg transition-colors`}>
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
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan="6" className="px-4 py-8 text-center text-zharyq-gray">
                          {usersInfo.length === 0 ? t('director.noDataToDisplay') : t('director.filterNoResults')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* ── SLA Monitor ──────────────────────────────────────────── */}
        <section className="print:hidden">
          <article className="rounded-2xl border border-zharyq-border bg-zharyq-bg">
            <button
              onClick={() => setSlaOpen(o => !o)}
              className="w-full flex items-center justify-between px-5 py-4 text-left"
            >
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-zharyq-orange flex-shrink-0" />
                <div>
                  <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zharyq-gray">
                    {t('sla.title')}
                  </h2>
                  <p className="text-xs text-zharyq-gray mt-0.5">{t('sla.subtitle')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {slaData && (
                  <div className="flex gap-2 text-xs">
                    {slaData.summary.breached > 0 && (
                      <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 text-red-600 border border-red-200 font-semibold">
                        <AlertTriangle size={11} /> {slaData.summary.breached} {t('sla.badgeBreached')}
                      </span>
                    )}
                    {slaData.summary.warning > 0 && (
                      <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-50 text-orange-600 border border-orange-200 font-semibold">
                        <Clock size={11} /> {slaData.summary.warning} {t('sla.badgeWarning')}
                      </span>
                    )}
                  </div>
                )}
                {slaOpen ? <ChevronUp size={16} className="text-zharyq-gray" /> : <ChevronDown size={16} className="text-zharyq-gray" />}
              </div>
            </button>

            {slaOpen && (
              <div className="border-t border-zharyq-border px-5 pb-5 pt-4 space-y-5">
                {/* Refresh + summary KPIs */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-3">
                    {[
                      { label: t('sla.kpiTotal'), value: slaData?.summary.total_open ?? '…', icon: Clock, cls: 'text-zharyq-dark' },
                      { label: t('sla.kpiBreached'), value: slaData?.summary.breached ?? '…', icon: AlertTriangle, cls: 'text-red-600' },
                      { label: t('sla.kpiWarning'), value: slaData?.summary.warning ?? '…', icon: Clock, cls: 'text-orange-500' },
                      { label: t('sla.kpiOk'), value: slaData?.summary.ok ?? '…', icon: CheckCircle2, cls: 'text-emerald-600' },
                    ].map(kpi => (
                      <div key={kpi.label} className="rounded-xl border border-zharyq-border bg-white px-4 py-2.5 flex items-center gap-2 min-w-[100px]">
                        <kpi.icon size={14} className={kpi.cls} />
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-zharyq-gray font-semibold leading-none">{kpi.label}</p>
                          <p className={`text-xl font-semibold ${kpi.cls}`}>{kpi.value}</p>
                        </div>
                      </div>
                    ))}
                    {slaData?.summary.avg_response_seconds != null && (
                      <div className="rounded-xl border border-zharyq-border bg-white px-4 py-2.5">
                        <p className="text-[10px] uppercase tracking-wide text-zharyq-gray font-semibold leading-none">{t('sla.kpiAvgResponse')}</p>
                        <p className="text-xl font-semibold text-zharyq-dark">{formatDuration(slaData.summary.avg_response_seconds)}</p>
                      </div>
                    )}
                  </div>
                  <button onClick={loadSlaData} className="flex items-center gap-2 px-3 py-2 text-sm border border-zharyq-border rounded-xl hover:bg-white transition-colors">
                    <RefreshCw size={13} className={slaLoading ? 'animate-spin text-zharyq-orange' : 'text-zharyq-gray'} />
                    {t('sla.refresh')}
                  </button>
                </div>

                {/* Psychologist KPI cards */}
                {slaData?.psychologist_stats?.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-zharyq-gray font-semibold mb-3 flex items-center gap-1.5">
                      <Users2 size={12} /> {t('sla.psychSection')}
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {slaData.psychologist_stats.map(p => (
                        <div key={p.id} className="rounded-xl border border-zharyq-border bg-white p-4 min-w-[180px] flex-1">
                          <p className="font-semibold text-sm text-zharyq-dark truncate">{p.name}</p>
                          <div className="mt-2 space-y-1 text-xs text-zharyq-gray">
                            <div className="flex justify-between">
                              <span>{t('sla.psychOpenCases')}</span>
                              <span className="font-semibold text-zharyq-dark">{p.open_cases}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>{t('sla.psychResolvedToday')}</span>
                              <span className="font-semibold text-emerald-600">{p.resolved_today}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>{t('sla.psychAvgResponse')}</span>
                              <span className="font-semibold text-zharyq-dark">
                                {p.avg_response_seconds != null ? formatDuration(p.avg_response_seconds) : '—'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Kanban columns */}
                {slaLoading && !slaData && (
                  <p className="text-sm text-zharyq-gray text-center py-6">{t('sla.loading')}</p>
                )}
                {slaData && slaData.open_alerts.length === 0 && (
                  <div className="flex flex-col items-center py-8 gap-2 text-zharyq-gray">
                    <CheckCircle2 size={32} className="text-emerald-400" />
                    <p className="text-sm font-medium">{t('sla.allClear')}</p>
                  </div>
                )}
                {slaData && slaData.open_alerts.length > 0 && (
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                    {[
                      { key: 'breached', label: t('sla.colBreached'), headerCls: 'bg-red-50 border-red-200', dotCls: 'bg-red-500' },
                      { key: 'warning',  label: t('sla.colWarning'),  headerCls: 'bg-orange-50 border-orange-200', dotCls: 'bg-orange-400' },
                      { key: 'ok',       label: t('sla.colOk'),       headerCls: 'bg-green-50 border-green-200', dotCls: 'bg-emerald-400' },
                    ].map(col => {
                      const cards = slaData.open_alerts.filter(a => a.sla_status === col.key)
                      return (
                        <div key={col.key} className="rounded-xl border border-zharyq-border overflow-hidden">
                          <div className={`flex items-center gap-2 px-4 py-2.5 border-b ${col.headerCls}`}>
                            <span className={`w-2 h-2 rounded-full ${col.dotCls}`} />
                            <span className="text-xs font-semibold text-zharyq-dark">{col.label}</span>
                            <span className="ml-auto text-xs font-bold text-zharyq-gray">{cards.length}</span>
                          </div>
                          <div className="bg-white divide-y divide-zharyq-border max-h-[420px] overflow-y-auto">
                            {cards.length === 0 && (
                              <p className="text-xs text-zharyq-gray text-center py-6">{t('sla.noAlerts')}</p>
                            )}
                            {cards.map(alert => {
                              const elapsedLive = Math.floor((slaTickNow - new Date(alert.created_at).getTime()) / 1000)
                              const pct = Math.min(100, Math.round(elapsedLive / alert.sla_threshold_seconds * 100))
                              const barColor = col.key === 'breached' ? 'bg-red-400' : col.key === 'warning' ? 'bg-orange-400' : 'bg-emerald-400'
                              const levelBadge = {
                                critical: 'bg-red-50 text-red-600 border-red-200',
                                high:     'bg-orange-50 text-orange-600 border-orange-200',
                                medium:   'bg-amber-50 text-amber-700 border-amber-200',
                                low:      'bg-green-50 text-green-700 border-green-200',
                              }[alert.level] || 'bg-gray-50 text-gray-600 border-gray-200'
                              return (
                                <div key={alert.id} className="px-4 py-3 space-y-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <p className="text-xs font-semibold text-zharyq-dark">{alert.anonymous_id}</p>
                                      {alert.class_name && <p className="text-[10px] text-zharyq-gray">{alert.class_name}</p>}
                                    </div>
                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${levelBadge}`}>
                                      {alert.level.toUpperCase()}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-zharyq-gray truncate">{alert.alert_type}</p>
                                  {/* Progress bar */}
                                  <div className="h-1.5 rounded-full bg-zharyq-border overflow-hidden">
                                    <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                                  </div>
                                  <div className="flex items-center justify-between text-[10px] text-zharyq-gray">
                                    <span className="font-mono">{formatDuration(elapsedLive)}</span>
                                    {col.key === 'breached' && (
                                      <span className="flex items-center gap-0.5 font-semibold text-red-500">
                                        <AlertTriangle size={10} /> SLA Breached
                                      </span>
                                    )}
                                    {col.key === 'warning' && (
                                      <span className="text-orange-500 font-semibold">{pct}% SLA</span>
                                    )}
                                    {col.key === 'ok' && (
                                      <span className="text-emerald-600">{t('sla.withinSla')}</span>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </article>
        </section>

        {/* ── Audit Trail ──────────────────────────────────────────── */}
        <section className="print:hidden">
          <article className="rounded-2xl border border-zharyq-border bg-zharyq-bg">
            {/* Collapsible header */}
            <button
              onClick={() => setAuditOpen(o => !o)}
              className="w-full flex items-center justify-between px-5 py-4 text-left"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-zharyq-orange flex-shrink-0" />
                <div>
                  <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zharyq-gray">
                    {t('audit.title')}
                  </h2>
                  <p className="text-xs text-zharyq-gray mt-0.5">{t('audit.subtitle')}</p>
                </div>
              </div>
              {auditOpen ? <ChevronUp size={16} className="text-zharyq-gray" /> : <ChevronDown size={16} className="text-zharyq-gray" />}
            </button>

            {auditOpen && (
              <div className="border-t border-zharyq-border px-5 pb-5 pt-4 space-y-4">
                {/* Filters */}
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase tracking-wide text-zharyq-gray font-semibold">{t('audit.filterAction')}</label>
                    <select
                      value={auditFilter.action}
                      onChange={e => setAuditFilter(f => ({ ...f, action: e.target.value }))}
                      className="text-sm border border-zharyq-border rounded-xl px-3 py-2 bg-white text-zharyq-dark focus:outline-none focus:ring-2 focus:ring-zharyq-orange/30"
                    >
                      <option value="">{t('audit.allActions')}</option>
                      {auditActions.map(a => (
                        <option key={a} value={a}>{t(`audit.actions.${a}`, a)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase tracking-wide text-zharyq-gray font-semibold">{t('audit.filterFrom')}</label>
                    <input
                      type="date"
                      value={auditFilter.dateFrom}
                      onChange={e => setAuditFilter(f => ({ ...f, dateFrom: e.target.value }))}
                      className="text-sm border border-zharyq-border rounded-xl px-3 py-2 bg-white text-zharyq-dark focus:outline-none focus:ring-2 focus:ring-zharyq-orange/30"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase tracking-wide text-zharyq-gray font-semibold">{t('audit.filterTo')}</label>
                    <input
                      type="date"
                      value={auditFilter.dateTo}
                      onChange={e => setAuditFilter(f => ({ ...f, dateTo: e.target.value }))}
                      className="text-sm border border-zharyq-border rounded-xl px-3 py-2 bg-white text-zharyq-dark focus:outline-none focus:ring-2 focus:ring-zharyq-orange/30"
                    />
                  </div>
                  <button
                    onClick={() => loadAuditLogs(0)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-zharyq-border hover:bg-white transition-colors"
                  >
                    <RefreshCw size={14} className={auditLoading ? 'animate-spin text-zharyq-orange' : 'text-zharyq-gray'} />
                    {t('audit.apply')}
                  </button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-xl border border-zharyq-border">
                  <table className="w-full min-w-[900px] text-xs font-mono">
                    <thead className="bg-white border-b border-zharyq-border">
                      <tr>
                        {[t('audit.colTimestamp'), t('audit.colActor'), t('audit.colAction'), t('audit.colTarget'), t('audit.colReason')].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-zharyq-gray font-sans">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-zharyq-border">
                      {auditLoading && (
                        <tr><td colSpan="5" className="px-4 py-6 text-center text-zharyq-gray font-sans">{t('audit.loading')}</td></tr>
                      )}
                      {!auditLoading && auditLogs.length === 0 && (
                        <tr><td colSpan="5" className="px-4 py-6 text-center text-zharyq-gray font-sans">{t('audit.noLogs')}</td></tr>
                      )}
                      {!auditLoading && auditLogs.map(log => {
                        const ts = new Date(log.created_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
                        const actionColor = {
                          RESOLVE_ALERT: 'text-emerald-600',
                          CREATE_SESSION: 'text-blue-600',
                          CREATE_USER: 'text-zharyq-teal',
                          IMPORT_USERS: 'text-zharyq-teal',
                          DELETE_SESSION: 'text-red-500',
                          VIEW_METRICS_BATCH: 'text-zharyq-gray',
                          VIEW_USER_ANALYTICS: 'text-zharyq-gray',
                          VIEW_ALERTS: 'text-zharyq-gray',
                        }[log.action] || 'text-zharyq-dark'
                        return (
                          <tr key={log.id} className="hover:bg-zharyq-bg transition-colors">
                            <td className="px-4 py-2.5 text-zharyq-gray whitespace-nowrap">[{ts}]</td>
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="font-semibold text-zharyq-dark">{log.actor_name}</span>
                                <span className="text-[10px] text-zharyq-gray uppercase">{log.actor_role}</span>
                              </div>
                            </td>
                            <td className={`px-4 py-2.5 whitespace-nowrap font-semibold ${actionColor}`}>
                              {t(`audit.actions.${log.action}`, log.action)}
                            </td>
                            <td className="px-4 py-2.5 text-zharyq-gray whitespace-nowrap">
                              {log.target_anonymous_id
                                ? log.target_anonymous_id
                                : log.target_user_id
                                  ? `ID: ${log.target_user_id}`
                                  : '—'}
                            </td>
                            <td className="px-4 py-2.5 text-zharyq-gray max-w-[280px] truncate">{log.reason || '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between text-xs text-zharyq-gray">
                  <span>{t('audit.showing', { count: auditLogs.length, offset: auditOffset + 1 })}</span>
                  <div className="flex gap-2">
                    <button
                      disabled={auditOffset === 0}
                      onClick={() => loadAuditLogs(Math.max(0, auditOffset - AUDIT_LIMIT))}
                      className="px-3 py-1.5 border border-zharyq-border rounded-lg disabled:opacity-40 hover:bg-white transition-colors"
                    >
                      ← {t('audit.prev')}
                    </button>
                    <button
                      disabled={auditLogs.length < AUDIT_LIMIT}
                      onClick={() => loadAuditLogs(auditOffset + AUDIT_LIMIT)}
                      className="px-3 py-1.5 border border-zharyq-border rounded-lg disabled:opacity-40 hover:bg-white transition-colors"
                    >
                      {t('audit.next')} →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </article>
        </section>

        {/* ── Mass Campaign Hub ─────────────────────────────────────── */}
        <section className="print:hidden">
          <article className="rounded-2xl border border-zharyq-border bg-zharyq-bg">
            <button
              onClick={() => setCampaignOpen(o => !o)}
              className="w-full flex items-center justify-between px-5 py-4 text-left"
            >
              <div className="flex items-center gap-2">
                <Megaphone size={16} className="text-zharyq-orange flex-shrink-0" />
                <div>
                  <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zharyq-gray">
                    {t('campaign.title')}
                  </h2>
                  <p className="text-xs text-zharyq-gray mt-0.5">{t('campaign.subtitle')}</p>
                </div>
              </div>
              {campaignOpen ? <ChevronUp size={16} className="text-zharyq-gray" /> : <ChevronDown size={16} className="text-zharyq-gray" />}
            </button>
            {campaignOpen && (
              <div className="border-t border-zharyq-border px-5 pb-5 pt-4">
                <CampaignHub />
              </div>
            )}
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
