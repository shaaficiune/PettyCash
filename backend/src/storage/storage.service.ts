import { Injectable, Logger } from '@nestjs/common';
import { existsSync } from 'fs';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private client: any = null;
  private bucket: string;

  constructor() {
    const storageType = process.env.STORAGE_TYPE || 'local';
    this.bucket = process.env.MINIO_BUCKET || 'petty-cash-attachments';

    if (storageType === 'minio') {
      const endPoint = process.env.MINIO_ENDPOINT;
      const accessKey = process.env.MINIO_ACCESS_KEY;
      const secretKey = process.env.MINIO_SECRET_KEY;
      if (!endPoint || !accessKey || !secretKey) {
        throw new Error('MINIO_ENDPOINT, MINIO_ACCESS_KEY, and MINIO_SECRET_KEY are required when STORAGE_TYPE=minio');
      }

      // Load MinIO client dynamically to avoid a hard dependency for local storage.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const MinioClient = require('minio').Client;
      const port = parseInt(process.env.MINIO_PORT || '9000', 10);

      this.client = new MinioClient({
        endPoint,
        port,
        useSSL: process.env.MINIO_USE_SSL === 'true',
        accessKey,
        secretKey,
      });

      this.client.bucketExists(this.bucket, (err, exists) => {
        if (err) {
          this.logger.error(`MinIO bucket check failed: ${err.message}`);
          return;
        }
        if (!exists) {
          this.client!.makeBucket(this.bucket, '', (mkErr) => {
            if (mkErr) return this.logger.error(`Failed to create bucket: ${mkErr.message}`);
            this.logger.log(`Created MinIO bucket: ${this.bucket}`);
          });
        } else {
          this.logger.log(`MinIO bucket exists: ${this.bucket}`);
        }
      });
    }
  }

  async uploadLocalFile(filePath: string, destName?: string): Promise<string> {
    const storageType = process.env.STORAGE_TYPE || 'local';
    const fileName = destName || filePath.split(/[\\/]/).pop() || filePath;

    if (storageType === 'minio' && this.client) {
      if (!existsSync(filePath)) throw new Error('Local file not found for upload');
      return new Promise((resolve, reject) => {
        this.client!.fPutObject(this.bucket, fileName, filePath, {}, (err) => {
          if (err) return reject(err);
          // Return an S3-style URL for access; callers may use presigned URLs if needed
          const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
          const port = process.env.MINIO_PORT || '9000';
          const url = `http://${endpoint}:${port}/${this.bucket}/${encodeURIComponent(fileName)}`;
          resolve(url);
        });
      });
    }

    // Local attachments are delivered through the authenticated attachment API.
    return Promise.resolve(`/uploads/${fileName}`);
  }

  async getPresignedUrl(objectName: string, expiresSeconds = 24 * 60 * 60): Promise<string> {
    if (!this.client) throw new Error('Storage backend not configured for MinIO');
    return new Promise((resolve, reject) => {
      this.client!.presignedGetObject(this.bucket, objectName, expiresSeconds, (err, url) => {
        if (err) return reject(err);
        resolve(url as string);
      });
    });
  }

  async removeObject(objectName: string): Promise<void> {
    if (!this.client) return;
    return new Promise((resolve, reject) => {
      this.client!.removeObject(this.bucket, objectName, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }
}
