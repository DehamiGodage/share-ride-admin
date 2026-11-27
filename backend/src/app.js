import 'dotenv/config';
import { pathToFileURL } from 'node:url';
import authRoutes from './modules/auth/auth.routes.js';
import adminRoutes from './modules/index.js';
import express from 'express';
import cors from 'cors';
import connectDB from './config/db.js';
import { authenticate } from './core/auth.js';

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

// Public
app.get('/health', (req, res) => res.json({ status: 'ok' }));


app.use('/auth', authRoutes);

// Everything under /admin goes through authenticate
app.use('/admin', authenticate, adminRoutes);

// Unknown route
app.use((req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

// Error handler: same error format for everyone
app.use((err, req, res, next) => {
  if (!err.status || err.status >= 500) console.error(err);
  res.status(err.status || 500).json({
    error: { code: err.code || 'SERVER_ERROR', message: err.message, ...(err.details && { details: err.details }) },
  });
});

export default app;

// Start the server only when this file is run directly (npm run dev), not when tests import it.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = process.env.PORT || 4000;
  connectDB()
    .then(() => app.listen(port, () => console.log(`Backend running on port ${port}`)))
    .catch((err) => {
      console.error('[db] Connection failed:', err.message);
      process.exit(1);
    });
}
