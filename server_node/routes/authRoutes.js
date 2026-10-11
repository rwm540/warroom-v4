/**
 * مسیرهای ثبت‌نام و ورود کاربر
 */
const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { validateNationalCode, normalizePhone } = require('../utils/otp');
const { apiLimiter } = require('../middleware/rateLimiter');
const crypto = require('crypto');

/**
 * POST /api/auth/register
 * ثبت‌نام کاربر جدید در Supabase
 */
router.post('/register', apiLimiter, async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      nationalCode,
      phone,
      birthDate,
      gender,
      password,
      groupName
    } = req.body;

    // اعتبارسنجی ورودی‌ها
    if (!firstName || !lastName || !nationalCode || !phone || !birthDate || !gender) {
      return res.status(400).json({
        success: false,
        error: 'تمام فیلدها الزامی هستند'
      });
    }

    // اعتبارسنجی کد ملی
    if (!validateNationalCode(nationalCode)) {
      return res.status(400).json({
        success: false,
        error: 'کد ملی معتبر نیست'
      });
    }

    // نرمال‌سازی شماره موبایل
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return res.status(400).json({
        success: false,
        error: 'شماره موبایل معتبر نیست'
      });
    }

    // بررسی تکراری نبودن کد ملی
    const { data: existingUsers, error: checkError } = await supabase
      .from('warroom_users')
      .select('id')
      .eq('id', nationalCode)
      .limit(1);

    if (checkError) {
      console.error('خطا در بررسی کاربر:', checkError);
      return res.status(500).json({
        success: false,
        error: 'خطا در بررسی اطلاعات'
      });
    }

    if (existingUsers && existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'این کد ملی قبلاً ثبت شده است'
      });
    }

    // هش کردن رمز عبور
    let passwordHash = '';
    if (password && password.trim().length >= 8) {
      passwordHash = crypto
        .createHash('sha256')
        .update(password.trim())
        .digest('hex');
    }

    // تولید کد شخصی
    const personalCode = `90${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`;

    // داده‌های کاربر
    const userData = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      national_code: nationalCode,
      personal_code: personalCode,
      phone: normalizedPhone,
      birth_date: birthDate,
      gender: gender,
      role: 'user',
      education_level: 'متوسطه اول',
      grade: 'هشتم',
      province: 'تهران',
      city: 'تهران',
      school_name: 'دبیرستان',
      level: 1,
      points: 0,
      completed_stages: [],
      avatar_url: gender === 'دختر' 
        ? '/avatars/woman/woman_1.jpeg' 
        : '/avatars/male/male_1.jpeg',
      is_active: true,
      is_blocked: false,
      created_at: new Date().toISOString()
    };

    // اگر ثبت‌نام گروهی است
    if (groupName && groupName.trim()) {
      const groupId = `g_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      userData.group_id = groupId;
      userData.squad_rank = 'commander';
      userData.is_group_member = false;

      // ایجاد گروه
      const groupData = {
        id: groupId,
        name: groupName.trim(),
        leader_id: nationalCode,
        leader_name: `${firstName} ${lastName}`,
        members_count: 1,
        max_members: 10,
        province: 'تهران',
        city: 'تهران',
        total_points: 0,
        level: 1,
        created_at: new Date().toISOString()
      };

      // ذخیره گروه
      const { error: groupError } = await supabase
        .from('warroom_groups')
        .insert({
          id: groupId,
          data: groupData,
          updated_at: new Date().toISOString()
        });

      if (groupError) {
        console.error('خطا در ایجاد گروه:', groupError);
      }
    }

    // ذخیره کاربر در Supabase
    const { data: insertedUser, error: insertError } = await supabase
      .from('warroom_users')
      .insert({
        id: nationalCode,
        data: userData,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('خطا در ثبت کاربر:', insertError);
      return res.status(500).json({
        success: false,
        error: 'خطا در ثبت‌نام. لطفاً دوباره تلاش کنید.'
      });
    }

    // اگر رمز عبور داشت، در جدول امن ذخیره کن
    if (passwordHash) {
      await supabase
        .from('warroom_credentials')
        .insert({
          id: nationalCode,
          data: {
            password_hash: passwordHash,
            mustChangePassword: false
          },
          updated_at: new Date().toISOString()
        });
    }

    res.json({
      success: true,
      message: 'ثبت‌نام با موفقیت انجام شد',
      user: {
        id: nationalCode,
        firstName: userData.first_name,
        lastName: userData.last_name,
        phone: userData.phone,
        gender: userData.gender
      }
    });

  } catch (error) {
    console.error('خطا در ثبت‌نام:', error);
    res.status(500).json({
      success: false,
      error: 'خطای سرور در ثبت‌نام'
    });
  }
});

/**
 * POST /api/auth/check-national-code
 * بررسی وجود کد ملی در سیستم
 */
router.post('/check-national-code', apiLimiter, async (req, res) => {
  try {
    const { nationalCode } = req.body;

    if (!validateNationalCode(nationalCode)) {
      return res.status(400).json({
        success: false,
        exists: false,
        error: 'کد ملی معتبر نیست'
      });
    }

    const { data, error } = await supabase
      .from('warroom_users')
      .select('id')
      .eq('id', nationalCode)
      .limit(1);

    if (error) {
      return res.status(500).json({
        success: false,
        exists: false,
        error: 'خطا در بررسی'
      });
    }

    res.json({
      success: true,
      exists: data && data.length > 0
    });

  } catch (error) {
    console.error('خطا در بررسی کد ملی:', error);
    res.status(500).json({
      success: false,
      exists: false,
      error: 'خطای سرور'
    });
  }
});

module.exports = router;
