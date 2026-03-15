import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, BookOpen, Eye, Send, GripVertical, BookMarked,
  Dumbbell, Plus, Settings, Upload, ChevronDown, Wind,
  FileText, Link2, Sparkles, Bold, Italic,
  Quote, Trash2, CheckSquare, X
} from 'lucide-react'
import ThemeToggle from '../components/ThemeToggle'
import { useTheme } from '../context/ThemeContext'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

function useDebounce(fn, delay) {
  const timer = useRef(null)
  return useCallback((...args) => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => fn(...args), delay)
  }, [fn, delay])
}

const CATEGORIES = ['Стресс', 'Выгорание', 'Тревожность', 'Эмоции', 'Мотивация']

const INITIAL_MODULES = [
  { id: 'settings', type: 'settings', label: 'Настройки курса' },
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

function CourseSettingsEditor({ courseId, initialCategory, initialDescription, initialDuration, lessonsCount, courseType, onSave }) {
  const [category, setCategory] = useState(initialCategory || 'Стресс')
  const [description, setDescription] = useState(initialDescription || '')
  const [duration, setDuration] = useState(initialDuration || 45)

  const save = useCallback(async (cat, desc, dur) => {
    if (!courseId) return
    try {
      await fetch(`${API}/courses/${courseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: cat, description: desc, duration: dur }),
      })
      onSave?.({ category: cat, description: desc, duration: dur })
    } catch (e) { console.error(e) }
  }, [courseId])

  const debouncedSave = useDebounce(save, 800)

  const handleCategory = (val) => { setCategory(val); debouncedSave(val, description, duration) }
  const handleDescription = (val) => { setDescription(val); debouncedSave(category, val, duration) }
  const handleDuration = (val) => { setDuration(val); debouncedSave(category, description, val) }

  return (
    <div className="h-full overflow-y-auto animate-fade-in-up">
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
              onChange={e => handleCategory(e.target.value)}
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
            onChange={e => handleDescription(e.target.value)}
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
                value={duration}
                onChange={e => handleDuration(Number(e.target.value))}
                className="w-full border border-zharyq-border rounded-lg px-3 py-2 text-sm focus:border-zharyq-orange transition-all outline-none"
                style={{ background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}
              />
            </div>
            <div>
              <label className="block text-xs text-zharyq-gray mb-1.5">Количество уроков</label>
              <input
                type="text"
                value={lessonsCount ?? '-'}
                readOnly
                className="w-full border border-zharyq-border rounded-lg px-3 py-2 text-sm outline-none opacity-80 cursor-not-allowed"
                style={{ background: 'var(--color-surface)', color: 'var(--color-text-secondary)' }}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-zharyq-gray mb-1.5">Тип курса</label>
              <input
                type="text"
                value={courseType || 'Не определен'}
                readOnly
                className="w-full border border-zharyq-border rounded-lg px-3 py-2 text-sm outline-none opacity-80 cursor-not-allowed"
                style={{ background: 'var(--color-surface)', color: 'var(--color-text-secondary)' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TheoryModuleEditor({ module, courseId, moduleDbId, onSave }) {
  const [videoUrl, setVideoUrl] = useState(module.theory?.video_url || '')
  const [lessonTitle, setLessonTitle] = useState(module.theory?.lesson_title || module.label || '')
  const [showVideoInput, setShowVideoInput] = useState(false)
  const [urlFocused, setUrlFocused] = useState(false)
  const [showFormatBar, setShowFormatBar] = useState(false)
  const [formatBarPos, setFormatBarPos] = useState({ top: 0, left: 0 })
  const articleRef = useRef(null)
  const editorWrapRef = useRef(null)

  // Always-current refs so the unmount cleanup can read the latest values
  const latestVideoUrl    = useRef(videoUrl)
  const latestLessonTitle = useRef(lessonTitle)
  const onSaveRef         = useRef(onSave)
  useEffect(() => { latestVideoUrl.current    = videoUrl  }, [videoUrl])
  useEffect(() => { latestLessonTitle.current = lessonTitle }, [lessonTitle])
  useEffect(() => { onSaveRef.current         = onSave    }, [onSave])

  const saveTheory = useCallback(async (payload) => {
    if (!courseId || !moduleDbId) return
    try {
      await fetch(`${API}/courses/${courseId}/modules/${moduleDbId}/theory`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      onSaveRef.current?.(payload)
    } catch (e) { console.error(e) }
  }, [courseId, moduleDbId])

  // Flush all edits immediately when the user navigates away — don't wait for debounce
  useEffect(() => {
    return () => {
      if (!courseId || !moduleDbId) return
      const payload = {
        video_url:       latestVideoUrl.current,
        lesson_title:    latestLessonTitle.current,
        article_content: articleRef.current?.innerHTML || '',
      }
      onSaveRef.current?.(payload)
      fetch(`${API}/courses/${courseId}/modules/${moduleDbId}/theory`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(console.error)
    }
  }, [courseId, moduleDbId])

  // Each field gets its own debounce instance so fast edits across fields don't cancel each other
  const debouncedSaveVideo   = useDebounce(saveTheory, 800)
  const debouncedSaveTitle   = useDebounce(saveTheory, 800)
  const debouncedSaveArticle = useDebounce(saveTheory, 800)

  const handleVideoUrl = (val) => { setVideoUrl(val); debouncedSaveVideo({ video_url: val }) }
  const handleTitle = (val) => { setLessonTitle(val); debouncedSaveTitle({ lesson_title: val }) }
  const handleArticle = () => {
    const content = articleRef.current?.innerHTML || ''
    debouncedSaveArticle({ article_content: content })
  }

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
    <div className="h-full overflow-y-auto animate-fade-in-up">
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
                    onChange={e => handleVideoUrl(e.target.value)}
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
          onChange={e => handleTitle(e.target.value)}
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
            ref={articleRef}
            contentEditable
            suppressContentEditableWarning
            onMouseUp={handleEditorMouseUp}
            onKeyDown={hideFormatBar}
            onInput={handleArticle}
            onBlur={() => { hideFormatBar(); handleArticle() }}
            dangerouslySetInnerHTML={{ __html: module.theory?.article_content || '' }}
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

function PracticeModuleEditor({ module, courseId, moduleDbId }) {
  const savedPractice = module.practice || {}
  const [practiceType, setPracticeType] = useState(savedPractice.practice_type || 'essay')
  const [prompt, setPrompt] = useState(savedPractice.prompt || '')
  const [aiEnabled, setAiEnabled] = useState(savedPractice.ai_enabled || false)
  const [breathDuration, setBreathDuration] = useState(savedPractice.breath_duration_minutes || 5)
  const [quizQuestion, setQuizQuestion] = useState(savedPractice.quiz_question || '')
  const [quizOptions, setQuizOptions] = useState(() => {
    try { return JSON.parse(savedPractice.quiz_options || 'null') || ['', '', '', ''] } catch { return ['', '', '', ''] }
  })
  const [correctIndex, setCorrectIndex] = useState(savedPractice.quiz_correct_index ?? 0)

  const savePractice = useCallback(async (payload) => {
    if (!courseId || !moduleDbId) return
    try {
      await fetch(`${API}/courses/${courseId}/modules/${moduleDbId}/practice`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } catch (e) { console.error(e) }
  }, [courseId, moduleDbId])

  const debouncedSave = useDebounce(savePractice, 800)

  const handleType = (val) => { setPracticeType(val); debouncedSave({ practice_type: val }) }
  const handlePrompt = (val) => { setPrompt(val); debouncedSave({ prompt: val }) }
  const handleAi = (val) => { setAiEnabled(val); debouncedSave({ ai_enabled: val }) }
  const handleBreath = (val) => { setBreathDuration(val); debouncedSave({ breath_duration_minutes: val }) }
  const handleQuizQuestion = (val) => { setQuizQuestion(val); debouncedSave({ quiz_question: val }) }
  const handleOptions = (opts, ci = correctIndex) => {
    setQuizOptions(opts)
    debouncedSave({ quiz_options: JSON.stringify(opts), quiz_correct_index: ci })
  }

  const addOption = () => handleOptions([...quizOptions, ''])
  const removeOption = (i) => {
    const next = quizOptions.filter((_, idx) => idx !== i)
    const newCi = correctIndex >= next.length ? 0 : correctIndex
    setCorrectIndex(newCi)
    handleOptions(next, newCi)
  }
  const updateOption = (i, val) => handleOptions(quizOptions.map((o, idx) => idx === i ? val : o))
  const setCorrect = (i) => { setCorrectIndex(i); debouncedSave({ quiz_correct_index: i }) }


  return (
    <div className="h-full overflow-y-auto animate-fade-in-up">
      <div className="max-w-2xl mx-auto px-8 py-8">
        <h2 className="text-lg font-semibold text-zharyq-dark mb-1">{module.label}</h2>
        <p className="text-sm text-zharyq-gray mb-8">Модуль практики · Настройте тип задания</p>

        <div className="mb-6">
          <label className="block text-xs font-semibold text-zharyq-gray uppercase tracking-wider mb-3">Тип задания</label>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleType('essay')}
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
              onClick={() => handleType('breathing')}
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
            <button
              onClick={() => handleType('quiz')}
              className="flex items-start gap-3 p-4 rounded-xl border transition-all text-left"
              style={{
                borderColor: practiceType === 'quiz' ? 'var(--color-accent)' : 'var(--color-border)',
                background: practiceType === 'quiz' ? 'var(--color-accent-light)' : 'var(--color-bg)',
              }}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-surface)' }}>
                <CheckSquare size={15} strokeWidth={1.5} className="text-zharyq-gray" />
              </div>
              <div>
                <p className="text-sm font-medium text-zharyq-dark">Тестовый вопрос</p>
                <p className="text-xs text-zharyq-gray mt-0.5">Варианты с одним правильным</p>
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
                onChange={e => handlePrompt(e.target.value)}
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
              onClick={() => handleAi(!aiEnabled)}
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
        ) : practiceType === 'breathing' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zharyq-gray uppercase tracking-wider mb-3">Продолжительность (минуты)</label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={1}
                  max={20}
                  value={breathDuration}
                  onChange={e => handleBreath(Number(e.target.value))}
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
        ) : (
          /* QUIZ TYPE */
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-zharyq-gray uppercase tracking-wider mb-3">Вопрос</label>
              <textarea
                value={quizQuestion}
                onChange={e => handleQuizQuestion(e.target.value)}
                placeholder="Введите вопрос для учащегося..."
                rows={3}
                className="w-full border border-zharyq-border rounded-xl px-3 py-3 text-sm leading-relaxed focus:border-zharyq-orange transition-all outline-none resize-none"
                style={{ background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-xs font-semibold text-zharyq-gray uppercase tracking-wider">Варианты ответов</label>
                <p className="text-[11px] text-zharyq-gray">Нажмите на кружок, чтобы отметить правильный</p>
              </div>
              <div className="flex flex-col gap-2">
                {quizOptions.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2 group">
                    <button
                      onClick={() => setCorrect(i)}
                      className="w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all"
                      style={{
                        borderColor: correctIndex === i ? 'var(--color-teal)' : 'var(--color-border)',
                        background: correctIndex === i ? 'var(--color-teal)' : 'transparent',
                      }}
                      title="Отметить как правильный"
                    >
                      {correctIndex === i && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </button>
                    <input
                      type="text"
                      value={opt}
                      onChange={e => updateOption(i, e.target.value)}
                      placeholder={`Вариант ${i + 1}`}
                      className="flex-1 border border-zharyq-border rounded-lg px-3 py-2 text-sm outline-none transition-all"
                      style={{
                        background: 'var(--color-bg)',
                        color: 'var(--color-text-primary)',
                        borderColor: correctIndex === i ? 'var(--color-teal)' : 'var(--color-border)',
                      }}
                      onFocus={e => { if (correctIndex !== i) e.target.style.borderColor = 'var(--color-accent)' }}
                      onBlur={e => { e.target.style.borderColor = correctIndex === i ? 'var(--color-teal)' : 'var(--color-border)' }}
                    />
                    {quizOptions.length > 2 && (
                      <button
                        onClick={() => removeOption(i)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-zharyq-gray hover:text-red-500 hover:bg-red-50 transition-all shrink-0"
                        title="Удалить вариант"
                      >
                        <X size={13} strokeWidth={1.5} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {quizOptions.length < 6 && (
                <button
                  onClick={addOption}
                  className="mt-3 flex items-center gap-1.5 text-xs text-zharyq-gray hover:text-zharyq-dark transition-colors px-2 py-1.5 rounded-lg hover:bg-gray-100"
                >
                  <Plus size={13} strokeWidth={1.5} />
                  Добавить вариант
                </button>
              )}
            </div>

            <div className="p-4 rounded-xl border border-zharyq-border" style={{ background: 'var(--color-surface)' }}>
              <p className="text-xs font-semibold text-zharyq-gray uppercase tracking-wider mb-2">Правильный ответ</p>
              {quizOptions[correctIndex]?.trim() ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--color-teal)' }}>
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>
                  <p className="text-sm text-zharyq-dark font-medium">{quizOptions[correctIndex]}</p>
                </div>
              ) : (
                <p className="text-sm text-zharyq-gray italic">Введите текст варианта и отметьте его правильным</p>
              )}
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
    <div className="h-full flex flex-col items-center justify-center text-zharyq-gray px-8 animate-fade-in-up">
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
  const [searchParams] = useSearchParams()
  const editingId = searchParams.get('id') ? Number(searchParams.get('id')) : null

  // Course-level state
  const [courseId, setCourseId] = useState(null)
  const [courseTitle, setCourseTitleState] = useState('Новый курс')
  const [courseStatus, setCourseStatus] = useState('draft')
  const [titleFocused, setTitleFocused] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveLabel, setSaveLabel] = useState('')

  // Module list (settings is a virtual local item, not in DB)
  const SETTINGS_ITEM = { id: 'settings', type: 'settings', label: 'Настройки курса', dbId: null }
  const [modules, setModules] = useState([SETTINGS_ITEM])
  const [courseInitData, setCourseInitData] = useState(null) // category + description from DB

  const [selectedId, setSelectedId] = useState(null)
  const [draggedId, setDraggedId] = useState(null)
  const [dragOverId, setDragOverId] = useState(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [publishConfirm, setPublishConfirm] = useState(false)
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')

  const selectedModule = modules.find(m => m.id === selectedId) || null
  const moduleToDelete = modules.find(m => m.id === deleteConfirmId) || null

  // ── Init: create or load course ─────────────────────────────
  useEffect(() => {
    if (editingId) {
      // Load existing
      fetch(`${API}/courses/${editingId}`)
        .then(r => r.json())
        .then(data => {
          setCourseId(data.id)
          setCourseTitleState(data.title)
          setCourseStatus(data.status)
          setCourseInitData({ category: data.category, description: data.description, duration: data.duration })
          const dbModules = (data.modules || []).map(m => ({
            id: `${m.module_type}-${m.id}`,
            type: m.module_type,
            label: m.label || (m.module_type === 'theory' ? `Теоретический урок` : `Практическое задание`),
            dbId: m.id,
            theory: m.theory || null,
            practice: m.practice || null,
          }))
          setModules([SETTINGS_ITEM, ...dbModules])
          setSaveLabel('Загружен из базы')
        })
        .catch(console.error)
    } else {
      // Create new draft
      fetch(`${API}/courses/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Новый курс', description: '', category: 'Стресс', duration: 45 }),
      })
        .then(r => r.json())
        .then(data => {
          setCourseId(data.id)
          setCourseStatus(data.status)
          setSaveLabel('Черновик создан')
        })
        .catch(console.error)
    }
  }, [])

  // ── Autosave title ──────────────────────────────────────────
  const saveTitleFn = useCallback(async (title) => {
    if (!courseId) return
    setSaving(true)
    try {
      await fetch(`${API}/courses/${courseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
      const now = new Date()
      setSaveLabel(`Сохранено в ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`)
    } catch (e) { console.error(e) } finally { setSaving(false) }
  }, [courseId])

  const debouncedTitle = useDebounce(saveTitleFn, 800)
  const handleTitle = (val) => { setCourseTitleState(val); debouncedTitle(val) }

  // ── Add module ──────────────────────────────────────────────
  const addModule = async (type) => {
    if (!courseId) return
    const label = type === 'theory'
      ? `Теоретический урок ${modules.filter(m => m.type === 'theory').length + 1}`
      : `Практическое задание ${modules.filter(m => m.type === 'practice').length + 1}`
    try {
      const res = await fetch(`${API}/courses/${courseId}/modules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module_type: type, label }),
      })
      const data = await res.json()
      const newMod = {
        id: `${type}-${data.id}`,
        type,
        label: data.label || label,
        dbId: data.id,
        theory: data.theory || null,
        practice: data.practice || null,
      }
      setModules(prev => [...prev, newMod])
      setSelectedId(newMod.id)
    } catch (e) { console.error(e) }
  }

  // ── Delete module ───────────────────────────────────────────
  const deleteModule = async (id) => {
    const mod = modules.find(m => m.id === id)
    if (mod?.dbId && courseId) {
      try {
        await fetch(`${API}/courses/${courseId}/modules/${mod.dbId}`, { method: 'DELETE' })
      } catch (e) { console.error(e) }
    }
    setModules(prev => prev.filter(m => m.id !== id))
    if (selectedId === id) setSelectedId(null)
    setDeleteConfirmId(null)
  }

  // ── Rename module ───────────────────────────────────────────
  const startRename = (e, m) => { e.stopPropagation(); setRenamingId(m.id); setRenameValue(m.label) }
  const commitRename = async (id) => {
    const trimmed = renameValue.trim()
    setRenamingId(null)
    if (!trimmed) return
    const mod = modules.find(m => m.id === id)
    setModules(prev => prev.map(m => m.id === id ? { ...m, label: trimmed } : m))
    if (mod?.dbId && courseId) {
      try {
        await fetch(`${API}/courses/${courseId}/modules/${mod.dbId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ label: trimmed }),
        })
      } catch (e) { console.error(e) }
    }
  }

  // ── Drag & drop reorder ─────────────────────────────────────
  const handleDragStart = (e, id) => { setDraggedId(id); e.dataTransfer.effectAllowed = 'move' }
  const handleDragOver = (e, id) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (id !== draggedId) setDragOverId(id) }
  const handleDragEnd = () => { setDraggedId(null); setDragOverId(null) }

  const handleDrop = async (e, id) => {
    e.preventDefault()
    if (!draggedId || draggedId === id) return
    const rest = modules.filter(m => m.type !== 'settings')
    const fromIdx = rest.findIndex(m => m.id === draggedId)
    const toIdx = rest.findIndex(m => m.id === id)
    if (fromIdx < 0 || toIdx < 0) return
    const reordered = [...rest]
    const [removed] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, removed)
    const newList = [SETTINGS_ITEM, ...reordered]
    setModules(newList)
    setDraggedId(null)
    setDragOverId(null)
    if (courseId) {
      const order = reordered.filter(m => m.dbId).map(m => m.dbId)
      try {
        await fetch(`${API}/courses/${courseId}/modules/reorder`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(order),
        })
      } catch (e) { console.error(e) }
    }
  }

  // ── Publish / Draft ─────────────────────────────────────────
  const doPublish = async () => {
    if (!courseId) return
    try {
      await fetch(`${API}/courses/${courseId}/publish`, { method: 'PATCH' })
      setCourseStatus('published')
      setSaveLabel('Опубликован')
    } catch (e) { console.error(e) }
    setPublishConfirm(false)
  }

  const doDraft = async () => {
    if (!courseId) return
    try {
      await fetch(`${API}/courses/${courseId}/draft`, { method: 'PATCH' })
      setCourseStatus('draft')
      setSaveLabel('Черновик')
    } catch (e) { console.error(e) }
  }

  // ── Render editor ───────────────────────────────────────────
  const renderEditor = () => {
    if (!selectedModule) return <EmptyEditor />
    
    // Compute dynamic meta-info fields
    const lessonsCount = modules.filter(m => m.type !== 'settings').length;
    const hasVideo = modules.some(m => m.type === 'theory' && m.theory?.video_url);
    const hasText = modules.some(m => m.type === 'theory' && m.theory?.article_content && m.theory.article_content !== '<p><br></p>');
    const courseType = hasVideo && hasText ? 'Смешанный' : hasVideo ? 'Видео' : hasText ? 'Статья' : 'Не определен';

    if (selectedModule.type === 'settings') return (
      <CourseSettingsEditor
        key={courseId}
        courseId={courseId}
        initialCategory={courseInitData?.category}
        initialDescription={courseInitData?.description}
        initialDuration={courseInitData?.duration}
        lessonsCount={lessonsCount}
        courseType={courseType}
      />
    )
    if (selectedModule.type === 'theory') return (
      <TheoryModuleEditor
        key={selectedModule.id}
        module={selectedModule}
        courseId={courseId}
        moduleDbId={selectedModule.dbId}
        onSave={(updates) => setModules(prev => prev.map(m =>
          m.id === selectedModule.id ? { ...m, theory: { ...(m.theory || {}), ...updates } } : m
        ))}
      />
    )
    if (selectedModule.type === 'practice') return <PracticeModuleEditor key={selectedModule.id} module={selectedModule} courseId={courseId} moduleDbId={selectedModule.dbId} />
    return <EmptyEditor />
  }

  const isPublished = courseStatus === 'published'

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
          onChange={e => handleTitle(e.target.value)}
          onFocus={() => setTitleFocused(true)}
          onBlur={() => setTitleFocused(false)}
          className="text-sm font-semibold bg-transparent rounded-lg px-2 py-1.5 transition-all outline-none min-w-[180px]"
          style={{
            color: 'var(--color-text-primary)',
            border: titleFocused ? '1px solid var(--color-accent)' : '1px solid transparent',
          }}
        />

        <div className="flex-1 flex justify-center">
          <span className="text-xs text-zharyq-gray">{saving ? 'Сохранение...' : saveLabel}</span>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <ThemeToggle />
          <button
            onClick={() => courseId && navigate(`/course/${courseId}`)}
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border transition-colors hover:bg-gray-100"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          >
            <Eye size={14} strokeWidth={1.5} />
            Предпросмотр
          </button>
          {isPublished ? (
            <button
              onClick={doDraft}
              className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border transition-colors hover:bg-gray-100"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
            >
              <BookOpen size={14} strokeWidth={1.5} />
              В черновик
            </button>
          ) : (
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
          )}
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
                <div className="flex-1 min-w-0" onDoubleClick={e => startRename(e, m)}>
                  {renamingId === m.id ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onBlur={() => commitRename(m.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); commitRename(m.id) }
                        if (e.key === 'Escape') { setRenamingId(null) }
                      }}
                      onClick={e => e.stopPropagation()}
                      className="w-full text-sm rounded px-1 outline-none"
                      style={{
                        background: 'var(--color-bg)',
                        border: '1px solid var(--color-accent)',
                        color: 'var(--color-text-primary)',
                        caretColor: 'var(--color-accent)',
                      }}
                    />
                  ) : (
                    <p
                      className="text-sm truncate"
                      style={{
                        color: selectedId === m.id ? 'var(--color-accent)' : 'var(--color-text-primary)',
                        fontWeight: selectedId === m.id ? 500 : 400,
                      }}
                      title="Двойной клик для переименования"
                    >
                      {m.label}
                    </p>
                  )}
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
              onClick={() => addModule('theory')}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors hover:bg-gray-100 text-zharyq-gray hover:text-zharyq-dark"
            >
              <Plus size={15} strokeWidth={1.5} />
              <BookOpen size={14} strokeWidth={1.5} />
              <span>Добавить теорию</span>
            </button>
            <button
              onClick={() => addModule('practice')}
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
                onClick={doPublish}
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

