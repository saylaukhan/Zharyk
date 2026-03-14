import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, BookOpen, Eye, Send, GripVertical, BookMarked,
  Dumbbell, Plus, Settings, Upload, ChevronDown, Wind,
  FileText, Link2, Sparkles, Bold, Italic,
  Quote, Trash2
} from 'lucide-react'
import ThemeToggle from '../components/ThemeToggle'
import { useTheme } from '../context/ThemeContext'

const CATEGORIES = ['Стресс', 'Выгорание', 'Тревожность', 'Эмоции', 'Мотивация']

const INITIAL_MODULES = [
  { id: 'settings', type: 'settings', label: 'Настройки курса' },
  { id: 'theory-1', type: 'theory', label: 'Природа стресса: откуда он берётся?', index: 1 },
  { id: 'practice-1', type: 'practice', label: 'Осознание триггеров', index: 1 },
  { id: 'theory-2', type: 'theory', label: 'Физиология стресс-ответа', index: 2 },
  { id: 'practice-2', type: 'practice', label: 'Дыхательная практика 4-7-8', index: 2 },
]

function EmptyStateIllustration() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-5 opacity-40">
      <rect x="20" y="30" width="80" height="56" rx="6" stroke="currentColor" strokeWidth="1.5" />
      <rect x="28" y="42" width="30" height="22" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <line x1="64" y1="46" x2="88" y2="46" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="64" y1="52" x2="84" y2="52" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="64" y1="58" x2="80" y2="58" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="43" cy="53" r="5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M40 53 L42 55 L46 51" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="28" y1="76" x2="92" y2="76" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="28" y1="82" x2="75" y2="82" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="96" cy="88" r="14" stroke="currentColor" strokeWidth="1.5" />
      <line x1="96" y1="84" x2="96" y2="92" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="92" y1="88" x2="100" y2="88" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function CourseSettingsEditor() {
  const [category, setCategory] = useState('Стресс')
  const [description, setDescription] = useState('')

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-8 py-8">
        <h2 className="text-lg font-semibold text-zharyq-dark mb-1">Настройки курса</h2>
        <p className="text-sm text-zharyq-gray mb-8">Общая информация и обложка курса</p>

        <div className="mb-6">
          <label className="block text-xs font-semibold text-zharyq-gray uppercase tracking-wider mb-3">Обложка курса</label>
          <div
            className="w-full aspect-video rounded-xl border border-dashed border-zharyq-border flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors hover:border-zharyq-orange group"
            style={{ background: 'var(--color-surface)' }}
          >
            <div className="w-10 h-10 rounded-xl border border-zharyq-border flex items-center justify-center group-hover:border-zharyq-orange transition-colors">
              <Upload size={18} className="text-zharyq-gray group-hover:text-zharyq-orange transition-colors" strokeWidth={1.5} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-zharyq-dark">Загрузить обложку</p>
              <p className="text-xs text-zharyq-gray mt-0.5">Рекомендуется 1280×720 · PNG, JPG</p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-xs font-semibold text-zharyq-gray uppercase tracking-wider mb-3">Категория</label>
          <div className="relative">
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full border border-zharyq-border rounded-xl px-3 py-2.5 text-sm bg-white text-zharyq-dark focus:border-zharyq-orange transition-all outline-none appearance-none pr-8"
              style={{ background: 'var(--color-bg)' }}
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zharyq-gray pointer-events-none" strokeWidth={1.5} />
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-xs font-semibold text-zharyq-gray uppercase tracking-wider mb-3">Краткое описание</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Что узнает и научится делать ученик после прохождения курса..."
            rows={5}
            className="w-full border border-zharyq-border rounded-xl px-3 py-3 text-sm bg-white text-zharyq-dark focus:border-zharyq-orange transition-all outline-none resize-none leading-relaxed"
            style={{ background: 'var(--color-bg)' }}
          />
          <p className="text-xs text-zharyq-gray mt-1.5">{description.length} символов</p>
        </div>

        <div className="p-4 rounded-xl border border-zharyq-border" style={{ background: 'var(--color-surface)' }}>
          <p className="text-xs font-semibold text-zharyq-gray uppercase tracking-wider mb-3">Мета-информация</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-zharyq-gray mb-1.5">Время прохождения (мин)</label>
              <input
                type="number"
                defaultValue={45}
                className="w-full border border-zharyq-border rounded-lg px-3 py-2 text-sm focus:border-zharyq-orange transition-all outline-none"
                style={{ background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}
              />
            </div>
            <div>
              <label className="block text-xs text-zharyq-gray mb-1.5">Количество уроков</label>
              <input
                type="number"
                defaultValue={4}
                className="w-full border border-zharyq-border rounded-lg px-3 py-2 text-sm focus:border-zharyq-orange transition-all outline-none"
                style={{ background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TheoryModuleEditor({ module }) {
  const [videoUrl, setVideoUrl] = useState('')
  const [lessonTitle, setLessonTitle] = useState(module.label)
  const [showVideoInput, setShowVideoInput] = useState(false)
  const [urlFocused, setUrlFocused] = useState(false)
  const [showFormatBar, setShowFormatBar] = useState(false)
  const [formatBarPos, setFormatBarPos] = useState({ top: 0, left: 0 })

  const editorWrapRef = useRef(null)

  const handleEditorMouseUp = useCallback(() => {
    setTimeout(() => {
      const sel = window.getSelection()
      if (!sel || sel.toString().length === 0 || !editorWrapRef.current) {
        setShowFormatBar(false)
        return
      }
      const range = sel.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      const wrapRect = editorWrapRef.current.getBoundingClientRect()
      const barWidth = 168
      setFormatBarPos({
        top: rect.top - wrapRect.top - 46,
        left: Math.min(
          Math.max(rect.left - wrapRect.left + rect.width / 2 - barWidth / 2, 0),
          wrapRect.width - barWidth
        ),
      })
      setShowFormatBar(true)
    }, 10)
  }, [])

  const hideFormatBar = useCallback(() => setShowFormatBar(false), [])

  const getEmbedUrl = (url) => {
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
    if (yt) return `https://www.youtube.com/embed/${yt[1]}`
    const vimeo = url.match(/vimeo\.com\/(\d+)/)
    if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`
    return null
  }

  const embedUrl = videoUrl ? getEmbedUrl(videoUrl) : null

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[700px] mx-auto px-6 py-8 pb-16">

        {/* VIDEO BLOCK */}
        <div className="mb-7">
          {embedUrl ? (
            <div
              className="relative w-full rounded-xl overflow-hidden border border-zharyq-border group"
              style={{ aspectRatio: '16/9' }}
            >
              <iframe
                src={embedUrl}
                className="w-full h-full"
                allowFullScreen
                title="Video preview"
              />
              <button
                onClick={() => { setVideoUrl(''); setShowVideoInput(false) }}
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity px-2.5 py-1 rounded-lg text-xs font-medium text-white"
                style={{ background: 'rgba(0,0,0,0.55)' }}
              >
                Изменить
              </button>
            </div>
          ) : (
            <div
              className="w-full rounded-xl border border-dashed border-zharyq-border flex flex-col items-center justify-center gap-4 transition-colors hover:border-zharyq-orange group"
              style={{ aspectRatio: '16/9', background: 'var(--color-surface)', cursor: showVideoInput ? 'default' : 'pointer' }}
              onClick={() => !showVideoInput && setShowVideoInput(true)}
            >
              {showVideoInput ? (
                <div className="flex flex-col items-center gap-3 w-64 panel-enter" onClick={e => e.stopPropagation()}>
                  <input
                    autoFocus
                    type="text"
                    value={videoUrl}
                    onChange={e => setVideoUrl(e.target.value)}
                    onFocus={() => setUrlFocused(true)}
                    onBlur={() => { setUrlFocused(false); if (!videoUrl) setShowVideoInput(false) }}
                    placeholder="Вставьте ссылку на YouTube или Vimeo"
                    className="w-full rounded-lg px-3 py-2.5 text-sm text-center outline-none transition-all"
                    style={{
                      background: 'var(--color-bg)',
                      border: urlFocused ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                      color: 'var(--color-text-primary)',
                      caretColor: 'var(--color-accent)',
                    }}
                  />
                  <span className="text-xs text-zharyq-gray">или</span>
                  <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs text-zharyq-gray border border-zharyq-border hover:border-zharyq-dark hover:text-zharyq-dark transition-colors">
                    <Upload size={13} strokeWidth={1.5} />
                    Загрузить MP4
                  </button>
                </div>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-xl border border-zharyq-border flex items-center justify-center group-hover:border-zharyq-orange transition-colors">
                    <Link2 size={18} className="text-zharyq-gray group-hover:text-zharyq-orange transition-colors" strokeWidth={1.5} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Добавить видео</p>
                    <p className="text-xs text-zharyq-gray mt-0.5">YouTube, Vimeo или загрузите MP4</p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* LESSON TITLE */}
        <input
          type="text"
          value={lessonTitle}
          onChange={e => setLessonTitle(e.target.value)}
          placeholder="Название урока"
          className="w-full bg-transparent border-none outline-none mb-7 pb-5 border-b border-zharyq-border"
          style={{
            fontSize: '26px',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            caretColor: 'var(--color-accent)',
          }}
        />

        {/* NOTION-LIKE ARTICLE EDITOR */}
        <div className="relative" ref={editorWrapRef}>
          {showFormatBar && (
            <div
              className="absolute z-20 flex items-center gap-0.5 px-1.5 py-1 rounded-lg"
              style={{
                top: formatBarPos.top,
                left: formatBarPos.left,
                background: 'var(--color-text-primary)',
                pointerEvents: 'auto',
              }}
            >
              {[
                { Icon: Bold,   title: 'Жирный' },
                { Icon: Italic, title: 'Курсив' },
                { Icon: Link2,  title: 'Ссылка' },
                { Icon: Quote,  title: 'Цитата' },
              ].map(({ Icon, title }) => (
                <button
                  key={title}
                  title={title}
                  className="p-1.5 rounded transition-colors"
                  style={{ color: '#F4F4F5' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  onMouseDown={e => e.preventDefault()}
                >
                  <Icon size={13} strokeWidth={1.5} />
                </button>
              ))}
              <div className="w-px h-3.5 mx-0.5" style={{ background: 'rgba(255,255,255,0.18)' }} />
              <button
                className="px-1.5 py-0.5 rounded text-[11px] font-semibold transition-colors"
                style={{ color: 'var(--color-accent)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                onMouseDown={e => e.preventDefault()}
              >
                H2
              </button>
            </div>
          )}

          <div
            contentEditable
            suppressContentEditableWarning
            onMouseUp={handleEditorMouseUp}
            onKeyDown={hideFormatBar}
            onBlur={hideFormatBar}
            className="outline-none"
            data-placeholder="Начните писать конспект к уроку..."
            style={{
              lineHeight: 1.7,
              maxWidth: '65ch',
              minHeight: '320px',
              fontSize: '14px',
              color: 'var(--color-text-primary)',
              caretColor: 'var(--color-accent)',
            }}
          />
        </div>
      </div>

      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: var(--color-text-secondary);
          opacity: 0.4;
          pointer-events: none;
        }
        [contenteditable] blockquote {
          border-left: 3px solid var(--color-accent);
          margin: 0.75em 0;
          padding: 0.25em 0 0.25em 1em;
          color: var(--color-text-secondary);
        }
        [contenteditable] ul {
          list-style: disc;
          padding-left: 1.4em;
          margin: 0.5em 0;
        }
        [contenteditable] li { margin: 0.25em 0; }
      `}</style>
    </div>
  )
}

function PracticeModuleEditor({ module }) {
  const [practiceType, setPracticeType] = useState('essay')
  const [prompt, setPrompt] = useState('')
  const [aiEnabled, setAiEnabled] = useState(false)
  const [breathDuration, setBreathDuration] = useState(5)

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-8 py-8">
        <h2 className="text-lg font-semibold text-zharyq-dark mb-1">{module.label}</h2>
        <p className="text-sm text-zharyq-gray mb-8">Модуль практики · Настройте тип задания</p>

        <div className="mb-6">
          <label className="block text-xs font-semibold text-zharyq-gray uppercase tracking-wider mb-3">Тип задания</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setPracticeType('essay')}
              className="flex items-start gap-3 p-4 rounded-xl border transition-all text-left"
              style={{
                borderColor: practiceType === 'essay' ? 'var(--color-accent)' : 'var(--color-border)',
                background: practiceType === 'essay' ? 'var(--color-accent-light)' : 'var(--color-bg)',
              }}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-surface)' }}>
                <FileText size={15} strokeWidth={1.5} className="text-zharyq-gray" />
              </div>
              <div>
                <p className="text-sm font-medium text-zharyq-dark">Открытый вопрос</p>
                <p className="text-xs text-zharyq-gray mt-0.5">Эссе или дневниковая запись</p>
              </div>
            </button>
            <button
              onClick={() => setPracticeType('breathing')}
              className="flex items-start gap-3 p-4 rounded-xl border transition-all text-left"
              style={{
                borderColor: practiceType === 'breathing' ? 'var(--color-accent)' : 'var(--color-border)',
                background: practiceType === 'breathing' ? 'var(--color-accent-light)' : 'var(--color-bg)',
              }}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-surface)' }}>
                <Wind size={15} strokeWidth={1.5} className="text-zharyq-gray" />
              </div>
              <div>
                <p className="text-sm font-medium text-zharyq-dark">Дыхательная практика</p>
                <p className="text-xs text-zharyq-gray mt-0.5">Встроенный виджет упражнений</p>
              </div>
            </button>
          </div>
        </div>

        <div key={practiceType} className="panel-enter">
        {practiceType === 'essay' ? (
          <>
            <div className="mb-6">
              <label className="block text-xs font-semibold text-zharyq-gray uppercase tracking-wider mb-3">Вопрос или задание</label>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Опишите ситуацию, в которой вы недавно испытали стресс. Что произошло? Как вы себя чувствовали физически и эмоционально?"
                rows={5}
                className="w-full border border-zharyq-border rounded-xl px-3 py-3 text-sm leading-relaxed focus:border-zharyq-orange transition-all outline-none resize-none"
                style={{ background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}
              />
            </div>

            <div
              className="p-4 rounded-xl border transition-colors cursor-pointer"
              style={{
                borderColor: aiEnabled ? 'var(--color-accent)' : 'var(--color-border)',
                background: aiEnabled ? 'var(--color-accent-light)' : 'var(--color-surface)',
              }}
              onClick={() => setAiEnabled(v => !v)}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: aiEnabled ? 'var(--color-accent)' : 'var(--color-border)' }}
                >
                  <Sparkles size={14} strokeWidth={1.5} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-zharyq-dark">Анализировать ответ с помощью AI</p>
                  <p className="text-xs text-zharyq-gray mt-0.5">ИИ прочитает ответ ученика и даст поддерживающую обратную связь</p>
                </div>
                <div
                  className="w-10 h-6 rounded-full flex items-center transition-all shrink-0"
                  style={{ background: aiEnabled ? 'var(--color-accent)' : 'var(--color-border)', padding: '2px' }}
                >
                  <div
                    className="w-5 h-5 rounded-full bg-white transition-transform"
                    style={{ transform: aiEnabled ? 'translateX(16px)' : 'translateX(0)' }}
                  />
                </div>
              </div>
              {aiEnabled && (
                <div className="builder-ai-expand mt-3 pt-3 border-t border-orange-200">
                  <p className="text-xs text-zharyq-gray">
                    После отправки ответа ученик получит персонализированную поддерживающую обратную связь от AI на основе содержания его ответа.
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zharyq-gray uppercase tracking-wider mb-3">Продолжительность (минуты)</label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={1}
                  max={20}
                  value={breathDuration}
                  onChange={e => setBreathDuration(Number(e.target.value))}
                  className="flex-1 accent-zharyq-orange"
                />
                <span className="text-2xl font-semibold text-zharyq-dark w-12 text-right">{breathDuration}</span>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-zharyq-border flex flex-col items-center gap-4" style={{ background: 'var(--color-surface)' }}>
              <div
                className="w-24 h-24 rounded-full border-2 flex items-center justify-center"
                style={{ borderColor: 'var(--color-teal)' }}
              >
                <Wind size={32} strokeWidth={1.5} style={{ color: 'var(--color-teal)' }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-zharyq-dark">Предпросмотр виджета</p>
                <p className="text-xs text-zharyq-gray mt-0.5">Техника 4-7-8 · {breathDuration} мин</p>
              </div>
              <div className="flex gap-3 text-xs text-zharyq-gray">
                <span className="px-2.5 py-1 rounded-full border border-zharyq-border">Вдох 4с</span>
                <span className="px-2.5 py-1 rounded-full border border-zharyq-border">Задержка 7с</span>
                <span className="px-2.5 py-1 rounded-full border border-zharyq-border">Выдох 8с</span>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}

function EmptyEditor() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-zharyq-gray px-8">
      <EmptyStateIllustration />
      <p className="text-sm font-medium text-zharyq-dark mb-1.5 text-center">Выберите раздел для редактирования</p>
      <p className="text-sm text-center leading-relaxed max-w-xs">
        Начните с добавления настроек курса или первого теоретического модуля
      </p>
    </div>
  )
}

export default function CourseBuilder() {
  const { isDark } = useTheme()
  const navigate = useNavigate()

  const [courseTitle, setCourseTitleState] = useState('Новый курс')
  const [titleFocused, setTitleFocused] = useState(false)
  const [modules, setModules] = useState(INITIAL_MODULES)
  const [selectedId, setSelectedId] = useState(null)
  const [draggedId, setDraggedId] = useState(null)
  const [dragOverId, setDragOverId] = useState(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [publishConfirm, setPublishConfirm] = useState(false)

  const selectedModule = modules.find(m => m.id === selectedId) || null
  const moduleToDelete = modules.find(m => m.id === deleteConfirmId) || null

  const addTheory = () => {
    const theoryCount = modules.filter(m => m.type === 'theory').length + 1
    const newModule = {
      id: `theory-${Date.now()}`,
      type: 'theory',
      label: `Теоретический урок ${theoryCount}`,
      index: theoryCount,
    }
    setModules(prev => [...prev, newModule])
    setSelectedId(newModule.id)
  }

  const addPractice = () => {
    const practiceCount = modules.filter(m => m.type === 'practice').length + 1
    const newModule = {
      id: `practice-${Date.now()}`,
      type: 'practice',
      label: `Практическое задание ${practiceCount}`,
      index: practiceCount,
    }
    setModules(prev => [...prev, newModule])
    setSelectedId(newModule.id)
  }

  const deleteModule = (id) => {
    setModules(prev => prev.filter(m => m.id !== id))
    if (selectedId === id) setSelectedId(null)
    setDeleteConfirmId(null)
  }

  const handleDragStart = (e, id) => {
    setDraggedId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, id) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (id !== draggedId) setDragOverId(id)
  }

  const handleDrop = (e, id) => {
    e.preventDefault()
    if (!draggedId || draggedId === id) return
    const settings = modules.filter(m => m.type === 'settings')
    const rest = modules.filter(m => m.type !== 'settings')
    const fromIdx = rest.findIndex(m => m.id === draggedId)
    const toIdx = rest.findIndex(m => m.id === id)
    if (fromIdx < 0 || toIdx < 0) return
    const reordered = [...rest]
    const [removed] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, removed)
    setModules([...settings, ...reordered])
    setDraggedId(null)
    setDragOverId(null)
  }

  const handleDragEnd = () => {
    setDraggedId(null)
    setDragOverId(null)
  }

  const renderEditor = () => {
    if (!selectedModule) return <EmptyEditor />
    if (selectedModule.type === 'settings') return <CourseSettingsEditor />
    if (selectedModule.type === 'theory') return <TheoryModuleEditor key={selectedModule.id} module={selectedModule} />
    if (selectedModule.type === 'practice') return <PracticeModuleEditor key={selectedModule.id} module={selectedModule} />
    return <EmptyEditor />
  }

  return (
    <div
      className="builder-page-enter font-sans h-screen flex flex-col overflow-hidden selection:bg-zharyq-orange selection:text-white"
      style={{ background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}
    >
      {/* BUILDER HEADER */}
      <header
        className="flex items-center gap-4 px-5 py-3 shrink-0 sticky top-0 z-20"
        style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}
      >
        <button
          onClick={() => navigate('/psychologist')}
          className="flex items-center gap-1.5 text-sm text-zharyq-gray hover:text-zharyq-dark transition-colors rounded-lg px-2 py-1.5 hover:bg-gray-100"
        >
          <ArrowLeft size={15} strokeWidth={1.5} />
          <span>Назад к курсам</span>
        </button>

        <div className="w-px h-4 shrink-0" style={{ background: 'var(--color-border)' }} />

        <input
          type="text"
          value={courseTitle}
          onChange={e => setCourseTitleState(e.target.value)}
          onFocus={() => setTitleFocused(true)}
          onBlur={() => setTitleFocused(false)}
          className="text-sm font-semibold bg-transparent rounded-lg px-2 py-1.5 transition-all outline-none min-w-[180px]"
          style={{
            color: 'var(--color-text-primary)',
            border: titleFocused ? '1px solid var(--color-accent)' : '1px solid transparent',
          }}
        />

        <div className="flex-1 flex justify-center">
          <span className="text-xs text-zharyq-gray">Сохранено в черновики в 14:05</span>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <ThemeToggle />
          <button
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border transition-colors hover:bg-gray-100"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          >
            <Eye size={14} strokeWidth={1.5} />
            Предпросмотр
          </button>
          <button
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border transition-colors hover:bg-gray-100"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
          >
            <BookOpen size={14} strokeWidth={1.5} />
            Черновик
          </button>
          <button
            onClick={() => setPublishConfirm(true)}
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg text-white transition-colors"
            style={{ background: 'var(--color-accent)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--color-accent-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--color-accent)'}
          >
            <Send size={14} strokeWidth={1.5} />
            Опубликовать
          </button>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT SIDEBAR — Course Structure */}
        <aside
          className="w-[30%] min-w-[260px] max-w-[340px] flex flex-col h-full overflow-hidden shrink-0"
          style={{ borderRight: '1px solid var(--color-border)', background: 'var(--color-surface)' }}
        >
          <div className="px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <p className="text-xs font-semibold text-zharyq-gray uppercase tracking-wider">Структура курса</p>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {/* Settings item */}
            {modules.filter(m => m.type === 'settings').map(m => (
              <button
                key={m.id}
                onClick={() => setSelectedId(m.id)}
                className="builder-module-item w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors relative"
                style={{
                  background: selectedId === m.id ? 'var(--color-bg)' : 'transparent',
                  borderLeft: selectedId === m.id ? '2px solid var(--color-accent)' : '2px solid transparent',
                }}
              >
                <Settings
                  size={15}
                  strokeWidth={1.5}
                  style={{ color: selectedId === m.id ? 'var(--color-accent)' : 'var(--color-text-secondary)', flexShrink: 0 }}
                />
                <span
                  className="text-sm truncate"
                  style={{ color: selectedId === m.id ? 'var(--color-accent)' : 'var(--color-text-primary)', fontWeight: selectedId === m.id ? 500 : 400 }}
                >
                  {m.label}
                </span>
              </button>
            ))}

            {/* Theory & Practice modules */}
            {modules.filter(m => m.type !== 'settings').length > 0 && (
              <div className="mt-2 px-4 py-2">
                <p className="text-[10px] font-semibold text-zharyq-gray uppercase tracking-wider">Модули</p>
              </div>
            )}

            {modules.filter(m => m.type !== 'settings').map(m => (
              <div
                key={m.id}
                draggable
                onDragStart={e => handleDragStart(e, m.id)}
                onDragOver={e => handleDragOver(e, m.id)}
                onDrop={e => handleDrop(e, m.id)}
                onDragEnd={handleDragEnd}
                onClick={() => setSelectedId(m.id)}
                className="builder-module-item w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all group cursor-pointer select-none"
                style={{
                  background: dragOverId === m.id && draggedId !== m.id
                    ? 'var(--color-accent-light)'
                    : selectedId === m.id ? 'var(--color-bg)' : 'transparent',
                  borderLeft: selectedId === m.id ? '2px solid var(--color-accent)' : dragOverId === m.id && draggedId !== m.id ? '2px solid var(--color-accent)' : '2px solid transparent',
                  opacity: draggedId === m.id ? 0.4 : 1,
                }}
              >
                <GripVertical
                  size={14}
                  strokeWidth={1.5}
                  className="opacity-0 group-hover:opacity-40 transition-opacity shrink-0 cursor-grab"
                  style={{ color: 'var(--color-text-secondary)' }}
                />
                {m.type === 'theory' ? (
                  <BookMarked
                    size={15}
                    strokeWidth={1.5}
                    style={{ color: selectedId === m.id ? 'var(--color-accent)' : 'var(--color-text-secondary)', flexShrink: 0 }}
                  />
                ) : (
                  <Dumbbell
                    size={15}
                    strokeWidth={1.5}
                    style={{ color: selectedId === m.id ? 'var(--color-accent)' : 'var(--color-teal)', flexShrink: 0 }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm truncate"
                    style={{
                      color: selectedId === m.id ? 'var(--color-accent)' : 'var(--color-text-primary)',
                      fontWeight: selectedId === m.id ? 500 : 400,
                    }}
                  >
                    {m.label}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                    {m.type === 'theory' ? '📚 Теория' : '🧘 Практика'}
                  </p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); setDeleteConfirmId(m.id) }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-red-50 text-zharyq-gray hover:text-red-500 shrink-0"
                  title="Удалить модуль"
                >
                  <Trash2 size={13} strokeWidth={1.5} />
                </button>
              </div>
            ))}
          </div>

          {/* Bottom action buttons */}
          <div className="p-3 flex flex-col gap-2 shrink-0" style={{ borderTop: '1px solid var(--color-border)' }}>
            <button
              onClick={addTheory}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors hover:bg-gray-100 text-zharyq-gray hover:text-zharyq-dark"
            >
              <Plus size={15} strokeWidth={1.5} />
              <BookOpen size={14} strokeWidth={1.5} />
              <span>Добавить теорию</span>
            </button>
            <button
              onClick={addPractice}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors hover:bg-gray-100 text-zharyq-gray hover:text-zharyq-dark"
            >
              <Plus size={15} strokeWidth={1.5} />
              <Dumbbell size={14} strokeWidth={1.5} />
              <span>Добавить практику</span>
            </button>
          </div>
        </aside>

        {/* RIGHT EDITOR */}
        <main className="flex-1 overflow-hidden" style={{ background: 'var(--color-bg)' }}>
          <div key={selectedId} className="h-full panel-enter">
            {renderEditor()}
          </div>
        </main>
      </div>

      {/* DELETE MODULE CONFIRMATION */}
      {deleteConfirmId && moduleToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.3)' }}
          onClick={() => setDeleteConfirmId(null)}
        >
          <div
            className="rounded-2xl border border-zharyq-border p-6 w-[380px] max-w-[90vw] builder-page-enter"
            style={{ background: 'var(--color-bg)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                <Trash2 size={16} className="text-red-500" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Удалить модуль?</p>
                <p className="text-xs text-zharyq-gray mt-0.5">Это действие нельзя отменить</p>
              </div>
            </div>
            <p className="text-sm text-zharyq-gray mb-5 leading-relaxed">
              Модуль <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>«{moduleToDelete.label}»</span> и всё его содержимое будут удалены.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-4 py-2 rounded-lg text-sm border transition-colors hover:bg-gray-50"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              >
                Отмена
              </button>
              <button
                onClick={() => deleteModule(deleteConfirmId)}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PUBLISH CONFIRMATION */}
      {publishConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.3)' }}
          onClick={() => setPublishConfirm(false)}
        >
          <div
            className="rounded-2xl border border-zharyq-border p-6 w-[400px] max-w-[90vw] builder-page-enter"
            style={{ background: 'var(--color-bg)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'var(--color-accent-light)', border: '1px solid rgba(255,113,0,0.2)' }}
              >
                <Send size={16} strokeWidth={1.5} style={{ color: 'var(--color-accent)' }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Опубликовать курс?</p>
                <p className="text-xs text-zharyq-gray mt-0.5">Курс станет доступен учащимся</p>
              </div>
            </div>
            <p className="text-sm text-zharyq-gray mb-5 leading-relaxed">
              Курс <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>«{courseTitle}»</span> будет опубликован. Вы сможете вернуть его в черновики в любой момент.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPublishConfirm(false)}
                className="flex-1 px-4 py-2 rounded-lg text-sm border transition-colors hover:bg-gray-50"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              >
                Отмена
              </button>
              <button
                onClick={() => setPublishConfirm(false)}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                style={{ background: 'var(--color-accent)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--color-accent-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--color-accent)'}
              >
                Опубликовать
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
