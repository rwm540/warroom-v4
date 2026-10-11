/**
 * سرویس ارسال پیامک از طریق IPPanel
 */
const { createClient } = require('ippanel-node-sdk');

const apiKey = process.env.IPPANEL_API_KEY;
const fromNumber = process.env.IPPANEL_FROM_NUMBER;

if (!apiKey || !fromNumber) {
  throw new Error('❌ تنظیمات IPPanel ناقص است. لطفاً IPPANEL_API_KEY و IPPANEL_FROM_NUMBER را در .env تنظیم کنید.');
}

const client = createClient(apiKey);

/**
 * ارسال کد OTP به شماره موبایل
 * @param {string} phone - شماره موبایل با فرمت +989123456789
 * @param {string} otp - کد OTP شش رقمی
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
async function sendOTP(phone, otp) {
  try {
    const message = `کد تایید شما در سامانه اتاق جنگ:\n${otp}\n\nاین کد تا 5 دقیقه اعتبار دارد.`;
    
    console.log(`📤 درحال ارسال OTP به ${phone}...`);
    
    const result = await client.sendWebservice(
      message,
      fromNumber,
      [phone]
    );
    
    // بررسی موفقیت ارسال
    if (result?.meta?.status === true) {
      const messageId = result.data?.message_outbox_ids?.[0];
      console.log(`✅ پیامک با موفقیت ارسال شد. شناسه: ${messageId}`);
      
      return {
        success: true,
        messageId: messageId?.toString()
      };
    } else {
      const errorMsg = result?.meta?.message || 'خطای نامشخص در ارسال پیامک';
      console.error(`❌ خطا در ارسال پیامک:`, errorMsg);
      
      return {
        success: false,
        error: errorMsg
      };
    }
  } catch (error) {
    console.error('❌ استثنا در ارسال پیامک:', error.message);
    return {
      success: false,
      error: 'خطای سرور در ارسال پیامک'
    };
  }
}

/**
 * ارسال پیامک با متن دلخواه (برای استفاده‌های عمومی)
 * @param {string} phone - شماره موبایل
 * @param {string} message - متن پیامک
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
async function sendSMS(phone, message) {
  try {
    const result = await client.sendWebservice(
      message,
      fromNumber,
      [phone]
    );
    
    if (result?.meta?.status === true) {
      return {
        success: true,
        messageId: result.data?.message_outbox_ids?.[0]?.toString()
      };
    } else {
      return {
        success: false,
        error: result?.meta?.message || 'خطا در ارسال'
      };
    }
  } catch (error) {
    console.error('خطا در sendSMS:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  sendOTP,
  sendSMS
};
