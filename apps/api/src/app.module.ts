import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AnalyticsController } from './analytics/analytics.controller';
import { AuthController } from './auth/auth.controller';
import { JwtAuthGuard } from './auth/jwt.guard';
import { ClientsController, VehiclesController } from './clients/clients.controller';
import { ClientsService } from './clients/clients.service';
import { ConstructorController } from './constructor/constructor.controller';
import { PricingService } from './constructor/pricing.service';
import { DocumentsController } from './documents/documents.controller';
import { DocumentsService } from './documents/documents.service';
import { ExportController } from './export/export.controller';
import { HealthController } from './health.controller';
import { NotificationsController } from './notifications/notifications.controller';
import { OrdersController } from './orders/orders.controller';
import { OrdersService } from './orders/orders.service';
import { PhotosController } from './photos.controller';
import { PrismaModule } from './prisma/prisma.module';
import { SeedService } from './seed/seed.service';
import { TeamController } from './team/team.controller';
import { CatalogController, WorkshopController } from './workshop/workshop.controller';
import { WorkshopService } from './workshop/workshop.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'pdrforge-dev-secret-change-me'),
        signOptions: { expiresIn: '30d' },
      }),
    }),
    PrismaModule,
  ],
  controllers: [
    HealthController,
    AuthController,
    WorkshopController,
    CatalogController,
    ClientsController,
    VehiclesController,
    OrdersController,
    ConstructorController,
    TeamController,
    AnalyticsController,
    NotificationsController,
    DocumentsController,
    ExportController,
    PhotosController,
  ],
  providers: [
    SeedService,
    WorkshopService,
    ClientsService,
    PricingService,
    OrdersService,
    DocumentsService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
