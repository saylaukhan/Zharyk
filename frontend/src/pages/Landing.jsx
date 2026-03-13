import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles, Sun, Moon, MessageCircle, ArrowDown, LayoutGrid, Bot,
  ShieldCheck, BookOpen, BarChart2, Users, Check, Lock, ArrowUp,
  ChevronRight
} from 'lucide-react'
import { Radar } from 'react-chartjs-2'
import {
  Chart as ChartJS, RadialLinearScale, PointElement, LineElement,
  Filler, Tooltip, Legend
} from 'chart.js'
import ThemeToggle from '../components/ThemeToggle'
import { useTheme } from '../context/ThemeContext'

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

function getChartTextColor() {
  return getComputedStyle(document.documentElement).getPropertyValue('--color-text-secondary').trim()
}

const TABS = ['students', 'psychologists', 'management']
const TAB_LABELS = { students: 'Ученики / Сотрудники', psychologists: 'Психологи', management: 'Руководство' }

export default function Landing() {
  const { isDark } = useTheme()
  const [activeTab, setActiveTab] = useState('students')
  const [showAiReply, setShowAiReply] = useState(false)
  const headerRef = useRef(null)

  useEffect(() => {
    const t1 = setTimeout(() => setShowAiReply(true), 3200)
    return () => clearTimeout(t1)
  }, [])

  useEffect(() => {
    const header = headerRef.current
    if (!header) return
    const onScroll = () => {
      header.style.boxShadow = window.scrollY > 10 ? '0 1px 12px rgba(0,0,0,0.07)' : ''
    }
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const radarData = {
    labels: ['Стресс', 'Выгорание', 'Тревожность', 'Мотивация', 'Эмоции'],
    datasets: [{
      label: 'Профиль',
      data: [35, 25, 40, 85, 75],
      backgroundColor: 'rgba(20,184,166,0.15)',
      borderColor: '#14B8A6',
      pointBackgroundColor: '#FFFFFF',
      pointBorderColor: '#14B8A6',
      borderWidth: 2,
    }]
  }
  const radarOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: { legend: { display: false } },
    scales: {
      r: {
        min: 0, max: 100,
        ticks: { display: false, stepSize: 25 },
        grid: { color: isDark ? '#3F3F46' : '#E5E7EB' },
        pointLabels: { color: isDark ? '#A1A1AA' : '#6B7280', font: { size: 11 } },
        angleLines: { color: isDark ? '#3F3F46' : '#E5E7EB' },
      }
    }
  }

  return (
    <div className="bg-white text-zharyq-dark font-sans antialiased selection:bg-zharyq-orange selection:text-white">
      <header
        ref={headerRef}
        id="site-header"
        className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-zharyq-border transition-shadow"
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
          <a href="#" className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-full bg-zharyq-orange flex items-center justify-center">
              <Sparkles size={14} className="text-white" />
            </div>
            <span className="font-semibold text-lg tracking-tight">Zharyq</span>
          </a>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#about" className="text-sm text-zharyq-gray hover:text-zharyq-dark transition-colors">О платформе</a>
            <a href="#features" className="text-sm text-zharyq-gray hover:text-zharyq-dark transition-colors">Возможности</a>
            <a href="#roles" className="text-sm text-zharyq-gray hover:text-zharyq-dark transition-colors">Для кого</a>
          </nav>
          <div className="flex items-center gap-3 shrink-0">
            <ThemeToggle />
            <Link to="/app">
              <button className="px-4 py-2 border border-zharyq-border rounded-[10px] text-sm font-medium hover:border-zharyq-gray transition-colors">Войти</button>
            </Link>
            <Link to="/app">
              <button className="px-4 py-2 rounded-[10px] text-sm font-semibold text-white bg-zharyq-orange hover:bg-zharyq-orange-hover transition-colors">Попробовать</button>
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="pt-32 pb-24 px-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-zharyq-orange-light border border-orange-200 text-zharyq-orange text-xs font-semibold px-3 py-1 rounded-full mb-6" style={{ letterSpacing: '0.03em' }}>
              <Sparkles size={12} />
              AI-платформа психологической поддержки
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6" style={{ letterSpacing: '-0.02em' }}>
              Ясный ум.<br />Фокус.<br />
              <span style={{ color: 'var(--color-accent)' }}>Здоровая среда.</span>
            </h1>
            <p className="text-lg text-zharyq-gray leading-relaxed mb-10 max-w-md">
              Платформа психологической поддержки с AI-ассистентом для учащихся и сотрудников.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/app">
                <button className="flex items-center gap-2 px-7 py-3 rounded-xl text-[0.9375rem] font-semibold text-white bg-zharyq-orange hover:bg-zharyq-orange-hover transition-all hover:-translate-y-px">
                  <MessageCircle size={16} />
                  Начать первый чек-ин
                </button>
              </Link>
              <a href="#features">
                <button className="flex items-center gap-2 px-7 py-3 rounded-xl text-[0.9375rem] font-medium border border-zharyq-border hover:border-zharyq-gray transition-all hover:-translate-y-px">
                  Узнать подробнее
                  <ArrowDown size={16} />
                </button>
              </a>
            </div>
            <div className="flex gap-8 mt-12">
              <div>
                <p className="text-2xl font-bold tracking-tight">5+</p>
                <p className="text-sm text-zharyq-gray mt-0.5">курсов и практик</p>
              </div>
              <div className="w-px bg-zharyq-border" />
              <div>
                <p className="text-2xl font-bold tracking-tight">100%</p>
                <p className="text-sm text-zharyq-gray mt-0.5">анонимность</p>
              </div>
              <div className="w-px bg-zharyq-border" />
              <div>
                <p className="text-2xl font-bold tracking-tight">24/7</p>
                <p className="text-sm text-zharyq-gray mt-0.5">поддержка AI</p>
              </div>
            </div>
          </div>

          {/* Chat Mockup */}
          <div className="flex items-center justify-center">
            <div className="w-full max-w-sm rounded-2xl border border-zharyq-border bg-white shadow-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-zharyq-border bg-zharyq-bg">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-zharyq-orange flex items-center justify-center">
                    <Sparkles size={10} className="text-white" />
                  </div>
                  <span className="text-sm font-semibold">Zharyq AI</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-xs text-zharyq-gray">Онлайн</span>
                </div>
              </div>
              <div className="px-4 pt-4 pb-2 flex flex-col gap-3 min-h-[260px]">
                <div className="flex gap-2.5 chat-msg-appear" style={{ animationDelay: '0.6s' }}>
                  <div className="w-6 h-6 rounded-full bg-zharyq-orange flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles size={12} className="text-white" />
                  </div>
                  <div className="bg-zharyq-bg border border-zharyq-border rounded-xl rounded-tl-sm px-3.5 py-2.5 text-sm leading-relaxed max-w-[85%]">
                    Привет! Я Zharyq AI. Как вы себя чувствуете сегодня?
                  </div>
                </div>
                <div className="flex justify-end chat-msg-appear" style={{ animationDelay: '1.2s' }}>
                  <div className="rounded-xl rounded-tr-sm px-3.5 py-2.5 text-sm leading-relaxed max-w-[80%] text-white" style={{ background: 'var(--color-accent)' }}>
                    Немного устал, много задач…
                  </div>
                </div>
                {!showAiReply ? (
                  <div className="flex gap-2.5 chat-msg-appear" style={{ animationDelay: '1.9s' }}>
                    <div className="w-6 h-6 rounded-full bg-zharyq-orange flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles size={12} className="text-white" />
                    </div>
                    <div className="bg-zharyq-bg border border-zharyq-border rounded-xl rounded-tl-sm px-3.5 py-2.5 flex gap-1.5 items-center">
                      {[0, 200, 400].map((d, i) => (
                        <span key={i} className="w-1.5 h-1.5 rounded-full bg-zharyq-gray" style={{ animation: `blink 1.2s ${d}ms infinite ease-in-out` }} />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-zharyq-orange flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles size={12} className="text-white" />
                    </div>
                    <div className="bg-zharyq-bg border border-zharyq-border rounded-xl rounded-tl-sm px-3.5 py-2.5 text-sm leading-relaxed max-w-[85%]">
                      Понимаю. Давайте проведём короткий чек-ин — всего 3 вопроса.
                    </div>
                  </div>
                )}
              </div>
              <div className="px-4 pb-3 flex gap-2 flex-wrap">
                <button className="bg-white border border-zharyq-border text-xs px-3 py-1.5 rounded-xl text-zharyq-dark hover:border-zharyq-orange transition-colors">Начать чек-ин</button>
                <button className="bg-white border border-zharyq-border text-xs px-3 py-1.5 rounded-xl text-zharyq-dark hover:border-zharyq-orange transition-colors">Выговориться</button>
              </div>
              <div className="px-3 pb-3">
                <div className="flex items-center gap-2 border border-zharyq-border rounded-xl px-3 py-2 bg-zharyq-bg">
                  <span className="text-xs text-zharyq-gray flex-1 select-none">Расскажите, как вы себя чувствуете…</span>
                  <button className="w-6 h-6 rounded-lg flex items-center justify-center text-white shrink-0" style={{ background: 'var(--color-accent)' }}>
                    <ArrowUp size={12} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24 px-6 bg-zharyq-bg">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-1.5 bg-zharyq-orange-light border border-orange-200 text-zharyq-orange text-xs font-semibold px-3 py-1 rounded-full mb-4">
              <LayoutGrid size={12} />
              Возможности
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight mb-4" style={{ letterSpacing: '-0.02em' }}>
              Всё, что нужно для<br />психологического здоровья
            </h2>
            <p className="text-zharyq-gray text-lg max-w-xl mx-auto">
              Инструменты, которые работают тихо в фоне — пока вы фокусируетесь на главном.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            <div className="bento-card md:col-span-2 p-7 flex flex-col justify-between min-h-[260px]" style={{ background: '#F9FAFB', border: '1px solid var(--color-border)', borderRadius: '16px', transition: 'box-shadow 0.2s, border-color 0.2s' }}>
              <div>
                <div className="w-11 h-11 rounded-xl bg-orange-50 flex items-center justify-center mb-5">
                  <Bot size={20} style={{ color: 'var(--color-accent)' }} />
                </div>
                <h3 className="text-lg font-semibold mb-2">Conversational AI</h3>
                <p className="text-zharyq-gray text-sm leading-relaxed max-w-sm">
                  Тестирование на стресс и выгорание в формате живого диалога с ИИ, а не скучных анкет. Разговор — это уже поддержка.
                </p>
              </div>
              <div className="mt-6 flex flex-col gap-2">
                <div className="flex gap-2 items-start">
                  <div className="w-5 h-5 rounded-full bg-zharyq-orange flex items-center justify-center shrink-0">
                    <Sparkles size={10} className="text-white" />
                  </div>
                  <div className="bg-white border border-zharyq-border text-xs px-3 py-2 rounded-xl rounded-tl-sm max-w-[85%] text-zharyq-dark">
                    Оцените своё состояние по шкале от 1 до 10 прямо сейчас.
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="text-xs px-3 py-2 rounded-xl rounded-tr-sm max-w-[75%] text-white" style={{ background: 'var(--color-accent)' }}>
                    Примерно на 6…
                  </div>
                </div>
              </div>
            </div>
            <div className="p-7 flex flex-col" style={{ background: '#F9FAFB', border: '1px solid var(--color-border)', borderRadius: '16px' }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5" style={{ background: 'var(--color-teal-light)' }}>
                <ShieldCheck size={20} style={{ color: 'var(--color-teal)' }} />
              </div>
              <h3 className="text-lg font-semibold mb-2">Абсолютная приватность</h3>
              <p className="text-zharyq-gray text-sm leading-relaxed flex-1">
                Анонимность по умолчанию. 100% шифрование личных данных. Никакой передачи третьим лицам.
              </p>
              <div className="mt-5 flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--color-teal)' }}>
                <Lock size={14} />
                End-to-end шифрование
              </div>
            </div>
            <div className="p-7 flex flex-col" style={{ background: '#F9FAFB', border: '1px solid var(--color-border)', borderRadius: '16px' }}>
              <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center mb-5">
                <BookOpen size={20} className="text-blue-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Библиотека практик</h3>
              <p className="text-zharyq-gray text-sm leading-relaxed flex-1">
                5+ персонализированных курсов и практик: управление стрессом, выгорание, тревожность, фокус, эмоциональный интеллект.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-2">
                {[['var(--color-accent)', 'Стресс'], ['#60A5FA', 'Фокус'], ['var(--color-teal)', 'Выгорание'], ['#A78BFA', 'Эмоции']].map(([color, label]) => (
                  <div key={label} className="text-[11px] text-zharyq-gray bg-white border border-zharyq-border px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                    {label}
                  </div>
                ))}
              </div>
            </div>
            <div className="md:col-span-2 p-7 flex flex-col md:flex-row gap-8 items-center" style={{ background: '#F9FAFB', border: '1px solid var(--color-border)', borderRadius: '16px' }}>
              <div className="flex-1">
                <div className="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center mb-5">
                  <BarChart2 size={20} className="text-violet-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Аналитика в реальном времени</h3>
                <p className="text-zharyq-gray text-sm leading-relaxed">
                  Психологический профиль обновляется после каждого чек-ина. Руководство видит агрегированные данные без персональных деталей.
                </p>
              </div>
              <div className="shrink-0 w-full max-w-[260px] aspect-square">
                <Radar data={radarData} options={radarOptions} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ROLES */}
      <section id="roles" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-1.5 bg-zharyq-orange-light border border-orange-200 text-zharyq-orange text-xs font-semibold px-3 py-1 rounded-full mb-4">
              <Users size={12} />
              Для кого
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight" style={{ letterSpacing: '-0.02em' }}>
              Платформа для каждой роли
            </h2>
          </div>
          <div className="flex justify-center mb-10">
            <div className="flex gap-1 p-1 bg-zharyq-bg border border-zharyq-border rounded-xl">
              {TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2 rounded-[10px] text-sm font-medium transition-colors ${activeTab === tab ? 'bg-zharyq-orange text-white' : 'text-zharyq-gray hover:text-zharyq-dark'}`}
                >
                  {TAB_LABELS[tab]}
                </button>
              ))}
            </div>
          </div>
          {activeTab === 'students' && (
            <div className="flex flex-col md:flex-row gap-12 items-center">
              <div className="flex-1 max-w-lg">
                <h3 className="text-2xl font-bold mb-4 tracking-tight">Поддержка тогда, когда она нужна</h3>
                <p className="text-zharyq-gray leading-relaxed mb-6">
                  Начните с короткого чек-ина в любое время. AI-ассистент выслушает, проведёт тест на стресс или тревожность и предложит персонализированный курс — всё анонимно.
                </p>
                <ul className="flex flex-col gap-3">
                  {['Анонимный разговор с AI-ассистентом', 'Еженедельный психологический профиль', 'Персонализированные курсы и практики', 'Серии достижений и геймификация'].map(item => (
                    <li key={item} className="flex items-start gap-3 text-sm">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
                        <Check size={12} />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link to="/app">
                  <button className="mt-8 flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-zharyq-orange hover:bg-zharyq-orange-hover transition-all">
                    Попробовать бесплатно <ChevronRight size={16} />
                  </button>
                </Link>
              </div>
              <div className="flex-1 flex justify-center">
                <div className="w-full max-w-xs rounded-2xl border border-zharyq-border bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4 pb-4 border-b border-zharyq-border">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-zharyq-teal to-blue-400" />
                    <div>
                      <p className="text-sm font-semibold">Асель Т.</p>
                      <p className="text-xs text-zharyq-gray">Старшая школа</p>
                    </div>
                    <div className="ml-auto">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border" style={{ color: 'var(--color-teal)', background: 'var(--color-teal-light)', borderColor: 'rgba(20,184,166,0.2)' }}>В норме</span>
                    </div>
                  </div>
                  <p className="text-xs text-zharyq-gray mb-3 font-semibold uppercase tracking-wider">Психологический профиль</p>
                  <div className="w-full aspect-square max-w-[200px] mx-auto">
                    <Radar data={radarData} options={radarOptions} />
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'psychologists' && (
            <div className="flex flex-col md:flex-row gap-12 items-center">
              <div className="flex-1 max-w-lg">
                <h3 className="text-2xl font-bold mb-4 tracking-tight">Умный помощник для психолога</h3>
                <p className="text-zharyq-gray leading-relaxed mb-6">
                  Видите агрегированные данные по всем подопечным. Получайте автоматические алерты при высоком уровне стресса и принимайте обоснованные решения.
                </p>
                <ul className="flex flex-col gap-3">
                  {['Дашборд с алертами и приоритетами', 'Психологические профили учащихся', 'Инструменты для заметок и сессий', 'AI-рекомендации по курсам'].map(item => (
                    <li key={item} className="flex items-start gap-3 text-sm">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'var(--color-teal-light)', color: 'var(--color-teal)' }}>
                        <Check size={12} />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link to="/psychologist">
                  <button className="mt-8 flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all" style={{ background: 'var(--color-teal)' }}>
                    Панель психолога <ChevronRight size={16} />
                  </button>
                </Link>
              </div>
              <div className="flex-1 flex justify-center">
                <div className="w-full max-w-xs rounded-2xl border border-zharyq-border bg-white p-5 shadow-sm space-y-3">
                  {[{ id: 12, lvl: 'Критический', color: 'red' }, { id: 5, lvl: 'Критический', color: 'red' }, { id: 7, lvl: 'Средний', color: 'amber' }].map(a => (
                    <div key={a.id} className="flex items-center gap-3 p-3 border border-zharyq-border rounded-xl">
                      <div className={`w-2 h-2 rounded-full shrink-0 bg-${a.color}-500`} />
                      <span className="text-sm flex-1">Аноним #{a.id}</span>
                      <span className={`text-[11px] font-semibold text-${a.color}-600 bg-${a.color}-50 border border-${a.color}-100 px-2 py-0.5 rounded-full`}>{a.lvl}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {activeTab === 'management' && (
            <div className="flex flex-col md:flex-row gap-12 items-center">
              <div className="flex-1 max-w-lg">
                <h3 className="text-2xl font-bold mb-4 tracking-tight">Данные для принятия решений</h3>
                <p className="text-zharyq-gray leading-relaxed mb-6">
                  Агрегированная аналитика по всей организации. Отслеживайте ROI, снижение пропусков и рост вовлечённости без нарушения приватности сотрудников.
                </p>
                <ul className="flex flex-col gap-3">
                  {['Общий индекс благополучия', 'ROI-метрики и вовлечённость', 'Тренды по месяцам в реальном времени', 'Управление психологами и ресурсами'].map(item => (
                    <li key={item} className="flex items-start gap-3 text-sm">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'rgba(139,92,246,0.1)', color: '#8B5CF6' }}>
                        <Check size={12} />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link to="/director">
                  <button className="mt-8 flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-violet-500 hover:bg-violet-600 transition-all">
                    Director Dashboard <ChevronRight size={16} />
                  </button>
                </Link>
              </div>
              <div className="flex-1 flex justify-center">
                <div className="w-full max-w-xs rounded-2xl border border-zharyq-border bg-white p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-zharyq-gray font-semibold uppercase tracking-wider">Индекс благополучия</p>
                    <span className="text-emerald-600 text-xs font-medium">+4.1%</span>
                  </div>
                  <p className="text-3xl font-semibold">82%</p>
                  <div className="h-px bg-zharyq-border" />
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="border border-zharyq-border rounded-xl p-3">
                      <p className="text-xs text-zharyq-gray mb-1">Снижение пропусков</p>
                      <p className="text-lg font-semibold">-8.6%</p>
                    </div>
                    <div className="border border-zharyq-border rounded-xl p-3">
                      <p className="text-xs text-zharyq-gray mb-1">Вовлечённость</p>
                      <p className="text-lg font-semibold">+15%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-zharyq-bg">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight mb-4" style={{ letterSpacing: '-0.02em' }}>
            Готовы начать?
          </h2>
          <p className="text-zharyq-gray text-lg mb-8">
            Первый чек-ин займёт меньше 3 минут. Полностью анонимно.
          </p>
          <Link to="/app">
            <button className="flex items-center gap-2 px-8 py-4 rounded-xl text-base font-semibold text-white bg-zharyq-orange hover:bg-zharyq-orange-hover transition-all hover:-translate-y-px mx-auto">
              <MessageCircle size={18} />
              Начать первый чек-ин
            </button>
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-white border-t border-zharyq-border py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-zharyq-orange flex items-center justify-center">
              <Sparkles size={12} className="text-white" />
            </div>
            <span className="font-semibold">Zharyq</span>
          </div>
          <p className="text-sm text-zharyq-gray">© 2026 Zharyq. Все права защищены.</p>
          <div className="flex gap-5">
            <a href="#" className="text-sm text-zharyq-gray hover:text-zharyq-dark transition-colors">Политика конфиденциальности</a>
            <a href="#" className="text-sm text-zharyq-gray hover:text-zharyq-dark transition-colors">Условия использования</a>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes blink {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        .chat-msg-appear {
          animation: message-appear 0.35s ease-out both;
        }
        .dark .bento-card { background: var(--color-surface); }
        .dark #site-header { background-color: var(--color-bg); border-color: var(--color-border); }
        .dark footer { background-color: var(--color-bg); border-color: var(--color-border); }
      `}</style>
    </div>
  )
}
