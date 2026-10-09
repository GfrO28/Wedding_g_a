import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME!;

// URL pública del bucket (dominio propio o el *.r2.dev que te da Cloudflare).
// Tolera que la variable venga con barra final.
export function r2PublicBase() {
  return (process.env.R2_PUBLIC_URL ?? "").replace(/\/+$/, "");
}

export function publicUrlFor(key: string) {
  return `${r2PublicBase()}/${key}`;
}

// Genera una URL firmada para subir un archivo directo desde el navegador. Con
// contentLength, la firma exige ese tamaño exacto (para limitar lo que suben los invitados).
export async function getUploadUrl(key: string, contentType: string, contentLength?: number) {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
    ...(contentLength ? { ContentLength: contentLength } : {}),
  });
  return getSignedUrl(r2, command, { expiresIn: 300 });
}

export async function deleteObject(key: string) {
  await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}
