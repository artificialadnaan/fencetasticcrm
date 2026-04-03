import path from 'path';
import fs from 'fs/promises';
import { randomUUID } from 'crypto';

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.heic'];
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function ensureUploadDir(projectId: string): Promise<string> {
  // Fix 1: Validate projectId is a UUID before using it in a path
  if (!UUID_REGEX.test(projectId)) {
    throw new Error('Invalid project ID format');
  }

  const dir = path.join(UPLOAD_DIR, projectId);

  // Fix 1: Verify the resolved path stays inside UPLOAD_DIR
  const resolvedDir = path.resolve(dir);
  const resolvedUploadDir = path.resolve(UPLOAD_DIR);
  if (!resolvedDir.startsWith(resolvedUploadDir + path.sep) && resolvedDir !== resolvedUploadDir) {
    throw new Error('Invalid path');
  }

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

  // Fix 2: Whitelist extensions — reject anything not in the allowed list
  const ext = path.extname(originalName).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error('Only .jpg, .jpeg, .png, .heic files are allowed');
  }

  const dir = await ensureUploadDir(projectId);
  // Use only the UUID + whitelisted extension — drop original filename entirely
  const filename = `${randomUUID()}${ext}`;
  const filepath = path.join(dir, filename);

  await fs.writeFile(filepath, buffer);

  // Return relative URL — served by Express static middleware
  return `/uploads/${projectId}/${filename}`;
}
