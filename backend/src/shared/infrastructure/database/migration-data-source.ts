import 'reflect-metadata'
import { DataSource, type DataSourceOptions } from 'typeorm'
import type { MigrationConfig } from './migration.config'
import { BaselineProvisionalV21789948800000 } from './migrations/1789948800000-BaselineProvisionalV2'
import { CampaignRejected1791244800000 } from './migrations/1791244800000-CampaignRejected'
import { CreatorGrantAudit1791244800001 } from './migrations/1791244800001-CreatorGrantAudit'
import { MilestoneActivities1791849600000 } from './migrations/1791849600000-MilestoneActivities'
import { ProvisionalCatalogs1792015200000 } from './migrations/1792015200000-ProvisionalCatalogs'
import { InitiativeIdentity1792015200001 } from './migrations/1792015200001-InitiativeIdentity'
import { IdentityDraftCorrections1792015200002 } from './migrations/1792015200002-IdentityDraftCorrections'
import { ResponsibilityPermissions1792368000000 } from './migrations/1792368000000-ResponsibilityPermissions'
import { ContributionIntegrity1792368000001 } from './migrations/1792368000001-ContributionIntegrity'
import { FinancialRead1792368000002 } from './migrations/1792368000002-FinancialRead'
import { AuditRead1792368000003 } from './migrations/1792368000003-AuditRead'
import { StaffResponsibilities1792454400000 } from './migrations/1792454400000-StaffResponsibilities'
import { AuditRetention1792454400001 } from './migrations/1792454400001-AuditRetention'
import { DemoPayments1792540800000 } from './migrations/1792540800000-DemoPayments'

import { GalleryBookmarks1792627200000 } from './migrations/1792627200000-GalleryBookmarks'

import { CampaignProgress1792627200001 } from './migrations/1792627200001-CampaignProgress'
import { ContributionRead1792627200002 } from './migrations/1792627200002-ContributionRead'
import { VerificationCapture1792627200003 } from './migrations/1792627200003-VerificationCapture'

import { SupportCases1792627200004 } from './migrations/1792627200004-SupportCases'
import { MvpDemoAgreements1792713600000 } from './migrations/1792713600000-MvpDemoAgreements'
import {VerificationReview1792713600001} from './migrations/1792713600001-VerificationReview'
import {DemoRefunds1792713600002} from './migrations/1792713600002-DemoRefunds'
import {DemoObligationRead1792713600003} from './migrations/1792713600003-DemoObligationRead'
import {DemoDisputes1792713600004} from './migrations/1792713600004-DemoDisputes'
import {CampaignLifecycle1792713600005} from './migrations/1792713600005-CampaignLifecycle'
import {DemoDisbursements1792713600006} from './migrations/1792713600006-DemoDisbursements'
import {CampaignClosure1792800000000} from './migrations/1792800000000-CampaignClosure'
import {IntegratedAccess1792800000001} from './migrations/1792800000001-IntegratedAccess'
import {ContactMail1792800000002} from './migrations/1792800000002-ContactMail'
import {ResponsibilityDashboard1792800000003} from './migrations/1792800000003-ResponsibilityDashboard'
import {SupportCaseHistory1792800000004} from './migrations/1792800000004-SupportCaseHistory'

// Orden explícito: no se descubren por glob para que el contenido aplicado sea revisable en el repositorio.
export const MIGRATIONS = [BaselineProvisionalV21789948800000, CampaignRejected1791244800000, CreatorGrantAudit1791244800001, MilestoneActivities1791849600000, ProvisionalCatalogs1792015200000, InitiativeIdentity1792015200001, IdentityDraftCorrections1792015200002, ResponsibilityPermissions1792368000000, ContributionIntegrity1792368000001, FinancialRead1792368000002, AuditRead1792368000003, StaffResponsibilities1792454400000, AuditRetention1792454400001, DemoPayments1792540800000, GalleryBookmarks1792627200000, CampaignProgress1792627200001, ContributionRead1792627200002, VerificationCapture1792627200003, SupportCases1792627200004, MvpDemoAgreements1792713600000,VerificationReview1792713600001,DemoRefunds1792713600002,DemoObligationRead1792713600003,DemoDisputes1792713600004,CampaignLifecycle1792713600005,DemoDisbursements1792713600006,CampaignClosure1792800000000,IntegratedAccess1792800000001,ContactMail1792800000002,ResponsibilityDashboard1792800000003,SupportCaseHistory1792800000004]

// Nombre propio: el esquema oficial trae sus propias tablas y no se invade con el genérico "migrations".
export const MIGRATIONS_TABLE = 'schema_migration_brotar'

// Esquema aparte: dentro de public la tabla de control alteraría el inventario de la línea base
// (59 tablas) y haría fallar verify-provisional-v2. El manifiesto no se ajusta para silenciarlo.
export const MIGRATIONS_SCHEMA = 'brotar_migration'

export function migrationDataSourceOptions(config: MigrationConfig): DataSourceOptions {
  return {
    type: 'postgres',
    host: config.host,
    port: config.port,
    database: config.database,
    username: config.username,
    password: config.password,
    ssl: false,
    // Esquema por defecto de la conexión de migración; las migraciones nombran public explícitamente.
    schema: MIGRATIONS_SCHEMA,
    // Sin entidades: una migración no depende del mapeo actual de la API.
    entities: [],
    synchronize: false,
    dropSchema: false,
    migrationsRun: false,
    installExtensions: false,
    migrations: MIGRATIONS,
    migrationsTableName: MIGRATIONS_TABLE,
    migrationsTransactionMode: 'each',
    logging: false,
    connectTimeoutMS: 5000,
    extra: { max: 1 }
  }
}

export function createMigrationDataSource(config: MigrationConfig): DataSource {
  return new DataSource(migrationDataSourceOptions(config))
}
