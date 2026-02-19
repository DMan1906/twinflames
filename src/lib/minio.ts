// src/lib/minio.ts
import 'server-only';
import * as Minio from 'minio';

// Initialize the MinIO client using environment variables
export const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: 9000, // Default MinIO port; adjust if your setup uses a different one
  useSSL: process.env.NODE_ENV === 'production',
  accessKey: process.env.MINIO_ACCESS_KEY || '',
  secretKey: process.env.MINIO_SECRET_KEY || '',
});

const BUCKET_NAME = 'twinflames-media';

/**
 * Ensures the bucket exists, and generates a pre-signed URL for temporary, secure uploads.
 */
export async function getUploadUrl(fileName: string, mimeType: string) {
  try {
    const exists = await minioClient.bucketExists(BUCKET_NAME);
    if (!exists) {
      await minioClient.makeBucket(BUCKET_NAME, 'eu-central-1');
    }

    // URL expires in 5 minutes (300 seconds)
    const url = await minioClient.presignedPutObject(BUCKET_NAME, fileName, 300);
    return { success: true, url, objectKey: fileName };
  } catch (error: any) {
    console.error('MinIO Error:', error);
    return { success: false, error: 'Failed to generate upload URL' };
  }
}