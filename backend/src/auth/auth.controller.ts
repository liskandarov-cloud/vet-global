import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // Регистрация — 5 попыток за 10 минут с адреса: массовое создание аккаунтов
  // ботами не имеет смысла на B2B-площадке.
  @Post('register')
  @Throttle({ default: { ttl: 600_000, limit: 5 } })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  // Вход — 20 попыток за 5 минут с адреса. Лимит на IP, а не на аккаунт:
  // сотрудники фермы или клиники сидят за одним внешним адресом и делят его
  // между собой, поэтому слишком тесное окно блокировало бы весь офис.
  // Перебор словаря при этом остаётся непрактичным.
  @Post('login')
  @Throttle({ default: { ttl: 300_000, limit: 20 } })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  // Запрос ссылки — 5 за 15 минут с адреса: письма не должны становиться
  // способом заспамить чужой ящик.
  @Post('forgot-password')
  @HttpCode(200)
  @Throttle({ default: { ttl: 900_000, limit: 5 } })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto.email);
  }

  // Токен — 32 случайных байта, перебор бессмыслен; лимит гасит шум.
  @Post('reset-password')
  @HttpCode(200)
  @Throttle({ default: { ttl: 900_000, limit: 10 } })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.token, dto.password);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }
}
