type StatTone = 'default' | 'ok' | 'warn' | 'danger'

const TONE_VALUE_CLASS: Record<StatTone, string> = {
  default: 'text-white',
  ok: 'text-ok',
  warn: 'text-warn',
  danger: 'text-danger'
}

interface StatCardProps {
  label: string
  value: string
  sub?: string
  tone?: StatTone
}

export function StatCard({ label, value, sub, tone = 'default' }: StatCardProps) {
  return (
    <div className="rounded-xl border border-line bg-ink-900/70 px-4 py-3.5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-white/40">{label}</p>
      <p className={`mt-1 font-display text-2xl font-bold tabular-nums tracking-tight ${TONE_VALUE_CLASS[tone]}`}>
        {value}
      </p>
      {sub ? <p className="mt-0.5 text-xs text-white/40">{sub}</p> : null}
    </div>
  )
}
