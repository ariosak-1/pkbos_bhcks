import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

// Photos go to S3-compatible object storage (R2, S3, Supabase...) when S3_BUCKET is set,
// otherwise to ./data/uploads. Only the key lives in Postgres.
const LOCAL = path.join(process.cwd(), "data", "uploads");

async function s3() {
  const { S3Client } = await import("@aws-sdk/client-s3");
  return new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT || undefined,
    credentials: process.env.S3_ACCESS_KEY_ID ? { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! } : undefined,
  });
}

export async function putPhoto(buf: Buffer, contentType: string) {
  const ext = contentType.split("/")[1]?.replace("jpeg", "jpg") || "bin";
  const key = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
  if (process.env.S3_BUCKET) {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    await (await s3()).send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, Body: buf, ContentType: contentType }));
  } else {
    await fs.mkdir(path.join(LOCAL, path.dirname(key)), { recursive: true });
    await fs.writeFile(path.join(LOCAL, key), buf);
  }
  return key;
}

export async function getPhoto(key: string): Promise<Buffer | null> {
  if (key.includes("..")) return null;
  try {
    if (process.env.S3_BUCKET) {
      const { GetObjectCommand } = await import("@aws-sdk/client-s3");
      const out = await (await s3()).send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
      return Buffer.from(await out.Body!.transformToByteArray());
    }
    return await fs.readFile(path.join(LOCAL, key));
  } catch {
    return null;
  }
}
