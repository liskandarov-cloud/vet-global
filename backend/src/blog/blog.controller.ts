import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

class BlogPostDto {
  @IsString() title: string;
  @IsOptional() @IsString() titleUz?: string;
  @IsString() content: string;
  @IsOptional() @IsString() contentUz?: string;
  @IsOptional() @IsString() excerpt?: string;
  @IsOptional() @IsString() image?: string;
  @IsOptional() @IsString() metaTitle?: string;
  @IsOptional() @IsString() metaDesc?: string;
  @IsOptional() @IsBoolean() published?: boolean;
}

// All fields optional — supports partial updates (e.g. toggling `published`).
class UpdateBlogPostDto extends PartialType(BlogPostDto) {}

function slugify(s: string): string {
  const map: Record<string, string> = {
    а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',
  };
  return s
    .toLowerCase()
    .split('')
    .map((c) => map[c] ?? c)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

@ApiTags('blog')
@Controller('blog')
export class BlogController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query('skip') skip = 0, @Query('limit') limit = 12, @Query('all') all?: string) {
    const where = all === 'true' ? {} : { published: true };
    const [total, posts] = await this.prisma.$transaction([
      this.prisma.blogPost.count({ where }),
      this.prisma.blogPost.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: Number(skip),
        take: Number(limit),
      }),
    ]);
    return { total, posts };
  }

  @Get(':slug')
  async getBySlug(@Param('slug') slug: string) {
    const post = await this.prisma.blogPost.findUnique({ where: { slug } });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() dto: BlogPostDto, @CurrentUser() user: AuthUser) {
    let slug = slugify(dto.title);
    if (await this.prisma.blogPost.findUnique({ where: { slug } })) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }
    return this.prisma.blogPost.create({
      data: { ...dto, slug, authorId: user.id, authorName: user.fullName },
    });
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateBlogPostDto) {
    return this.prisma.blogPost.update({ where: { id }, data: dto });
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string) {
    await this.prisma.blogPost.delete({ where: { id } });
    return { message: 'Deleted' };
  }
}
