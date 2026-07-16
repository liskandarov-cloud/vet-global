import {
  Body,
  Controller,
  Get,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { Response } from 'express';
import { ImportService } from './import.service';
import { CommitImportDto } from './dto/import.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

@ApiTags('import')
@ApiBearerAuth()
@Controller('import')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SELLER, UserRole.ADMIN)
export class ImportController {
  constructor(private readonly service: ImportService) {}

  // Список полей для формы сопоставления.
  @Get('fields')
  fields() {
    return this.service.fields();
  }

  // Шаблон прайса с примером фасовки.
  @Get('template')
  async template(@Res() res: Response) {
    const buf = await this.service.template();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="vetglobal-price-template.xlsx"',
    });
    res.send(buf);
  }

  // Шаг 1 — разбор файла и автосопоставление колонок.
  @Post('parse')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_SIZE } }))
  parse(@UploadedFile() file: any) {
    return this.service.parse(file);
  }

  // Шаг 2 — проверка (dryRun) или загрузка.
  @Post('commit')
  commit(@Body() dto: CommitImportDto, @CurrentUser() user: AuthUser) {
    return this.service.commit(dto, user);
  }
}
