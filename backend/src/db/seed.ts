import bcrypt from 'bcrypt';
import { pool } from './index';
import dotenv from 'dotenv';

dotenv.config();

async function seed() {
  const username = process.env.ADMIN_USERNAME ?? 'admin';
  const password = process.env.ADMIN_PASSWORD ?? 'Admin@1234';

  if (password === 'Admin@1234') {
    console.warn('WARNING: Using default password. Set ADMIN_PASSWORD in .env before running in production.');
  }

  const hash = await bcrypt.hash(password, 12);
  await pool.query(
    `INSERT INTO admins (username, password_hash)
     VALUES ($1, $2)
     ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    [username, hash]
  );
  console.log(`Admin account seeded — username: "${username}"`);
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
