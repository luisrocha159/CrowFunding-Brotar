import { Module } from '@nestjs/common'
import { HealthModule } from './health/health.module'
import { UsersModule } from './users/users.module'
import { AuthModule } from './auth/auth.module'
import { ProfilesModule } from './profiles/profiles.module'
import { OrganizationsModule } from './organizations/organizations.module'

@Module({ imports: [HealthModule, UsersModule, AuthModule, ProfilesModule, OrganizationsModule] })
export class AppModule {}
