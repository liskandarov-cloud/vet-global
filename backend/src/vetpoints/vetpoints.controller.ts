import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('vetpoints')
@Controller('vetpoints')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class VetpointsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('balance')
  async balance(@CurrentUser() user: AuthUser) {
    const u = await this.prisma.user.findUnique({ where: { id: user.id } });
    return { balance: Number(u?.vetPointsBalance ?? 0) };
  }

  @Get('transactions')
  async transactions(
    @CurrentUser() user: AuthUser,
    @Query('skip') skip = 0,
    @Query('limit') limit = 50,
  ) {
    const txs = await this.prisma.vetPointsTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      skip: Number(skip),
      take: Number(limit),
    });
    return txs.map((t) => ({ ...t, amount: Number(t.amount) }));
  }
}
