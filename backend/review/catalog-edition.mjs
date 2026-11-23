import {createHash} from 'node:crypto'
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs'
import {dirname,resolve} from 'node:path'

const editions=[
  ['Semilleros para el barrio','Las familias prepararán semilleros comunitarios para cultivar juntas sus primeras hortalizas.','Preparación de una cama de siembra'],
  ['Zanahorias de la quebrada','Una red de productores quiere ampliar las parcelas de zanahoria que abastecen al barrio.','Cosecha de zanahorias en la parcela'],
  ['Un huerto en el patio de la escuela','Docentes y familias organizarán un huerto donde el alumnado pueda sembrar y cuidar sus alimentos.','Hortalizas en el jardín escolar'],
  ['Huertos familiares de Samaipata','Veinte familias compartirán semillas y herramientas para cultivar verduras en sus propios huertos.','Parcelas familiares entre las laderas del valle'],
  ['Semillas que pasan de mano en mano','Un banco comunitario conservará semillas locales y compartirá una guía de cultivo con quienes lo apoyen.','Semillas variadas listas para la siembra'],
  ['Cultiva tu primera huerta','Un vivero prepara kits con plantines e instrucciones para empezar una huerta en casa.','Plantines en macetas de cultivo'],
  ['Terrazas verdes del valle','Los vecinos recuperarán las terrazas de cultivo para aprovechar mejor la tierra de las laderas.','Cultivos en terrazas del valle'],
  ['Agua para las parcelas','Las familias instalarán depósitos y mangueras para llevar agua a sus huertos.','Depósito y mangueras de riego'],
  ['Riego para el vivero comunitario','La comunidad instalará riego en el vivero para mantener los plantines durante la estación seca.','Vivero comunitario en las laderas'],
  ['Hortalizas junto al río','Un grupo de familias recuperará parcelas junto al río para cultivar verduras de temporada.','Riego de hortalizas en una parcela'],
  ['Tomates del valle','Los productores compartirán herramientas para mejorar el cuidado y la cosecha de sus tomates.','Cosecha de tomates maduros'],
  ['La huerta del encuentro','Los vecinos acondicionarán un terreno de uso común para sembrar, compartir la cosecha y reunirse.','Huerta comunitaria con verduras de temporada'],
  ['Frutales para el barrio','La comunidad plantará árboles frutales y organizará turnos para cuidarlos.','Plantación de árboles frutales'],
  ['Un techo para los plantines','Productores del valle levantarán una cubierta de sombra para proteger las plantas jóvenes.','Vivero protegido del sol'],
  ['Herramientas compartidas','Una cuadrilla vecinal equipará un pequeño banco de herramientas para las jornadas de cultivo.','Herramientas de jardinería en una mesa'],
  ['Del almácigo a la mesa','Las familias prepararán bandejas de almácigos y trasplantarán las hortalizas en parcelas comunes.','Bandejas de almácigos en crecimiento'],
  ['La parcela de Semillas del Valle','La fundación organizará jornadas comunitarias de siembra y cuidado de hortalizas.','Cultivo comunitario de verduras'],
  ['Raíces para el futuro','Los vecinos iniciarán un pequeño vergel con árboles frutales adaptados al valle.','Árboles jóvenes en una huerta'],
  ['Bancales para cultivar juntos','La comunidad construirá bancales elevados para facilitar la siembra y el cuidado de sus verduras.','Construcción de bancales para cultivo'],
  ['Aulas entre surcos','Familias y docentes cultivarán un jardín de aprendizaje y compartirán semillas con quienes lo apoyen.','Jornada de aprendizaje en un huerto']
]

export function campaignEdition(code){
  if(!/^REV-(0[1-9]|1[0-9]|20)$/.test(code))throw new Error('Escenario de catálogo desconocido')
  const [title,summary,alt]=editions[Number(code.slice(4))-1]
  return {title,summary,alt,cover:new URL('./assets/covers/'+code+'.webp',import.meta.url)}
}

// A retry after an interrupted transaction reuses the staged file and the same UUID.
function coverId(campaignId,checksum){
  const bytes=createHash('sha256').update(campaignId+':'+checksum).digest().subarray(0,16)
  bytes[6]=(bytes[6]&15)|128
  bytes[8]=(bytes[8]&63)|128
  const hex=bytes.toString('hex')
  return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-')
}

// Upgrade only known seed values. Keep edited titles, uploaded covers, historic links and financial records.
export async function refreshReviewCatalog(client,manifest,storage){
  if(manifest.catalogEdition===2)return
  const oldCover=createHash('sha256').update(readFileSync(new URL('./assets/portada-huerto.png',import.meta.url))).digest('hex')
  await client.query('BEGIN')
  try{
    for(const item of manifest.scenarios){
      const edition=campaignEdition(item.code)
      const {rows:[campaign]}=await client.query(`SELECT title,summary,creator_user_id,cover_file_id FROM public.campaign WHERE id=$1 AND deleted_at IS NULL FOR UPDATE`,[item.id])
      if(!campaign)continue
      const newTitle=campaign.title===item.title&&campaign.title.startsWith(item.code+' ')?edition.title:campaign.title
      const newSummary=['Recuperar espacios comunitarios mediante actividades y recursos documentados.','Iniciativa comunitaria preparada para la revisión funcional del equipo.'].includes(campaign.summary)?edition.summary:campaign.summary
      if(newTitle!==campaign.title||newSummary!==campaign.summary)await client.query('UPDATE public.campaign SET title=$2,summary=$3 WHERE id=$1',[item.id,newTitle,newSummary])
      item.title=newTitle
      if(manifest.checkpoints['campana:'+item.code])manifest.checkpoints['campana:'+item.code].title=newTitle
      const {rowCount}=await client.query('SELECT 1 FROM public.file_asset WHERE id=$1 AND checksum=$2 AND scope=\'PUBLIC\' AND deleted_at IS NULL',[campaign.cover_file_id,oldCover])
      if(!rowCount)continue
      const content=readFileSync(edition.cover),checksum=createHash('sha256').update(content).digest('hex')
      const id=coverId(item.id,checksum),key='CAMPAIGN_PUBLIC_IMAGE/'+id+'.bin',target=resolve(storage,key)
      mkdirSync(dirname(target),{recursive:true})
      try{writeFileSync(target,content,{flag:'wx'})}catch(error){
        if(error.code!=='EEXIST'||!readFileSync(target).equals(content))throw error
      }
      await client.query(`INSERT INTO public.file_asset(id,storage_key,file_name,mime_type,size_bytes,checksum,scope,uploaded_by)
        VALUES($1,$2,$3,'image/webp',$4,$5,'PUBLIC',$6)`,[id,key,item.code+'.webp',content.length,checksum,campaign.creator_user_id])
      await client.query('UPDATE public.campaign SET cover_file_id=$2 WHERE id=$1',[item.id,id])
      await client.query("UPDATE public.file_attachment SET file_id=$2,caption=$3 WHERE campaign_id=$1 AND file_id=$4 AND attachment_role='COVER'",[item.id,id,edition.alt,campaign.cover_file_id])
    }
    manifest.catalogEdition=2
    await client.query("UPDATE brotar_review.dataset SET manifest=$1::jsonb,updated_at=clock_timestamp() WHERE name='leaders'",[JSON.stringify(manifest)])
    await client.query('COMMIT')
  }catch(error){await client.query('ROLLBACK');throw error}
}
