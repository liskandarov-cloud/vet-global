import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { RfqService } from './rfq.service';
import { CreateRfqDto, QuoteDto } from './dto/rfq.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('rfq')
@ApiBearerAuth()
@Controller('rfq')
@UseGuards(JwtAuthGuard)
export class RfqController {
  constructor(private readonly rfq: RfqService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.BUYER, UserRole.ADMIN)
  create(@Body() dto: CreateRfqDto, @CurrentUser() user: AuthUser) {
    return this.rfq.create(dto, user);
  }

  @Get('mine')
  listMine(@CurrentUser() user: AuthUser) {
    return this.rfq.listMine(user);
  }

  // Все запросы платформы — для админки (мониторинг тендеров).
  @Get('all')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  listAll() {
    return this.rfq.listAll();
  }

  @Get('open')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  listOpen(@CurrentUser() user: AuthUser) {
    return this.rfq.listOpen(user);
  }

  @Get(':id')
  getOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.rfq.getOne(id, user);
  }

  @Post(':id/quote')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SELLER)
  quote(@Param('id') id: string, @Body() dto: QuoteDto, @CurrentUser() user: AuthUser) {
    return this.rfq.quote(id, dto, user);
  }

  @Post(':id/award/:quoteId')
  award(@Param('id') id: string, @Param('quoteId') quoteId: string, @CurrentUser() user: AuthUser) {
    return this.rfq.award(id, quoteId, user);
  }

  @Post(':id/close')
  close(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.rfq.close(id, user);
  }
}
