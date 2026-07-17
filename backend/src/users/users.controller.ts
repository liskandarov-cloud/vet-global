import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { UsersService } from './users.service';
import { CounterpartyDto, SellerDocumentDto, UpdateProfileDto } from './dto/user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('users')
@Controller()
export class UsersController {
  constructor(private readonly users: UsersService) {}

  // ── Own profile & counterparties ──
  @Patch('users/me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(user.id, dto);
  }

  @Get('users/me/counterparties')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  listCounterparties(@CurrentUser() user: AuthUser) {
    return this.users.listCounterparties(user.id);
  }

  @Post('users/me/counterparties')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  addCounterparty(@CurrentUser() user: AuthUser, @Body() dto: CounterpartyDto) {
    return this.users.addCounterparty(user.id, dto);
  }

  @Patch('users/me/counterparties/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  updateCounterparty(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CounterpartyDto) {
    return this.users.updateCounterparty(user.id, id, dto);
  }

  @Delete('users/me/counterparties/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  deleteCounterparty(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.users.deleteCounterparty(user.id, id);
  }

  // ── Seller documents ──
  @Post('sellers/me/documents')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  addSellerDocument(@CurrentUser() user: AuthUser, @Body() dto: SellerDocumentDto) {
    return this.users.addSellerDocument(user.id, dto);
  }

  @Get('sellers/me/documents')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  listSellerDocuments(@CurrentUser() user: AuthUser) {
    return this.users.listSellerDocuments(user.id);
  }

  // ── Public sellers ──
  @Get('sellers')
  listSellers(@Query('verifiedOnly') verifiedOnly?: string) {
    return this.users.listSellers(verifiedOnly === 'true');
  }

  @Get('sellers/:id')
  getSeller(@Param('id') id: string) {
    return this.users.getSeller(id);
  }

  // ── Admin user management ──
  @Get('admin/users')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  adminListUsers(
    @Query('role') role?: UserRole,
    @Query('skip') skip = 0,
    @Query('take') take = 50,
  ) {
    return this.users.adminListUsers(role, Number(skip), Number(take));
  }

  @Patch('admin/users/:id/verify')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  adminVerify(@Param('id') id: string, @Body('isVerified') isVerified = true) {
    return this.users.adminVerify(id, isVerified);
  }

  @Patch('admin/users/:id/ban')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  adminBan(@Param('id') id: string, @Body('isBanned') isBanned = true) {
    return this.users.adminBan(id, isBanned);
  }

  // Удаление пользователя (админ) — чистка тестовых аккаунтов.
  // Заказы и связанные записи уходят каскадом, поэтому удалять стоит только
  // тех, у кого нет реальной истории; иначе безопаснее бан.
  @Delete('admin/users/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  adminRemove(@Param('id') id: string, @CurrentUser() me: AuthUser) {
    return this.users.adminRemove(id, me);
  }
}
