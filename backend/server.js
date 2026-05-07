/**
 * server.js - Main Express server entry point
 * Celcium360 Solutions - Work Readiness Program Registration API
 */

/**
 * FIX FOR NODE 18.12 + MongoDB/Mongoose
 * Prevents:
 * ReferenceError: crypto is not defined
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

    getRandomValues: (arr) => {
      return nodeCrypto.randomFillSync(arr);
    }
  };
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const mongooseConnect = require('./config/database');

// Load environment variables
dotenv.config({
  path: path.join(__dirname, '.env')
});

const app = express();

//
// ── Middleware ───────────────────────────────────────────────
//

// Security
app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: 'cross-origin'
    }
  })
);
 
app.use('/api/auth', require('./routes/auth.routes'));
// CORS Configuration
app.use(
  cors({
    origin: [
      'https://celcuim.netlify.app',
      'http://localhost:4200'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Request logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Body parsing
app.use(express.json({ limit: '10mb' }));

app.use(
  express.urlencoded({
    limit: '10mb',
    extended: true
  })
);

//
// ── Static Files for Uploads ─────────────────────────────────
//

const uploadsDir = path.join(__dirname, 'uploads');

// Ensure uploads folder exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, {
    recursive: true
  });
}

// Static access
app.use('/uploads', express.static(uploadsDir));

// Serve uploaded files with correct MIME type
app.get('/uploads/:filename', (req, res) => {
  const filepath = path.join(uploadsDir, req.params.filename);

  if (!fs.existsSync(filepath)) {
    return res.status(404).json({
      success: false,
      message: 'File not found'
    });
  }

  const ext = path.extname(filepath).toLowerCase();

  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.pdf': 'application/pdf',
    '.gif': 'image/gif',
    '.webp': 'image/webp'
  };

  const contentType =
    mimeTypes[ext] || 'application/octet-stream';

  res.setHeader('Content-Type', contentType);
  res.setHeader(
    'Cross-Origin-Resource-Policy',
    'cross-origin'
  );

  res.sendFile(filepath);
});

//
// ── Database Connection ──────────────────────────────────────
//

mongooseConnect();

//
// ── API Routes ───────────────────────────────────────────────
//

app.use(
  '/api/registration',
  require('./routes/registration.routes')
);

// Alias for admin routes
app.use(
  '/api/registrations',
  require('./routes/registration.routes')
);

app.use(
  '/api/health',
  require('./routes/health.routes')
);

//
// ── Simple Health Check Route ────────────────────────────────
//

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Celcium360 Registration API is running',
    timestamp: new Date().toISOString(),
    environment:
      process.env.NODE_ENV || 'development'
  });
});

//
// ── Global Error Handler ─────────────────────────────────────
//

app.use((err, req, res, next) => {
  console.error('❌ Error:', err);

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: Object.values(err.errors).map(
        (e) => e.message
      )
    });
  }

  // Duplicate email / unique key errors
  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      message:
        'This email is already registered. Please use a different email.'
    });
  }

  // Multer file upload errors
  if (err.name === 'MulterError') {
    if (err.code === 'FILE_TOO_LARGE') {
      return res.status(413).json({
        success: false,
        message:
          'File is too large. Maximum size is 5MB.'
      });
    }

    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(413).json({
        success: false,
        message:
          'Too many files uploaded.'
      });
    }

    return res.status(400).json({
      success: false,
      message: `File upload error: ${err.message}`
    });
  }

  const statusCode =
    err.statusCode || err.status || 500;

  const message =
    err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    error:
      process.env.NODE_ENV === 'development'
        ? err.stack
        : undefined
  });
});

//
// ── 404 Handler ──────────────────────────────────────────────
//

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.path}`
  });
});

//
// ── Start Server ─────────────────────────────────────────────
//

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   Celcium360 Registration Server                         ║');
  console.log(`║   🚀 Running on http://localhost:${PORT}                        ║`);
  console.log(
    `║   📧 Environment: ${process.env.NODE_ENV || 'development'}`
  );
  console.log(
    `║   🔌 CORS Origin: ${
      process.env.CORS_ORIGIN || 'http://localhost:4200'
    }`
  );
  console.log('║   ✅ Ready to accept registrations                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
});

//
// ── Graceful Shutdown ────────────────────────────────────────
//

process.on('SIGTERM', () => {
  console.log('\n⚠️ SIGTERM received. Shutting down gracefully...');

  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n⚠️ SIGINT received. Shutting down gracefully...');

  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

module.exports = app;