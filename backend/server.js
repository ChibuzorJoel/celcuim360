/**
 * server.js - Celcium360 Solutions Backend
 * Production Ready Version (Updated)
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// -----------------------------------------------------------------------------
// CRYPTO POLYFILL
// -----------------------------------------------------------------------------

if (!global.crypto) {
  global.crypto = crypto.webcrypto || {
    subtle: crypto.webcrypto?.subtle || {},
    randomUUID: crypto.randomUUID
      ? crypto.randomUUID.bind(crypto)
      : () =>
          'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = (Math.random() * 16) | 0;
            return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
          }),
    getRandomValues: arr => crypto.randomFillSync(arr),
  };
}

dotenv.config({
  path: path.join(__dirname, '.env'),
});

const app = express();
const PORT = process.env.PORT || 5000;

// -----------------------------------------------------------------------------
// IMPROVED CORS CONFIGURATION
// -----------------------------------------------------------------------------

const ALLOWED_ORIGINS = [
  'https://celcium360solutions.com',
  'https://www.celcium360solutions.com',
  'https://api.celcium360solutions.com',
  'https://celcuim.netlify.app',

  'http://localhost:4200',
  'http://127.0.0.1:4200',
  'http://localhost:3000',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (Postman, curl, mobile apps, server-to-server)
      if (!origin) {
        return callback(null, true);
      }

      // Flexible origin matching
      const isAllowed = ALLOWED_ORIGINS.some(allowedOrigin => 
        origin === allowedOrigin || origin.startsWith(allowedOrigin)
      );

      if (isAllowed) {
        return callback(null, true);
      }

      console.warn(`❌ CORS BLOCKED: ${origin}`);
      return callback(new Error(`Origin not allowed by CORS: ${origin}`));
    },

    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'ngrok-skip-browser-warning',
      'X-Requested-With',
      'X-CSRF-Token',
    ],
    credentials: true,           // Recommended for auth
    maxAge: 86400,               // 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

// Explicit preflight handler
app.options('*', (req, res) => {
  res.status(204).end();
});

// -----------------------------------------------------------------------------
// SECURITY
// -----------------------------------------------------------------------------

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  })
);

// -----------------------------------------------------------------------------
// BODY PARSERS
// -----------------------------------------------------------------------------

app.use(express.json({ limit: '10mb' }));
app.use(
  express.urlencoded({
    extended: true,
    limit: '10mb',
  })
);

// -----------------------------------------------------------------------------
// LOGGING
// -----------------------------------------------------------------------------

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// -----------------------------------------------------------------------------
// FAVICON
// -----------------------------------------------------------------------------

app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// -----------------------------------------------------------------------------
// DEBUG ROUTE
// -----------------------------------------------------------------------------

app.get('/api/debug', (req, res) => {
  res.json({
    success: true,
    origin: req.headers.origin || null,
    host: req.headers.host,
    forwardedHost: req.headers['x-forwarded-host'] || null,
    forwardedProto: req.headers['x-forwarded-proto'] || null,
    timestamp: new Date().toISOString(),
  });
});

// -----------------------------------------------------------------------------
// HEALTH CHECK
// -----------------------------------------------------------------------------

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'OK',
    message: 'Celcium360 API Running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'OK',
    message: 'Celcium360 API Running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// -----------------------------------------------------------------------------
// UPLOADS DIRECTORY
// -----------------------------------------------------------------------------

const uploadsDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(
  '/uploads',
  express.static(uploadsDir, {
    setHeaders: (res) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Origin', '*');
    },
  })
);

app.get('/uploads/:filename', (req, res) => {
  const filePath = path.join(uploadsDir, req.params.filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      success: false,
      message: 'File not found',
    });
  }

  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf',
  };

  const ext = path.extname(filePath).toLowerCase();

  res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');

  res.sendFile(filePath);
});

// -----------------------------------------------------------------------------
// DATABASE CONNECTION
// -----------------------------------------------------------------------------

const mongooseConnect = require('./config/database');
mongooseConnect();

// -----------------------------------------------------------------------------
// API ROUTES
// -----------------------------------------------------------------------------

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/registration', require('./routes/registration.routes'));
app.use('/api/admin/registrations', require('./routes/admin.routes'));

// -----------------------------------------------------------------------------
// ERROR HANDLER
// -----------------------------------------------------------------------------

app.use((err, req, res, next) => {
  console.error('[ERROR]', err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: Object.values(err.errors).map(e => e.message),
    });
  }

  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'This email is already registered.',
    });
  }

  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: 'File too large. Maximum size is 5MB.',
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

// -----------------------------------------------------------------------------
// 404 HANDLER
// -----------------------------------------------------------------------------

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// -----------------------------------------------------------------------------
// START SERVER
// -----------------------------------------------------------------------------

const server = app.listen(PORT, () => {
  console.log('========================================');
  console.log('🚀 Celcium360 API Started');
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('========================================');
});

// -----------------------------------------------------------------------------
// GRACEFUL SHUTDOWN
// -----------------------------------------------------------------------------

process.on('SIGTERM', () => {
  console.log('SIGTERM received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = app;