import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import authRouter from './routes/auth';
import playersRouter from './routes/players';
import duesRouter from './routes/dues';
import settingsRouter from './routes/settings';

dotenv.config();

if (!process.env.DATABASE_URL) throw new Error('Missing env var: DATABASE_URL');
if (!process.env.JWT_SECRET)   throw new Error('Missing env var: JWT_SECRET');

const app  = express();
const PORT = process.env.PORT ?? 4000;

app.use(cors({ origin: process.env.FRONTEND_URL ?? '*' }));
app.use(express.json());

// Serve uploaded player photos as static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth',     authRouter);
app.use('/api/players',  playersRouter);
app.use('/api/dues',     duesRouter);
app.use('/api/settings', settingsRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => console.log(`Akoka FC backend running on port ${PORT}`));
