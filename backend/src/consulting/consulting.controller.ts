import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AnimalType, ConsultStatus, UserRole } from '@prisma/client';
import { ConsultingService } from './consulting.service';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

class CreateConsultDto {
  @IsString() fullName: string;
  @IsString() phone: string;
  @IsString() topic: string;
  @IsString() message: string;
  @IsOptional() @IsEnum(AnimalType) animalType?: AnimalType;
}

class AnswerDto {
  @IsOptional() @IsString() answer?: string;
  @IsOptional() @IsEnum(ConsultStatus) status?: ConsultStatus;
}

@ApiTags('consulting')
@Controller('consultations')
export class ConsultingController {
  constructor(private readonly consulting: ConsultingService) {}

  // Public or authenticated submission (guest allowed).
  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  create(@Body() dto: CreateConsultDto, @CurrentUser() user?: AuthUser) {
    return this.consulting.create({ ...dto, userId: user?.id });
  }

  @Get('mine')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  mine(@CurrentUser() user: AuthUser) {
    return this.consulting.listMine(user.id);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  list(@Query('status') status?: ConsultStatus) {
    return this.consulting.list(status);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  answer(@Param('id') id: string, @Body() dto: AnswerDto, @CurrentUser() user: AuthUser) {
    if (dto.answer) {
      return this.consulting.answer(id, dto.answer, user.fullName, dto.status ?? ConsultStatus.ANSWERED);
    }
    return this.consulting.updateStatus(id, dto.status ?? ConsultStatus.IN_PROGRESS);
  }
}
