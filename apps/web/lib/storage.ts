/**
 * @file storage.ts
 * @description Storage helper for GATE notes thumbnails and study diagrams.
 * Supports:
 * 1. Firebase Cloud Storage signed URLs when credentials are provided.
 * 2. Local uploads directory fallback for development/demo without cloud credentials.
 */

import fs from "fs";
import path from "path";

/**
 * Returns a public URL or direct upload path for an image.
 */
export async function getUploadConfig(filename: string, contentType: string) {
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  // If Firebase Admin credentials are set, generate signed URL
  if (bucketName && privateKey && clientEmail) {
    try {
      // Dynamic require so webpack does not fail the build when optional dependency is not installed
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const gcs = (eval("require"))("@google-cloud/storage");
      const Storage = gcs.Storage;
      const storage = new Storage({
        credentials: {
          client_email: clientEmail,
          private_key: privateKey.replace(/\\n/g, "\n"),
        },
      });

      const bucket = storage.bucket(bucketName);
      const uniqueName = `uploads/${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const file = bucket.file(uniqueName);

      const [uploadUrl] = await file.getSignedUrl({
        version: "v4",
        action: "write",
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        contentType,
      });

      const publicUrl = `https://storage.googleapis.com/${bucketName}/${uniqueName}`;
      return { uploadUrl, publicUrl, directUpload: false };
    } catch (err) {
      console.warn("Failed to generate Firebase Storage signed URL, falling back to local:", err);
    }
  }

  // Fallback: Local upload endpoint
  const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  const uniqueName = `${Date.now()}_${sanitized}`;
  return {
    uploadUrl: `/api/admin/upload-file?filename=${encodeURIComponent(uniqueName)}`,
    publicUrl: `/uploads/${uniqueName}`,
    directUpload: true,
  };
}

/**
 * Saves an uploaded buffer to the local public/uploads directory.
 */
export async function saveLocalUpload(filename: string, buffer: Buffer): Promise<string> {
  const uploadsDir = path.resolve(process.cwd(), "public", "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  const filePath = path.join(uploadsDir, filename);
  fs.writeFileSync(filePath, buffer);
  return `/uploads/${filename}`;
}
