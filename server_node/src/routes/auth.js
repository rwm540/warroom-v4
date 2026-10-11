import { Router } from 'express';
import { findUserByNationalCode } from '../lib/supabase.js';
import { authGuard, issueRefreshToken, rotateRefreshToken, revokeRefreshToken, signAccessToken } from '../lib/tokens.js';

const router = Router();

router.get('/me', authGuard, async (req, res, next) => {
  try {
    const userRow = await findUserByNationalCode(req.user.nationalCode);
    const data = userRow?.data || {};
    res.json({
      id: req.user.sub,
      national_code: req.user.nationalCode,
      role: data.role || req.user.role,
      first_name: data.first_name || '',
      last_name: data.last_name || '',
      phone: data.phone ? undefined : undefined,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const raw = String(req.body?.refreshToken || '');
    const userId = await rotateRefreshToken(raw);
    const accessToken = signAccessToken({ id: userId, national_code: '', role: 'user' });
    const refreshToken = await issueRefreshToken(userId);
    res.json({ success: true, accessToken, refreshToken, tokenType: 'Bearer' });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    await revokeRefreshToken(String(req.body?.refreshToken || ''));
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
