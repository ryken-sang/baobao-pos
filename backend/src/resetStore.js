import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const seedPath = path.join(__dirname, '..', 'data', 'store.seed.json');
const storePath = path.join(__dirname, '..', 'data', 'store.json');

if (!fs.existsSync(seedPath)) {
  throw new Error('Không tìm thấy file seed.');
}

fs.copyFileSync(seedPath, storePath);
console.log('Đã reset dữ liệu về bản mẫu V2.');
