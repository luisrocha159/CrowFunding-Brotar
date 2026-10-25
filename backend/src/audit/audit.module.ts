import { BadRequestException, Controller, Get, Header, Injectable, Module, Query, UseGuards } from '@nestjs/common'
import { IsIn, IsOptional, IsUUID, Matches } from 'class-validator'
import { RolesModule } from '../roles/roles.module'
import { RequirePermissions, RoleGuard } from '../roles/infrastructure/roles-http'
import { DatabaseModule } from '../shared/infrastructure/database/database.module'
import { DatabaseService } from '../shared/infrastructure/database/database.service'
import { ReportInvalid, validatePeriod } from '../finance/domain/report'

export class AuditQueryDto {
  @IsIn(['AUDIT','STATUS']) source: 'AUDIT' | 'STATUS'='AUDIT'
  @Matches(/^(?:[1-9]|[1-4]\d|50)$/) limit='25'
  @IsOptional() @Matches(/^[1-9]\d{0,18}$/) cursor?: string
  @IsOptional() @IsUUID() actorId?: string
  @IsOptional() @IsUUID() entityId?: string
  @IsOptional() @Matches(/^[a-z][a-z_]{0,79}$/) entity?: string
  @IsOptional() @IsIn(['CREATE','UPDATE','DELETE','READ','LOGIN','LOGOUT','STATUS_CHANGE','APPROVE','REJECT','PAYMENT_EVENT','EXPORT']) action?: string
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) from?: string
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) to?: string
}
export interface AuditEntry {
  id: string; actorId: string | null; actorRole: string | null; action: string; entity: string; entityId: string | null
  occurredAt: string; result: 'APPLIED' | 'UNSPECIFIED' | 'RECORDED'; fromStatus: string | null; toStatus: string | null
}
type AuditRow=Omit<AuditEntry,'occurredAt'> & {occurredAt:Date}
@Injectable()
export class AuditReader {
  constructor(private readonly database: DatabaseService) {}
  async list(query: AuditQueryDto): Promise<{source:'AUDIT' | 'STATUS';items:AuditEntry[];nextCursor:string | null}> {
    validatePeriod(query)
    if (query.cursor && BigInt(query.cursor)>9223372036854775807n) throw new ReportInvalid('El marcador supera el rango de identificadores.')
    // Proyecciones cerradas: nunca SELECT *, description/reason, old/new_values, IP, user_agent o metadata.
    const projection=query.source==='AUDIT' ? `SELECT id,actor_user_id AS "actorId",
      CASE WHEN actor_role ~ '^[A-Z][A-Z_]{0,59}$' THEN actor_role END AS "actorRole",action::text,
      CASE WHEN entity_name ~ '^[a-z][a-z_]{0,79}$' THEN entity_name ELSE 'unclassified' END AS entity,entity_id AS "entityId",occurred_at AS "occurredAt",
      CASE WHEN new_values->>'source'='APPLICATION' AND new_values->>'result'='APPLIED' THEN 'APPLIED' ELSE 'UNSPECIFIED' END AS result,
      NULL::text AS "fromStatus",NULL::text AS "toStatus" FROM public.audit_log` :
      `SELECT id,changed_by AS "actorId",NULL::text AS "actorRole",'STATUS_CHANGE'::text AS action,
      lower(entity_type::text) AS entity,entity_id AS "entityId",changed_at AS "occurredAt",'RECORDED'::text AS result,
      CASE WHEN from_status ~ '^[A-Z][A-Z_]{0,39}$' THEN from_status END AS "fromStatus",
      CASE WHEN to_status ~ '^[A-Z][A-Z_]{0,39}$' THEN to_status END AS "toStatus" FROM public.status_history`
    const rows: AuditRow[]=await this.database.connection().query(`SELECT id::text,"actorId","actorRole",action,entity,"entityId","occurredAt",result,"fromStatus","toStatus"
      FROM (${projection}) entries WHERE ($1::uuid IS NULL OR "actorId"=$1) AND ($2::uuid IS NULL OR "entityId"=$2)
      AND ($3::text IS NULL OR entity=$3) AND ($4::text IS NULL OR action=$4)
      AND ($5::date IS NULL OR "occurredAt">=($5::date::timestamp AT TIME ZONE 'UTC'))
      AND ($6::date IS NULL OR "occurredAt"<(($6::date+1)::timestamp AT TIME ZONE 'UTC'))
      AND ($7::bigint IS NULL OR id<$7) ORDER BY entries.id DESC LIMIT $8`,
    [query.actorId ?? null,query.entityId ?? null,query.entity ?? null,query.action ?? null,query.from ?? null,query.to ?? null,query.cursor ?? null,Number(query.limit)+1])
    const items=rows.slice(0,Number(query.limit)).map(row=>({...row,occurredAt:row.occurredAt.toISOString()}))
    return {source:query.source,items,nextCursor:rows.length>Number(query.limit)?items.at(-1)!.id:null}
  }
}
@Controller('admin/audit') @UseGuards(RoleGuard) @RequirePermissions('audit.read')
export class AuditController {
  constructor(private readonly reader: AuditReader) {}
  @Get() @Header('Cache-Control','no-store')
  async list(@Query() query: AuditQueryDto) {
    try {return await this.reader.list(query)} catch (error) {
      if (error instanceof ReportInvalid) throw new BadRequestException(error.message)
      throw error
    }
  }
}
@Module({imports:[DatabaseModule,RolesModule],controllers:[AuditController],providers:[AuditReader]})
export class AuditModule {}
