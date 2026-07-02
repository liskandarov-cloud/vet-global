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
  @Post()
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_SIZE } }))
  async upload(
    @UploadedFile() file: any,
    @Query('kind') kind: 'image' | 'certificate' = 'image',
  ) {
    if (!file) throw new BadRequestException('No file provided');

    const allowed = kind === 'certificate' ? PDF_MIME : IMAGE_MIME;
    if (!allowed.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type for "${kind}". Allowed: ${allowed.join(', ')}`,
      );
    }

    const folder = kind === 'certificate' ? 'certificates' : 'images';
    const url = await this.storage.upload(file, folder);
    return { url };
  }
}
