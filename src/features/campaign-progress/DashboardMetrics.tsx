import styles from './dashboard.module.css'

export type Metric = { label: string; value: number | string; attention?: boolean; id?: string }

export function DashboardMetrics({ items }: { items: Metric[] }) {
  return <dl className={styles.metrics}>
    {items.map(({label, value, attention, id}) => <div key={id ?? label} className={attention ? styles.attention : undefined}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>)}
  </dl>
}
