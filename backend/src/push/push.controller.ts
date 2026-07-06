import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PushService } from './push.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('push')
@Controller('push')
export class PushController {
  constructor(private readonly push: PushService) {}

  @Get('vapid-public-key')
  publicKey() {
    return this.push.getPublicKey();
  }

  @Post('subscribe')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  subscribe(@Body() sub: any, @CurrentUser() user: AuthUser) {
    return this.push.subscribe(sub, user);
  }

  @Post('unsubscribe')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  unsubscribe(@Body('endpoint') endpoint: string, @CurrentUser() user: AuthUser) {
    return this.push.unsubscribe(endpoint, user);
  }
}
