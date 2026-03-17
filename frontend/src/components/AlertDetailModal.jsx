import { useState, useEffect } from 'react';
import { X, UserCheck, AlertOctagon, MessageCircle } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
} from 'chart.js';
import { getAlertMessages, resolveAlert } from '../api/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip);

const METRIC_LABELS = {
  stress: 'Стресс',
  burnout: 'Выгорание',
  anxiety: 'Тревожность',
  motivation: 'Мотивация',
  emotion: 'Эмоции',
};

/**
 * Modal showing alert context: chat messages, metric snapshot, and action buttons.
 * Design: Flat Design 2.0 — no box-shadows, 1px border, backdrop overlay.
 */
export default function AlertDetailModal({ alert, onClose, onResolved, isDark }) {
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [resolving, setResolving] = useState(false);

  const alertId = alert?.alert_id ?? alert?.id;

  useEffect(() => {
    if (!alertId) return;
    setMessagesLoading(true);
    getAlertMessages(alertId)
      .then(setMessages)
      .catch(console.error)
      .finally(() => setMessagesLoading(false));
  }, [alertId]);

  const handleResolve = async (isFalseAlarm = false) => {
    if (!alertId || resolving) return;
    setResolving(true);
    try {
      await resolveAlert(alertId);
      onResolved?.(alertId, isFalseAlarm);
      onClose?.();
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    } finally {
      setResolving(false);
    }
  };

  if (!alert) return null;

  const studentName = alert.student_name ?? alert.anonymous_id ?? `Студент #${alert.student_id ?? alert.user_id}`;
  const reasoning = alert.reasoning ?? alert.message ?? '';
  const metrics = alert.metrics ?? alert.metrics_snapshot ?? null;
  const isCritical = alert.level === 'critical';

  const surface = isDark ? 'bg-zinc-900' : 'bg-white';
  const border = isDark ? 'border-zinc-700' : 'border-gray-200';
  const textPrimary = isDark ? 'text-zinc-100' : 'text-gray-900';
  const textSecondary = isDark ? 'text-zinc-400' : 'text-gray-500';
  const divider = isDark ? 'border-zinc-800' : 'border-gray-100';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-xl mx-4 rounded-2xl border ${border} ${surface} overflow-hidden`}
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${divider}`}>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium uppercase tracking-wide px-2 py-0.5 rounded-full border
              ${isCritical
                ? isDark ? 'text-orange-400 border-orange-500/40 bg-orange-500/10' : 'text-orange-600 border-orange-200 bg-orange-50'
                : isDark ? 'text-red-400 border-red-500/40 bg-red-500/10' : 'text-red-600 border-red-200 bg-red-50'
              }`}>
              {isCritical ? 'Критический' : 'Высокий'}
            </span>
            <span className={`text-sm font-medium ${textPrimary}`}>{studentName}</span>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-gray-100 text-gray-500'}`}
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Reasoning */}
          {reasoning && (
            <div>
              <p className={`text-xs font-medium uppercase tracking-wide mb-1.5 ${textSecondary}`}>Анализ ИИ</p>
              <p className={`text-sm leading-relaxed ${textPrimary}`}>{reasoning}</p>
            </div>
          )}

          {/* Metric mini-chart */}
          {metrics && <MetricChart metrics={metrics} isDark={isDark} isCritical={isCritical} />}

          {/* Chat context */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <MessageCircle size={13} className={textSecondary} />
              <p className={`text-xs font-medium uppercase tracking-wide ${textSecondary}`}>Контекст чата</p>
            </div>
            {messagesLoading ? (
              <p className={`text-sm ${textSecondary}`}>Загрузка…</p>
            ) : messages.length === 0 ? (
              <p className={`text-sm ${textSecondary}`}>Нет сообщений для отображения</p>
            ) : (
              <div className={`rounded-xl border ${border} overflow-hidden`}>
                {messages.map((msg, i) => (
                  <div
                    key={msg.id ?? i}
                    className={`px-4 py-2.5 text-sm leading-relaxed
                      ${i > 0 ? `border-t ${divider}` : ''}
                      ${msg.role === 'user'
                        ? isDark ? 'bg-zinc-800/50' : 'bg-gray-50'
                        : surface
                      }`}
                  >
                    <span className={`text-xs font-medium mr-2 ${msg.role === 'user' ? 'text-orange-500' : textSecondary}`}>
                      {msg.role === 'user' ? 'Студент' : 'ИИ'}
                    </span>
                    <span className={textPrimary}>{msg.content}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className={`flex gap-2 px-5 py-4 border-t ${divider}`}>
          <button
            onClick={() => handleResolve(false)}
            disabled={resolving}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium
              bg-orange-500 text-white hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            <UserCheck size={14} />
            Принять в работу
          </button>
          <button
            onClick={() => handleResolve(true)}
            disabled={resolving}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm border transition-colors disabled:opacity-50
              ${isDark ? 'border-zinc-600 text-zinc-300 hover:bg-zinc-800' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
          >
            <AlertOctagon size={14} />
            Ложная тревога
          </button>
        </div>
      </div>
    </div>
  );
}

function MetricChart({ metrics, isDark, isCritical }) {
  const labels = Object.keys(metrics).filter(k => METRIC_LABELS[k]);
  const values = labels.map(k => metrics[k]);
  const accentColor = isCritical ? '#FF7100' : '#ef4444';

  const data = {
    labels: labels.map(k => METRIC_LABELS[k]),
    datasets: [{
      data: values,
      borderColor: accentColor,
      backgroundColor: accentColor + '1A',
      borderWidth: 2,
      pointRadius: 3,
      pointBackgroundColor: accentColor,
      fill: true,
      tension: 0.3,
    }],
  };

  const options = {
    responsive: true,
    plugins: { legend: { display: false }, tooltip: { enabled: true } },
    scales: {
      x: {
        grid: { color: isDark ? '#3f3f46' : '#f3f4f6' },
        ticks: { color: isDark ? '#a1a1aa' : '#6b7280', font: { size: 11 } },
      },
      y: {
        min: 0,
        max: 100,
        grid: { color: isDark ? '#3f3f46' : '#f3f4f6' },
        ticks: { color: isDark ? '#a1a1aa' : '#6b7280', font: { size: 11 } },
      },
    },
  };

  return (
    <div>
      <p className={`text-xs font-medium uppercase tracking-wide mb-2 ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
        Снимок метрик
      </p>
      <div className="h-32">
        <Line data={data} options={{ ...options, maintainAspectRatio: false }} />
      </div>
    </div>
  );
}
