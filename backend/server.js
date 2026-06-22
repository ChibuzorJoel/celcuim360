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
const PORT = process.env.PORT || 3000;

// -----------------------------------------------------------------------------
// IMPROVED CORS CONFIGURATION
// -----------------------------------------------------------------------------

const ALLOWED_ORIGINS = [
  'https://celcium360solutions.com',
  'https://www.celcium360solutions.com',
  'https://api.celcium360solutions.com',
  'https://celcuim360-7934.onrender.com',
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
    credentials: true,
    maxAge: 86400,
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
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
// UPLOADS — static middleware + explicit route handlers
//
// ORDER MATTERS:
//   1. express.static handles the common case efficiently (images, PDFs, etc.)
//   2. /uploads/final-videos/:filename  — explicit handler for video subfolder
//      with proper MIME types and Accept-Ranges so the browser player can seek
//   3. /uploads/:filename               — fallback for top-level upload files
//
// The generic /:filename param only captures ONE path segment, so without step 2
// any request to /uploads/final-videos/xxx.mp4 falls straight to the 404 handler.
// -----------------------------------------------------------------------------

const uploadsDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 1 — Static middleware (covers everything efficiently for normal cases)
app.use(
  '/uploads',
  express.static(uploadsDir, {
    setHeaders: (res) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Origin', '*');
    },
  })
);

// 2 — Explicit handler for /uploads/final-videos/:filename
//     Needs to come BEFORE the generic /:filename handler.
//     Supports range requests so the <video> element can seek/scrub.
app.get('/uploads/final-videos/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadsDir, 'final-videos', filename);

  if (!fs.existsSync(filePath)) {
    console.warn(`[Video 404] ${filePath}`);
    return res.status(404).json({ success: false, message: 'Video file not found.' });
  }

  const ext = path.extname(filename).toLowerCase();
  const videoMimeTypes = {
    '.mp4':  'video/mp4',
    '.mov':  'video/quicktime',
    '.webm': 'video/webm',
    '.avi':  'video/x-msvideo',
    '.mkv':  'video/x-matroska',
    '.ogv':  'video/ogg',
  };
  const contentType = videoMimeTypes[ext] || 'video/mp4';

  const stat     = fs.statSync(filePath);
  const fileSize = stat.size;
  const range    = req.headers.range;

  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (range) {
    // Partial content — lets the browser seek to any point in the video
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end   = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      'Content-Range':  `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges':  'bytes',
      'Content-Length': chunkSize,
      'Content-Type':   contentType,
    });

    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    // Full file
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type':   contentType,
      'Accept-Ranges':  'bytes',
    });

    fs.createReadStream(filePath).pipe(res);
  }
});

// 3 — Fallback handler for top-level /uploads/:filename (images, PDFs, etc.)
app.get('/uploads/:filename', (req, res) => {
  const filePath = path.join(uploadsDir, req.params.filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'File not found' });
  }

  const mimeTypes = {
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png':  'image/png',
    '.gif':  'image/gif',
    '.webp': 'image/webp',
    '.pdf':  'application/pdf',
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

app.use('/api/auth',                  require('./routes/auth.routes'));
app.use('/api/registration',          require('./routes/registration.routes'));
app.use('/api/admin/registrations',   require('./routes/admin.routes'));
app.use('/api/coursework-questions',  require('./routes/courseworkquestions.routes'));
app.use('/api/student',               require('./routes/student.routes'));
app.use('/api',                       require('./routes/student.routes'));
app.use('/api/final-exam',            require('./routes/finalexam.routes'));
app.use('/api/final-video',           require('./routes/final-video.routes'));

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