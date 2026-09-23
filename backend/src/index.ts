import express from 'express';
import cors from 'cors';
import { sessions } from './routes/sessions.js';
import { alerts } from './routes/alerts.js';
import { users } from './routes/users.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/sessions', sessions);
app.use('/alerts', alerts);
app.use('/users', users);

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`CardioAlert backend escuchando en :${port}`);
});
