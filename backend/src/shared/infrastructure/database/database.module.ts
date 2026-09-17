import { Module } from '@nestjs/common'
import { readDatabaseConfig } from './database.config'
import { DATABASE_CONFIG, DatabaseService } from './database.service'

@Module({
  providers: [
    { provide: DATABASE_CONFIG, useFactory: () => readDatabaseConfig(process.env) },
    DatabaseService
  ],
  exports: [DatabaseService]
})
export class DatabaseModule {}
