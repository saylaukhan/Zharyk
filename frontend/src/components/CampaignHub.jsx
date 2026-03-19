import { useState, useEffect } from 'react'
import { Megaphone, Plus, Trash2, Rocket, Users, BookOpen, X, RefreshCw } from 'lucide-react'
import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../context/ThemeContext'
import {
  fetchCampaigns, createCampaign, launchCampaign,
  deleteCampaign, previewCampaignAudience, fetchCourses, fetchCohorts,
} from '../api/api'

ChartJS.register(ArcElement, Tooltip, Legend)

const ROLES = ['student', 'employee', 'psychologist']

export default function CampaignHub() {
  const { t } = useTranslation()
  const { isDark } = useTheme()
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [courses, setCourses] = useState([])
  const [cohorts, setCohorts] = useState([])
  const [form, setForm] = useState({
    title: '',
    description: '',
    course_id: '',
    target_roles: ['student'],
    target_classes: [],
  })
  const [previewCount, setPreviewCount] = useState(null)
  const [creating, setCreating] = useState(false)
  const [launchingId, setLaunchingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const loadCampaigns = () => {
    setLoading(true)
    fetchCampaigns().then(setCampaigns).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => {
    loadCampaigns()
    fetchCourses().then(data => setCourses(Array.isArray(data) ? data : [])).catch(() => {})
    fetchCohorts().then(data => setCohorts(Array.isArray(data) ? data : [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (!showModal) return
    previewCampaignAudience({
      target_roles: form.target_roles.join(','),
      target_classes: form.target_classes.join(','),
    }).then(r => setPreviewCount(r.count)).catch(() => {})
  }, [form.target_roles, form.target_classes, showModal])

  const toggleRole = (role) =>
    setForm(f => ({
      ...f,
      target_roles: f.target_roles.includes(role)
        ? f.target_roles.filter(r => r !== role)
        : [...f.target_roles, role],
    }))

  const toggleClass = (cls) =>
    setForm(f => ({
      ...f,
      target_classes: f.target_classes.includes(cls)
        ? f.target_classes.filter(c => c !== cls)
        : [...f.target_classes, cls],
    }))

  const handleCreate = async () => {
    if (!form.title.trim() || !form.course_id) return
    setCreating(true)
    try {
      await createCampaign({
        title: form.title.trim(),
        description: form.description.trim() || null,
        course_id: Number(form.course_id),
        target_roles: form.target_roles,
        target_classes: form.target_classes,
      })
      setShowModal(false)
      setForm({ title: '', description: '', course_id: '', target_roles: ['student'], target_classes: [] })
      setPreviewCount(null)
      loadCampaigns()
    } catch (e) {
      alert(e.message)
    } finally {
      setCreating(false)
    }
  }

  const handleLaunch = async (id) => {
    setLaunchingId(id)
    try {
      await launchCampaign(id)
      loadCampaigns()
    } catch (e) {
      alert(e.message)
    } finally {
      setLaunchingId(null)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm(t('campaign.confirmDelete'))) return
    setDeletingId(id)
    try {
      await deleteCampaign(id)
      setCampaigns(cs => cs.filter(c => c.id !== id))
    } catch (e) {
      alert(e.message)
    } finally {
      setDeletingId(null)
    }
  }

  const statusBadge = (s) => {
    if (s === 'active') return 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30'
    if (s === 'completed') return 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30'
    return isDark ? 'bg-zinc-700 text-zinc-400 border-zinc-600' : 'bg-gray-100 text-gray-500 border-gray-200'
  }

  const statusLabel = (s) => {
    if (s === 'active') return t('campaign.statusActive')
    if (s === 'completed') return t('campaign.statusCompleted')
    return t('campaign.statusDraft')
  }

  const roleLabel = (role) => {
    const map = { student: t('director.roleStudent'), employee: t('director.roleEmployee'), psychologist: t('director.rolePsychologist') }
    return map[role] || role
  }

  // Shared input class following CreateUserModal pattern
  const inputCls = 'w-full text-sm border border-zharyq-border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zharyq-orange/30 bg-zharyq-bg text-zharyq-dark dark:bg-[#3F3F46] dark:text-white dark:border-[#3F3F46] dark:focus:ring-zharyq-orange/40'

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zharyq-gray">
            {t('campaign.title')}
          </h3>
          <p className="text-xs text-zharyq-gray mt-0.5">{t('campaign.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadCampaigns}
            className="p-2 rounded-xl border border-zharyq-border hover:bg-white dark:hover:bg-zinc-700 transition-colors"
            title={t('campaign.refresh')}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin text-zharyq-orange' : 'text-zharyq-gray'} />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium bg-zharyq-orange text-white rounded-xl hover:bg-orange-600 transition-colors"
          >
            <Plus size={13} />
            {t('campaign.new')}
          </button>
        </div>
      </div>

      {/* Campaign cards */}
      {loading ? (
        <div className="text-center py-8 text-zharyq-gray text-sm">{t('campaign.loading')}</div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2 border border-dashed border-zharyq-border rounded-2xl">
          <Megaphone size={28} className="text-zharyq-gray opacity-30" />
          <p className="text-sm text-zharyq-gray">{t('campaign.noCampaigns')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {campaigns.map(c => {
            const pct = c.total_participants > 0
              ? Math.round((c.completed_participants / c.total_participants) * 100)
              : 0
            const remaining = Math.max(0, c.total_participants - c.completed_participants)
            const donutData = {
              datasets: [{
                data: c.total_participants > 0 ? [c.completed_participants, remaining] : [0, 1],
                backgroundColor: c.total_participants > 0
                  ? ['#14b8a6', isDark ? '#3f3f46' : '#e5e7eb']
                  : [isDark ? '#3f3f46' : '#e5e7eb', isDark ? '#3f3f46' : '#e5e7eb'],
                borderWidth: 0,
              }],
              labels: [t('campaign.completed'), t('campaign.notCompleted')],
            }
            const donutOpts = {
              cutout: '68%',
              plugins: { legend: { display: false }, tooltip: { enabled: c.total_participants > 0 } },
              animation: false,
            }
            return (
              <div
                key={c.id}
                className="rounded-2xl border border-zharyq-border bg-white dark:bg-[#27272A] p-4 space-y-3 flex flex-col"
              >
                <div className="flex items-start gap-2 justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-zharyq-dark dark:text-white text-sm truncate">{c.title}</h4>
                    {c.description && (
                      <p className="text-xs text-zharyq-gray mt-0.5 line-clamp-2">{c.description}</p>
                    )}
                  </div>
                  <span className={`flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusBadge(c.status)}`}>
                    {statusLabel(c.status)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-zharyq-gray">
                  <BookOpen size={12} className="flex-shrink-0" />
                  <span className="truncate">{c.course_title || `Course #${c.course_id}`}</span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-zharyq-gray">
                  <Users size={12} className="flex-shrink-0" />
                  <span className="truncate">
                    {c.target_classes?.length ? c.target_classes.join(', ') : t('campaign.allStudents')}
                  </span>
                </div>

                <div className="flex items-center gap-4 pt-1">
                  <div className="relative w-16 h-16 flex-shrink-0">
                    <Doughnut data={donutData} options={donutOpts} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-bold text-zharyq-dark dark:text-white">{pct}%</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-zharyq-gray">
                      {c.completed_participants} / {c.total_participants} {t('campaign.participants')}
                    </p>
                    <div className="flex flex-col gap-0.5 text-[10px] text-zharyq-gray">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-zharyq-teal inline-block" />
                        {t('campaign.completed')}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full inline-block ${isDark ? 'bg-zinc-600' : 'bg-gray-200'}`} />
                        {t('campaign.notCompleted')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-zharyq-border mt-auto">
                  {c.status === 'draft' && (
                    <button
                      onClick={() => handleLaunch(c.id)}
                      disabled={launchingId === c.id}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-zharyq-orange text-white rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50"
                    >
                      <Rocket size={12} />
                      {launchingId === c.id ? t('campaign.launching') : t('campaign.launch')}
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(c.id)}
                    disabled={deletingId === c.id}
                    className="p-1.5 rounded-xl border border-zharyq-border text-zharyq-gray hover:text-red-500 hover:border-red-200 dark:hover:border-red-500/40 transition-colors disabled:opacity-50 ml-auto"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Campaign Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#27272A] rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zharyq-border dark:border-[#3F3F46]">
              <h2 className="text-sm font-semibold text-zharyq-dark dark:text-white flex items-center gap-2">
                <Megaphone size={15} className="text-zharyq-orange" />
                {t('campaign.new')}
              </h2>
              <button
                onClick={() => { setShowModal(false); setPreviewCount(null) }}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
              >
                <X size={16} className="text-zharyq-gray" />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-5 space-y-4">
              {/* Title */}
              <div>
                <label className="text-[10px] uppercase tracking-wide text-zharyq-gray font-semibold block mb-1">
                  {t('campaign.fieldTitle')} *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder={t('campaign.titlePlaceholder')}
                  className={inputCls}
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] uppercase tracking-wide text-zharyq-gray font-semibold block mb-1">
                  {t('campaign.fieldDesc')}
                </label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className={`${inputCls} resize-none`}
                />
              </div>

              {/* Course */}
              <div>
                <label className="text-[10px] uppercase tracking-wide text-zharyq-gray font-semibold block mb-1">
                  {t('campaign.fieldCourse')} *
                </label>
                <select
                  value={form.course_id}
                  onChange={e => setForm(f => ({ ...f, course_id: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">{t('campaign.selectCourse')}</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              {/* Target roles */}
              <div>
                <label className="text-[10px] uppercase tracking-wide text-zharyq-gray font-semibold block mb-2">
                  {t('campaign.fieldRoles')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {ROLES.map(role => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleRole(role)}
                      className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                        form.target_roles.includes(role)
                          ? 'bg-zharyq-orange text-white border-zharyq-orange'
                          : isDark
                            ? 'border-zinc-600 text-zinc-300 hover:border-zharyq-orange'
                            : 'border-zharyq-border text-zharyq-gray hover:border-zharyq-orange'
                      }`}
                    >
                      {roleLabel(role)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target classes */}
              {cohorts.length > 0 && (
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-zharyq-gray font-semibold block mb-2">
                    {t('campaign.fieldClasses')}
                  </label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {cohorts.map(cls => (
                      <button
                        key={cls}
                        type="button"
                        onClick={() => toggleClass(cls)}
                        className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                          form.target_classes.includes(cls)
                            ? 'bg-zharyq-teal text-white border-zharyq-teal'
                            : isDark
                              ? 'border-zinc-600 text-zinc-300 hover:border-zharyq-teal'
                              : 'border-zharyq-border text-zharyq-gray hover:border-zharyq-teal'
                        }`}
                      >
                        {cls}
                      </button>
                    ))}
                  </div>
                  {form.target_classes.length === 0 && (
                    <p className="text-[11px] text-zharyq-gray mt-1">{t('campaign.allClassesHint')}</p>
                  )}
                </div>
              )}

              {/* Audience preview */}
              {previewCount !== null && (
                <div className={`flex items-center gap-2 text-xs rounded-xl px-3 py-2.5 border ${
                  isDark ? 'bg-zinc-800 border-zinc-600' : 'bg-zharyq-bg border-zharyq-border'
                }`}>
                  <Users size={13} className="text-zharyq-orange flex-shrink-0" />
                  <span className="text-zharyq-dark dark:text-white font-medium">
                    {t('campaign.previewCount', { count: previewCount })}
                  </span>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className={`flex items-center gap-2 px-5 py-4 border-t border-zharyq-border dark:border-[#3F3F46]`}>
              <button
                onClick={() => { setShowModal(false); setPreviewCount(null) }}
                className={`flex-1 px-4 py-2 text-sm border rounded-xl transition-colors ${
                  isDark
                    ? 'border-zinc-600 text-zinc-300 hover:bg-zinc-700'
                    : 'border-zharyq-border text-zharyq-dark hover:bg-gray-50'
                }`}
              >
                {t('campaign.cancel')}
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !form.title.trim() || !form.course_id}
                className="flex-1 px-4 py-2 text-sm font-medium bg-zharyq-orange text-white rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50"
              >
                {creating ? t('campaign.creating') : t('campaign.create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
