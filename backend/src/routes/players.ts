import { Router } from 'express';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';
import type { UploadApiResponse } from 'cloudinary';
import { pool } from '../db';
import { requireAdmin } from '../middleware/requireAdmin';
import { upload } from '../middleware/upload';

const router = Router();

const nigerianPhone = z
  .string()
  .regex(
    /^(\+234|234|0)[7-9][0-1]\d{8}$/,
    'Must be a valid Nigerian phone number (e.g. 08012345678 or +2348012345678)'
  );

const playerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  nickname: z.string().max(50).optional().nullable(),
  date_of_birth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be in YYYY-MM-DD format')
    .optional()
    .nullable(),
  phone_number: nigerianPhone.optional().nullable(),
  jersey_number: z.number().int().min(1).max(99).optional().nullable(),
  position: z.string().max(50).optional().nullable(),
});

async function storePhoto(buffer: Buffer, filename: string): Promise<string> {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
    cloudinary.config({ cloud_name: CLOUDINARY_CLOUD_NAME, api_key: CLOUDINARY_API_KEY, api_secret: CLOUDINARY_API_SECRET });
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'akoka-fc', transformation: [{ width: 300, height: 300, crop: 'fill', gravity: 'face' }] },
        (err, res) => (err ? reject(err) : resolve(res!))
      );
      stream.end(buffer);
    });
    return result.secure_url;
  }
  // Local dev fallback
  const uploadDir = path.join(__dirname, '../../uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  await fs.promises.writeFile(path.join(uploadDir, filename), buffer);
  return `/uploads/${filename}`;
}

// GET /api/players?page=1&limit=10&search=
router.get('/', async (req, res) => {
  const page   = Math.max(1, parseInt((req.query.page  as string) ?? '1',  10) || 1);
  const limit  = Math.max(1, Math.min(50, parseInt((req.query.limit as string) ?? '10', 10) || 10));
  const search = ((req.query.search as string | undefined) ?? '').trim();
  const offset = (page - 1) * limit;

  try {
    const settingsResult = await pool.query("SELECT value FROM settings WHERE key = 'active_year'");
    const activeYear = parseInt(settingsResult.rows[0]?.value ?? '2026', 10);

    const [countResult, playersResult] = search
      ? await Promise.all([
          pool.query(
            'SELECT COUNT(*)::int AS total FROM players WHERE name ILIKE $1 OR nickname ILIKE $1',
            [`%${search}%`]
          ),
          pool.query(
            `SELECT * FROM players WHERE name ILIKE $1 OR nickname ILIKE $1
             ORDER BY jersey_number ASC NULLS LAST, name ASC LIMIT $2 OFFSET $3`,
            [`%${search}%`, limit, offset]
          ),
        ])
      : await Promise.all([
          pool.query('SELECT COUNT(*)::int AS total FROM players'),
          pool.query(
            'SELECT * FROM players ORDER BY jersey_number ASC NULLS LAST, name ASC LIMIT $1 OFFSET $2',
            [limit, offset]
          ),
        ]);

    const total      = countResult.rows[0].total as number;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const playerIds  = playersResult.rows.map((p) => p.id);

    const duesResult = playerIds.length > 0
      ? await pool.query(
          'SELECT * FROM monthly_dues WHERE year = $1 AND player_id = ANY($2::int[])',
          [activeYear, playerIds]
        )
      : { rows: [] };

    const players = playersResult.rows.map((p) => ({
      ...p,
      dues: duesResult.rows.filter((d) => d.player_id === p.id),
    }));

    res.json({ players, activeYear, total, page, totalPages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/players
router.post('/', requireAdmin, async (req, res) => {
  const parse = playerSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.flatten().fieldErrors });
    return;
  }
  const { name, nickname, date_of_birth, phone_number, jersey_number, position } = parse.data;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const settingsResult = await client.query("SELECT value FROM settings WHERE key = 'active_year'");
    const activeYear = parseInt(settingsResult.rows[0]?.value ?? '2026', 10);

    const playerResult = await client.query(
      `INSERT INTO players (name, nickname, date_of_birth, phone_number, jersey_number, position)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, nickname ?? null, date_of_birth ?? null, phone_number ?? null, jersey_number ?? null, position ?? null]
    );
    const player = playerResult.rows[0];

    for (let month = 1; month <= 12; month++) {
      await client.query(
        `INSERT INTO monthly_dues (player_id, month, year)
         VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [player.id, month, activeYear]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(player);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// PUT /api/players/:id
router.put('/:id', requireAdmin, async (req, res) => {
  const parse = playerSchema.partial().safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.flatten().fieldErrors });
    return;
  }

  const data = parse.data;
  const fields = ['name', 'nickname', 'date_of_birth', 'phone_number', 'jersey_number', 'position'] as const;
  const setClauses: string[] = [];
  const values: unknown[] = [];

  fields.forEach((field) => {
    if (field in data) {
      setClauses.push(`${field} = $${values.length + 1}`);
      values.push(data[field] ?? null);
    }
  });

  if (setClauses.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  values.push(req.params.id);
  try {
    const result = await pool.query(
      `UPDATE players SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (!result.rows[0]) { res.status(404).json({ error: 'Player not found' }); return; }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/players/:id/photo
router.post('/:id/photo', requireAdmin, upload.single('photo'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No image file provided' });
    return;
  }
  try {
    const filename = `player-${Date.now()}${require('path').extname(req.file.originalname).toLowerCase()}`;
    const photoUrl = await storePhoto(req.file.buffer, filename);
    const result = await pool.query(
      'UPDATE players SET photo_url = $1 WHERE id = $2 RETURNING photo_url',
      [photoUrl, req.params.id]
    );
    if (!result.rows[0]) { res.status(404).json({ error: 'Player not found' }); return; }
    res.json({ photo_url: photoUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Photo upload failed' });
  }
});

// DELETE /api/players/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM players WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) { res.status(404).json({ error: 'Player not found' }); return; }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
