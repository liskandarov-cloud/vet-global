import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
import { FinancingModule } from './financing/financing.module';
import { RfqModule } from './rfq/rfq.module';
import { BrandsModule } from './brands/brands.module';
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
    FinancingModule,
    RfqModule,
    BrandsModule,
    OrdersModule,
    VetpointsModule,
    ReviewsModule,
    PromotionsModule,
    BlogModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
