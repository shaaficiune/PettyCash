import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CompaniesModule } from './companies/companies.module';
import { RequestsModule } from './requests/requests.module';
import { PaymentsModule } from './payments/payments.module';
import { SettlementsModule } from './settlements/settlements.module';
import { ReportsModule } from './reports/reports.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { StorageModule } from './storage/storage.module';
import { FundsModule } from './funds/funds.module';
import { AuditLogInterceptor } from './common/audit-log.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 120,
    }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    CompaniesModule,
    RequestsModule,
    PaymentsModule,
    SettlementsModule,
    ReportsModule,
    NotificationsModule,
    AttachmentsModule,
    StorageModule,
    FundsModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
