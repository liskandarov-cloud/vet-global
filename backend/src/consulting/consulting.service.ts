import { Injectable } from '@nestjs/common';
import { AnimalType, ConsultStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../mail/notifications.service';

export interface CreateConsultInput {
  fullName: string;
  phone: string;
  topic: string;
  message: string;
  animalType?: AnimalType;
  userId?: string;
}

@Injectable()
export class ConsultingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(input: CreateConsultInput) {
    const consult = await this.prisma.consultRequest.create({ data: input });
    void this.notifications.onConsultCreated(consult.id).catch(() => undefined);
    return consult;
  }

  list(status?: ConsultStatus) {
    return this.prisma.consultRequest.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  listMine(userId: string) {
    return this.prisma.consultRequest.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  answer(id: string, answer: string, answeredBy: string, status: ConsultStatus = ConsultStatus.ANSWERED) {
    return this.prisma.consultRequest.update({ where: { id }, data: { answer, answeredBy, status } });
  }

  updateStatus(id: string, status: ConsultStatus) {
    return this.prisma.consultRequest.update({ where: { id }, data: { status } });
  }

  countNew() {
    return this.prisma.consultRequest.count({ where: { status: ConsultStatus.NEW } });
  }
}
