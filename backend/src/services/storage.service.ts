import crypto from 'node:crypto';
import path from 'node:path';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env.js';

let client: S3Client | null = null;
let bucketVerified = false;

export function isStorageConfigured(): boolean {
  return Boolean(
    env.s3.endpoint &&
      env.s3.accessKeyId &&
      env.s3.secretAccessKey &&
      env.s3.bucket
  );
}

function getS3Client(): S3Client {
  if (!isStorageConfigured()) {
    throw new Error('S3 storage is not configured. Check AWS_ENDPOINT_URL_S3 and credentials.');
  }
  if (!client) {
    client = new S3Client({
      endpoint: env.s3.endpoint,
      region: env.s3.region,
      forcePathStyle: true,
      credentials: {
        accessKeyId: env.s3.accessKeyId,
        secretAccessKey: env.s3.secretAccessKey,
      },
    });
  }
  return client;
}

export function sanitizeFilename(originalName: string): string {
  const base = path.basename(originalName || 'resume.pdf');
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_');
  return cleaned.slice(0, 120) || 'resume.pdf';
}

export function buildResumeKey(
  userId: string,
  folder: 'profiles' | 'applications',
  originalName: string
): string {
  const safeName = sanitizeFilename(originalName);
  const uniqueId = crypto.randomUUID();
  return `uploads/${folder}/${userId}/${uniqueId}-${safeName}`;
}

export function buildDocumentKey(employeeId: string, originalName: string): string {
  const safeName = sanitizeFilename(originalName);
  const uniqueId = crypto.randomUUID();
  return `uploads/hr-docs/${employeeId}/${uniqueId}-${safeName}`;
}

async function ensureBucketExists(s3: S3Client): Promise<void> {
  if (bucketVerified) return;
  try {
    await s3.send(new HeadBucketCommand({ Bucket: env.s3.bucket }));
    bucketVerified = true;
  } catch (err: any) {
    const code = err?.name || err?.Code || '';
    const status = err?.$metadata?.httpStatusCode;
    if (code === 'NotFound' || code === 'NoSuchBucket' || status === 404) {
      await s3.send(new CreateBucketCommand({ Bucket: env.s3.bucket }));
      bucketVerified = true;
    } else {
      throw err;
    }
  }
}

export async function uploadFileToS3(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<{ key: string; url: string }> {
  const s3 = getS3Client();
  await ensureBucketExists(s3);

  await s3.send(
    new PutObjectCommand({
      Bucket: env.s3.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  const url = await getPresignedDownloadUrl(key);
  return { key, url };
}

export async function getPresignedDownloadUrl(
  key: string,
  expiresInSeconds = 3600
): Promise<string> {
  const s3 = getS3Client();
  return getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: env.s3.bucket,
      Key: key,
    }),
    { expiresIn: expiresInSeconds }
  );
}

export async function deleteFileFromS3(key: string): Promise<void> {
  if (!isStorageConfigured() || !key) return;
  try {
    const s3 = getS3Client();
    await s3.send(
      new DeleteObjectCommand({
        Bucket: env.s3.bucket,
        Key: key,
      })
    );
  } catch (err) {
    console.warn('[Storage] Failed to delete object from S3:', key, (err as Error).message);
  }
}
