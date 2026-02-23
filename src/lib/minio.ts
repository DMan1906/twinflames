// src/lib/minio.ts
import 'server-only';
import * as Minio from 'minio';

// Parse MinIO endpoint - handle both formats:
// - "localhost:9000" (hostname:port)
// - "http://localhost:9000" (full URL)
function parseMinioEndpoint() {
  const endpoint = process.env.MINIO_ENDPOINT || 'localhost:9000';
  let url: URL;
  
  try {
    // Try parsing as full URL
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      url = new URL(endpoint);
      return {
        endPoint: url.hostname || 'localhost',
        port: url.port ? parseInt(url.port, 10) : 9000,
        useSSL: url.protocol === 'https:',
      };
    }
  } catch {}
  
  // Parse as "host:port" format
  const parts = endpoint.split(':');
  return {
    endPoint: parts[0] || 'localhost',
    port: parts[1] ? parseInt(parts[1], 10) : 9000,
    useSSL: process.env.NODE_ENV === 'production',
  };
}

const minioConfig = parseMinioEndpoint();

// Initialize the MinIO client using environment variables
export const minioClient = new Minio.Client({
  endPoint: minioConfig.endPoint,
  port: minioConfig.port,
  useSSL: minioConfig.useSSL,
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