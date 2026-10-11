import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import otpRouter from './routes/otp.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin(origin, callback) {
    if (!origin || config.corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('CORS_DENIED'));
  },
  credentials: false,
  methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600,
}));

app.use(express.json({ limit: '16kb' }));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 80,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'RATE_LIMITED', message: 'درخواست‌های زیادی ارسال شده است.' },
}));

const healthHandler = (_req, res) => {
  res.json({
    ok: true,
    service: 'warroom-server-node',
    smsConfigured: Boolean(config.ippanelKey && config.ippanelFrom),
    dbConfigured: Boolean(config.supabaseUrl && config.supabaseServiceRoleKey),
  });
};
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

app.use('/api/otp', otpRouter);

app.use((err, _req, res, _next) => {
  const status = Number(err.status || (err.message === 'CORS_DENIED' ? 403 : 500));
  const safeMessage = status >= 500
    ? 'خطای داخلی سرور'
    : (err.message === 'CORS_DENIED' ? 'درخواست از مبدأ غیرمجاز است.' : err.message);
  res.status(status).json({
    error: err.code || 'REQUEST_FAILED',
    message: safeMessage,
  });
});

app.listen(config.port, config.host, () => {
  console.info(`[warroom-server-node] listening on ${config.host}:${config.port}`);
});
