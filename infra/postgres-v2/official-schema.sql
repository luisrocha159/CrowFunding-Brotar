-- ============================================================================
-- BROTAR - BASE DE DATOS PROVISIONAL
-- PostgreSQL
-- ----------------------------------------------------------------------------
-- Objetivo:
--   Esquema común para los equipos de desarrollo del MVP de Brotar, manteniendo
--   flexibilidad para decisiones pendientes del cliente.
--
-- IMPORTANTE:
--   1) Ejecutar sobre una base PostgreSQL VACÍA (por ejemplo: brotar_db).
--   2) Este script NO crea la base de datos; crea su estructura interna.
--   3) Los INSERT del final son catálogos estructurales mínimos, NO datos demo.
--   4) No se fijan proveedores de pago, métodos de pago, categorías de campaña,
--      documentos KYC/KYB ni reglas financieras todavía no confirmadas.
-- ============================================================================

BEGIN;

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET search_path TO public;

-- Extensiones requeridas por el esquema.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- 1. TIPOS / ESTADOS
-- ============================================================================

CREATE TYPE user_status AS ENUM (
    'PENDING_VERIFICATION',
    'ACTIVE',
    'SUSPENDED',
    'CLOSED'
);

CREATE TYPE user_token_type AS ENUM (
    'SESSION',
    'EMAIL_VERIFICATION',
    'PASSWORD_RESET',
    'PHONE_OTP'
);

CREATE TYPE organization_status AS ENUM (
    'DRAFT',
    'PENDING_VERIFICATION',
    'ACTIVE',
    'SUSPENDED',
    'CLOSED'
);

CREATE TYPE organization_role_type AS ENUM (
    'OWNER',
    'LEGAL_REPRESENTATIVE',
    'ADMIN',
    'MEMBER'
);

CREATE TYPE party_type AS ENUM (
    'USER',
    'ORGANIZATION'
);

CREATE TYPE verification_status AS ENUM (
    'NOT_STARTED',
    'PENDING',
    'IN_REVIEW',
    'REQUIRES_INFO',
    'APPROVED',
    'REJECTED',
    'EXPIRED'
);

CREATE TYPE payout_account_status AS ENUM (
    'PENDING',
    'VERIFIED',
    'REJECTED',
    'DISABLED'
);

CREATE TYPE campaign_type AS ENUM (
    'DONATION',
    'REWARD',
    'PRESALE'
);

CREATE TYPE funding_model AS ENUM (
    'ALL_OR_NOTHING',
    'FLEXIBLE'
);

CREATE TYPE campaign_status AS ENUM (
    'DRAFT',
    'PENDING_VERIFICATION',
    'IN_REVIEW',
    'CHANGES_REQUESTED',
    'APPROVED',
    'PUBLISHED',
    'FUNDING_ENDED',
    'IN_EXECUTION',
    'CLOSED',
    'CANCELLED'
);

CREATE TYPE progress_status AS ENUM (
    'PLANNED',
    'IN_PROGRESS',
    'COMPLETED',
    'DELAYED',
    'CANCELLED'
);

CREATE TYPE review_decision AS ENUM (
    'PENDING',
    'APPROVED',
    'CHANGES_REQUESTED',
    'REJECTED'
);

CREATE TYPE observation_severity AS ENUM (
    'INFO',
    'MINOR',
    'BLOCKER'
);

CREATE TYPE observation_status AS ENUM (
    'OPEN',
    'ADDRESSED',
    'ACCEPTED',
    'DISMISSED'
);

CREATE TYPE contribution_status AS ENUM (
    'PENDING',
    'CONFIRMED',
    'CANCELLED',
    'EXPIRED',
    'REFUNDED'
);

CREATE TYPE payment_status AS ENUM (
    'INITIATED',
    'PENDING',
    'CONFIRMED',
    'FAILED',
    'EXPIRED',
    'REFUNDED',
    'DISPUTED'
);

CREATE TYPE refund_status AS ENUM (
    'REQUESTED',
    'PROCESSING',
    'REFUNDED',
    'FAILED'
);

CREATE TYPE dispute_status AS ENUM (
    'OPEN',
    'UNDER_REVIEW',
    'AWAITING_RESPONSE',
    'RESOLVED',
    'ESCALATED',
    'CLOSED'
);

CREATE TYPE support_case_status AS ENUM (
    'OPEN',
    'IN_PROGRESS',
    'AWAITING_RESPONSE',
    'RESOLVED',
    'CLOSED'
);

CREATE TYPE disbursement_status AS ENUM (
    'PENDING',
    'APPROVED',
    'PROCESSING',
    'COMPLETED',
    'FAILED'
);

CREATE TYPE reconciliation_status AS ENUM (
    'OPEN',
    'IN_PROGRESS',
    'CLOSED'
);

CREATE TYPE reconciliation_item_status AS ENUM (
    'MATCHED',
    'MISSING_INTERNAL',
    'MISSING_PROVIDER',
    'AMOUNT_MISMATCH',
    'DUPLICATED',
    'RESOLVED'
);

CREATE TYPE reward_fulfillment_status AS ENUM (
    'PENDING',
    'IN_PROGRESS',
    'FULFILLED',
    'CANCELLED'
);

CREATE TYPE accountability_status AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'IN_REVIEW',
    'CHANGES_REQUESTED',
    'APPROVED',
    'PUBLISHED'
);

CREATE TYPE bookmark_kind AS ENUM (
    'FAVORITE',
    'FOLLOW'
);

CREATE TYPE visibility AS ENUM (
    'PUBLIC',
    'SUPPORTERS_ONLY',
    'PRIVATE',
    'INTERNAL'
);

CREATE TYPE file_scope AS ENUM (
    'PUBLIC',
    'PRIVATE',
    'CONFIDENTIAL'
);

CREATE TYPE notification_channel AS ENUM (
    'IN_APP',
    'EMAIL',
    'SMS',
    'PUSH'
);

CREATE TYPE notification_status AS ENUM (
    'PENDING',
    'SENT',
    'FAILED',
    'READ'
);

CREATE TYPE audit_action AS ENUM (
    'CREATE',
    'UPDATE',
    'DELETE',
    'READ',
    'LOGIN',
    'LOGOUT',
    'STATUS_CHANGE',
    'APPROVE',
    'REJECT',
    'PAYMENT_EVENT',
    'EXPORT'
);

CREATE TYPE status_history_entity AS ENUM (
    'CAMPAIGN',
    'VERIFICATION',
    'PAYMENT',
    'REFUND',
    'DISPUTE',
    'DISBURSEMENT',
    'REWARD_FULFILLMENT'
);

-- ============================================================================
-- 2. CATÁLOGOS GENERALES
-- ============================================================================

CREATE TABLE currency (
    code            char(3) PRIMARY KEY,
    name            varchar(60) NOT NULL,
    symbol          varchar(8) NOT NULL,
    decimal_digits  smallint NOT NULL DEFAULT 2
                    CHECK (decimal_digits BETWEEN 0 AND 6),
    is_active       boolean NOT NULL DEFAULT true
);

CREATE TABLE country (
    code         char(2) PRIMARY KEY,
    code_alpha3  char(3) UNIQUE,
    name         varchar(80) NOT NULL,
    is_active    boolean NOT NULL DEFAULT true
);

CREATE TABLE administrative_area (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    country_code  char(2) NOT NULL REFERENCES country(code) ON DELETE CASCADE,
    parent_id     uuid REFERENCES administrative_area(id) ON DELETE SET NULL,
    level         smallint NOT NULL CHECK (level >= 1),
    code          varchar(40),
    name          varchar(120) NOT NULL,
    is_active     boolean NOT NULL DEFAULT true,
    UNIQUE (country_code, parent_id, name)
);

CREATE TABLE category (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id      uuid REFERENCES category(id) ON DELETE SET NULL,
    slug           varchar(80) NOT NULL UNIQUE,
    name           varchar(120) NOT NULL,
    description    text,
    icon           varchar(60),
    display_order  smallint NOT NULL DEFAULT 0,
    is_active      boolean NOT NULL DEFAULT true,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE expense_category (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code           varchar(60) NOT NULL UNIQUE,
    name           varchar(120) NOT NULL,
    description    text,
    display_order  smallint NOT NULL DEFAULT 0,
    is_active      boolean NOT NULL DEFAULT true
);

CREATE TABLE organization_type (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code         varchar(40) NOT NULL UNIQUE,
    name         varchar(120) NOT NULL,
    description  text,
    is_active    boolean NOT NULL DEFAULT true
);

CREATE TABLE document_type (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code             varchar(60) NOT NULL UNIQUE,
    name             varchar(120) NOT NULL,
    applies_to       party_type NOT NULL,
    country_code     char(2) REFERENCES country(code) ON DELETE SET NULL,
    requires_number  boolean NOT NULL DEFAULT false,
    requires_expiry  boolean NOT NULL DEFAULT false,
    is_active        boolean NOT NULL DEFAULT true
);

-- Los cinco niveles corresponden al documento funcional.
-- La lógica exacta para otorgarlos se mantiene desacoplada de un tipo de
-- verificación concreto, porque varias condiciones todavía dependen del cliente.
CREATE TABLE trust_level (
    level        smallint PRIMARY KEY CHECK (level BETWEEN 1 AND 5),
    name         varchar(100) NOT NULL,
    description  text NOT NULL
);

CREATE TABLE verification_type (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code                    varchar(60) NOT NULL UNIQUE,
    name                    varchar(120) NOT NULL,
    description             text,
    applies_to              party_type NOT NULL,
    requires_documents      boolean NOT NULL DEFAULT false,
    requires_manual_review  boolean NOT NULL DEFAULT false,
    validity_days           integer CHECK (validity_days IS NULL OR validity_days > 0),
    is_active               boolean NOT NULL DEFAULT true
);

CREATE TABLE payment_provider (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code         varchar(60) NOT NULL UNIQUE,
    name         varchar(120) NOT NULL,
    description  text,
    is_sandbox   boolean NOT NULL DEFAULT true,
    is_active    boolean NOT NULL DEFAULT true,
    config       jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE payment_method (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id    uuid NOT NULL REFERENCES payment_provider(id) ON DELETE CASCADE,
    code           varchar(60) NOT NULL,
    name           varchar(120) NOT NULL,
    currency_code  char(3) REFERENCES currency(code) ON DELETE RESTRICT,
    min_amount     numeric(14,2) CHECK (min_amount IS NULL OR min_amount >= 0),
    max_amount     numeric(14,2) CHECK (max_amount IS NULL OR max_amount >= 0),
    is_active      boolean NOT NULL DEFAULT true,
    UNIQUE (provider_id, code),
    UNIQUE (id, provider_id),
    CHECK (min_amount IS NULL OR max_amount IS NULL OR min_amount <= max_amount)
);

-- ============================================================================
-- 3. IDENTIDAD, ACCESO Y ARCHIVOS
-- ============================================================================

CREATE TABLE app_user (
    id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email                  citext NOT NULL,
    password_hash          text NOT NULL,
    status                 user_status NOT NULL DEFAULT 'PENDING_VERIFICATION',
    email_verified_at      timestamptz,
    phone_country_code     varchar(6),
    phone_number           varchar(30),
    phone_verified_at      timestamptz,
    last_login_at          timestamptz,
    failed_login_count     smallint NOT NULL DEFAULT 0 CHECK (failed_login_count >= 0),
    locked_until           timestamptz,
    accepted_terms_at      timestamptz,
    created_at             timestamptz NOT NULL DEFAULT now(),
    updated_at             timestamptz NOT NULL DEFAULT now(),
    deleted_at             timestamptz
);

CREATE TABLE file_asset (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    storage_key       text NOT NULL UNIQUE,
    public_url        text,
    file_name         varchar(255) NOT NULL,
    mime_type         varchar(160) NOT NULL,
    size_bytes        bigint NOT NULL CHECK (size_bytes >= 0),
    checksum          varchar(128),
    scope             file_scope NOT NULL DEFAULT 'PRIVATE',
    width             integer CHECK (width IS NULL OR width > 0),
    height            integer CHECK (height IS NULL OR height > 0),
    duration_seconds  integer CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
    uploaded_by       uuid REFERENCES app_user(id) ON DELETE SET NULL,
    uploaded_at       timestamptz NOT NULL DEFAULT now(),
    deleted_at        timestamptz
);

CREATE TABLE user_profile (
    user_id              uuid PRIMARY KEY REFERENCES app_user(id) ON DELETE CASCADE,
    first_name           varchar(120) NOT NULL,
    last_name            varchar(120) NOT NULL,
    display_name         varchar(160),
    bio                  text,
    birth_date           date,
    country_code         char(2) REFERENCES country(code) ON DELETE SET NULL,
    administrative_area_id uuid REFERENCES administrative_area(id) ON DELETE SET NULL,
    city                 varchar(120),
    avatar_file_id       uuid REFERENCES file_asset(id) ON DELETE SET NULL,
    website_url          text,
    preferred_language   varchar(10) NOT NULL DEFAULT 'es',
    preferred_currency   char(3) REFERENCES currency(code) ON DELETE SET NULL,
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE role (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code         varchar(60) NOT NULL UNIQUE,
    name         varchar(120) NOT NULL,
    description  text,
    is_internal  boolean NOT NULL DEFAULT false,
    is_system    boolean NOT NULL DEFAULT true,
    created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE permission (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code         varchar(120) NOT NULL UNIQUE,
    resource     varchar(60) NOT NULL,
    action       varchar(60) NOT NULL,
    description  text,
    UNIQUE (resource, action)
);

CREATE TABLE role_permission (
    role_id        uuid NOT NULL REFERENCES role(id) ON DELETE CASCADE,
    permission_id  uuid NOT NULL REFERENCES permission(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_role (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    role_id     uuid NOT NULL REFERENCES role(id) ON DELETE RESTRICT,
    granted_by  uuid REFERENCES app_user(id) ON DELETE SET NULL,
    granted_at  timestamptz NOT NULL DEFAULT now(),
    expires_at  timestamptz,
    revoked_at  timestamptz,
    CHECK (expires_at IS NULL OR expires_at > granted_at),
    CHECK (revoked_at IS NULL OR revoked_at >= granted_at)
);

CREATE UNIQUE INDEX user_role_active_uq
    ON user_role(user_id, role_id)
    WHERE revoked_at IS NULL;

CREATE TABLE user_token (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    token_type  user_token_type NOT NULL,
    token_hash  text NOT NULL UNIQUE,
    user_agent  text,
    ip_address  inet,
    created_at  timestamptz NOT NULL DEFAULT now(),
    expires_at  timestamptz NOT NULL,
    used_at     timestamptz,
    revoked_at  timestamptz,
    CHECK (expires_at > created_at),
    CHECK (used_at IS NULL OR used_at >= created_at),
    CHECK (revoked_at IS NULL OR revoked_at >= created_at)
);

-- ============================================================================
-- 4. ORGANIZACIONES, KYC/KYB Y CUENTAS DE DESTINO
-- ============================================================================

CREATE TABLE organization (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug                    varchar(120) NOT NULL,
    legal_name              varchar(200) NOT NULL,
    trade_name              varchar(200),
    organization_type_id    uuid NOT NULL REFERENCES organization_type(id) ON DELETE RESTRICT,
    tax_id                  varchar(60),
    tax_id_country          char(2) REFERENCES country(code) ON DELETE SET NULL,
    description             text,
    mission                 text,
    logo_file_id            uuid REFERENCES file_asset(id) ON DELETE SET NULL,
    website_url             text,
    contact_email           citext,
    contact_phone           varchar(40),
    country_code            char(2) REFERENCES country(code) ON DELETE SET NULL,
    administrative_area_id  uuid REFERENCES administrative_area(id) ON DELETE SET NULL,
    address_line            text,
    status                  organization_status NOT NULL DEFAULT 'DRAFT',
    founded_on              date,
    created_by              uuid NOT NULL REFERENCES app_user(id) ON DELETE RESTRICT,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),
    deleted_at              timestamptz
);

CREATE UNIQUE INDEX organization_tax_id_uq
    ON organization(tax_id_country, tax_id)
    WHERE tax_id IS NOT NULL;

CREATE TABLE organization_member (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id    uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    user_id             uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    organization_role   organization_role_type NOT NULL DEFAULT 'MEMBER',
    position_title      varchar(120),
    invited_by          uuid REFERENCES app_user(id) ON DELETE SET NULL,
    joined_at           timestamptz NOT NULL DEFAULT now(),
    left_at             timestamptz,
    CHECK (left_at IS NULL OR left_at >= joined_at)
);

CREATE UNIQUE INDEX organization_member_active_uq
    ON organization_member(organization_id, user_id)
    WHERE left_at IS NULL;

CREATE TABLE verification (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    verification_type_id  uuid NOT NULL REFERENCES verification_type(id) ON DELETE RESTRICT,
    user_id               uuid REFERENCES app_user(id) ON DELETE CASCADE,
    organization_id       uuid REFERENCES organization(id) ON DELETE CASCADE,
    status                verification_status NOT NULL DEFAULT 'NOT_STARTED',
    submitted_data        jsonb NOT NULL DEFAULT '{}'::jsonb,
    submitted_at          timestamptz,
    reviewed_by           uuid REFERENCES app_user(id) ON DELETE SET NULL,
    reviewed_at           timestamptz,
    expires_at            timestamptz,
    result_notes          text,
    rejection_reason      text,
    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now(),
    CHECK (num_nonnulls(user_id, organization_id) = 1),
    CHECK (reviewed_at IS NULL OR submitted_at IS NULL OR reviewed_at >= submitted_at)
);

CREATE TABLE verification_document (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    verification_id   uuid NOT NULL REFERENCES verification(id) ON DELETE CASCADE,
    document_type_id  uuid NOT NULL REFERENCES document_type(id) ON DELETE RESTRICT,
    file_id           uuid NOT NULL REFERENCES file_asset(id) ON DELETE RESTRICT,
    document_number   varchar(80),
    issued_on         date,
    expires_on        date,
    side              varchar(20),
    is_valid          boolean,
    review_notes      text,
    uploaded_at       timestamptz NOT NULL DEFAULT now(),
    UNIQUE (verification_id, file_id),
    CHECK (expires_on IS NULL OR issued_on IS NULL OR expires_on >= issued_on)
);

CREATE TABLE payout_account (
    id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                   uuid REFERENCES app_user(id) ON DELETE CASCADE,
    organization_id           uuid REFERENCES organization(id) ON DELETE CASCADE,
    account_holder_name       varchar(200) NOT NULL,
    bank_name                 varchar(160),
    account_type              varchar(40),
    account_number_last4      varchar(8),
    account_number_encrypted  text,
    currency_code             char(3) NOT NULL REFERENCES currency(code) ON DELETE RESTRICT,
    country_code              char(2) REFERENCES country(code) ON DELETE SET NULL,
    status                    payout_account_status NOT NULL DEFAULT 'PENDING',
    is_default                boolean NOT NULL DEFAULT false,
    verified_at               timestamptz,
    verified_by               uuid REFERENCES app_user(id) ON DELETE SET NULL,
    created_at                timestamptz NOT NULL DEFAULT now(),
    updated_at                timestamptz NOT NULL DEFAULT now(),
    deleted_at                timestamptz,
    CHECK (num_nonnulls(user_id, organization_id) = 1)
);

CREATE UNIQUE INDEX payout_account_default_user_uq
    ON payout_account(user_id)
    WHERE user_id IS NOT NULL AND is_default AND deleted_at IS NULL;

CREATE UNIQUE INDEX payout_account_default_org_uq
    ON payout_account(organization_id)
    WHERE organization_id IS NOT NULL AND is_default AND deleted_at IS NULL;

-- Evaluación explícita del nivel de confianza.
-- Evita inferir reglas todavía no confirmadas directamente desde KYC/KYB.
CREATE TABLE trust_assessment (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          uuid REFERENCES app_user(id) ON DELETE CASCADE,
    organization_id  uuid REFERENCES organization(id) ON DELETE CASCADE,
    campaign_id      uuid, -- FK agregada luego de crear campaign
    trust_level      smallint NOT NULL REFERENCES trust_level(level) ON DELETE RESTRICT,
    rationale        text,
    assessed_by      uuid REFERENCES app_user(id) ON DELETE SET NULL,
    assessed_at      timestamptz NOT NULL DEFAULT now(),
    expires_at       timestamptz,
    revoked_at       timestamptz,
    CHECK (num_nonnulls(user_id, organization_id, campaign_id) = 1),
    CHECK (expires_at IS NULL OR expires_at > assessed_at),
    CHECK (revoked_at IS NULL OR revoked_at >= assessed_at)
);

-- ============================================================================
-- 5. HISTORIAL Y CONFIGURACIÓN GENERAL
-- ============================================================================

CREATE TABLE status_history (
    id                 bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    entity_type        status_history_entity NOT NULL,
    entity_id          uuid NOT NULL,
    from_status        varchar(40),
    to_status          varchar(40) NOT NULL,
    changed_by         uuid REFERENCES app_user(id) ON DELETE SET NULL,
    reason             text,
    external_event_id  varchar(200),
    metadata           jsonb NOT NULL DEFAULT '{}'::jsonb,
    changed_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE system_setting (
    key          varchar(120) PRIMARY KEY,
    value        jsonb NOT NULL,
    description  text,
    updated_by   uuid REFERENCES app_user(id) ON DELETE SET NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 6. CAMPAÑAS
-- ============================================================================

CREATE TABLE campaign (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug             varchar(160) NOT NULL,
    title            varchar(200) NOT NULL,
    summary          varchar(500),
    campaign_type    campaign_type NOT NULL,
    funding_model    funding_model,
    creator_user_id  uuid NOT NULL REFERENCES app_user(id) ON DELETE RESTRICT,
    organization_id  uuid REFERENCES organization(id) ON DELETE SET NULL,
    category_id      uuid REFERENCES category(id) ON DELETE SET NULL,
    status           campaign_status NOT NULL DEFAULT 'DRAFT',
    builder_step     smallint NOT NULL DEFAULT 0 CHECK (builder_step BETWEEN 0 AND 20),
    goal_amount      numeric(14,2) CHECK (goal_amount IS NULL OR goal_amount > 0),
    currency_code    char(3) REFERENCES currency(code) ON DELETE RESTRICT,
    min_contribution numeric(14,2) CHECK (min_contribution IS NULL OR min_contribution > 0),
    duration_days    integer CHECK (duration_days IS NULL OR duration_days > 0),
    starts_at        timestamptz,
    ends_at          timestamptz,
    cover_file_id    uuid REFERENCES file_asset(id) ON DELETE SET NULL,
    video_url        text,
    submitted_at     timestamptz,
    approved_at      timestamptz,
    published_at     timestamptz,
    funding_ended_at timestamptz,
    closed_at        timestamptz,
    cancelled_at     timestamptz,
    cancellation_reason text,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),
    deleted_at       timestamptz,
    CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at),
    CHECK (status = 'DRAFT' OR (goal_amount IS NOT NULL AND currency_code IS NOT NULL))
);

CREATE UNIQUE INDEX campaign_id_currency_uq
    ON campaign(id, currency_code);

ALTER TABLE trust_assessment
    ADD CONSTRAINT trust_assessment_campaign_fk
    FOREIGN KEY (campaign_id) REFERENCES campaign(id) ON DELETE CASCADE;

CREATE TABLE campaign_story (
    campaign_id       uuid PRIMARY KEY REFERENCES campaign(id) ON DELETE CASCADE,
    problem           text,
    solution          text,
    beneficiaries     text,
    expected_results  text,
    long_description  text,
    updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE campaign_location (
    campaign_id             uuid PRIMARY KEY REFERENCES campaign(id) ON DELETE CASCADE,
    country_code            char(2) REFERENCES country(code) ON DELETE SET NULL,
    administrative_area_id  uuid REFERENCES administrative_area(id) ON DELETE SET NULL,
    locality                varchar(160),
    address_line            text,
    reference               text,
    latitude                numeric(9,6) CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
    longitude               numeric(9,6) CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180)
);

CREATE TABLE campaign_impact_indicator (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id     uuid NOT NULL REFERENCES campaign(id) ON DELETE CASCADE,
    name            varchar(200) NOT NULL,
    description     text,
    unit            varchar(60),
    baseline_value  numeric(14,2),
    target_value    numeric(14,2),
    achieved_value  numeric(14,2),
    display_order   smallint NOT NULL DEFAULT 0
);

CREATE TABLE campaign_risk (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id    uuid NOT NULL REFERENCES campaign(id) ON DELETE CASCADE,
    title          varchar(200) NOT NULL,
    description    text,
    likelihood     varchar(40),
    impact         varchar(40),
    mitigation     text,
    display_order  smallint NOT NULL DEFAULT 0
);

-- Actividades y responsables: separado de "milestone" porque actividad e hito
-- representan conceptos distintos en el documento funcional.
CREATE TABLE campaign_activity (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id          uuid NOT NULL REFERENCES campaign(id) ON DELETE CASCADE,
    name                 varchar(200) NOT NULL,
    description          text,
    responsible_user_id  uuid REFERENCES app_user(id) ON DELETE SET NULL,
    responsible_name     varchar(160),
    planned_start_on     date,
    planned_end_on       date,
    actual_start_on      date,
    actual_end_on        date,
    status               progress_status NOT NULL DEFAULT 'PLANNED',
    progress_percent     smallint NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
    display_order        smallint NOT NULL DEFAULT 0,
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now(),
    CHECK (planned_end_on IS NULL OR planned_start_on IS NULL OR planned_end_on >= planned_start_on),
    CHECK (actual_end_on IS NULL OR actual_start_on IS NULL OR actual_end_on >= actual_start_on)
);

CREATE TABLE budget_item (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id          uuid NOT NULL REFERENCES campaign(id) ON DELETE CASCADE,
    expense_category_id  uuid NOT NULL REFERENCES expense_category(id) ON DELETE RESTRICT,
    description          varchar(300) NOT NULL,
    quantity             numeric(12,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price           numeric(14,2) CHECK (unit_price IS NULL OR unit_price >= 0),
    planned_amount       numeric(14,2) NOT NULL CHECK (planned_amount >= 0),
    display_order        smallint NOT NULL DEFAULT 0,
    notes                text,
    UNIQUE (id, campaign_id)
);

CREATE TABLE milestone (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id          uuid NOT NULL REFERENCES campaign(id) ON DELETE CASCADE,
    activity_id          uuid REFERENCES campaign_activity(id) ON DELETE SET NULL,
    name                 varchar(200) NOT NULL,
    description          text,
    responsible_user_id  uuid REFERENCES app_user(id) ON DELETE SET NULL,
    responsible_name     varchar(160),
    planned_start_on     date,
    planned_end_on       date,
    actual_start_on      date,
    actual_end_on        date,
    status               progress_status NOT NULL DEFAULT 'PLANNED',
    progress_percent     smallint NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
    display_order        smallint NOT NULL DEFAULT 0,
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now(),
    UNIQUE (id, campaign_id),
    CHECK (planned_end_on IS NULL OR planned_start_on IS NULL OR planned_end_on >= planned_start_on),
    CHECK (actual_end_on IS NULL OR actual_start_on IS NULL OR actual_end_on >= actual_start_on)
);

CREATE TABLE reward (
    id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id            uuid NOT NULL,
    title                  varchar(200) NOT NULL,
    description            text NOT NULL,
    reward_kind            varchar(60),
    min_amount             numeric(14,2) NOT NULL CHECK (min_amount > 0),
    currency_code          char(3) NOT NULL,
    quantity_total         integer CHECK (quantity_total IS NULL OR quantity_total >= 0),
    estimated_delivery_on  date,
    image_file_id          uuid REFERENCES file_asset(id) ON DELETE SET NULL,
    display_order          smallint NOT NULL DEFAULT 0,
    is_active              boolean NOT NULL DEFAULT true,
    created_at             timestamptz NOT NULL DEFAULT now(),
    updated_at             timestamptz NOT NULL DEFAULT now(),
    UNIQUE (id, campaign_id),
    CONSTRAINT reward_campaign_currency_fk
        FOREIGN KEY (campaign_id, currency_code)
        REFERENCES campaign(id, currency_code) ON DELETE CASCADE
);

CREATE TABLE campaign_review (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id       uuid NOT NULL REFERENCES campaign(id) ON DELETE CASCADE,
    round             smallint NOT NULL CHECK (round > 0),
    reviewer_user_id  uuid REFERENCES app_user(id) ON DELETE SET NULL,
    decision          review_decision NOT NULL DEFAULT 'PENDING',
    summary           text,
    internal_notes    text,
    assigned_at       timestamptz NOT NULL DEFAULT now(),
    started_at        timestamptz,
    decided_at        timestamptz,
    UNIQUE (campaign_id, round),
    CHECK (started_at IS NULL OR started_at >= assigned_at),
    CHECK (decided_at IS NULL OR decided_at >= assigned_at)
);

CREATE TABLE campaign_review_observation (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id        uuid NOT NULL REFERENCES campaign_review(id) ON DELETE CASCADE,
    section          varchar(80) NOT NULL,
    field_path       varchar(160),
    severity         observation_severity NOT NULL DEFAULT 'INFO',
    status           observation_status NOT NULL DEFAULT 'OPEN',
    message          text NOT NULL,
    created_by       uuid REFERENCES app_user(id) ON DELETE SET NULL,
    created_at       timestamptz NOT NULL DEFAULT now(),
    resolved_by      uuid REFERENCES app_user(id) ON DELETE SET NULL,
    resolved_at      timestamptz,
    resolution_note  text,
    CHECK (resolved_at IS NULL OR resolved_at >= created_at)
);

-- ============================================================================
-- 7. APORTES, PAGOS Y RECOMPENSAS
-- ============================================================================

CREATE SEQUENCE contribution_reference_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE contribution (
    id                           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_code               varchar(24) NOT NULL UNIQUE
                                 DEFAULT ('BRT-C-' || lpad(nextval('contribution_reference_seq')::text, 8, '0')),
    campaign_id                  uuid NOT NULL,
    user_id                      uuid NOT NULL REFERENCES app_user(id) ON DELETE RESTRICT,
    reward_id                    uuid,
    amount                       numeric(14,2) NOT NULL CHECK (amount > 0),
    currency_code                char(3) NOT NULL,
    status                       contribution_status NOT NULL DEFAULT 'PENDING',
    is_anonymous                 boolean NOT NULL DEFAULT false,
    supporter_message            text,
    supporter_message_visibility visibility NOT NULL DEFAULT 'PUBLIC',
    created_at                   timestamptz NOT NULL DEFAULT now(),
    confirmed_at                 timestamptz,
    cancelled_at                 timestamptz,
    expires_at                   timestamptz,
    updated_at                   timestamptz NOT NULL DEFAULT now(),
    UNIQUE (id, currency_code),
    CONSTRAINT contribution_campaign_currency_fk
        FOREIGN KEY (campaign_id, currency_code)
        REFERENCES campaign(id, currency_code) ON DELETE RESTRICT,
    CONSTRAINT contribution_reward_fk
        FOREIGN KEY (reward_id, campaign_id)
        REFERENCES reward(id, campaign_id) ON DELETE RESTRICT,
    CHECK (cancelled_at IS NULL OR cancelled_at >= created_at),
    CHECK (expires_at IS NULL OR expires_at > created_at)
);

CREATE TABLE payment (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contribution_id     uuid NOT NULL,
    provider_id         uuid NOT NULL REFERENCES payment_provider(id) ON DELETE RESTRICT,
    payment_method_id   uuid REFERENCES payment_method(id) ON DELETE RESTRICT,
    idempotency_key     varchar(120) NOT NULL UNIQUE,
    external_reference  varchar(200),
    amount              numeric(14,2) NOT NULL CHECK (amount > 0),
    currency_code       char(3) NOT NULL,
    fee_amount          numeric(14,2) NOT NULL DEFAULT 0 CHECK (fee_amount >= 0),
    net_amount          numeric(14,2) GENERATED ALWAYS AS (amount - fee_amount) STORED,
    status              payment_status NOT NULL DEFAULT 'INITIATED',
    attempt_number      smallint NOT NULL DEFAULT 1 CHECK (attempt_number > 0),
    failure_code        varchar(80),
    failure_message     text,
    provider_payload    jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    confirmed_at        timestamptz,
    expires_at          timestamptz,
    UNIQUE (contribution_id, attempt_number),
    UNIQUE (id, contribution_id),
    UNIQUE (id, currency_code),
    CONSTRAINT payment_method_provider_fk
        FOREIGN KEY (payment_method_id, provider_id)
        REFERENCES payment_method(id, provider_id) ON DELETE RESTRICT,
    CONSTRAINT payment_contribution_currency_fk
        FOREIGN KEY (contribution_id, currency_code)
        REFERENCES contribution(id, currency_code) ON DELETE RESTRICT,
    CHECK (net_amount >= 0),
    CHECK (expires_at IS NULL OR expires_at > created_at),
    CHECK (
        (status IN ('CONFIRMED', 'REFUNDED', 'DISPUTED') AND confirmed_at IS NOT NULL)
        OR
        (status NOT IN ('CONFIRMED', 'REFUNDED', 'DISPUTED') AND confirmed_at IS NULL)
    ),
    CHECK (confirmed_at IS NULL OR confirmed_at >= created_at)
);

-- Garantiza que un aporte tenga como máximo un intento confirmado.
CREATE UNIQUE INDEX payment_one_confirmed_per_contribution_uq
    ON payment(contribution_id)
    WHERE confirmed_at IS NOT NULL;

CREATE TABLE payment_event (
    id                 bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    payment_id         uuid NOT NULL REFERENCES payment(id) ON DELETE CASCADE,
    provider_event_id  varchar(200),
    event_type         varchar(80) NOT NULL,
    previous_status    payment_status,
    new_status         payment_status,
    payload            jsonb NOT NULL DEFAULT '{}'::jsonb,
    occurred_at        timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX payment_event_provider_event_uq
    ON payment_event(provider_event_id)
    WHERE provider_event_id IS NOT NULL;

-- Seguimiento funcional de la recompensa, sin logística/transportistas.
CREATE TABLE reward_fulfillment (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contribution_id  uuid NOT NULL UNIQUE REFERENCES contribution(id) ON DELETE CASCADE,
    status           reward_fulfillment_status NOT NULL DEFAULT 'PENDING',
    fulfilled_by     uuid REFERENCES app_user(id) ON DELETE SET NULL,
    fulfilled_at     timestamptz,
    notes            text,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),
    CHECK (
        (status = 'FULFILLED' AND fulfilled_at IS NOT NULL)
        OR (status <> 'FULFILLED' AND fulfilled_at IS NULL)
    )
);

CREATE TABLE refund (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id          uuid NOT NULL,
    contribution_id     uuid NOT NULL,
    amount              numeric(14,2) NOT NULL CHECK (amount > 0),
    currency_code       char(3) NOT NULL,
    reason_code         varchar(80),
    reason_detail       text,
    status              refund_status NOT NULL DEFAULT 'REQUESTED',
    requested_by        uuid REFERENCES app_user(id) ON DELETE SET NULL,
    approved_by         uuid REFERENCES app_user(id) ON DELETE SET NULL,
    external_reference  varchar(200),
    provider_payload    jsonb NOT NULL DEFAULT '{}'::jsonb,
    requested_at        timestamptz NOT NULL DEFAULT now(),
    processed_at        timestamptz,
    completed_at        timestamptz,
    failure_message     text,
    CONSTRAINT refund_payment_contribution_fk
        FOREIGN KEY (payment_id, contribution_id)
        REFERENCES payment(id, contribution_id) ON DELETE RESTRICT,
    CONSTRAINT refund_payment_currency_fk
        FOREIGN KEY (payment_id, currency_code)
        REFERENCES payment(id, currency_code) ON DELETE RESTRICT,
    CHECK (processed_at IS NULL OR processed_at >= requested_at),
    CHECK (completed_at IS NULL OR completed_at >= requested_at)
);

-- ============================================================================
-- 8. SOPORTE Y DISPUTAS
-- ============================================================================

CREATE SEQUENCE support_case_number_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE support_case (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    case_number  varchar(24) NOT NULL UNIQUE
                 DEFAULT ('BRT-S-' || lpad(nextval('support_case_number_seq')::text, 7, '0')),
    user_id      uuid REFERENCES app_user(id) ON DELETE SET NULL,
    campaign_id  uuid REFERENCES campaign(id) ON DELETE SET NULL,
    subject      varchar(200) NOT NULL,
    description  text NOT NULL,
    category     varchar(60),
    priority     smallint NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
    status       support_case_status NOT NULL DEFAULT 'OPEN',
    assigned_to  uuid REFERENCES app_user(id) ON DELETE SET NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    resolved_at  timestamptz,
    closed_at    timestamptz,
    CHECK (resolved_at IS NULL OR resolved_at >= created_at),
    CHECK (closed_at IS NULL OR closed_at >= created_at)
);

CREATE TABLE support_case_message (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    support_case_id  uuid NOT NULL REFERENCES support_case(id) ON DELETE CASCADE,
    author_user_id   uuid REFERENCES app_user(id) ON DELETE SET NULL,
    body             text NOT NULL,
    is_internal      boolean NOT NULL DEFAULT false,
    created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE SEQUENCE dispute_number_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE dispute (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_number   varchar(24) NOT NULL UNIQUE
                     DEFAULT ('BRT-D-' || lpad(nextval('dispute_number_seq')::text, 7, '0')),
    contribution_id  uuid NOT NULL REFERENCES contribution(id) ON DELETE RESTRICT,
    payment_id       uuid,
    campaign_id      uuid REFERENCES campaign(id) ON DELETE SET NULL,
    support_case_id  uuid REFERENCES support_case(id) ON DELETE SET NULL,
    raised_by        uuid NOT NULL REFERENCES app_user(id) ON DELETE RESTRICT,
    reason_code      varchar(80) NOT NULL,
    description      text NOT NULL,
    status           dispute_status NOT NULL DEFAULT 'OPEN',
    assigned_to      uuid REFERENCES app_user(id) ON DELETE SET NULL,
    resolution       text,
    opened_at        timestamptz NOT NULL DEFAULT now(),
    resolved_at      timestamptz,
    closed_at        timestamptz,
    updated_at       timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT dispute_payment_contribution_fk
        FOREIGN KEY (payment_id, contribution_id)
        REFERENCES payment(id, contribution_id) ON DELETE RESTRICT,
    CHECK (resolved_at IS NULL OR resolved_at >= opened_at),
    CHECK (closed_at IS NULL OR closed_at >= opened_at)
);

-- ============================================================================
-- 9. FINANZAS, DESEMBOLSOS Y CONCILIACIÓN
-- ============================================================================

CREATE SEQUENCE disbursement_number_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE disbursement (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    disbursement_number  varchar(24) NOT NULL UNIQUE
                         DEFAULT ('BRT-P-' || lpad(nextval('disbursement_number_seq')::text, 7, '0')),
    campaign_id          uuid NOT NULL,
    payout_account_id    uuid NOT NULL REFERENCES payout_account(id) ON DELETE RESTRICT,
    beneficiary_user_id  uuid REFERENCES app_user(id) ON DELETE RESTRICT,
    beneficiary_org_id   uuid REFERENCES organization(id) ON DELETE RESTRICT,
    gross_amount         numeric(14,2) NOT NULL CHECK (gross_amount > 0),
    platform_fee         numeric(14,2) NOT NULL DEFAULT 0 CHECK (platform_fee >= 0),
    provider_fee         numeric(14,2) NOT NULL DEFAULT 0 CHECK (provider_fee >= 0),
    other_costs          numeric(14,2) NOT NULL DEFAULT 0 CHECK (other_costs >= 0),
    net_amount           numeric(14,2)
                         GENERATED ALWAYS AS (gross_amount - platform_fee - provider_fee - other_costs) STORED,
    currency_code        char(3) NOT NULL,
    status               disbursement_status NOT NULL DEFAULT 'PENDING',
    authorized_by        uuid REFERENCES app_user(id) ON DELETE SET NULL,
    authorized_at        timestamptz,
    external_reference   varchar(200),
    scheduled_for        date,
    processed_at         timestamptz,
    completed_at         timestamptz,
    failure_message      text,
    notes                text,
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT disbursement_campaign_currency_fk
        FOREIGN KEY (campaign_id, currency_code)
        REFERENCES campaign(id, currency_code) ON DELETE RESTRICT,
    CHECK (num_nonnulls(beneficiary_user_id, beneficiary_org_id) = 1),
    CHECK (net_amount >= 0)
);

CREATE TABLE reconciliation (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id     uuid NOT NULL REFERENCES payment_provider(id) ON DELETE RESTRICT,
    period_start    date NOT NULL,
    period_end      date NOT NULL,
    status          reconciliation_status NOT NULL DEFAULT 'OPEN',
    source_file_id  uuid REFERENCES file_asset(id) ON DELETE SET NULL,
    total_internal  numeric(16,2),
    total_provider  numeric(16,2),
    difference      numeric(16,2)
                    GENERATED ALWAYS AS (COALESCE(total_internal,0) - COALESCE(total_provider,0)) STORED,
    created_by      uuid REFERENCES app_user(id) ON DELETE SET NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    closed_by       uuid REFERENCES app_user(id) ON DELETE SET NULL,
    closed_at       timestamptz,
    notes           text,
    CHECK (period_end >= period_start),
    CHECK (closed_at IS NULL OR closed_at >= created_at)
);

CREATE TABLE reconciliation_item (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reconciliation_id     uuid NOT NULL REFERENCES reconciliation(id) ON DELETE CASCADE,
    payment_id            uuid REFERENCES payment(id) ON DELETE SET NULL,
    external_reference    varchar(200),
    internal_amount       numeric(14,2),
    provider_amount       numeric(14,2),
    status                reconciliation_item_status NOT NULL,
    note                  text,
    resolved_by           uuid REFERENCES app_user(id) ON DELETE SET NULL,
    resolved_at           timestamptz,
    created_at            timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 10. EJECUCIÓN, ACTUALIZACIONES, EVIDENCIAS Y RENDICIÓN
-- ============================================================================

CREATE TABLE campaign_update (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id     uuid NOT NULL REFERENCES campaign(id) ON DELETE CASCADE,
    author_user_id  uuid NOT NULL REFERENCES app_user(id) ON DELETE RESTRICT,
    title           varchar(200) NOT NULL,
    body            text NOT NULL,
    visibility      visibility NOT NULL DEFAULT 'PUBLIC',
    milestone_id    uuid REFERENCES milestone(id) ON DELETE SET NULL,
    published_at    timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    deleted_at      timestamptz
);

CREATE TABLE evidence (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id    uuid NOT NULL REFERENCES campaign(id) ON DELETE CASCADE,
    milestone_id   uuid REFERENCES milestone(id) ON DELETE SET NULL,
    title          varchar(200) NOT NULL,
    description    text,
    evidence_type  varchar(60),
    external_url   text,
    visibility     visibility NOT NULL DEFAULT 'PUBLIC',
    recorded_on    date,
    uploaded_by    uuid REFERENCES app_user(id) ON DELETE SET NULL,
    created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE accountability_report (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id           uuid NOT NULL,
    period_label          varchar(80),
    period_start          date,
    period_end            date,
    is_final              boolean NOT NULL DEFAULT false,
    status                accountability_status NOT NULL DEFAULT 'DRAFT',
    funds_received        numeric(14,2) CHECK (funds_received IS NULL OR funds_received >= 0),
    funds_spent           numeric(14,2) CHECK (funds_spent IS NULL OR funds_spent >= 0),
    balance               numeric(14,2)
                          GENERATED ALWAYS AS (COALESCE(funds_received,0) - COALESCE(funds_spent,0)) STORED,
    currency_code         char(3) NOT NULL,
    variance_explanation  text,
    narrative             text,
    submitted_by          uuid REFERENCES app_user(id) ON DELETE SET NULL,
    submitted_at          timestamptz,
    reviewed_by           uuid REFERENCES app_user(id) ON DELETE SET NULL,
    reviewed_at           timestamptz,
    published_at          timestamptz,
    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now(),
    UNIQUE (id, campaign_id),
    CONSTRAINT accountability_campaign_currency_fk
        FOREIGN KEY (campaign_id, currency_code)
        REFERENCES campaign(id, currency_code) ON DELETE RESTRICT,
    CHECK (period_end IS NULL OR period_start IS NULL OR period_end >= period_start),
    CHECK (reviewed_at IS NULL OR submitted_at IS NULL OR reviewed_at >= submitted_at)
);

CREATE TABLE accountability_expense (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id            uuid NOT NULL,
    campaign_id          uuid NOT NULL,
    budget_item_id       uuid REFERENCES budget_item(id) ON DELETE SET NULL,
    expense_category_id  uuid NOT NULL REFERENCES expense_category(id) ON DELETE RESTRICT,
    description          varchar(300) NOT NULL,
    spent_amount         numeric(14,2) NOT NULL CHECK (spent_amount > 0),
    currency_code        char(3) NOT NULL REFERENCES currency(code) ON DELETE RESTRICT,
    spent_on             date,
    supplier             varchar(200),
    receipt_number       varchar(80),
    notes                text,
    created_at           timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT accountability_expense_report_fk
        FOREIGN KEY (report_id, campaign_id)
        REFERENCES accountability_report(id, campaign_id) ON DELETE CASCADE
);

CREATE TABLE accountability_report_evidence (
    report_id    uuid NOT NULL REFERENCES accountability_report(id) ON DELETE CASCADE,
    evidence_id  uuid NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
    PRIMARY KEY (report_id, evidence_id)
);

-- Una tabla de adjuntos con FKs reales, evitando el enlace polimórfico anterior.
CREATE TABLE file_attachment (
    id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id                    uuid NOT NULL REFERENCES file_asset(id) ON DELETE RESTRICT,
    campaign_id                uuid REFERENCES campaign(id) ON DELETE CASCADE,
    campaign_update_id         uuid REFERENCES campaign_update(id) ON DELETE CASCADE,
    evidence_id                uuid REFERENCES evidence(id) ON DELETE CASCADE,
    accountability_expense_id  uuid REFERENCES accountability_expense(id) ON DELETE CASCADE,
    attachment_role            varchar(60),
    caption                    varchar(300),
    display_order              smallint NOT NULL DEFAULT 0,
    created_at                 timestamptz NOT NULL DEFAULT now(),
    CHECK (
        num_nonnulls(
            campaign_id,
            campaign_update_id,
            evidence_id,
            accountability_expense_id
        ) = 1
    )
);

-- ============================================================================
-- 11. PLATAFORMA: FAVORITOS, AUDITORÍA, NOTIFICACIONES Y EVENTOS DE PRODUCTO
-- ============================================================================

CREATE TABLE campaign_bookmark (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    campaign_id  uuid NOT NULL REFERENCES campaign(id) ON DELETE CASCADE,
    kind         bookmark_kind NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, campaign_id, kind)
);

CREATE TABLE audit_log (
    id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actor_user_id  uuid REFERENCES app_user(id) ON DELETE SET NULL,
    actor_role     varchar(60),
    action         audit_action NOT NULL,
    entity_name    varchar(80) NOT NULL,
    entity_id      uuid,
    description    text,
    old_values     jsonb,
    new_values     jsonb,
    ip_address     inet,
    user_agent     text,
    request_id     varchar(80),
    occurred_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE notification (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    event_code   varchar(80) NOT NULL,
    channel      notification_channel NOT NULL DEFAULT 'IN_APP',
    title        varchar(200) NOT NULL,
    body         text,
    entity_name  varchar(80),
    entity_id    uuid,
    payload      jsonb NOT NULL DEFAULT '{}'::jsonb,
    status       notification_status NOT NULL DEFAULT 'PENDING',
    sent_at      timestamptz,
    read_at      timestamptz,
    created_at   timestamptz NOT NULL DEFAULT now()
);

-- Data Foundation: registro de eventos de producto/analytics.
-- No sustituye audit_log: audit_log es trazabilidad de seguridad/operación.
CREATE TABLE product_event (
    id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_name   varchar(120) NOT NULL,
    user_id      uuid REFERENCES app_user(id) ON DELETE SET NULL,
    campaign_id  uuid REFERENCES campaign(id) ON DELETE SET NULL,
    session_id   varchar(120),
    source       varchar(40),
    metadata     jsonb NOT NULL DEFAULT '{}'::jsonb,
    occurred_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 12. FUNCIONES Y TRIGGERS DE INTEGRIDAD
-- ============================================================================

CREATE OR REPLACE FUNCTION brotar_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION brotar_current_actor()
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    raw text;
BEGIN
    raw := current_setting('brotar.actor_id', true);
    IF raw IS NULL OR raw = '' THEN
        RETURN NULL;
    END IF;
    RETURN raw::uuid;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION brotar_log_status_history()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    target_type status_history_entity;
BEGIN
    target_type := TG_ARGV[0]::status_history_entity;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO status_history (
            entity_type, entity_id, from_status, to_status, changed_by
        )
        VALUES (
            target_type, NEW.id, NULL, NEW.status::text, brotar_current_actor()
        );
    ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
        INSERT INTO status_history (
            entity_type, entity_id, from_status, to_status, changed_by
        )
        VALUES (
            target_type, NEW.id, OLD.status::text, NEW.status::text, brotar_current_actor()
        );
    END IF;

    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION brotar_check_campaign_organization()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.organization_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM organization_member om
        WHERE om.organization_id = NEW.organization_id
          AND om.user_id = NEW.creator_user_id
          AND om.left_at IS NULL
          AND om.organization_role IN ('OWNER', 'LEGAL_REPRESENTATIVE', 'ADMIN')
    ) THEN
        RAISE EXCEPTION
            'El creador % no es miembro activo autorizado de la organización %',
            NEW.creator_user_id, NEW.organization_id
            USING ERRCODE = 'integrity_constraint_violation';
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION brotar_check_milestone_activity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.activity_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM campaign_activity ca
        WHERE ca.id = NEW.activity_id
          AND ca.campaign_id = NEW.campaign_id
    ) THEN
        RAISE EXCEPTION
            'El hito y la actividad deben pertenecer a la misma campaña'
            USING ERRCODE = 'integrity_constraint_violation';
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION brotar_check_campaign_update_milestone()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.milestone_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM milestone m
        WHERE m.id = NEW.milestone_id
          AND m.campaign_id = NEW.campaign_id
    ) THEN
        RAISE EXCEPTION
            'La actualización y el hito deben pertenecer a la misma campaña'
            USING ERRCODE = 'integrity_constraint_violation';
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION brotar_check_evidence_milestone()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.milestone_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM milestone m
        WHERE m.id = NEW.milestone_id
          AND m.campaign_id = NEW.campaign_id
    ) THEN
        RAISE EXCEPTION
            'La evidencia y el hito deben pertenecer a la misma campaña'
            USING ERRCODE = 'integrity_constraint_violation';
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION brotar_check_accountability_expense_budget_item()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.budget_item_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM budget_item bi
        WHERE bi.id = NEW.budget_item_id
          AND bi.campaign_id = NEW.campaign_id
    ) THEN
        RAISE EXCEPTION
            'El gasto y el ítem de presupuesto deben pertenecer a la misma campaña'
            USING ERRCODE = 'integrity_constraint_violation';
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION brotar_check_accountability_evidence_campaign()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM accountability_report ar
        JOIN evidence ev ON ev.id = NEW.evidence_id
        WHERE ar.id = NEW.report_id
          AND ev.campaign_id = ar.campaign_id
    ) THEN
        RAISE EXCEPTION
            'La rendición y la evidencia deben pertenecer a la misma campaña'
            USING ERRCODE = 'integrity_constraint_violation';
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION brotar_check_contribution_amount()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    campaign_min numeric(14,2);
    reward_min   numeric(14,2);
BEGIN
    SELECT min_contribution
      INTO campaign_min
      FROM campaign
     WHERE id = NEW.campaign_id;

    IF campaign_min IS NOT NULL AND NEW.amount < campaign_min THEN
        RAISE EXCEPTION
            'El aporte % es menor al mínimo de campaña %',
            NEW.amount, campaign_min
            USING ERRCODE = 'integrity_constraint_violation';
    END IF;

    IF NEW.reward_id IS NOT NULL THEN
        SELECT min_amount
          INTO reward_min
          FROM reward
         WHERE id = NEW.reward_id
           AND campaign_id = NEW.campaign_id;

        IF reward_min IS NULL THEN
            RAISE EXCEPTION
                'La recompensa no pertenece a la campaña'
                USING ERRCODE = 'foreign_key_violation';
        END IF;

        IF NEW.amount < reward_min THEN
            RAISE EXCEPTION
                'El aporte % es menor al mínimo de recompensa %',
                NEW.amount, reward_min
                USING ERRCODE = 'integrity_constraint_violation';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION brotar_check_payment_amount()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    contribution_amount numeric(14,2);
BEGIN
    SELECT amount
      INTO contribution_amount
      FROM contribution
     WHERE id = NEW.contribution_id;

    IF contribution_amount IS NULL THEN
        RAISE EXCEPTION
            'El aporte asociado no existe'
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    IF NEW.amount <> contribution_amount THEN
        RAISE EXCEPTION
            'El pago % debe coincidir con el aporte %',
            NEW.amount, contribution_amount
            USING ERRCODE = 'integrity_constraint_violation';
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION brotar_check_refund_total()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    paid_amount           numeric(14,2);
    payment_confirmed_at  timestamptz;
    refunded_amount       numeric(14,2);
BEGIN
    SELECT amount, confirmed_at
      INTO paid_amount, payment_confirmed_at
      FROM payment
     WHERE id = NEW.payment_id
     FOR UPDATE;

    IF paid_amount IS NULL THEN
        RAISE EXCEPTION
            'El pago asociado no existe'
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    IF payment_confirmed_at IS NULL THEN
        RAISE EXCEPTION
            'No se puede devolver un pago que no fue confirmado'
            USING ERRCODE = 'integrity_constraint_violation';
    END IF;

    SELECT COALESCE(SUM(amount), 0)
      INTO refunded_amount
      FROM refund
     WHERE payment_id = NEW.payment_id
       AND status <> 'FAILED'
       AND id <> NEW.id;

    IF refunded_amount + NEW.amount > paid_amount THEN
        RAISE EXCEPTION
            'Las devoluciones superarían el monto pagado'
            USING ERRCODE = 'integrity_constraint_violation';
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION brotar_check_reward_fulfillment()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    selected_reward uuid;
    contribution_status_value contribution_status;
BEGIN
    SELECT reward_id, status
      INTO selected_reward, contribution_status_value
      FROM contribution
     WHERE id = NEW.contribution_id;

    IF selected_reward IS NULL THEN
        RAISE EXCEPTION
            'No se puede crear cumplimiento de recompensa para un aporte sin recompensa'
            USING ERRCODE = 'integrity_constraint_violation';
    END IF;

    IF contribution_status_value IS DISTINCT FROM 'CONFIRMED' THEN
        RAISE EXCEPTION
            'No se puede crear cumplimiento de recompensa para un aporte que no está confirmado'
            USING ERRCODE = 'integrity_constraint_violation';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM payment
         WHERE contribution_id = NEW.contribution_id
           AND confirmed_at IS NOT NULL
    ) THEN
        RAISE EXCEPTION
            'No se puede crear cumplimiento de recompensa sin un pago confirmado para ese aporte'
            USING ERRCODE = 'integrity_constraint_violation';
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION brotar_check_verification_subject()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    type_applies_to party_type;
BEGIN
    SELECT applies_to INTO type_applies_to
      FROM verification_type
     WHERE id = NEW.verification_type_id;

    IF type_applies_to = 'USER' AND NEW.user_id IS NULL THEN
        RAISE EXCEPTION
            'El tipo de verificación aplica a USER, pero la verificación no tiene user_id'
            USING ERRCODE = 'integrity_constraint_violation';
    END IF;

    IF type_applies_to = 'ORGANIZATION' AND NEW.organization_id IS NULL THEN
        RAISE EXCEPTION
            'El tipo de verificación aplica a ORGANIZATION, pero la verificación no tiene organization_id'
            USING ERRCODE = 'integrity_constraint_violation';
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION brotar_check_verification_document_type()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    type_applies_to    party_type;
    verification_user  uuid;
    verification_org   uuid;
BEGIN
    SELECT applies_to INTO type_applies_to
      FROM document_type
     WHERE id = NEW.document_type_id;

    SELECT user_id, organization_id INTO verification_user, verification_org
      FROM verification
     WHERE id = NEW.verification_id;

    IF type_applies_to = 'USER' AND verification_user IS NULL THEN
        RAISE EXCEPTION
            'El tipo de documento aplica a USER, pero la verificación asociada es de una organización'
            USING ERRCODE = 'integrity_constraint_violation';
    END IF;

    IF type_applies_to = 'ORGANIZATION' AND verification_org IS NULL THEN
        RAISE EXCEPTION
            'El tipo de documento aplica a ORGANIZATION, pero la verificación asociada es de una persona'
            USING ERRCODE = 'integrity_constraint_violation';
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION brotar_check_disbursement_beneficiary()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    account_user uuid;
    account_org  uuid;
BEGIN
    SELECT user_id, organization_id
      INTO account_user, account_org
      FROM payout_account
     WHERE id = NEW.payout_account_id
       AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'La cuenta de destino indicada no existe o fue eliminada'
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    IF NEW.beneficiary_user_id IS NOT NULL THEN
        IF account_user IS DISTINCT FROM NEW.beneficiary_user_id THEN
            RAISE EXCEPTION
                'La cuenta de destino no pertenece al beneficiario indicado'
                USING ERRCODE = 'integrity_constraint_violation';
        END IF;
    ELSE
        IF account_org IS DISTINCT FROM NEW.beneficiary_org_id THEN
            RAISE EXCEPTION
                'La cuenta de destino no pertenece a la organización beneficiaria'
                USING ERRCODE = 'integrity_constraint_violation';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- updated_at
CREATE TRIGGER app_user_set_updated_at
BEFORE UPDATE ON app_user
FOR EACH ROW EXECUTE FUNCTION brotar_set_updated_at();

CREATE TRIGGER user_profile_set_updated_at
BEFORE UPDATE ON user_profile
FOR EACH ROW EXECUTE FUNCTION brotar_set_updated_at();

CREATE TRIGGER category_set_updated_at
BEFORE UPDATE ON category
FOR EACH ROW EXECUTE FUNCTION brotar_set_updated_at();

CREATE TRIGGER payment_provider_set_updated_at
BEFORE UPDATE ON payment_provider
FOR EACH ROW EXECUTE FUNCTION brotar_set_updated_at();

CREATE TRIGGER organization_set_updated_at
BEFORE UPDATE ON organization
FOR EACH ROW EXECUTE FUNCTION brotar_set_updated_at();

CREATE TRIGGER verification_set_updated_at
BEFORE UPDATE ON verification
FOR EACH ROW EXECUTE FUNCTION brotar_set_updated_at();

CREATE TRIGGER payout_account_set_updated_at
BEFORE UPDATE ON payout_account
FOR EACH ROW EXECUTE FUNCTION brotar_set_updated_at();

CREATE TRIGGER campaign_set_updated_at
BEFORE UPDATE ON campaign
FOR EACH ROW EXECUTE FUNCTION brotar_set_updated_at();

CREATE TRIGGER campaign_story_set_updated_at
BEFORE UPDATE ON campaign_story
FOR EACH ROW EXECUTE FUNCTION brotar_set_updated_at();

CREATE TRIGGER campaign_activity_set_updated_at
BEFORE UPDATE ON campaign_activity
FOR EACH ROW EXECUTE FUNCTION brotar_set_updated_at();

CREATE TRIGGER milestone_set_updated_at
BEFORE UPDATE ON milestone
FOR EACH ROW EXECUTE FUNCTION brotar_set_updated_at();

CREATE TRIGGER reward_set_updated_at
BEFORE UPDATE ON reward
FOR EACH ROW EXECUTE FUNCTION brotar_set_updated_at();

CREATE TRIGGER contribution_set_updated_at
BEFORE UPDATE ON contribution
FOR EACH ROW EXECUTE FUNCTION brotar_set_updated_at();

CREATE TRIGGER payment_set_updated_at
BEFORE UPDATE ON payment
FOR EACH ROW EXECUTE FUNCTION brotar_set_updated_at();

CREATE TRIGGER reward_fulfillment_set_updated_at
BEFORE UPDATE ON reward_fulfillment
FOR EACH ROW EXECUTE FUNCTION brotar_set_updated_at();

CREATE TRIGGER support_case_set_updated_at
BEFORE UPDATE ON support_case
FOR EACH ROW EXECUTE FUNCTION brotar_set_updated_at();

CREATE TRIGGER dispute_set_updated_at
BEFORE UPDATE ON dispute
FOR EACH ROW EXECUTE FUNCTION brotar_set_updated_at();

CREATE TRIGGER disbursement_set_updated_at
BEFORE UPDATE ON disbursement
FOR EACH ROW EXECUTE FUNCTION brotar_set_updated_at();

CREATE TRIGGER campaign_update_set_updated_at
BEFORE UPDATE ON campaign_update
FOR EACH ROW EXECUTE FUNCTION brotar_set_updated_at();

CREATE TRIGGER accountability_report_set_updated_at
BEFORE UPDATE ON accountability_report
FOR EACH ROW EXECUTE FUNCTION brotar_set_updated_at();

-- reglas de integridad
CREATE TRIGGER campaign_check_organization
BEFORE INSERT OR UPDATE OF organization_id, creator_user_id
ON campaign
FOR EACH ROW EXECUTE FUNCTION brotar_check_campaign_organization();

CREATE TRIGGER milestone_check_activity
BEFORE INSERT OR UPDATE OF activity_id, campaign_id
ON milestone
FOR EACH ROW EXECUTE FUNCTION brotar_check_milestone_activity();

CREATE TRIGGER verification_check_subject
BEFORE INSERT OR UPDATE OF verification_type_id, user_id, organization_id
ON verification
FOR EACH ROW EXECUTE FUNCTION brotar_check_verification_subject();

CREATE TRIGGER verification_document_check_type
BEFORE INSERT OR UPDATE OF document_type_id, verification_id
ON verification_document
FOR EACH ROW EXECUTE FUNCTION brotar_check_verification_document_type();

CREATE TRIGGER campaign_update_check_milestone
BEFORE INSERT OR UPDATE OF milestone_id, campaign_id
ON campaign_update
FOR EACH ROW EXECUTE FUNCTION brotar_check_campaign_update_milestone();

CREATE TRIGGER evidence_check_milestone
BEFORE INSERT OR UPDATE OF milestone_id, campaign_id
ON evidence
FOR EACH ROW EXECUTE FUNCTION brotar_check_evidence_milestone();

CREATE TRIGGER accountability_expense_check_budget_item
BEFORE INSERT OR UPDATE OF budget_item_id, campaign_id
ON accountability_expense
FOR EACH ROW EXECUTE FUNCTION brotar_check_accountability_expense_budget_item();

CREATE TRIGGER accountability_report_evidence_check_campaign
BEFORE INSERT OR UPDATE OF report_id, evidence_id
ON accountability_report_evidence
FOR EACH ROW EXECUTE FUNCTION brotar_check_accountability_evidence_campaign();

CREATE TRIGGER contribution_check_amount
BEFORE INSERT OR UPDATE OF amount, reward_id, campaign_id
ON contribution
FOR EACH ROW EXECUTE FUNCTION brotar_check_contribution_amount();

CREATE TRIGGER payment_check_amount
BEFORE INSERT OR UPDATE OF amount, contribution_id
ON payment
FOR EACH ROW EXECUTE FUNCTION brotar_check_payment_amount();

CREATE TRIGGER refund_check_total
BEFORE INSERT OR UPDATE OF amount, status, payment_id
ON refund
FOR EACH ROW EXECUTE FUNCTION brotar_check_refund_total();

CREATE TRIGGER reward_fulfillment_check
BEFORE INSERT OR UPDATE OF contribution_id
ON reward_fulfillment
FOR EACH ROW EXECUTE FUNCTION brotar_check_reward_fulfillment();

CREATE TRIGGER disbursement_check_beneficiary
BEFORE INSERT OR UPDATE OF payout_account_id, beneficiary_user_id, beneficiary_org_id
ON disbursement
FOR EACH ROW EXECUTE FUNCTION brotar_check_disbursement_beneficiary();

-- historial de estados
CREATE TRIGGER campaign_log_status
AFTER INSERT OR UPDATE OF status ON campaign
FOR EACH ROW EXECUTE FUNCTION brotar_log_status_history('CAMPAIGN');

CREATE TRIGGER verification_log_status
AFTER INSERT OR UPDATE OF status ON verification
FOR EACH ROW EXECUTE FUNCTION brotar_log_status_history('VERIFICATION');

CREATE TRIGGER payment_log_status
AFTER INSERT OR UPDATE OF status ON payment
FOR EACH ROW EXECUTE FUNCTION brotar_log_status_history('PAYMENT');

CREATE TRIGGER refund_log_status
AFTER INSERT OR UPDATE OF status ON refund
FOR EACH ROW EXECUTE FUNCTION brotar_log_status_history('REFUND');

CREATE TRIGGER dispute_log_status
AFTER INSERT OR UPDATE OF status ON dispute
FOR EACH ROW EXECUTE FUNCTION brotar_log_status_history('DISPUTE');

CREATE TRIGGER disbursement_log_status
AFTER INSERT OR UPDATE OF status ON disbursement
FOR EACH ROW EXECUTE FUNCTION brotar_log_status_history('DISBURSEMENT');

CREATE TRIGGER reward_fulfillment_log_status
AFTER INSERT OR UPDATE OF status ON reward_fulfillment
FOR EACH ROW EXECUTE FUNCTION brotar_log_status_history('REWARD_FULFILLMENT');

-- ============================================================================
-- 13. ÍNDICES
-- ============================================================================

CREATE INDEX administrative_area_country_idx
    ON administrative_area(country_code, level);

CREATE INDEX app_user_status_idx
    ON app_user(status)
    WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX app_user_email_uq
    ON app_user(email)
    WHERE deleted_at IS NULL;

CREATE INDEX organization_status_idx
    ON organization(status)
    WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX organization_slug_uq
    ON organization(slug)
    WHERE deleted_at IS NULL;

CREATE INDEX organization_name_trgm_idx
    ON organization USING gin (legal_name gin_trgm_ops);

CREATE INDEX verification_user_idx
    ON verification(user_id, status)
    WHERE user_id IS NOT NULL;

CREATE INDEX verification_org_idx
    ON verification(organization_id, status)
    WHERE organization_id IS NOT NULL;

CREATE INDEX payout_account_user_idx
    ON payout_account(user_id, status)
    WHERE user_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX payout_account_org_idx
    ON payout_account(organization_id, status)
    WHERE organization_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX campaign_status_idx
    ON campaign(status)
    WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX campaign_slug_uq
    ON campaign(slug)
    WHERE deleted_at IS NULL;

CREATE INDEX campaign_category_idx
    ON campaign(category_id, status)
    WHERE deleted_at IS NULL;

CREATE INDEX campaign_creator_idx
    ON campaign(creator_user_id, status)
    WHERE deleted_at IS NULL;

CREATE INDEX campaign_organization_idx
    ON campaign(organization_id, status)
    WHERE organization_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX campaign_type_idx
    ON campaign(campaign_type, status)
    WHERE deleted_at IS NULL;

CREATE INDEX campaign_published_idx
    ON campaign(published_at DESC)
    WHERE status = 'PUBLISHED' AND deleted_at IS NULL;

CREATE INDEX campaign_title_trgm_idx
    ON campaign USING gin (title gin_trgm_ops);

CREATE INDEX campaign_summary_trgm_idx
    ON campaign USING gin (summary gin_trgm_ops);

CREATE INDEX campaign_activity_campaign_idx
    ON campaign_activity(campaign_id, status);

CREATE INDEX milestone_campaign_idx
    ON milestone(campaign_id, status);

CREATE INDEX reward_campaign_idx
    ON reward(campaign_id, is_active);

CREATE INDEX campaign_review_campaign_idx
    ON campaign_review(campaign_id, round DESC);

CREATE INDEX campaign_review_observation_review_idx
    ON campaign_review_observation(review_id, status);

CREATE INDEX contribution_campaign_idx
    ON contribution(campaign_id, status, created_at DESC);

CREATE INDEX contribution_user_idx
    ON contribution(user_id, created_at DESC);

CREATE INDEX payment_contribution_idx
    ON payment(contribution_id, attempt_number DESC);

CREATE INDEX payment_status_idx
    ON payment(status, created_at DESC);

CREATE INDEX payment_external_reference_idx
    ON payment(external_reference)
    WHERE external_reference IS NOT NULL;

CREATE INDEX payment_event_payment_idx
    ON payment_event(payment_id, occurred_at DESC);

CREATE INDEX refund_payment_idx
    ON refund(payment_id, status);

CREATE INDEX reward_fulfillment_status_idx
    ON reward_fulfillment(status, created_at);

CREATE INDEX support_case_user_idx
    ON support_case(user_id, status)
    WHERE user_id IS NOT NULL;

CREATE INDEX support_case_status_idx
    ON support_case(status, priority, created_at);

CREATE INDEX dispute_status_idx
    ON dispute(status, opened_at);

CREATE INDEX disbursement_campaign_idx
    ON disbursement(campaign_id, status);

CREATE INDEX reconciliation_provider_period_idx
    ON reconciliation(provider_id, period_start, period_end);

CREATE INDEX campaign_update_campaign_idx
    ON campaign_update(campaign_id, published_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX evidence_campaign_idx
    ON evidence(campaign_id, recorded_on DESC);

CREATE INDEX accountability_report_campaign_idx
    ON accountability_report(campaign_id, created_at DESC);

CREATE INDEX accountability_expense_report_idx
    ON accountability_expense(report_id, spent_on);

CREATE INDEX file_attachment_campaign_idx
    ON file_attachment(campaign_id)
    WHERE campaign_id IS NOT NULL;

CREATE INDEX file_attachment_update_idx
    ON file_attachment(campaign_update_id)
    WHERE campaign_update_id IS NOT NULL;

CREATE INDEX file_attachment_evidence_idx
    ON file_attachment(evidence_id)
    WHERE evidence_id IS NOT NULL;

CREATE INDEX status_history_entity_idx
    ON status_history(entity_type, entity_id, changed_at DESC);

CREATE INDEX audit_log_entity_idx
    ON audit_log(entity_name, entity_id, occurred_at DESC);

CREATE INDEX audit_log_actor_idx
    ON audit_log(actor_user_id, occurred_at DESC)
    WHERE actor_user_id IS NOT NULL;

CREATE INDEX notification_user_idx
    ON notification(user_id, status, created_at DESC);

CREATE INDEX product_event_event_idx
    ON product_event(event_name, occurred_at DESC);

CREATE INDEX product_event_user_idx
    ON product_event(user_id, occurred_at DESC)
    WHERE user_id IS NOT NULL;

CREATE INDEX product_event_campaign_idx
    ON product_event(campaign_id, occurred_at DESC)
    WHERE campaign_id IS NOT NULL;

CREATE INDEX trust_assessment_user_idx
    ON trust_assessment(user_id, trust_level DESC, assessed_at DESC)
    WHERE user_id IS NOT NULL AND revoked_at IS NULL;

CREATE INDEX trust_assessment_org_idx
    ON trust_assessment(organization_id, trust_level DESC, assessed_at DESC)
    WHERE organization_id IS NOT NULL AND revoked_at IS NULL;

CREATE INDEX trust_assessment_campaign_idx
    ON trust_assessment(campaign_id, trust_level DESC, assessed_at DESC)
    WHERE campaign_id IS NOT NULL AND revoked_at IS NULL;

-- ============================================================================
-- 14. VISTAS
-- ============================================================================

-- Financiamiento neto:
--   suma todo pago que alguna vez fue confirmado (confirmed_at),
--   y descuenta devoluciones completadas.
CREATE VIEW v_campaign_funding AS
WITH confirmed_payments AS (
    SELECT
        c.campaign_id,
        COALESCE(SUM(p.amount), 0)::numeric(16,2) AS gross_confirmed
    FROM contribution c
    JOIN payment p ON p.contribution_id = c.id
    WHERE p.confirmed_at IS NOT NULL
    GROUP BY c.campaign_id
),
completed_refunds AS (
    SELECT
        c.campaign_id,
        COALESCE(SUM(r.amount), 0)::numeric(16,2) AS refunded_amount
    FROM contribution c
    JOIN refund r ON r.contribution_id = c.id
    WHERE r.status = 'REFUNDED'
    GROUP BY c.campaign_id
)
SELECT
    ca.id AS campaign_id,
    ca.goal_amount,
    ca.currency_code,
    GREATEST(
        COALESCE(cp.gross_confirmed, 0) - COALESCE(cr.refunded_amount, 0),
        0
    )::numeric(16,2) AS amount_raised,
    CASE
        WHEN ca.goal_amount > 0 THEN
            ROUND(
                (
                    GREATEST(
                        COALESCE(cp.gross_confirmed, 0) - COALESCE(cr.refunded_amount, 0),
                        0
                    ) / ca.goal_amount
                ) * 100,
                2
            )
        ELSE 0
    END AS funding_percent
FROM campaign ca
LEFT JOIN confirmed_payments cp ON cp.campaign_id = ca.id
LEFT JOIN completed_refunds cr ON cr.campaign_id = ca.id;

CREATE VIEW v_reward_availability AS
SELECT
    r.id AS reward_id,
    r.campaign_id,
    r.title,
    r.quantity_total,
    COUNT(c.id) FILTER (
        WHERE EXISTS (
            SELECT 1 FROM payment p
             WHERE p.contribution_id = c.id AND p.confirmed_at IS NOT NULL
        )
    )::integer AS quantity_claimed,
    CASE
        WHEN r.quantity_total IS NULL THEN NULL
        ELSE GREATEST(
            r.quantity_total - COUNT(c.id) FILTER (
                WHERE EXISTS (
                    SELECT 1 FROM payment p
                     WHERE p.contribution_id = c.id AND p.confirmed_at IS NOT NULL
                )
            )::integer,
            0
        )
    END AS quantity_available
FROM reward r
LEFT JOIN contribution c
    ON c.reward_id = r.id
GROUP BY r.id, r.campaign_id, r.title, r.quantity_total;

CREATE VIEW v_budget_execution AS
SELECT
    bi.id AS budget_item_id,
    bi.campaign_id,
    bi.description,
    bi.planned_amount,
    COALESCE(SUM(ae.spent_amount), 0)::numeric(16,2) AS executed_amount,
    (bi.planned_amount - COALESCE(SUM(ae.spent_amount), 0))::numeric(16,2) AS variance
FROM budget_item bi
LEFT JOIN accountability_expense ae
    ON ae.budget_item_id = bi.id
GROUP BY bi.id, bi.campaign_id, bi.description, bi.planned_amount;

-- Último nivel de confianza vigente registrado por sujeto.
CREATE VIEW v_current_trust_assessment AS
SELECT DISTINCT ON (subject_kind, subject_id)
    subject_kind,
    subject_id,
    trust_level,
    rationale,
    assessed_at,
    expires_at
FROM (
    SELECT
        'USER'::text AS subject_kind,
        user_id AS subject_id,
        trust_level,
        rationale,
        assessed_at,
        expires_at
    FROM trust_assessment
    WHERE user_id IS NOT NULL
      AND revoked_at IS NULL
      AND (expires_at IS NULL OR expires_at > now())

    UNION ALL

    SELECT
        'ORGANIZATION'::text,
        organization_id,
        trust_level,
        rationale,
        assessed_at,
        expires_at
    FROM trust_assessment
    WHERE organization_id IS NOT NULL
      AND revoked_at IS NULL
      AND (expires_at IS NULL OR expires_at > now())

    UNION ALL

    SELECT
        'CAMPAIGN'::text,
        campaign_id,
        trust_level,
        rationale,
        assessed_at,
        expires_at
    FROM trust_assessment
    WHERE campaign_id IS NOT NULL
      AND revoked_at IS NULL
      AND (expires_at IS NULL OR expires_at > now())
) x
ORDER BY subject_kind, subject_id, assessed_at DESC;

-- Métricas de reputación derivadas de hechos verificables.
-- No genera una "estrella" ni un score subjetivo.
CREATE VIEW v_creator_reputation_metrics AS
WITH creator_campaigns AS (
    SELECT
        creator_user_id,
        COUNT(*) FILTER (WHERE status IN ('PUBLISHED','FUNDING_ENDED','IN_EXECUTION','CLOSED')) AS campaigns_published,
        COUNT(*) FILTER (WHERE status = 'CLOSED') AS projects_closed
    FROM campaign
    WHERE deleted_at IS NULL
    GROUP BY creator_user_id
),
creator_disputes AS (
    SELECT
        ca.creator_user_id,
        COUNT(d.id) FILTER (WHERE d.status NOT IN ('RESOLVED','CLOSED')) AS open_disputes
    FROM campaign ca
    LEFT JOIN dispute d ON d.campaign_id = ca.id
    GROUP BY ca.creator_user_id
),
creator_reports AS (
    SELECT
        ca.creator_user_id,
        COUNT(DISTINCT ar.campaign_id) FILTER (WHERE ar.status = 'PUBLISHED') AS campaigns_with_published_accountability
    FROM campaign ca
    LEFT JOIN accountability_report ar ON ar.campaign_id = ca.id
    GROUP BY ca.creator_user_id
),
creator_rewards AS (
    SELECT
        ca.creator_user_id,
        COUNT(co.id) AS reward_commitments,
        COUNT(rf.id) FILTER (WHERE rf.status = 'FULFILLED') AS rewards_fulfilled
    FROM campaign ca
    LEFT JOIN contribution co ON co.campaign_id = ca.id AND co.reward_id IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM payment p
             WHERE p.contribution_id = co.id AND p.confirmed_at IS NOT NULL
        )
    LEFT JOIN reward_fulfillment rf ON rf.contribution_id = co.id
    GROUP BY ca.creator_user_id
)
SELECT
    u.id AS creator_user_id,
    COALESCE(cc.campaigns_published, 0) AS campaigns_published,
    COALESCE(cc.projects_closed, 0) AS projects_closed,
    COALESCE(cd.open_disputes, 0) AS open_disputes,
    COALESCE(cr.campaigns_with_published_accountability, 0) AS campaigns_with_published_accountability,
    COALESCE(cw.reward_commitments, 0) AS reward_commitments,
    COALESCE(cw.rewards_fulfilled, 0) AS rewards_fulfilled,
    CASE
        WHEN COALESCE(cw.reward_commitments, 0) = 0 THEN NULL
        ELSE ROUND(
            (cw.rewards_fulfilled::numeric / cw.reward_commitments::numeric) * 100,
            2
        )
    END AS reward_fulfillment_percent
FROM app_user u
LEFT JOIN creator_campaigns cc ON cc.creator_user_id = u.id
LEFT JOIN creator_disputes cd ON cd.creator_user_id = u.id
LEFT JOIN creator_reports cr ON cr.creator_user_id = u.id
LEFT JOIN creator_rewards cw ON cw.creator_user_id = u.id;

-- ============================================================================
-- 15. CATÁLOGOS ESTRUCTURALES MÍNIMOS
--     NO SON DATOS DE PRUEBA
-- ============================================================================

INSERT INTO currency (code, name, symbol, decimal_digits, is_active)
VALUES ('BOB', 'Boliviano', 'Bs', 2, true);

INSERT INTO country (code, code_alpha3, name, is_active)
VALUES ('BO', 'BOL', 'Bolivia', true);

-- Niveles exactamente alineados al documento funcional.
INSERT INTO trust_level (level, name, description) VALUES
(1, 'Contacto verificado', 'Correo y teléfono verificados.'),
(2, 'Identidad verificada', 'Identidad de la persona verificada.'),
(3, 'Cuenta de destino verificada', 'Cuenta de destino validada.'),
(4, 'Proyecto y documentación revisados', 'Proyecto y documentación revisados por la plataforma.'),
(5, 'Organización o historial verificado', 'Organización o institución verificada y/o historial positivo basado en hechos verificables.');

-- Tipos generales respaldados por el documento; se evita inventar subtipos.
INSERT INTO organization_type (code, name) VALUES
('COMPANY', 'Empresa'),
('NGO', 'ONG'),
('FOUNDATION', 'Fundación'),
('OTHER', 'Otra organización');

-- Roles estructurales del sistema.
INSERT INTO role (code, name, description, is_internal, is_system) VALUES
('REGISTERED_USER', 'Usuario registrado', 'Usuario con cuenta activa en la plataforma.', false, true),
('SPONSOR', 'Patrocinador / aportante', 'Usuario que realiza y consulta aportes.', false, true),
('CREATOR', 'Creador', 'Persona que prepara y administra campañas.', false, true),
('REVIEWER', 'Revisor', 'Revisa campañas y registra observaciones.', true, true),
('COMPLIANCE', 'Compliance', 'Gestiona verificaciones KYC/KYB.', true, true),
('FINANCE', 'Finanzas', 'Gestiona operaciones financieras, conciliación, devoluciones y desembolsos.', true, true),
('SUPPORT', 'Soporte', 'Gestiona consultas, incidencias y casos.', true, true),
('ADMIN', 'Administrador', 'Administra configuración y gobierno de la plataforma.', true, true),
('AUDITOR', 'Auditor', 'Acceso de consulta y auditoría sin modificación de información.', true, true);

-- Tipos de verificación generales. Los documentos exactos permanecen pendientes.
INSERT INTO verification_type
(code, name, description, applies_to, requires_documents, requires_manual_review, validity_days, is_active)
VALUES
('EMAIL', 'Verificación de correo', 'Confirma el correo electrónico de una persona.', 'USER', false, false, NULL, true),
('PHONE', 'Verificación de teléfono', 'Confirma el teléfono de una persona.', 'USER', false, false, NULL, true),
('KYC_IDENTITY', 'Verificación de identidad', 'Proceso KYC para persona natural.', 'USER', true, true, NULL, true),
('PAYOUT_ACCOUNT', 'Verificación de cuenta de destino', 'Verificación de una cuenta de destino de persona natural.', 'USER', true, true, NULL, true),
('KYB_LEGAL', 'Verificación legal de organización', 'Proceso KYB sobre información legal de una organización.', 'ORGANIZATION', true, true, NULL, true),
('KYB_REPRESENTATIVE', 'Verificación de representante', 'Verificación del representante de una organización.', 'ORGANIZATION', true, true, NULL, true),
('ORG_PAYOUT_ACCOUNT', 'Verificación de cuenta institucional', 'Verificación de una cuenta de destino institucional.', 'ORGANIZATION', true, true, NULL, true);

-- Categorías de gasto referenciales explícitas en el documento.
INSERT INTO expense_category (code, name, display_order) VALUES
('MATERIALS', 'Materiales', 10),
('PRODUCTION', 'Producción', 20),
('PERSONNEL', 'Personal', 30),
('REWARDS', 'Recompensas', 40),
('LOGISTICS', 'Logística', 50),
('COMMUNICATION', 'Comunicación', 60),
('OTHER', 'Otros', 70);

COMMIT;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
