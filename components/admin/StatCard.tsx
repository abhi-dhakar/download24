type StatTone = 'default' | 'ok' | 'warn' | 'danger'

const TONE_VALUE_CLASS: Record<StatTone, string> = {
  default: 'text-ink',
  ok: 'text-ok-ink',
  warn: 'text-warn-ink',
  danger: 'text-danger-ink'
}

interface StatCardProps {
  label: string
  value: string
  sub?: string
  tone?: StatTone
}

export function StatCard({ label, value, sub, tone = 'default' }: StatCardProps) {
  return (
    <div className="nb-card-sm px-4 py-3.5">
      <p className="font-mono text-[10px] font-bold tracking-[0.14em] text-ink-mute uppercase">{label}</p>
      <p className={`mt-1.5 font-display text-2xl tabular-nums ${TONE_VALUE_CLASS[tone]}`}>{value}</p>
      {sub ? <p className="mt-1 text-[11px] text-ink-mute">{sub}</p> : null}
    </div>
  )
}
