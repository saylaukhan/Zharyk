import { useState, useEffect, useRef } from 'react'
import { Sparkles, MessageSquare, BarChart2, BookOpen, ShieldCheck, ChevronRight, ChevronLeft, X, Send, User, Pencil } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { updateSettings } from '../api/api'

const STORAGE_KEY = (userId) => `onboarding_seen_${userId}`

const METRICS = [
  { label: 'Стресс',           value: '—', color: 'var(--color-accent)' },
  { label: 'Выгорание',        value: '—', color: '#f59e0b' },
  { label: 'Тревожность',      value: '—', color: '#8b5cf6' },
  { label: 'Мотивация',        value: '—', color: 'var(--color-teal)' },
  { label: 'Эмоц. фон',       value: '—', color: '#3b82f6' },
]

const AI_EMPATHY = {
  'устал':       'Усталость — это сигнал. Хорошо, что ты это замечаешь.',
  'устала':      'Усталость — это сигнал. Хорошо, что ты это замечаешь.',
  'тревога':     'Тревога иногда говорит важные вещи. Я здесь, чтобы выслушать.',
  'тревожно':    'Понимаю. Расскажи больше, когда будешь готов.',
  'хорошо':      'Здорово слышать это. Расскажи, что сегодня удалось?',
  'плохо':       'Прости, что так. Я рядом, и мы разберёмся вместе.',
  'радость':     'Радость — это топливо. Запомни это ощущение.',
  'радостно':    'Рад слышать! Что принесло тебе радость сегодня?',
  'нервничаю':   'Нервничать — это нормально. Давай разберёмся, что за этим стоит.',
  'грустно':     'Грусть тоже имеет право быть. Хочешь рассказать, что случилось?',
  'злость':      'Злость часто скрывает боль или несправедливость. Я слушаю.',
  'спокойно':    'Спокойствие — хорошая основа. Как ты до него добрался?',
  'confused':    'Запутанность — начало понимания. Ты в правильном месте.',
  'default':     'Спасибо, что поделился. Я здесь и готов слушать.',
}

function getAIReply(word) {
  const key = word.trim().toLowerCase()
  return AI_EMPATHY[key] || AI_EMPATHY['default']
}

const STEPS_COUNT = 5

export default function OnboardingModal() {
  const { user } = useAuth()
  const [visible, setVisible]         = useState(false)
  const [step, setStep]               = useState(0)
  const [word, setWord]               = useState('')
  const [aiReply, setAiReply]         = useState('')
  const [sending, setSending]         = useState(false)
  const [fadeIn, setFadeIn]           = useState(true)
  const [personalized, setPersonalized] = useState(false)
  const [avatarUrl, setAvatarUrl]     = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!user?.id) return
    if (!['student', 'employee'].includes(user.role)) return
    const seen = localStorage.getItem(STORAGE_KEY(user.id))
    if (!seen) setVisible(true)
  }, [user?.id])

  // Trigger fade-in on each step change
  useEffect(() => {
    setFadeIn(false)
    const t = setTimeout(() => setFadeIn(true), 20)
    return () => clearTimeout(t)
  }, [step])

  function markSeen() {
    if (user?.id) {
      localStorage.setItem(STORAGE_KEY(user.id), '1')
      localStorage.setItem(`personalized_mode_${user.id}`, personalized ? '1' : '0')
      if (avatarUrl) localStorage.setItem(`avatar_${user.id}`, avatarUrl)
      updateSettings({ personalized_mode: personalized }).catch(() => {})
    }
    setVisible(false)
  }

  function goNext() {
    if (step < STEPS_COUNT - 1) setStep(s => s + 1)
    else markSeen()
  }

  function handleSend() {
    if (!word.trim() || sending) return
    setSending(true)
    setTimeout(() => {
      setAiReply(getAIReply(word))
      setSending(false)
    }, 700)
  }

  function handleWordKey(e) {
    if (e.key === 'Enter') handleSend()
  }

  if (!visible) return null

  const progress = ((step + 1) / STEPS_COUNT) * 100

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-primary)' }}
    >
      {/* Progress bar */}
      <div className="w-full h-[3px]" style={{ backgroundColor: 'var(--color-border)' }}>
        <div
          className="h-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%`, backgroundColor: 'var(--color-accent)' }}
        />
      </div>

      {/* Step dots */}
      <div className="flex justify-center gap-2 pt-4">
        {Array.from({ length: STEPS_COUNT }).map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width:  i === step ? '20px' : '6px',
              height: '6px',
              backgroundColor: i <= step ? 'var(--color-accent)' : 'var(--color-border)',
            }}
          />
        ))}
      </div>

      {/* Skip all button */}
      <div className="absolute top-4 right-5">
        <button
          onClick={markSeen}
          className="flex items-center gap-1 text-sm transition-colors"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <X size={15} strokeWidth={1.5} />
          <span>Пропустить всё</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-8 overflow-y-auto">
        <div
          className="w-full max-w-md"
          style={{
            opacity:    fadeIn ? 1 : 0,
            transform:  fadeIn ? 'translateY(0)' : 'translateY(6px)',
            transition: 'opacity 280ms ease-out, transform 280ms ease-out',
          }}
        >
          {step === 0 && <StepWelcome />}
          {step === 1 && (
            <StepCompanion
              word={word}
              setWord={setWord}
              aiReply={aiReply}
              sending={sending}
              onSend={handleSend}
              onKey={handleWordKey}
              inputRef={inputRef}
            />
          )}
          {step === 2 && <StepAnalytics />}
          {step === 3 && <StepRecommendations />}
          {step === 4 && (
            <StepPrivacy
              personalized={personalized}
              setPersonalized={setPersonalized}
              avatarUrl={avatarUrl}
              setAvatarUrl={setAvatarUrl}
              username={user?.username}
            />
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between px-8 pb-8 pt-2">
        <button
          onClick={() => setStep(s => s - 1)}
          disabled={step === 0}
          className="flex items-center gap-1 text-sm transition-colors"
          style={{
            color: step === 0 ? 'var(--color-border)' : 'var(--color-text-secondary)',
            pointerEvents: step === 0 ? 'none' : 'auto',
          }}
        >
          <ChevronLeft size={16} strokeWidth={1.5} />
          <span>Назад</span>
        </button>

        <button
          onClick={goNext}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-colors"
          style={{ backgroundColor: 'var(--color-accent)' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--color-accent)')}
        >
          {step < STEPS_COUNT - 1 ? (
            <>Далее <ChevronRight size={16} strokeWidth={1.5} /></>
          ) : (
            'Перейти в кабинет'
          )}
        </button>
      </div>
    </div>
  )
}

/* ─── Step 1: Welcome ─── */
function StepWelcome() {
  return (
    <div className="text-center">
      <div className="flex justify-center mb-8">
        <div
          className="relative flex items-center justify-center"
          style={{ animation: 'breathe 3s ease-in-out infinite' }}
        >
          <Sparkles size={64} strokeWidth={1.5} style={{ color: 'var(--color-accent)' }} />
        </div>
      </div>
      <h1 className="text-2xl font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
        Добро пожаловать в Zharyq
      </h1>
      <p className="text-base mb-4" style={{ color: 'var(--color-text-secondary)' }}>
        Наше пространство для честного разговора и заботы о себе
      </p>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)', lineHeight: '1.7' }}>
        Мы создали это место, чтобы вы могли быть услышаны.
        Здесь нет оценок и осуждения. Только поддержка и инструменты для вашего благополучия.
      </p>
    </div>
  )
}

/* ─── Step 2: AI Companion ─── */
function StepCompanion({ word, setWord, aiReply, sending, onSend, onKey, inputRef, isDark }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div
          className="flex items-center justify-center w-10 h-10 rounded-xl"
          style={{ backgroundColor: 'var(--color-accent-light)', border: '1px solid var(--color-border)' }}
        >
          <MessageSquare size={20} strokeWidth={1.5} style={{ color: 'var(--color-accent)' }} />
        </div>
        <div>
          <h2 className="text-lg font-medium" style={{ color: 'var(--color-text-primary)' }}>
            Эмпатичный слушатель
          </h2>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Агент 1</p>
        </div>
      </div>

      <p className="text-sm mb-5 leading-relaxed" style={{ color: 'var(--color-text-secondary)', lineHeight: '1.7' }}>
        Наш AI-ассистент готов выслушать вас в любое время. Расскажите ему о своём дне, усталости или успехах.
        Он общается на вашем языке и всегда на вашей стороне.
      </p>

      {/* Demo chat bubble */}
      <div
        className="rounded-xl p-4 mb-4 text-sm"
        style={{
          backgroundColor: 'var(--color-accent-light)',
          border: '1px solid var(--color-border)',
          lineHeight: '1.6',
        }}
      >
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '11px', marginBottom: '6px' }}>Zharyq AI</p>
        <p style={{ color: 'var(--color-text-primary)' }}>
          Привет! Как ты себя чувствуешь сегодня? Одно слово — уже начало разговора.
        </p>
      </div>

      {/* Interactive one-word input */}
      <div
        className="flex items-center gap-2 rounded-xl px-4 py-2"
        style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        <input
          ref={inputRef}
          type="text"
          value={word}
          onChange={e => setWord(e.target.value)}
          onKeyDown={onKey}
          maxLength={30}
          placeholder="Одно слово о вашем состоянии…"
          className="flex-1 bg-transparent text-sm"
          style={{
            color: 'var(--color-text-primary)',
            outline: 'none',
            caretColor: 'var(--color-accent)',
          }}
        />
        <button
          onClick={onSend}
          disabled={!word.trim() || sending}
          style={{
            color: word.trim() && !sending ? 'var(--color-accent)' : 'var(--color-border)',
            transition: 'color 150ms',
          }}
        >
          <Send size={16} strokeWidth={1.5} />
        </button>
      </div>

      {/* AI reply */}
      {aiReply && (
        <div
          className="mt-3 rounded-xl px-4 py-3 text-sm"
          style={{
            backgroundColor: 'var(--color-accent-light)',
            border: '1px solid var(--color-border)',
            animation: 'fadeSlideUp 220ms ease-out both',
            color: 'var(--color-text-primary)',
            lineHeight: '1.6',
          }}
        >
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '11px', marginBottom: '4px' }}>Zharyq AI</p>
          {aiReply}
        </div>
      )}

      <p className="mt-4 text-xs italic" style={{ color: 'var(--color-text-secondary)' }}>
        Важно: AI не ставит диагнозы, он помогает найти путь к поддержке.
      </p>
    </div>
  )
}

/* ─── Step 3: Analytics ─── */
function StepAnalytics() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div
          className="flex items-center justify-center w-10 h-10 rounded-xl"
          style={{ backgroundColor: 'var(--color-teal-light)', border: '1px solid var(--color-border)' }}
        >
          <BarChart2 size={20} strokeWidth={1.5} style={{ color: 'var(--color-teal)' }} />
        </div>
        <div>
          <h2 className="text-lg font-medium" style={{ color: 'var(--color-text-primary)' }}>
            Интеллектуальный анализ
          </h2>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Агент 2</p>
        </div>
      </div>

      <p className="text-sm mb-5 leading-relaxed" style={{ color: 'var(--color-text-secondary)', lineHeight: '1.7' }}>
        Пока вы общаетесь, система анализирует ваше состояние по 5 ключевым метрикам.
        Это ваш личный компас, помогающий заметить усталость раньше, чем она станет проблемой.
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {METRICS.map(({ label, value, color }, i) => (
          <div
            key={label}
            className="rounded-xl px-4 py-3"
            style={{
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              animation: `fadeSlideUp 200ms ease-out ${i * 60}ms both`,
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                {label}
              </span>
            </div>
            <p className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {value}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Step 4: Recommendations ─── */
function StepRecommendations() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div
          className="flex items-center justify-center w-10 h-10 rounded-xl"
          style={{ backgroundColor: 'var(--color-accent-light)', border: '1px solid var(--color-border)' }}
        >
          <BookOpen size={20} strokeWidth={1.5} style={{ color: 'var(--color-accent)' }} />
        </div>
        <div>
          <h2 className="text-lg font-medium" style={{ color: 'var(--color-text-primary)' }}>
            От понимания к действию
          </h2>
        </div>
      </div>

      <p className="text-sm mb-5 leading-relaxed" style={{ color: 'var(--color-text-secondary)', lineHeight: '1.7' }}>
        На основе ваших разговоров и тестов система предложит курсы и практики, которые подходят именно вам прямо сейчас.
      </p>

      {/* Example recommendation card */}
      <div
        className="rounded-xl p-4"
        style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: 'var(--color-accent-light)',
                  color: 'var(--color-accent)',
                  border: '1px solid var(--color-border)',
                }}
              >
                Стресс −15%
              </span>
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
              Основы эмоционального интеллекта
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              5 уроков · 20 минут
            </p>
          </div>
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0"
            style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
          >
            <BookOpen size={14} strokeWidth={1.5} />
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        Упражнения по заземлению, лекции о мотивации или техники тайм-менеджмента.
      </p>
    </div>
  )
}

/* ─── Step 5: Privacy & Format ─── */
function StepPrivacy({ personalized, setPersonalized, avatarUrl, setAvatarUrl, username }) {
  const fileInputRef = useRef(null)

  function handleAvatarUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const size = 128
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        const minSide = Math.min(img.width, img.height)
        const sx = (img.width - minSide) / 2
        const sy = (img.height - minSide) / 2
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size)
        setAvatarUrl(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
  }

  const initial = username?.[0]?.toUpperCase() || '?'

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div
          className="flex items-center justify-center w-10 h-10 rounded-xl"
          style={{ backgroundColor: 'var(--color-teal-light)', border: '1px solid var(--color-border)' }}
        >
          <ShieldCheck size={20} strokeWidth={1.5} style={{ color: 'var(--color-teal)' }} />
        </div>
        <h2 className="text-lg font-medium" style={{ color: 'var(--color-text-primary)' }}>
          Ваше личное — остаётся личным
        </h2>
      </div>

      <p className="text-sm mb-5 leading-relaxed" style={{ color: 'var(--color-text-secondary)', lineHeight: '1.7' }}>
        Мы используем локальные модели: ваши разговоры не покидают платформу.
        По умолчанию все данные анонимны, но вы можете выбрать формат работы с психологом.
      </p>

      {/* Avatar preview */}
      <div className="flex justify-center mb-5">
        <div className="relative">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center overflow-hidden"
            style={{
              border: '1px solid var(--color-border)',
              backgroundColor: personalized ? 'var(--color-accent-light)' : 'var(--color-surface)',
              transition: 'background-color 350ms ease',
            }}
          >
            {personalized && avatarUrl ? (
              <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            ) : personalized ? (
              <span className="text-2xl font-semibold" style={{ color: 'var(--color-accent)' }}>{initial}</span>
            ) : (
              <User size={32} strokeWidth={1.5} style={{ color: 'var(--color-text-secondary)', transition: 'color 350ms ease' }} />
            )}
          </div>

          {/* Pencil button — only when personalized */}
          {personalized && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: 'var(--color-accent)',
                border: '2px solid var(--color-bg)',
                animation: 'fadeSlideUp 180ms ease-out both',
              }}
              title="Загрузить фото"
            >
              <Pencil size={11} strokeWidth={2} color="#fff" />
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
          />
        </div>
      </div>

      {/* Toggle row */}
      <div
        className="flex items-start justify-between gap-4 rounded-xl px-4 py-3.5 mb-3"
        style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        <div className="flex-1">
          <p className="text-sm font-medium mb-0.5" style={{ color: 'var(--color-text-primary)' }}>
            Включить персонализированный режим
          </p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            {personalized
              ? 'Психолог увидит моё имя для адресной помощи в случае высокого уровня стресса'
              : 'Психолог видит только анонимный ID — без имени и личных данных'}
          </p>
        </div>

        {/* Toggle switch */}
        <button
          onClick={() => setPersonalized(p => !p)}
          className="relative flex-shrink-0 mt-0.5"
          style={{
            width: '40px',
            height: '22px',
          }}
          aria-label="Переключить персонализированный режим"
        >
          <div
            className="w-full h-full rounded-full"
            style={{
              backgroundColor: personalized ? 'var(--color-accent)' : 'var(--color-border)',
              transition: 'background-color 280ms cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          />
          <div
            className="absolute top-[3px] rounded-full"
            style={{
              width: '16px',
              height: '16px',
              backgroundColor: '#ffffff',
              left: personalized ? 'calc(100% - 19px)' : '3px',
              transition: 'left 280ms cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          />
        </button>
      </div>

      {/* Legal footnote */}
      <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        Ваши данные защищены согласно{' '}
        <span
          className="underline cursor-pointer"
          style={{ color: 'var(--color-teal)' }}
        >
          Политике конфиденциальности
        </span>
      </p>
    </div>
  )
}
