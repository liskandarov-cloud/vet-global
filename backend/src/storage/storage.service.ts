import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(private readonly config: ConfigService) {
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
}
