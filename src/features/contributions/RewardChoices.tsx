import {useId} from 'react'
import {rewardAvailability,type SupportOptions} from './simulationClient'
import styles from './contributions.module.css'

export function RewardChoices({options,amount,value,disabled,onChange}:{options:SupportOptions;amount:string;value:string;disabled:boolean;onChange:(id:string)=>void}){
  const group=useId()
  if(options.campaignType==='DONATION')return null
  const presale=options.campaignType==='PRESALE'
  return <fieldset className={styles.rewardGroup} disabled={disabled}>
    <legend>2. {presale?'Elige un producto':'Elige cómo quieres apoyar'}</legend>
    <p className={styles.choiceHelp}>{presale?'La preventa requiere elegir un producto. Su mínimo y disponibilidad dependen del importe.':'Puedes aportar sin recompensa o elegir una de las opciones habilitadas por tu importe.'}</p>
    <div className={styles.rewardGrid}>
      {!presale&&<label className={`${styles.rewardChoice} ${value===''?styles.rewardSelected:''}`}>
        <input type="radio" name={group} value="" checked={value===''} onChange={()=>onChange('')}/>
        <span className={styles.rewardChoiceBody}><strong>Aportar sin recompensa</strong><span>Tu aporte apoya la campaña sin recibir una recompensa.</span><span className={styles.rewardStatus}>{value===''?'Opción seleccionada':'Sin recompensa'}</span></span>
      </label>}
      {options.rewards.map(reward=>{
        const availability=rewardAvailability(options,amount.trim(),reward),selected=value===reward.id
        return <label key={reward.id} className={`${styles.rewardChoice} ${selected?styles.rewardSelected:''} ${!availability.enabled?styles.rewardUnavailable:''}`}>
          <input type="radio" name={group} value={reward.id} checked={selected} disabled={!availability.enabled} onChange={()=>onChange(reward.id)} aria-describedby={`${group}-${reward.id}-status`}/>
          <span className={styles.rewardChoiceBody}>
            <strong>{reward.title}</strong><span className={styles.rewardPrice}>Desde {reward.minimum} {options.currency}</span>
            <span>{reward.available===null?'Sin límite de unidades registrado':`${reward.available} ${reward.available===1?'unidad disponible':'unidades disponibles'}`}</span>
            <span id={`${group}-${reward.id}-status`} className={styles.rewardStatus}>{selected&&availability.enabled?'Opción seleccionada':availability.message}</span>
          </span>
        </label>
      })}
    </div>
  </fieldset>
}
