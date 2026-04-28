import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();

// GET /api/settings — public, returns active_year and any other settings
router.get('/', async (_req, res) => {
  try {
    const result = await pool.query('SELECT key, value FROM settings');
    const settings: Record<string, string> = {};
    result.rows.forEach((row) => {
      settings[row.key] = row.value;
    });
    res.json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/settings/year — admin only, switch to a new year and provision dues rows
router.put('/year', requireAdmin, async (req, res) => {
  const parse = z
    .object({ year: z.number().int().min(2024).max(2100) })
    .safeParse(req.body);

  if (!parse.success) {
    res.status(400).json({ error: 'year must be an integer between 2024 and 2100' });
    return;
  }

  const { year } = parse.data;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      "UPDATE settings SET value = $1 WHERE key = 'active_year'",
      [year.toString()]
    );

    // Provision 12 monthly_dues rows for every existing player for the new year
    const players = await client.query('SELECT id FROM players');
    for (const player of players.rows) {
      for (let month = 1; month <= 12; month++) {
        await client.query(
          `INSERT INTO monthly_dues (player_id, month, year)
           VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
          [player.id, month, year]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ activeYear: year });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

export default router;
