import 'reflect-metadata'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createDataSource} from '../src/shared/infrastructure/database/data-source'
import {readDatabaseConfig} from '../src/shared/infrastructure/database/database.config'
import {readTestDatabaseTarget} from './database-target'
import {LEGAL_HASH as previousHash} from '../src/legal/legal-v1-record'
import {LEGAL_HASH} from '../src/legal/legal-v2-record'
import {LEGAL_VERSION} from '../src/legal/domain/legal-v2-20261109'

test('presentación: publicación archivada intacta, tres políticas sin prefijo y compatibilidad explícita sin aprobar casos',async()=>{
 const config=readDatabaseConfig(process.env);assert.ok(config.enabled&&process.env.ALLOW_DB_TEST_WRITES==='true');readTestDatabaseTarget(config)
 const source=createDataSource(config);await source.initialize()
 try{
  const bundles:{version:string;hash:string}[]=await source.query('SELECT version,sha256 AS hash FROM brotar_extension.legal_bundle ORDER BY version')
  assert.equal(bundles.find(b=>b.version==='mvp-demo-legal-1.0-20261028')?.hash,previousHash)
  assert.equal(bundles.find(b=>b.version===LEGAL_VERSION)?.hash,LEGAL_HASH)
  const policies:{version:string;definition:{fields:{label:string}[];compatibleVersions:string[]}}[]=await source.query('SELECT version,definition FROM brotar_extension.verification_policy WHERE is_active ORDER BY verification_type_id')
  assert.equal(policies.length,3)
  for(const p of policies){
   assert.equal(p.version,'mvp-demo-1.1-20261109')
   assert.doesNotMatch(JSON.stringify(p.definition.fields.map(field=>field.label)),/DEMO/i)
   assert.deepEqual(p.definition.compatibleVersions,['mvp-demo-1.0-20261023'])
  }
  const versions:{compatible:boolean}[]=await source.query(`SELECT bool_and(p.version=candidate OR p.definition->'compatibleVersions' ? candidate) AS compatible FROM brotar_extension.verification_policy p CROSS JOIN unnest(ARRAY['mvp-demo-1.0-20261023','mvp-demo-1.1-20261109']) candidate WHERE p.is_active`)
  assert.equal(versions[0]?.compatible,true)
  const unknown:{compatible:boolean}[]=await source.query(`SELECT bool_or(p.version='otra-politica' OR p.definition->'compatibleVersions' ? 'otra-politica') AS compatible FROM brotar_extension.verification_policy p WHERE p.is_active`)
  assert.equal(unknown[0]?.compatible,false)
 }finally{await source.destroy()}
})
