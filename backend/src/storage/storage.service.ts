import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

// Лимит на файл при хранении в Postgres: бесплатная БД Render маленькая,
// фото товара больше 2 МБ — повод сжать, а не хранить.
const DB_MAX_SIZE = 2 * 1024 * 1024;

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;
  // S3_ENDPOINT задан (docker-compose) → MinIO/S3; не задан (Render) → байты в Postgres.
  private readonly s3Enabled: boolean;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.s3Enabled = !!config.get<string>('S3_ENDPOINT');
    const endpoint = config.get<string>('S3_ENDPOINT') ?? 'http://minio:9000';
    this.bucket = config.get<string>('S3_BUCKET') ?? 'vetglobal';
    this.publicUrl = config.get<string>('S3_PUBLIC_URL') ?? 'http://localhost:9000';
    this.client = new S3Client({
      endpoint,
      region: config.get<string>('S3_REGION') ?? 'us-east-1',
      forcePathStyle: true, // required for MinIO
      credentials: {
        accessKeyId: config.get<string>('S3_ACCESS_KEY') ?? 'vetglobal',
        secretAccessKey: config.get<string>('S3_SECRET_KEY') ?? 'vetglobal_dev_pwd',
      },
    });
  }

  // Ensure the bucket exists and is public-read (idempotent; minio-init also does this).
  async onModuleInit() {
    if (!this.s3Enabled) {
      this.logger.log('S3_ENDPOINT не задан — файлы хранятся в Postgres (/api/files/:id)');
      return;
    }
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      try {
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
        await this.client.send(
          new PutBucketPolicyCommand({
            Bucket: this.bucket,
            Policy: JSON.stringify({
              Version: '2012-10-17',
              Statement: [
                {
                  Effect: 'Allow',
                  Principal: { AWS: ['*'] },
                  Action: ['s3:GetObject'],
                  Resource: [`arn:aws:s3:::${this.bucket}/*`],
                },
              ],
            }),
          }),
        );
        this.logger.log(`Created bucket ${this.bucket}`);
      } catch (e) {
        this.logger.warn(`Bucket init skipped: ${(e as Error).message}`);
      }
    }
  }

  // Uploads a buffer and returns its public URL.
  async upload(
    file: { buffer: Buffer; originalname: string; mimetype: string },
    folder = 'uploads',
  ): Promise<string> {
    if (!this.s3Enabled) return this.uploadToDb(file);
    const ext = file.originalname.includes('.') ? file.originalname.split('.').pop() : 'bin';
    const key = `${folder}/${randomUUID()}.${ext}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );
    return `${this.publicUrl}/${this.bucket}/${key}`;
  }

  // Фолбэк без S3: байты в Postgres, наружу — ссылка на /api/files/:id.
  // Абсолютный URL обязателен: фронт живёт на другом домене (Vercel).
  private async uploadToDb(file: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
  }): Promise<string> {
    if (file.buffer.length > DB_MAX_SIZE)
      throw new BadRequestException('Файл больше 2 МБ — сожмите фото и попробуйте снова');
    const rec = await this.prisma.storedFile.create({
      data: {
        mime: file.mimetype,
        name: file.originalname,
        size: file.buffer.length,
        data: file.buffer,
      },
    });
    // RENDER_EXTERNAL_URL Render подставляет сам; PUBLIC_API_URL — ручной override.
    const base =
      this.config.get<string>('PUBLIC_API_URL') ??
      this.config.get<string>('RENDER_EXTERNAL_URL') ??
      '';
    return `${base}/api/files/${rec.id}`;
  }
}
