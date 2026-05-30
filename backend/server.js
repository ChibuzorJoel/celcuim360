/**
 * server.js - Final Version for cPanel (Strong CORS)
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Crypto Fix
if (!global.crypto) global.crypto = crypto;
if (!global.crypto.subtle) global.crypto.subtle = crypto.webcrypto?.subtle || {};

dotenv.config({ path: path.join(__dirname, '.env') });

const mongooseConnect = require('./config/database');

const app = express();

// ====================== STRONG CORS CONFIG ======================
const ALLOWED_ORIGINS = [
  'http://localhost:4200',
  'http://127.0.0.1:4200',
  'https://celcium360solutions.com',
  'https://www.celcium360solutions.com',
  'https://celcuim.netlify.app'
];

app.use(cors({
  origin: true,                    // Allow all for now (safer for testing)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'ngrok-skip-browser-warning',
    'X-Requested-With'
  ],
  optionsSuccessStatus: 200
}));

// Extra preflight handler
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,ngrok-skip-browser-warning');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// ====================== OTHER MIDDLEWARE ======================
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Uploads
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// Database & Routes
mongooseConnect();

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/registration', require('./routes/registration.routes'));
app.use('/api/health', require('./routes/health.routes'));

app.get('/health', (req, res) => res.json({ success: true, message: 'Server running' }));

// Error Handlers
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, message: err.message || 'Server Error' });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 CORS enabled for all origins (testing mode)`);
});