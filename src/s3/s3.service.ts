import { Injectable } from '@nestjs/common';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../config/env';

const PRESIGNED_URL_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
export const PRESIGNED_URL_REFRESH_THRESHOLD_MS = 5 * 24 * 60 * 60 * 1000; // 5 days

@Injectable()
export class S3Service {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    const { AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET } = env();
    this.client = new S3Client({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      },
    });
    this.bucket = AWS_S3_BUCKET;
  }

  async upload(key: string, buffer: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
  }

  async getDownloadUrl(key: string): Promise<{ fileUrl: string; fileUrlExpiresAt: Date }> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    const fileUrl = await getSignedUrl(this.client, command, {
      expiresIn: PRESIGNED_URL_TTL_SECONDS,
    });

    const fileUrlExpiresAt = new Date(Date.now() + PRESIGNED_URL_TTL_SECONDS * 1000);
    return { fileUrl, fileUrlExpiresAt };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
