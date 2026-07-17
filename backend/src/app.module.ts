import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppThrottlerGuard } from './common/guards/app-throttler.guard';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './storage/storage.module';
import { DocumentsModule } from './documents/documents.module';
import { MailModule } from './mail/mail.module';
import { SmsModule } from './sms/sms.module';
import { LeadsModule } from './leads/leads.module';
import { TelegramModule } from './telegram/telegram.module';
import { DidoxModule } from './didox/didox.module';
import { DeliveryModule } from './delivery/delivery.module';
import { ConsultingModule } from './consulting/consulting.module';
import { PaymentsModule } from './payments/payments.module';
import { SyncModule } from './sync/sync.module';
import { EimzoModule } from './eimzo/eimzo.module';
import { FavoritesModule } from './favorites/favorites.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { OffersModule } from './offers/offers.module';
import { ImportModule } from './import/import.module';
import { FinancingModule } from './financing/financing.module';
import { RfqModule } from './rfq/rfq.module';
import { BrandsModule } from './brands/brands.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { ContractPricesModule } from './contract-prices/contract-prices.module';
import { MarketModule } from './market/market.module';
import { PushModule } from './push/push.module';
import { AlertsModule } from './alerts/alerts.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { OrdersModule } from './orders/orders.module';
import { VetpointsModule } from './vetpoints/vetpoints.module';
import { ReviewsModule } from './reviews/reviews.module';
import { PromotionsModule } from './promotions/promotions.module';
import { BlogModule } from './blog/blog.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Общий потолок частоты запросов. Без него пароль можно было подбирать
    // бесконечно: 12 неверных попыток подряд получали 401 и ни одного отказа.
    // Строгий лимит на вход/регистрацию задаётся точечно в AuthController.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    StorageModule,
    DocumentsModule,
    SmsModule,
    MailModule,
    LeadsModule,
    TelegramModule,
    DidoxModule,
    DeliveryModule,
    ConsultingModule,
    PaymentsModule,
    SyncModule,
    EimzoModule,
    FavoritesModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    ProductsModule,
    OffersModule,
    ImportModule,
    FinancingModule,
    RfqModule,
    BrandsModule,
    OrganizationsModule,
    SubscriptionsModule,
    ContractPricesModule,
    MarketModule,
    PushModule,
    AlertsModule,
    MaintenanceModule,
    OrdersModule,
    VetpointsModule,
    ReviewsModule,
    PromotionsModule,
    BlogModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [{ provide: APP_GUARD, useClass: AppThrottlerGuard }],
})
export class AppModule {}
