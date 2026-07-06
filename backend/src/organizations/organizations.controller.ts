import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CreateOrgDto, InviteMemberDto, UpdateMemberDto } from './dto/organization.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('organizations')
@ApiBearerAuth()
@Controller('org')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly org: OrganizationsService) {}

  @Get('me')
  myOrg(@CurrentUser() user: AuthUser) {
    return this.org.myOrg(user);
  }

  @Post()
  create(@Body() dto: CreateOrgDto, @CurrentUser() user: AuthUser) {
    return this.org.create(dto, user);
  }

  @Post('members')
  invite(@Body() dto: InviteMemberDto, @CurrentUser() user: AuthUser) {
    return this.org.invite(dto, user);
  }

  @Patch('members/:id')
  updateMember(@Param('id') id: string, @Body() dto: UpdateMemberDto, @CurrentUser() user: AuthUser) {
    return this.org.updateMember(id, dto, user);
  }

  @Delete('members/:id')
  removeMember(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.org.removeMember(id, user);
  }

  @Get('approvals')
  approvals(@CurrentUser() user: AuthUser) {
    return this.org.pendingApprovals(user);
  }

  @Post('approvals/:orderId')
  decide(@Param('orderId') orderId: string, @Body('approve') approve: boolean, @CurrentUser() user: AuthUser) {
    return this.org.decideApproval(orderId, approve ?? true, user);
  }
}
