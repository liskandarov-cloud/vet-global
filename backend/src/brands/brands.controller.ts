import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { BrandsService } from './brands.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('brands')
@Controller('brands')
export class BrandsController {
  constructor(private readonly brands: BrandsService) {}

  @Get()
  list() {
    return this.brands.list();
  }

  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.brands.getBySlug(slug);
  }

  @Patch(':id/sponsor')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  setSponsor(
    @Param('id') id: string,
    @Body('isSponsored') isSponsored: boolean,
    @Body('sponsorRank') sponsorRank?: number,
  ) {
    return this.brands.setSponsor(id, isSponsored ?? true, sponsorRank);
  }
}
