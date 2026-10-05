import { Injectable } from '@nestjs/common'
import { DatabaseService } from '../../shared/infrastructure/database/database.service'
import type { PublicCampaign, PublicCampaignRepository } from '../application/public-campaigns'

// Consulta pública de Alison, integrada sin alterar los repositorios de S2-15/S2-17.
@Injectable()
export class TypeormPublicCampaignRepository implements PublicCampaignRepository {
  constructor(private readonly database: DatabaseService) {}
  list(slug?: string): Promise<PublicCampaign[]> {
    return this.database.connection().query(`
      SELECT c.id, c.slug, c.title AS name, COALESCE(c.summary, '') AS summary,
             COALESCE(cat.name, '') AS category, COALESCE(loc.locality, '') AS location,
             COALESCE(NULLIF(o.trade_name, ''), NULLIF(o.legal_name, ''),
               NULLIF(concat_ws(' ', p.first_name, p.last_name), ''), 'Creador') AS creator,
             c.campaign_type AS "campaignType", c.status, c.goal_amount::text AS goal,
             f.amount_raised::text AS raised, c.currency_code AS "currencyCode",
             c.published_at AS "publishedAt", c.ends_at AS "endsAt",
             fa.id AS "imageId", '/api/files/public/' || fa.id AS "imageUrl",
             COALESCE(NULLIF(a.caption, ''), 'Portada de ' || c.title) AS "imageAlt",
             COALESCE(cs.long_description, cs.problem, '') AS description,
             COALESCE(cs.problem, '') AS problem, COALESCE(cs.solution, '') AS solution,
             COALESCE(cs.beneficiaries, '') AS beneficiaries,
             COALESCE(cs.expected_results, '') AS "expectedResults",
             COALESCE(NULLIF(o.description, ''), p.bio, '') AS "creatorDescription",
             COALESCE((SELECT json_agg(json_build_object('indicator', i.name, 'target',
               concat_ws(' ', i.target_value::text, i.unit)) ORDER BY i.display_order, i.id)
               FROM public.campaign_impact_indicator i WHERE i.campaign_id = c.id), '[]'::json) AS impact,
             COALESCE((SELECT json_agg(json_build_object('id', r.id, 'title', r.title,
               'description', r.description, 'minAmount', r.min_amount::text, 'currency', r.currency_code)
               ORDER BY r.display_order, r.id) FROM public.reward r
               WHERE r.campaign_id = c.id AND r.is_active AND c.campaign_type <> 'DONATION'), '[]'::json) AS rewards
        FROM public.campaign c
        LEFT JOIN public.category cat ON cat.id = c.category_id
        LEFT JOIN public.campaign_location loc ON loc.campaign_id = c.id
        LEFT JOIN public.organization o ON o.id = c.organization_id
        LEFT JOIN public.user_profile p ON p.user_id = c.creator_user_id
        JOIN public.file_asset fa ON fa.id = c.cover_file_id AND fa.scope = 'PUBLIC'
          AND fa.deleted_at IS NULL AND fa.mime_type LIKE 'image/%'
          AND fa.storage_key LIKE 'CAMPAIGN_PUBLIC_IMAGE/%'
        LEFT JOIN public.file_attachment a ON a.campaign_id=c.id AND a.file_id=fa.id AND a.attachment_role='COVER'
        LEFT JOIN public.campaign_story cs ON cs.campaign_id = c.id
        JOIN public.v_campaign_funding f ON f.campaign_id = c.id
       WHERE c.status = 'PUBLISHED' AND c.deleted_at IS NULL ${slug === undefined ? '' : 'AND c.slug = $1'}
       ORDER BY c.published_at DESC NULLS LAST, c.id`, slug === undefined ? [] : [slug])
  }
}
