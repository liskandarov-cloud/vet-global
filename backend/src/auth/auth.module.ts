import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { parseJwtExpiry } from '../common/jwt-expiry';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';

// Глобальный модуль.
//
// Страж JwtAuthGuard применяется почти в каждом контроллере, а в passport 12 он
// требует настройки модуля авторизации в том же контексте внедрения — иначе
// приложение не поднимается вовсе. Раньше это работало само; делать импорт в
// каждом из трёх десятков модулей ради одной зависимости незачем.
// Passport регистрируется явно: в версии 12 страж запрашивает настройки модуля
// авторизации как зависимость, и без register() их просто нет — приложение не
// поднимается с «Nest can't resolve dependencies of the JwtAuthGuard».
const passport = PassportModule.register({ defaultStrategy: 'jwt' });

@Global()
@Module({
  imports: [
    passport,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') ?? 'dev-secret',
        // Значение проверяется здесь же: неверное останавливает запуск, а не
        // падает при первом входе. Приведение типа — после проверки: библиотека
        // описывает срок жизни литеральным типом, который из произвольной
        // строки окружения не выводится.
        signOptions: { expiresIn: parseJwtExpiry(config.get<string>('JWT_EXPIRES_IN')) as any },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, passport, JwtModule],
})
export class AuthModule {}
