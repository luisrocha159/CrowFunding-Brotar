import type { EntityManager } from 'typeorm'
import type { InitiativeStage } from '../domain/initiative'

/** Solo lectura de declaraciones anteriores. No son requisitos de admisión del Sprint 2. */
export async function identityForCampaign(manager: EntityManager, campaignId: string): Promise<InitiativeStage | null> {
  const rows = await manager.query(`SELECT s.id,s.initiative_id AS "initiativeId",i.name AS "initiativeName",i.purpose,
    i.site_reference AS "siteReference",trim(i.country_code) AS "countryCode",i.locality,
    s.name AS "stageName",s.objective,s.starts_on::text AS "startsOn",s.ends_on::text AS "endsOn"
    FROM brotar_extension.initiative_stage s JOIN brotar_extension.initiative i ON i.id=s.initiative_id
    JOIN brotar_extension.campaign_identity ci ON ci.stage_id=s.id WHERE ci.campaign_id=$1`, [campaignId]) as InitiativeStage[]
  return rows[0] ?? null
}
