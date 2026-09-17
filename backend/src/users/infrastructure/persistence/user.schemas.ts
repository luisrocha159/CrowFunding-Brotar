import { EntitySchema } from 'typeorm'

export interface UserRecord {
  id: string
  email: string
  passwordHash: string
  status: 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'CLOSED'
  emailVerifiedAt: Date | null
  phoneCountryCode: string | null
  phoneNumber: string | null
  phoneVerifiedAt: Date | null
  lastLoginAt: Date | null
  failedLoginCount: number
  lockedUntil: Date | null
  acceptedTermsAt: Date | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export const UserSchema = new EntitySchema<UserRecord>({
  name: 'AppUser', tableName: 'app_user', schema: 'public',
  columns: {
    id: { type: 'uuid', primary: true, default: () => 'gen_random_uuid()' },
    email: { type: 'citext' },
    passwordHash: { name: 'password_hash', type: 'text', select: false },
    status: { type: 'enum', enumName: 'user_status', enum: ['PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'CLOSED'], default: 'PENDING_VERIFICATION' },
    emailVerifiedAt: { name: 'email_verified_at', type: 'timestamptz', nullable: true },
    phoneCountryCode: { name: 'phone_country_code', type: 'varchar', length: 6, nullable: true },
    phoneNumber: { name: 'phone_number', type: 'varchar', length: 30, nullable: true },
    phoneVerifiedAt: { name: 'phone_verified_at', type: 'timestamptz', nullable: true },
    lastLoginAt: { name: 'last_login_at', type: 'timestamptz', nullable: true },
    failedLoginCount: { name: 'failed_login_count', type: 'smallint', default: 0 },
    lockedUntil: { name: 'locked_until', type: 'timestamptz', nullable: true },
    acceptedTermsAt: { name: 'accepted_terms_at', type: 'timestamptz', nullable: true },
    createdAt: { name: 'created_at', type: 'timestamptz', default: () => 'now()' },
    updatedAt: { name: 'updated_at', type: 'timestamptz', default: () => 'now()' },
    deletedAt: { name: 'deleted_at', type: 'timestamptz', nullable: true }
  }
})

export interface UserProfileRecord {
  userId: string
  firstName: string
  lastName: string
  displayName: string | null
  bio: string | null
  birthDate: string | null
  countryCode: string | null
  administrativeAreaId: string | null
  city: string | null
  avatarFileId: string | null
  websiteUrl: string | null
  preferredLanguage: string
  preferredCurrency: string | null
  createdAt: Date
  updatedAt: Date
}

export const UserProfileSchema = new EntitySchema<UserProfileRecord>({
  name: 'UserProfile', tableName: 'user_profile', schema: 'public',
  columns: {
    userId: { name: 'user_id', type: 'uuid', primary: true },
    firstName: { name: 'first_name', type: 'varchar', length: 120 },
    lastName: { name: 'last_name', type: 'varchar', length: 120 },
    displayName: { name: 'display_name', type: 'varchar', length: 160, nullable: true },
    bio: { type: 'text', nullable: true },
    birthDate: { name: 'birth_date', type: 'date', nullable: true },
    countryCode: { name: 'country_code', type: 'char', length: 2, nullable: true },
    administrativeAreaId: { name: 'administrative_area_id', type: 'uuid', nullable: true },
    city: { type: 'varchar', length: 120, nullable: true },
    avatarFileId: { name: 'avatar_file_id', type: 'uuid', nullable: true },
    websiteUrl: { name: 'website_url', type: 'text', nullable: true },
    preferredLanguage: { name: 'preferred_language', type: 'varchar', length: 10, default: 'es' },
    preferredCurrency: { name: 'preferred_currency', type: 'char', length: 3, nullable: true },
    createdAt: { name: 'created_at', type: 'timestamptz', default: () => 'now()' },
    updatedAt: { name: 'updated_at', type: 'timestamptz', default: () => 'now()' }
  }
})
