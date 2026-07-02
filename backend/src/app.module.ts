import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './storage/storage.module';
import { DocumentsModule } from './documents/documents.module';
import { MailModule } from './mail/mail.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
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
    MailModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    ProductsModule,
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
