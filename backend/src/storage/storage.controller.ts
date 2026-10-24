import {
  BadRequestException,
  Controller,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { StorageService } from './storage.service';
import { detectFileType } from './file-signature';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

const IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const PDF_MIME = ['application/pdf'];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

@ApiTags('storage')
@Controller('uploads')
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  // kind=image (product photos) | kind=certificate (PDF only) — SRS: strict MIME check.
  // kind=license — лицензия продавца: PDF или фото. Лицензию у дистрибьютора
  // чаще всего снимают на телефон, а PDF-only не давал загрузить её вовсе.
  @Post()
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_SIZE } }))
  async upload(
    @UploadedFile() file: any,
    @Query('kind') kind: 'image' | 'certificate' | 'license' = 'image',
  ) {
    if (!file) throw new BadRequestException('No file provided');

    // Тип — по содержимому (см. file-signature.ts), а не по заголовку клиента.
    const allowed =
      kind === 'certificate' ? PDF_MIME : kind === 'license' ? [...PDF_MIME, ...IMAGE_MIME] : IMAGE_MIME;
    const detected = detectFileType(file.buffer);
    if (!detected || !allowed.includes(detected.mime)) {
      throw new BadRequestException(
        `Invalid file type for "${kind}". Allowed: ${allowed.join(', ')}`,
      );
    }

    const folder = kind === 'certificate' ? 'certificates' : kind === 'license' ? 'licenses' : 'images';
    const url = await this.storage.upload({ ...file, mimetype: detected.mime }, folder, detected.ext);
    return { url };
  }
}
