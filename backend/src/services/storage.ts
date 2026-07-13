import { Client as MinioClient } from 'minio';

const minio = new MinioClient({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});

const BUCKET = 'documents';

/**
 * Ensure the bucket exists.
 */
async function ensureBucket(): Promise<void> {
  const exists = await minio.bucketExists(BUCKET);
  if (!exists) {
    await minio.makeBucket(BUCKET);
  }
}

/**
 * Upload a file to MinIO.
 */
export async function uploadFile(key: string, buffer: Buffer, mimeType: string): Promise<void> {
  await ensureBucket();
  await minio.putObject(BUCKET, key, buffer, buffer.length, {
    'Content-Type': mimeType,
  });
}

/**
 * Download a file from MinIO.
 */
export async function getFile(key: string): Promise<Buffer> {
  const stream = await minio.getObject(BUCKET, key);
  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

/**
 * Delete a file from MinIO.
 */
export async function deleteFile(key: string): Promise<void> {
  await minio.removeObject(BUCKET, key);
}

/**
 * Generate a storage key for a document.
 */
export function generateStorageKey(orgId: string, documentId: string, filename: string): string {
  // Sanitize filename
  const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${orgId}/${documentId}/${safeFilename}`;
}
