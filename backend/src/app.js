require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { authenticate } = require('./core/auth');

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

// Public
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Everything under /admin goes through authenticate (stub today, real JWT on day 3)
app.use('/admin', authenticate, require('./modules'));

// Unknown route
app.use((req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

// Error handler: same error format for everyone
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: { code: err.code || 'SERVER_ERROR', message: err.message },
  });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Backend running on port ${port}`));