import type { MigrationInterface, QueryRunner } from 'typeorm'

/** Acuerdos internos ADR-013: nunca son aprobación legal ni identidad real. */
export class MvpDemoAgreements1792713600000 implements MigrationInterface {
  name='MvpDemoAgreements1792713600000'
  async up(runner: QueryRunner) {
    await runner.query(`INSERT INTO public.permission(code,resource,action,description) VALUES
      ('catalog.read','catalog','read','Consulta administrativa de catálogos y parámetros acordados') ON CONFLICT(code) DO NOTHING;
      INSERT INTO public.role_permission(role_id,permission_id) SELECT r.id,p.id FROM public.role r CROSS JOIN public.permission p
      WHERE r.code IN ('ADMIN','AUDITOR') AND p.code='catalog.read' ON CONFLICT DO NOTHING;
      INSERT INTO public.system_setting(key,value,description) VALUES
      ('support.first_response_hours','48','Meta operativa de ensayo, no SLA legal; ADR-013 v1.0'),
      ('support.escalation_hours','120','Alerta interna de ensayo, no envío externo; ADR-013 v1.0') ON CONFLICT(key) DO NOTHING;
      INSERT INTO public.document_type(code,name,applies_to,country_code) VALUES
      ('DEMO_PERSON_ID','Identidad sintética · no documento real','USER','BO'),
      ('DEMO_ORG_RECORD','Registro/constitución sintético','ORGANIZATION','BO'),
      ('DEMO_ORG_TAX','Respaldo tributario o no aplicabilidad sintético','ORGANIZATION','BO'),
      ('DEMO_ORG_REPRESENTATIVE','Autorización de representación sintética','ORGANIZATION','BO') ON CONFLICT(code) DO NOTHING;`)
    const notice='MVP académico DEMO: usa solo información y documentos sintéticos. No verifica identidad real ni constituye aceptación de términos legales definitivos.'
    const policies=[
      {code:'KYC_IDENTITY',fields:[['demoName','Nombre ficticio (DEMO …)'],['demoIdentifier','Identificador ficticio (DEMO …)']],docs:['DEMO_PERSON_ID']},
      {code:'KYB_LEGAL',fields:[['demoLegalName','Organización ficticia (DEMO …)'],['demoRegistration','Registro ficticio (DEMO …)']],docs:['DEMO_ORG_RECORD','DEMO_ORG_TAX']},
      {code:'KYB_REPRESENTATIVE',fields:[['demoRepresentativeName','Representante ficticio (DEMO …)'],['demoIdentifier','Identificador ficticio (DEMO …)']],docs:['DEMO_ORG_REPRESENTATIVE']}
    ]
    for(const policy of policies) {
      const documents=await runner.query('SELECT id,code,name FROM public.document_type WHERE code=ANY($1::text[]) AND is_active',[policy.docs]) as {id:string;code:string;name:string}[]
      if(documents.length!==policy.docs.length)throw new Error('Requisitos DEMO en conflicto; revisar catálogo sin reactivarlo silenciosamente.')
      const definition={version:'mvp-demo-1.0-20261023',treatmentNotice:notice,evidenceReference:'docs/decisiones/ADR-013-definiciones-integracion-mvp-demo.md#d13-01',approvedBy:'Ricardo · acuerdo funcional de pruebas, no aprobación legal',approvedAt:'2026-10-23T00:00:00-04:00',requiresAcceptance:true,
        fields:policy.fields.map(([key,label])=>({key,label,required:true,maxLength:150})),documents:documents.map(d=>({documentTypeId:d.id,label:d.name,required:true}))}
      // No sustituye una política activa previa, aunque tenga otra versión/finalidad.
      await runner.query(`INSERT INTO brotar_extension.verification_policy(verification_type_id,version,definition,is_active)
        SELECT t.id,$2,$3::jsonb,NOT EXISTS(SELECT 1 FROM brotar_extension.verification_policy p WHERE p.verification_type_id=t.id AND p.is_active)
        FROM public.verification_type t WHERE t.code=$1 AND t.is_active ON CONFLICT DO NOTHING`,[policy.code,definition.version,JSON.stringify(definition)])
    }
  }
  async down(): Promise<void> {throw new Error('El acuerdo DEMO no se revierte automáticamente; conservar expedientes y preparar recuperación revisada.')}
}
