import { useState, useEffect } from 'react'
import { Line } from 'react-chartjs-2'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../context/ThemeContext'
import { fetchCohorts, fetchCohortComparison } from '../api/api'
import { GitCompare } from 'lucide-react'

const METRICS = ['stress', 'burnout', 'anxiety', 'motivation']
const COLORS_A = { border: '#FF7100', bg: 'rgba(255,113,0,0.12)' }
const COLORS_B = { border: '#14B8A6', bg: 'rgba(20,184,166,0.10)' }

export default function CohortComparison({ embedded = false }) {
  const { t } = useTranslation()
  const { isDark } = useTheme()

  const [cohorts, setCohorts] = useState([])
  const [cohortA, setCohortA] = useState('')
  const [cohortB, setCohortB] = useState('')
  const [metric, setMetric] = useState('stress')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  const chartText = isDark ? '#A1A1AA' : '#6B7280'
  const chartGrid = isDark ? '#3F3F46' : '#F3F4F6'

  useEffect(() => {
    fetchCohorts().then(list => {
      setCohorts(list)
      if (list.length >= 1) setCohortA(list[0])
      if (list.length >= 2) setCohortB(list[1])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!cohortA || !cohortB || cohortA === cohortB) return
    setLoading(true)
    fetchCohortComparison(cohortA, cohortB, metric)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [cohortA, cohortB, metric])

  // Merge timelines: union of all week labels from both cohorts
  const allWeeks = data
    ? [...new Set([
        ...data.cohort_a.data.map(d => d.week),
        ...data.cohort_b.data.map(d => d.week)
      ])].sort()
    : []

  const getLabel = (week) => {
    const found =
      data?.cohort_a.data.find(d => d.week === week) ||
      data?.cohort_b.data.find(d => d.week === week)
    return found?.date || week
  }

  const getValues = (series) =>
    allWeeks.map(w => {
      const found = series.find(d => d.week === w)
      return found ? found.value : null
    })

  const chartData = data ? {
    labels: allWeeks.map(getLabel),
    datasets: [
      {
        label: data.cohort_a.name,
        data: getValues(data.cohort_a.data),
        borderColor: COLORS_A.border,
        backgroundColor: COLORS_A.bg,
        fill: true,
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 5,
        pointBackgroundColor: '#fff',
        pointBorderColor: COLORS_A.border,
        spanGaps: true,
      },
      {
        label: data.cohort_b.name,
        data: getValues(data.cohort_b.data),
        borderColor: COLORS_B.border,
        backgroundColor: COLORS_B.bg,
        fill: true,
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 5,
        pointBackgroundColor: '#fff',
        pointBorderColor: COLORS_B.border,
        spanGaps: true,
      },
    ]
  } : null

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        labels: { color: chartText, font: { size: 12 }, boxWidth: 12 }
      },
      tooltip: {
        callbacks: {
          label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y ?? '—'}`
        }
      }
    },
    scales: {
      x: { ticks: { color: chartText }, grid: { color: chartGrid } },
      y: {
        min: 0, max: 100,
        ticks: { color: chartText, stepSize: 20 },
        grid: { color: chartGrid }
      }
    }
  }

  const noData = !loading && data && data.cohort_a.data.length === 0 && data.cohort_b.data.length === 0
  const sameGroup = cohortA && cohortB && cohortA === cohortB

  const inner = (
    <>
      {!embedded && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <GitCompare size={16} className="text-zharyq-orange" />
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zharyq-gray">
              {t('cohort.title')}
            </h2>
          </div>
          <p className="text-xs text-zharyq-gray">{t('cohort.subtitle')}</p>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-5">
        {/* Cohort A */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wide text-zharyq-gray font-semibold">
            {t('cohort.groupA')}
          </label>
          <select
            value={cohortA}
            onChange={e => setCohortA(e.target.value)}
            className="text-sm border border-zharyq-border rounded-xl px-3 py-2 bg-white text-zharyq-dark focus:outline-none focus:ring-2 focus:ring-zharyq-orange/30"
          >
            {cohorts.length === 0 && <option value="">{t('cohort.noCohorts')}</option>}
            {cohorts.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* VS badge */}
        <div className="flex items-end pb-2">
          <span className="text-xs font-bold text-zharyq-gray px-2">VS</span>
        </div>

        {/* Cohort B */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wide text-zharyq-gray font-semibold">
            {t('cohort.groupB')}
          </label>
          <select
            value={cohortB}
            onChange={e => setCohortB(e.target.value)}
            className="text-sm border border-zharyq-border rounded-xl px-3 py-2 bg-white text-zharyq-dark focus:outline-none focus:ring-2 focus:ring-zharyq-teal/30"
          >
            {cohorts.length === 0 && <option value="">{t('cohort.noCohorts')}</option>}
            {cohorts.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Metric selector */}
        <div className="flex flex-col gap-1 ml-auto">
          <label className="text-[10px] uppercase tracking-wide text-zharyq-gray font-semibold">
            {t('cohort.metric')}
          </label>
          <div className="flex gap-1 p-1 bg-white border border-zharyq-border rounded-xl">
            {METRICS.map(m => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  metric === m
                    ? 'bg-zharyq-orange text-white shadow-sm'
                    : 'text-zharyq-gray hover:text-zharyq-dark'
                }`}
              >
                {t(`cohort.metrics.${m}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart area */}
      <div style={{ height: '300px' }} className="relative">
        {cohorts.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-zharyq-gray text-sm">
            {t('cohort.noCohorts')}
          </div>
        )}
        {sameGroup && (
          <div className="absolute inset-0 flex items-center justify-center text-zharyq-gray text-sm">
            {t('cohort.selectDifferent')}
          </div>
        )}
        {loading && !sameGroup && (
          <div className="absolute inset-0 flex items-center justify-center text-zharyq-gray text-sm">
            {t('cohort.loading')}
          </div>
        )}
        {noData && !loading && (
          <div className="absolute inset-0 flex items-center justify-center text-zharyq-gray text-sm">
            {t('cohort.noData')}
          </div>
        )}
        {chartData && !loading && !sameGroup && !noData && (
          <Line data={chartData} options={chartOptions} />
        )}
      </div>

      {/* Legend summary */}
      {data && !sameGroup && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {[
            { name: data.cohort_a.name, series: data.cohort_a.data, color: COLORS_A.border },
            { name: data.cohort_b.name, series: data.cohort_b.data, color: COLORS_B.border },
          ].map(({ name, series, color }) => {
            const avg = series.length
              ? Math.round(series.reduce((s, d) => s + d.value, 0) / series.length)
              : null
            const last = series.length ? series[series.length - 1]?.value : null
            return (
              <div key={name} className="rounded-xl border border-zharyq-border bg-white p-3 flex items-center gap-3">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />
                <div>
                  <p className="text-sm font-semibold text-zharyq-dark">{name}</p>
                  <p className="text-xs text-zharyq-gray">
                    {t('cohort.avgLabel')}: <span className="font-medium text-zharyq-dark">{avg ?? '—'}</span>
                    {' · '}
                    {t('cohort.lastLabel')}: <span className="font-medium text-zharyq-dark">{last ?? '—'}</span>
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )

  if (embedded) return inner
  return (
    <article className="rounded-2xl border border-zharyq-border bg-zharyq-bg p-5">
      {inner}
    </article>
  )
}
