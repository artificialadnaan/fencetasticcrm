import path from 'path';
import fs from 'fs/promises';
import { randomUUID } from 'crypto';

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif'];

export async function ensureUploadDir(projectId: string): Promise<string> {
  const dir = path.join(UPLOAD_DIR, projectId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export function validateUploadFile(mimetype: string, size: number): void {
  if (!ALLOWED_TYPES.includes(mimetype.toLowerCase())) {
    throw new Error(`Unsupported file type: ${mimetype}. Allowed: JPEG, PNG, HEIC`);
  }
  if (size > MAX_FILE_SIZE) {
    throw new Error(`File too large: ${(size / 1024 / 1024).toFixed(1)}MB. Max 10MB`);
  }
}

export async function saveUploadedFile(
  projectId: string,
  originalName: string,
  buffer: Buffer,
  mimetype: string
): Promise<string> {
  validateUploadFile(mimetype, buffer.length);

  const dir = await ensureUploadDir(projectId);
  const ext = path.extname(originalName).toLowerCase() || '.jpg';
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filename = `${randomUUID()}-${safeName}`;
  const filepath = path.join(dir, filename);

  await fs.writeFile(filepath, buffer);

  // Return relative URL — served by Express static middleware
  return `/uploads/${projectId}/${filename}`;
}
