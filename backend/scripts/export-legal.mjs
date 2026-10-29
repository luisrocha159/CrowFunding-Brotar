import {createRequire} from 'node:module'
import {mkdirSync,writeFileSync} from 'node:fs'
const require=createRequire(import.meta.url)
const {LEGAL_DEFINITION,LEGAL_HASH}=require('../dist/legal/legal-v1-record.js')
const destination=new URL('../../docs/legal/',import.meta.url)
mkdirSync(destination,{recursive:true})
const names={TERMS:'01_Condiciones_MVP_Provisionales.md',PRIVACY:'02_Privacidad_MVP_Provisional.md',IDENTITY:'03_Requisitos_KYC_KYB_DEMO.md'}
for(const doc of LEGAL_DEFINITION.documents){
 const text=`# ${doc.title}\n\nVersión **${LEGAL_DEFINITION.version}** · publicación ${LEGAL_DEFINITION.publishedAt} · acuerdo propio del equipo para MVP académico DEMO.\n\nHuella SHA-256 del conjunto publicado: \`${LEGAL_HASH}\`.\n\n`+doc.sections.map(s=>`## ${s.title}\n\n${s.text}\n`).join('\n')
 writeFileSync(new URL(names[doc.code],destination),text,'utf8')
}
console.log('Tres documentos exportados desde la misma publicación inmutable utilizada por la API.')
