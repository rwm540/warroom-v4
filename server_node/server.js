/**
 * 🛡️ سرور امن OTP برای پلتفرم اتاق جنگ
 * ارسال و اعتبارسنجی کد تایید با IPPanel + Supabase + JWT
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const otpRoutes = require('./routes/otpRoutes');
const { apiLimiter } = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 5000;

// Routes
const otpRoutes = require('./routes/otpRoutes');
const authRoutes = require('./routes/authRoutes');

// ===== امنیت و Middleware =====

// Helmet: محافظت از هدرهای HTTP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS: فقط از دامنه‌های مجاز
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://warroom-game.ir',
  'https://dewfcjxlfolwvxqofocc.supabase.co'
];

app.use(cors({
  origin: function (origin, callback) {
    // اجازه دسترسی بدون origin (مثلاً Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('دسترسی از این دامنه مجاز نیست'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON با محدودیت حجم
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// محدودسازی عمومی درخواست‌ها
app.use('/api/', apiLimiter);

// ===== Health Check =====
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'WarRoom OTP Server',
    version: '1.0.0'
  });
});

// ===== API Routes =====
app.use('/api/otp', otpRoutes);
app.use('/api/auth', authRoutes);

// ===== مسیر پیش‌فرض =====
app.get('/', (req, res) => {
  res.json({
    message: '🛡️ سرور OTP اتاق جنگ',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      sendOTP: 'POST /api/otp/send',
      verifyOTP: 'POST /api/otp/verify',
      resendOTP: 'POST /api/otp/resend'
    }
  });
});

// ===== مدیریت خطاها =====

// مسیر یافت نشد
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'مسیر درخواستی یافت نشد'
  });
});

// مدیریت خطاهای عمومی
app.use((err, req, res, next) => {
  console.error('❌ خطای سرور:', err.stack);
  
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'خطای داخلی سرور' 
      : err.message
  });
});

// ===== راه‌اندازی سرور =====
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 سرور OTP اتاق جنگ با موفقیت راه‌اندازی شد');
  console.log('='.repeat(60));
  console.log(`📡 آدرس سرور: http://localhost:${PORT}`);
  console.log(`🌍 محیط: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📱 سرویس پیامک: IPPanel`);
  console.log(`🗄️  دیتابیس: Supabase`);
  console.log('='.repeat(60) + '\n');
  
  // بررسی تنظیمات حیاتی
  const requiredEnvVars = [
    'IPPANEL_API_KEY',
    'IPPANEL_FROM_NUMBER',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'JWT_SECRET'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn('⚠️  هشدار: متغیرهای محیطی زیر تنظیم نشده‌اند:');
    missingVars.forEach(varName => console.warn(`   - ${varName}`));
    console.warn('\n');
  } else {
    console.log('✅ تمام تنظیمات محیطی بارگذاری شدند\n');
  }
});

// مدیریت Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('\n⚠️  سیگنال SIGTERM دریافت شد. در حال خاموش شدن...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n⚠️  سیگنال SIGINT دریافت شد. در حال خاموش شدن...');
  process.exit(0);
});

module.exports = app;
