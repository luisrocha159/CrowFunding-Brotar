import type { EntityManager } from 'typeorm'
import { createHash } from 'node:crypto'
import { compareCampaigns, eligibleReference, type CampaignIdentity, type DuplicateReport } from '../domain/duplication'

const IDENTITY_SELECT = `SELECT c.id,c.title,COALESCE(c.summary,'') AS summary,c.status,c.submitted_at::text AS "submittedAt",
  COALESCE(trim(l.country_code),'') AS country,COALESCE(l.locality,'') AS locality,COALESCE(l.address_line,'') AS address,
  COALESCE(s.problem,'') AS problem,COALESCE(s.solution,'') AS solution,COALESCE(s.beneficiaries,'') AS beneficiaries,
  COALESCE(s.expected_results,'') AS results,c.goal_amount::text AS goal,COALESCE(trim(c.currency_code),'') AS currency,
  ci.stage_id AS "stageId",st.initiative_id AS "initiativeId",COALESCE(i.purpose,'') AS "initiativePurpose",COALESCE(i.site_reference,'') AS "siteReference",
  COALESCE((SELECT jsonb_agg(jsonb_build_object('name',a.name,'start',COALESCE(a.planned_start_on::text,''),
    'end',COALESCE(a.planned_end_on::text,'')) ORDER BY a.display_order,a.id) FROM public.campaign_activity a WHERE a.campaign_id=c.id),'[]') AS activities,
  COALESCE((SELECT jsonb_agg(jsonb_build_object('description',b.description,'quantity',b.quantity::text,
    'price',b.unit_price::text,'amount',b.planned_amount::text) ORDER BY b.display_order,b.id)
    FROM public.budget_item b WHERE b.campaign_id=c.id),'[]') AS budget
  FROM public.campaign c LEFT JOIN public.campaign_location l ON l.campaign_id=c.id
  LEFT JOIN public.campaign_story s ON s.campaign_id=c.id
  LEFT JOIN brotar_extension.campaign_identity ci ON ci.campaign_id=c.id
  LEFT JOIN brotar_extension.initiative_stage st ON st.id=ci.stage_id
  LEFT JOIN brotar_extension.initiative i ON i.id=st.initiative_id`

export async function campaignDuplicateReport(manager: EntityManager, id: string): Promise<DuplicateReport> {
  const [subject] = await manager.query(`${IDENTITY_SELECT} WHERE c.id=$1 AND c.deleted_at IS NULL`, [id]) as CampaignIdentity[]
  if (!subject) return { matches: [], reviewToken: null }
  // Filtro amplio: localidad aproximada O historia compartida. No se trunca con LIMIT:
  // hacerlo podría ocultar una copia situada detrás de muchos candidatos de un bot.
  // El operador % usa los índices GIN; cada conexión fija el umbral 0.3, no un ajuste global del servidor.
  const candidates = await manager.query(`${IDENTITY_SELECT} WHERE c.id<>$1 AND c.deleted_at IS NULL
    AND c.status NOT IN ('DRAFT','REJECTED','CANCELLED') AND c.id IN (
      SELECT place.campaign_id FROM public.campaign_location place WHERE place.country_code=$2 AND place.locality OPERATOR(public.%) $3::text
      UNION SELECT place.campaign_id FROM public.campaign_location place WHERE place.country_code=$2 AND lower(btrim(place.locality))=lower(btrim($3::text))
      UNION SELECT content.campaign_id FROM public.campaign_story content WHERE length($4::text)>=20 AND content.solution OPERATOR(public.%) $4::text
      UNION SELECT link.campaign_id FROM brotar_extension.campaign_identity link JOIN brotar_extension.initiative_stage stage ON stage.id=link.stage_id WHERE stage.initiative_id=$5::uuid
    ) ORDER BY c.id`,
  [id, subject.country || null, subject.locality, subject.solution, subject.initiativeId ?? null]) as CampaignIdentity[]
  const evidence = candidates.filter(candidate => eligibleReference(subject, candidate))
    .map(candidate => ({ candidate, match: compareCampaigns(subject, candidate) })).filter(item => item.match !== null)
  const matches = evidence.map(item => item.match!)
  // Token de concurrencia de la evidencia, no credencial ni porcentaje de certeza.
  const reviewToken = matches.length ? createHash('sha256').update(JSON.stringify({ version: 2,
    subject: { ...subject, status: '', submittedAt: null },
    candidates: evidence.map(item => ({ ...item.candidate, status: '', submittedAt: null })) })).digest('hex') : null
  return { matches, reviewToken }
}
