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
    const { S3_ENDPOINT_URL, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET } = env();
    this.client = new S3Client({
      endpoint: S3_ENDPOINT_URL,
      region: S3_REGION,
      credentials: {
        accessKeyId: S3_ACCESS_KEY_ID,
        secretAccessKey: S3_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true,
    });
    this.bucket = S3_BUCKET;
  }

  async upload(
    key: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
  }

  async getDownloadUrl(
    key: string,
  ): Promise<{ fileUrl: string; fileUrlExpiresAt: Date }> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    const fileUrl = await getSignedUrl(this.client, command, {
      expiresIn: PRESIGNED_URL_TTL_SECONDS,
    });

    const fileUrlExpiresAt = new Date(
      Date.now() + PRESIGNED_URL_TTL_SECONDS * 1000,
    );
    return { fileUrl, fileUrlExpiresAt };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}
