import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { EimzoService } from './eimzo.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

class SignDto {
  @IsString() pkcs7: string;
}

@ApiTags('eimzo')
@Controller('eimzo')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class EimzoController {
  constructor(private readonly eimzo: EimzoService) {}

  // Get the document bytes to sign with E-IMZO on the client.
  @Get('prepare/:orderId')
  prepare(@Param('orderId') orderId: string, @CurrentUser() user: AuthUser) {
    return this.eimzo.prepare(orderId, user);
  }

  // Submit the PKCS#7 signature produced by E-IMZO.
  @Post('sign/:orderId')
  sign(@Param('orderId') orderId: string, @Body() dto: SignDto, @CurrentUser() user: AuthUser) {
    return this.eimzo.sign(orderId, dto.pkcs7, user);
  }
}
