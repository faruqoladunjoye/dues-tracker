import { Router } from 'express';
import { pool } from '../db';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();

// PATCH /api/dues/:playerId/:month
router.patch('/:playerId/:month', requireAdmin, async (req, res) => {
  const playerId = parseInt(req.params.playerId, 10);
  const month = parseInt(req.params.month, 10);

  if (isNaN(playerId) || isNaN(month) || month < 1 || month > 12) {
    res.status(400).json({ error: 'Invalid player ID or month (1–12)' });
    return;
  }

  try {
    const settingsResult = await pool.query("SELECT value FROM settings WHERE key = 'active_year'");
    const activeYear = parseInt(settingsResult.rows[0]?.value ?? '2026', 10);

    const result = await pool.query(
      `INSERT INTO monthly_dues (player_id, month, year, paid, paid_at)
       VALUES ($1, $2, $3, TRUE, NOW())
       ON CONFLICT (player_id, month, year)
       DO UPDATE SET
         paid    = NOT monthly_dues.paid,
         paid_at = CASE WHEN NOT monthly_dues.paid THEN NOW() ELSE NULL END
       RETURNING *`,
      [playerId, month, activeYear]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
