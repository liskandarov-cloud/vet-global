import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
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

  // Вход — 10 попыток за 5 минут с адреса. Живому человеку, забывшему пароль,
  // этого хватает; перебор словаря становится непрактичным.
  @Post('login')
  @Throttle({ default: { ttl: 300_000, limit: 10 } })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }
}
