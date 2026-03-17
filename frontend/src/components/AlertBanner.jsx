import { useEffect, useRef } from 'react';
import { AlertTriangle, X, ChevronRight } from 'lucide-react';

/**
 * Displays a list of active (unresolved) Critical / High alerts.
 * Design: Flat Design 2.0 — no box-shadows, 1px border, 12px border-radius, CSS fade-in.
 * @param {Array}    alerts        - Array of alert objects
 * @param {function} onSelect      - Called with an alert when "Просмотреть" is clicked
 * @param {function} onDismiss     - Called with alert_id to resolve/dismiss
 * @param {boolean}  isDark        - Dark mode flag
 */
export default function AlertBanner({ alerts = [], onSelect, onDismiss, isDark }) {
  const visible = alerts.filter(a => ['critical', 'high'].includes(a.level) && !a.is_resolved);

  if (visible.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 mb-4">
      {visible.map((alert) => (
        <AlertCard
          key={alert.alert_id ?? alert.id}
          alert={alert}
          onSelect={onSelect}
          onDismiss={onDismiss}
          isDark={isDark}
        />
      ))}
    </div>
  );
}

function AlertCard({ alert, onSelect, onDismiss, isDark }) {
  const isCritical = alert.level === 'critical';
  const cardRef = useRef(null);

  // CSS-based fade-in + slide-down on mount
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    el.style.opacity = '0';
    el.style.transform = 'translateY(-6px)';
    el.style.transition = 'opacity 200ms ease-out, transform 200ms ease-out';
    requestAnimationFrame(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });
  }, []);

  const borderColor = isCritical
    ? 'border-orange-500'
    : 'border-red-400';

  const bgColor = isCritical
    ? isDark ? 'bg-orange-500/10' : 'bg-orange-50'
    : isDark ? 'bg-red-500/10' : 'bg-red-50';

  const labelColor = isCritical ? 'text-orange-500' : 'text-red-500';

  const studentName = alert.student_name ?? alert.anonymous_id ?? `Студент #${alert.student_id ?? alert.user_id}`;
  const reasoning = alert.reasoning ?? alert.message ?? '';
  const shortReasoning = reasoning.length > 120 ? reasoning.slice(0, 120) + '…' : reasoning;
  const timeLabel = formatTimeAgo(alert.created_at);

  return (
    <div
      ref={cardRef}
      className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${borderColor} ${bgColor}`}
    >
      {/* Icon */}
      <AlertTriangle
        size={16}
        className={`${labelColor} mt-0.5 shrink-0`}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-xs font-medium uppercase tracking-wide ${labelColor}`}>
            {isCritical ? 'Критический' : 'Высокий'}
          </span>
          <span className={`text-xs ${isDark ? 'text-zinc-400' : 'text-gray-400'}`}>
            {studentName}
          </span>
          {timeLabel && (
            <span className={`text-xs ml-auto shrink-0 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
              {timeLabel}
            </span>
          )}
        </div>
        {shortReasoning && (
          <p className={`text-sm leading-relaxed ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
            {shortReasoning}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onSelect?.(alert)}
          className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors
            ${isDark
              ? 'border-zinc-600 text-zinc-300 hover:bg-zinc-700'
              : 'border-gray-300 text-gray-600 hover:bg-gray-100'
            }`}
        >
          Просмотреть
          <ChevronRight size={12} />
        </button>
        <button
          onClick={() => onDismiss?.(alert.alert_id ?? alert.id)}
          className={`p-1.5 rounded-lg transition-colors
            ${isDark ? 'text-zinc-500 hover:bg-zinc-700' : 'text-gray-400 hover:bg-gray-100'}`}
          title="Закрыть"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

function formatTimeAgo(dateString) {
  if (!dateString) return '';
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Только что';
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;
  return `${Math.floor(hours / 24)} дн. назад`;
}
