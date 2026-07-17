import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

// Публичная отдача файлов, сохранённых в Postgres (режим без S3).
// Контент иммутабельный (id = uuid), поэтому кэшируем агрессивно.
// Из-под ограничителя частоты выведено: одна страница каталога тянет десяток
// картинок, и общий лимит на запросы срабатывал бы на обычном просмотре.
@SkipThrottle()
@ApiTags('storage')
@Controller('files')
export class FilesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':id')
  async serve(@Param('id') id: string, @Res() res: Response) {
    const file = await this.prisma.storedFile.findUnique({ where: { id } });
    if (!file) throw new NotFoundException('Файл не найден');
    res.set({
      'Content-Type': file.mime,
      'Content-Length': String(file.size),
      'Cache-Control': 'public, max-age=31536000, immutable',
    });
    res.send(Buffer.from(file.data));
  }
}
