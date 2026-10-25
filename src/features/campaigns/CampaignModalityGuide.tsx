import type { Modality } from './campaignsClient'
import styles from './modality.module.css'

const options = [
  { type: 'DONATION', name: 'Donación', description: 'Recibe aportes sin ofrecer una contraprestación.' },
  { type: 'REWARD', name: 'Recompensa', description: 'Ofrece una recompensa a cambio del aporte recibido.' },
  { type: 'PRESALE', name: 'Preventa', description: 'Ofrece por adelantado un producto que está en preparación.' }
] as const

export function CampaignModalityGuide({ modality }: { modality: Modality }) {
  const { campaignType, rewardsApply, rewardCount } = modality
  return <div className={styles.guide}>
    <p className={styles.intro}>Conoce cómo funciona cada modalidad antes de elegir.</p>
    <dl className={styles.options} aria-label="Comparación de modalidades">
      {options.map(option => <div key={option.type} className={`${styles.option} ${campaignType === option.type ? styles.active : ''}`}>
        <dt>{option.name}{campaignType === option.type && <span className={styles.selected}>Actual</span>}</dt>
        <dd>{option.description}</dd>
      </div>)}
    </dl>
    <div className={styles.summary} role="status" aria-live="polite" aria-atomic="true">
      <div>
        <p className={styles.summaryTitle}>{rewardsApply ? 'Recompensas guardadas' : 'Sin etapa de recompensas'}</p>
        <p className={styles.summaryText}>{rewardsApply
          ? rewardCount === 0 ? 'Aún no hay recompensas guardadas. Se configuran en el paso «Recompensas».' : 'Consulta sus detalles en el paso «Recompensas».'
          : rewardCount === 0 ? 'En donación no necesitas ofrecer recompensas; esa etapa se omite.' : 'Las recompensas guardadas se conservan, pero no se utilizan en donación.'}</p>
      </div>
      {(rewardsApply || rewardCount > 0) && <span className={styles.count} aria-label={`${rewardCount} recompensas guardadas`}>{rewardCount}</span>}
    </div>
  </div>
}
