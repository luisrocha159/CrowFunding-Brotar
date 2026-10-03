import { Injectable } from '@nestjs/common'
import { DatabaseService } from '../../shared/infrastructure/database/database.service'

@Injectable()
export class PublicCampaigns {
  constructor(private readonly database: DatabaseService) {}

  async list(slug?: string) {
    const params: string[] = []
    const slugClause = slug ? `AND c.slug = $${params.push(slug)}` : ''
    return this.database.connection().query(`
      SELECT c.id, c.slug, c.title AS name, COALESCE(c.summary, '') AS summary,
             COALESCE(cat.name, '') AS category, COALESCE(loc.locality, '') AS location,
             COALESCE(NULLIF(o.trade_name, ''), NULLIF(o.legal_name, ''),
               NULLIF(concat_ws(' ', p.first_name, p.last_name), ''), 'Creador') AS creator,
             c.campaign_type AS "campaignType", c.status, c.goal_amount AS goal,
             f.amount_raised AS raised, c.published_at AS "publishedAt", c.ends_at AS "endsAt",
             fa.id AS "imageId", COALESCE(fa.public_url, '') AS "imageUrl",
             COALESCE(cs.long_description, cs.problem, '') AS description,
             COALESCE(cs.problem, '') AS problem, COALESCE(cs.solution, '') AS solution,
             COALESCE(cs.beneficiaries, '') AS beneficiaries,
             COALESCE(p.bio, o.description, '') AS "creatorDescription",
             COALESCE((SELECT json_agg(json_build_object('indicator', i.name, 'target',
               COALESCE(i.target_value::text, ''))) FROM campaign_impact_indicator i
               WHERE i.campaign_id = c.id), '[]'::json) AS impact,
             COALESCE((SELECT json_agg(json_build_object('id', r.id, 'title', r.title,
               'description', r.description, 'minAmount', r.min_amount, 'currency', r.currency_code)
               ORDER BY r.display_order, r.title) FROM reward r
               WHERE r.campaign_id = c.id AND r.is_active), '[]'::json) AS rewards
        FROM campaign c
        LEFT JOIN category cat ON cat.id = c.category_id
        LEFT JOIN campaign_location loc ON loc.campaign_id = c.id
        LEFT JOIN organization o ON o.id = c.organization_id
        LEFT JOIN user_profile p ON p.user_id = c.creator_user_id
        JOIN file_asset fa ON fa.id = c.cover_file_id AND fa.scope = 'PUBLIC'
          AND fa.deleted_at IS NULL AND fa.mime_type LIKE 'image/%'
        LEFT JOIN campaign_story cs ON cs.campaign_id = c.id
        LEFT JOIN v_campaign_funding f ON f.campaign_id = c.id
       WHERE c.status = 'PUBLISHED' AND c.deleted_at IS NULL ${slugClause}
       ORDER BY c.published_at DESC NULLS LAST, c.created_at DESC`, params)
  }
}
