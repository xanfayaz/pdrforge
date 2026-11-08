import { existsSync } from 'fs';
import path from 'path';

export function resolveUploads(): string {
  return process.env.UPLOAD_DIR || path.resolve(process.cwd(), 'uploads');
}

export function resolveAssets(): string {
  const candidates = [
    process.env.ASSETS_DIR,
    path.resolve(process.cwd(), 'assets'),
    path.resolve(__dirname, '..', '..', 'assets'),
  ].filter((item): item is string => Boolean(item));
  return candidates.find((dir) => existsSync(dir)) ?? path.resolve(process.cwd(), 'assets');
}
