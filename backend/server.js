/**
 * server.js - Main Express server entry point
 * Celcium360 Solutions - Work Readiness Program Registration API
 */

const nodeCrypto = require('crypto');

if (!global.crypto) {
  global.crypto = {
    randomUUID: nodeCrypto.randomUUID
      ? nodeCrypto.randomUUID.bind(nodeCrypto)
      : () =>
          'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          }),
    getRandomValues: (arr) => nodeCrypto.randomFillSync(arr)
  };
}

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const dotenv     = require('dotenv');
const path       = require('path');
const fs         = require('fs');

const mongooseConnect = require('./config/database');

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();

// ── CORS ─────────────────────────────────────────────────────────────────
// Must be defined BEFORE all routes and BEFORE helmet

const ALLOWED_ORIGINS = [
  'https://celcuim.netlify.app',
  'https://hydrant-roamer-frenzied.ngrok-free.dev',
  'http://localhost:4200',
  'http://localhost:3000'
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow server-to-server / Postman (no origin header)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    console.warn('⚠️  CORS blocked origin:', origin);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'ngrok-skip-browser-warning'   // required for ngrok free tier
  ],
  optionsSuccessStatus: 200        // IE11 compatibility
};

// Apply CORS globally
app.use(cors(corsOptions));

// ← THIS LINE IS THE KEY FIX
// Respond to all OPTIONS preflight requests before they hit any route
app.options(/.*/, cors(corsOptions));

// ── Security ──────────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// ── Body parsing ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ── Request logging ───────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// ── Static uploads ────────────────────────────────────────────────────────
const uploadsDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use('/uploads', express.static(uploadsDir));

app.get('/uploads/:filename', (req, res) => {
  const filepath = path.join(uploadsDir, req.params.filename);

  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ success: false, message: 'File not found' });
  }

  const ext = path.extname(filepath).toLowerCase();
  const mimeTypes = {
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png':  'image/png',
    '.pdf':  'application/pdf',
    '.gif':  'image/gif',
    '.webp': 'image/webp'
  };

  res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.sendFile(filepath);
});

// ── Database ──────────────────────────────────────────────────────────────
mongooseConnect();

// ── API Routes ────────────────────────────────────────────────────────────
app.use('/api/auth',         require('./routes/auth.routes'));
app.use('/api/registration', require('./routes/registration.routes'));
app.use('/api/health',       require('./routes/health.routes'));

// Uncomment when cohort + coursework routes are ready:
// app.use('/api/cohorts',    require('./routes/cohort.routes'));
// app.use('/api/coursework', require('./routes/coursework.routes'));

// ── Health check ──────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status:      'OK',
    message:     'Celcium360 Registration API is running',
    timestamp:   new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ── Global error handler ──────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors:  Object.values(err.errors).map(e => e.message)
    });
  }

  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'This email is already registered. Please use a different email.'
    });
  }

  if (err.name === 'MulterError') {
    if (err.code === 'FILE_TOO_LARGE')  return res.status(413).json({ success: false, message: 'File is too large. Maximum size is 5MB.' });
    if (err.code === 'LIMIT_FILE_COUNT') return res.status(413).json({ success: false, message: 'Too many files uploaded.' });
    return res.status(400).json({ success: false, message: `File upload error: ${err.message}` });
  }

  res.status(err.statusCode || err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error:   process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// ── 404 handler ───────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.path}` });
});

// ── Start server ──────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   Celcium360 Registration Server                          ║');
  console.log(`║   🚀 Running on http://localhost:${PORT}                   ║`);
  console.log(`║   📧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`║   🔌 CORS Origins: ${ALLOWED_ORIGINS.join(', ')}`);
  console.log('║   ✅ Ready to accept registrations                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
});

// ── Graceful shutdown ─────────────────────────────────────────────────────
process.on('SIGTERM', () => {
  console.log('\n⚠️  SIGTERM received. Shutting down gracefully...');
  server.close(() => { console.log('✅ Server closed'); process.exit(0); });
});

process.on('SIGINT', () => {
  console.log('\n⚠️  SIGINT received. Shutting down gracefully...');
  server.close(() => { console.log('✅ Server closed'); process.exit(0); });
});

module.exports = app;