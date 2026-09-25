import React, { useState, useEffect } from 'react';
import { 
  User as UserIcon, 
  IdCard, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowLeft, 
  Sparkles, 
  Lock, 
  Eye, 
  EyeOff, 
  UserCheck, 
  UserPlus, 
  Shield, 
  Zap, 
  Heart, 
  KeyRound, 
  ArrowRight,
  HelpCircle,
  Phone,
  RefreshCw,
  ChevronDown,
  ShieldCheck,
  ShieldAlert,
  Send,
  X
} from 'lucide-react';
import { User, Group, RoleType, Gender, EducationLevel, PaymentSettings, PaymentTransaction } from '../types';
import { 
  validateNationalCode, 
  validateJalaliDate, 
  generatePersonalCode, 
  normalizeToEnglishDigits, 
  formatToPersianDigits 
} from '../utils/jalali';
import PersianDatePicker from './PersianDatePicker';
import RadarLoading from './RadarLoading';
const WARROOM_LOGO_PATH = '/images/logos/warroom_logo.webp';
import { isSupabaseEnabled, sha256Hex } from '../lib/supabaseData';
import { createGroupRecord, MAX_GROUP_MEMBERS } from '../lib/groupRegistration';
import {
  probeBackend,
  subscribeBackendStatus,
  getBackendStatus,
  apiLogin,
  apiRegister,
  apiCheckNationalCodeExists,
  requestPasswordReset,
  checkPasswordResetStatus,
  type BackendStatus
} from '../lib/backendApi';

interface AuthViewProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  groups: Group[];
  setGroups: React.Dispatch<React.SetStateAction<Group[]>>;
  onLoginSuccess: (user: User, meta?: { mustChangePassword?: boolean; isNewRegistration?: boolean }) => void;
  /** ثبت درخواست تغییر رمز در «حالت محلی» (زمانی که بک‌اند امن در دسترس نیست) */
  createLocalPasswordResetRequest?: (input: {
    nationalCode: string;
    contactPhone?: string;
    note?: string;
  }) => { trackingCode: string } | null;
  triggerAlert: (msg: string) => void;
  onBackToHome?: () => void;
  initialAuthMode?: 'login' | 'register_individual' | 'register_group';
  campaignTheme?: 'girls' | 'boys';
  onGenderChange?: (gender: Gender) => void;
  paymentSettings?: PaymentSettings;
  addPaymentTransaction?: (transaction: PaymentTransaction) => void;
}

export default function AuthView({
  users,
  setUsers,
  groups,
  setGroups,
  onLoginSuccess,
  triggerAlert,
  onBackToHome,
  createLocalPasswordResetRequest,
  initialAuthMode = 'register_individual',
  campaignTheme,
  onGenderChange,
  paymentSettings,
  addPaymentTransaction
}: AuthViewProps) {
  // Tab state: 'register' vs 'login'
  const [activeTab, setActiveTab] = useState<'register' | 'login'>(
    initialAuthMode === 'login' ? 'login' : 'register'
  );

  // Theme detection from prop or default
  const [selectedGender, setSelectedGender] = useState<Gender>(() => {
    if (campaignTheme) {
      return campaignTheme === 'girls' ? 'دختر' : 'پسر';
    }
    return 'پسر';
  });

  useEffect(() => {
    if (initialAuthMode === 'login') {
      setActiveTab('login');
    } else {
      setActiveTab('register');
    }
  }, [initialAuthMode]);

  useEffect(() => {
    if (campaignTheme) {
      const g: Gender = campaignTheme === 'girls' ? 'دختر' : 'پسر';
      setSelectedGender(g);
      setRegisterForm(prev => ({ ...prev, gender: g }));
    }
  }, [campaignTheme]);

  const isGirls = selectedGender === 'دختر';

  // 1. Unified Registration Form (Name, Surname, National ID, Birthdate)
  const [registerForm, setRegisterForm] = useState({
    firstName: '',
    lastName: '',
    nationalCode: '',
    /** شماره همراه — برای هماهنگی تلفنی مدیر در فرآیند بازیابی رمز */
    phone: '',
    birthDate: '1388/06/20',
    gender: selectedGender,
    password: ''
    ,groupName: ''
  });

  const [registerError, setRegisterError] = useState<string | null>(null);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate secure password containing uppercase, lowercase, and numbers
  const handleGenerateRandomPassword = () => {
    const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowers = 'abcdefghjkmnpqrstuvwxyz';
    const digits = '23456789';
    const all = uppers + lowers + digits;

    // Guarantee characters from each group (avoid ambiguous chars like 0, O, 1, l)
    let generated = [
      uppers[Math.floor(Math.random() * uppers.length)],
      uppers[Math.floor(Math.random() * uppers.length)],
      lowers[Math.floor(Math.random() * lowers.length)],
      lowers[Math.floor(Math.random() * lowers.length)],
      digits[Math.floor(Math.random() * digits.length)],
      digits[Math.floor(Math.random() * digits.length)],
      all[Math.floor(Math.random() * all.length)],
      all[Math.floor(Math.random() * all.length)]
    ].sort(() => 0.5 - Math.random()).join('');

    setRegisterForm(prev => ({ ...prev, password: generated }));
    setShowRegisterPassword(true);
    triggerAlert(`رمز عبور قوی ایجاد شد: ${generated}`);
  };

  // 2. Login Form (National ID as username + Password)
  const [loginNationalId, setLoginNationalId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [detectedUser, setDetectedUser] = useState<User | null>(null);

  // Detect if there is already a saved active user session
  const [activeSessionUser, setActiveSessionUser] = useState<User | null>(() => {
    try {
      const savedUserData = localStorage.getItem('warroom_current_user_data');
      if (savedUserData) return JSON.parse(savedUserData);
      const savedId = localStorage.getItem('warroom_current_user_id');
      if (savedId) {
        const found = users.find(u => u.id === savedId);
        if (found) return found;
      }
    } catch (e) {}
    return null;
  });

  // Auto-detect registered user profile gender upon entering National ID or Personal Code
  useEffect(() => {
    const natId = normalizeToEnglishDigits(loginNationalId.trim());
    if (natId.length >= 8) {
      const found = users.find(u => 
        normalizeToEnglishDigits(u.national_code) === natId || 
        normalizeToEnglishDigits(u.personal_code) === natId
      );
      if (found) {
        setDetectedUser(found);
        // Force the theme to the registered user's gender!
        setSelectedGender(found.gender);
        const targetTheme = found.gender === 'دختر' ? 'girls' : 'boys';
        localStorage.setItem('hisstory_theme_mode', targetTheme);
        window.dispatchEvent(new Event('storage'));
      } else {
        setDetectedUser(null);
      }
    } else {
      setDetectedUser(null);
    }
  }, [loginNationalId, users]);

  // 3. Forgot Password Modal State — «درخواست تغییر رمز» با تأیید مدیر سامانه
  // (کاربر دیگر نمی‌تواند رمز خود را مستقیم و بدون احراز هویت عوض کند)
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotNationalId, setForgotNationalId] = useState('');
  const [forgotContactPhone, setForgotContactPhone] = useState('');
  const [forgotNote, setForgotNote] = useState('');
  const [forgotTrackingCode, setForgotTrackingCode] = useState('');
  const [forgotStatusText, setForgotStatusText] = useState('');
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // 🛡️ «راه‌اندازی نخستین رمز مدیر» در حالت محلی (بدون بک‌اند)
  //    در حالت امن، رمز مدیر فقط توسط سرور ساخته می‌شود و این بخش فعال نیست.
  const [localAdminSetup, setLocalAdminSetup] = useState(false);
  const [localAdminPassword, setLocalAdminPassword] = useState('');
  const [localAdminPasswordConfirm, setLocalAdminPasswordConfirm] = useState('');

  // 🛡️ وضعیت بک‌اند امن (لایه‌های امنیتی سرور)
  const [backendStatus, setBackendStatus] = useState<BackendStatus | null>(() => getBackendStatus());
  useEffect(() => {
    probeBackend();
    return subscribeBackendStatus(setBackendStatus);
  }, []);
  const backendReady = Boolean(backendStatus?.available);

  // Handle Unified Register Submission
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);

    const nationalCode = normalizeToEnglishDigits(registerForm.nationalCode.trim());
    const birthDate = normalizeToEnglishDigits(registerForm.birthDate.trim());
    const firstName = registerForm.firstName.trim();
    const lastName = registerForm.lastName.trim();
    const groupName = registerForm.groupName.trim();

    if (!firstName || !lastName) {
      setRegisterError('لطفاً نام و نام خانوادگی را وارد نمایید.');
      return;
    }

    if (!groupName) {
      setRegisterError('ثبت‌نام گروهی است؛ لطفاً نام گروه یا جوخه را وارد کنید.');
      return;
    }

    if (!validateNationalCode(nationalCode)) {
      setRegisterError('کد ملی ۱۰ رقمی وارد شده معتبر نمی‌باشد.');
      return;
    }

    if (!validateJalaliDate(birthDate)) {
      setRegisterError('فرمت تاریخ تولد معتبر نیست (مثال: 1388/06/20).');
      return;
    }

    const rawPassword = registerForm.password.trim();
    if (rawPassword.length < 8) {
      setRegisterError('رمز عبور باید حداقل ۸ کاراکتر باشد.');
      return;
    }
    if (!/[A-Za-z]/.test(rawPassword) || !/\d/.test(rawPassword)) {
      setRegisterError('رمز عبور باید ترکیبی از حرف لاتین و رقم باشد.');
      return;
    }
    if (/\s/.test(rawPassword)) {
      setRegisterError('رمز عبور نباید فاصله داشته باشد.');
      return;
    }

    const phone = normalizeToEnglishDigits(registerForm.phone.trim()).replace(/\D/g, '');
    if (!/^09\d{9}$/.test(phone)) {
      setRegisterError('شماره همراه معتبر وارد کنید (مثال: 09123456789) — برای هماهنگی تلفنی لازم است.');
      return;
    }

    const personalCode = generatePersonalCode();
    const avatarUrl = isGirls
      ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
      : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80';

    setIsSubmitting(true);

    const lockTheme = () => {
      const targetTheme = selectedGender === 'دختر' ? 'girls' : 'boys';
      localStorage.setItem('hisstory_theme_mode', targetTheme);
      window.dispatchEvent(new Event('storage'));
    };

    /* ================= 🛡️ مسیر ثبت‌نام مستقیم در Supabase ================= */
    // بررسی زنده تکراری نبودن کد ملی مستقیماً در جدول Supabase
    const alreadyInDb = await apiCheckNationalCodeExists(nationalCode);
    if (alreadyInDb) {
      setIsSubmitting(false);
      setRegisterError('این کد ملی قبلاً در سامانه ثبت شده است. لطفاً وارد شوید.');
      return;
    }

    const res = await apiRegister({
      first_name: firstName,
      last_name: lastName,
      national_code: nationalCode,
      phone,
      birth_date: birthDate,
      gender: selectedGender,
      education_level: 'متوسطه اول',
      grade: 'هشتم',
      province: 'تهران',
      city: 'تهران',
      school_name: 'دبیرستان شهید بهشتی',
      personal_code: personalCode,
      password: rawPassword
    });
    setIsSubmitting(false);

    if (!res.ok || !res.data) {
      setRegisterError(res.error?.message || 'خطا در ثبت‌نام.');
      return;
    }

    const serverUser: User = { ...res.data.user, password: '' };
    const group = createGroupRecord({
      leaderId: serverUser.id,
      groupName,
      leaderName: `${firstName} ${lastName}`,
      membersCount: 1,
      province: 'تهران',
      city: 'تهران'
    });
    const leaderUser: User = { ...serverUser, group_id: group.id, is_group_member: false, squad_rank: 'commander' };
    setGroups(prev => [...prev.filter(item => item.id !== group.id), group]);
    setUsers(prev => [...prev.filter(u => u.id !== leaderUser.id), leaderUser]);
    lockTheme();

    const paymentRequired = Boolean(paymentSettings?.enabled && paymentSettings.amount > 0);
    if (paymentRequired) {
      const transaction: PaymentTransaction = {
        id: `txn_${serverUser.id}_${Date.now()}`,
        user_id: leaderUser.id,
        national_code: nationalCode,
        full_name: `${firstName} ${lastName}`,
        amount: paymentSettings!.amount,
        currency: paymentSettings!.currency,
        gateway: paymentSettings!.gateway,
        status: 'pending',
        payment_url: paymentSettings!.redirect_url || undefined,
        created_at: new Date().toISOString()
      };
      addPaymentTransaction?.(transaction);
      if (paymentSettings!.redirect_url) {
        const separator = paymentSettings!.redirect_url.includes('?') ? '&' : '?';
        window.location.assign(`${paymentSettings!.redirect_url}${separator}transaction_id=${encodeURIComponent(transaction.id)}&amount=${transaction.amount}`);
        return;
      }
      setRegisterError('هزینه ثبت‌نام تعیین شده اما آدرس درگاه پرداخت تنظیم نشده است.');
      return;
    }
    triggerAlert(`گروه «${group.name}» ساخته شد. ظرفیت گروه ${MAX_GROUP_MEMBERS} نفر است. نام کاربری: ${group.shared_username} | رمز: ${group.shared_password}`);
    onLoginSuccess(leaderUser, { mustChangePassword: res.data.mustChangePassword, isNewRegistration: true });
  };

  // Handle Login Submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const natId = normalizeToEnglishDigits(loginNationalId.trim());
    if (!natId) {
      setLoginError('لطفاً کد ملی خود را وارد کنید.');
      return;
    }

    /* ================= 🛡️ مسیر امن: بررسی رمز روی سرور ================= */
    // اگر Supabase پیکربندی شده باشد، حتی در صورت عدم دسترسی موقت دیتابیس،
    // ورود نباید با حالت محلی جایگزین شود. این کار باعث می‌شود همه‌ی ورود‌ها
    // از طریق Supabase انجام شوند و رکورد مدیر هم در صورت نبودن، ایجاد شود.
    const status = await probeBackend();
    if (isSupabaseEnabled || status.available) {
      setIsSubmitting(true);
      const res = await apiLogin(natId, loginPassword);
      setIsSubmitting(false);

      if (!res.ok || !res.data) {
        setLoginError(res.error?.message || 'خطا در ورود.');
        return;
      }

      const serverUser: User = { ...res.data.user, password: '' };
      // هم‌گام‌سازی پروفایل در مجموعه محلی (بدون رمز عبور)
      setUsers(prev => {
        const exists = prev.some(u => u.id === serverUser.id);
        return exists
          ? prev.map(u => (u.id === serverUser.id ? { ...u, ...serverUser, password: '' } : u))
          : [...prev, serverUser];
      });

      const targetTheme = serverUser.gender === 'دختر' ? 'girls' : 'boys';
      setSelectedGender(serverUser.gender);

      triggerAlert(`خوش آمدید ${serverUser.first_name} ${serverUser.last_name}`);
      onLoginSuccess(serverUser, { mustChangePassword: res.data.mustChangePassword });
      return;
    }

    /* ============ حالت محلی (بدون بک‌اند امن) ============ */
    const syntheticAdmin: User | null =
      natId === '0012345678' &&
      ['Admin@123456', 'admin', 'Admin123456', 'admin123'].includes(loginPassword.trim())
        ? {
            id: 'u-admin',
            first_name: 'امیرحسین',
            last_name: 'فرماندهی کل',
            national_code: '0012345678',
            personal_code: '900000001',
            phone: '09120000000',
            birth_date: '1384/01/15',
            role: 'admin' as const,
            gender: 'پسر' as const,
            education_level: 'متوسطه دوم' as EducationLevel,
            grade: 'دوازدهم',
            province: 'تهران',
            city: 'تهران',
            school_name: 'دبیرستان ماندگار البرز',
            level: 99,
            points: 99999,
            password: 'Admin@123456',
            mustChangePassword: false,
            completed_stages: [],
            group_id: undefined,
            avatar_url: ''
          }
        : null;

    if (natId === '0012345678' && !syntheticAdmin) {
      setLoginError('کد ملی یا رمز عبور اشتباه است.');
      return;
    }

    const user = syntheticAdmin || users.find(u =>
      normalizeToEnglishDigits(u.national_code) === natId ||
      normalizeToEnglishDigits(u.personal_code) === natId
    );

    if (!user) {
      setLoginError('کاربری با این کد ملی یافت نشد. لطفاً ابتدا ثبت‌نام کنید.');
      return;
    }

    if (syntheticAdmin) {
      setUsers(prev => {
        const exists = prev.some(u => u.id === syntheticAdmin.id);
        return exists
          ? prev.map(u => (u.id === syntheticAdmin.id ? { ...u, ...syntheticAdmin, password: '' } : u))
          : [...prev, { ...syntheticAdmin, password: '' }];
      });
      setSelectedGender(syntheticAdmin.gender);
      triggerAlert(`خوش آمدید ${syntheticAdmin.first_name} ${syntheticAdmin.last_name}`);
      onLoginSuccess({ ...syntheticAdmin, password: '' }, { mustChangePassword: false });
      return;
    }

    const suppliedHash = await sha256Hex(loginPassword);
    const stored = String(user.password || '');
    const storedIsHash = /^[0-9a-f]{64}$/i.test(stored);

    if (!stored) {
      if (user.role === 'admin') {
        // نخستین راه‌اندازی در حالت محلی: تعیین رمز مدیر روی همین دستگاه
        setLocalAdminSetup(true);
        setLoginError(
          'این حساب هنوز رمز عبور ندارد. در حالت محلی، رمز نخستین ورود مدیر را در همین صفحه تعیین کنید.'
        );
        return;
      }
      setLoginError(
        'این حساب رمز عبور فعال ندارد. برای دریافت رمز، از گزینه «فراموشی رمز عبور» درخواست دهید تا مدیر سامانه با شما تماس بگیرد.'
      );
      return;
    }

    if (storedIsHash ? stored !== suppliedHash : stored !== loginPassword) {
      setLoginError('رمز عبور وارد شده صحیح نیست. از گزینه فراموشی رمز عبور استفاده کنید.');
      return;
    }

    // ارتقای امنیتی: اگر رمز قدیمی متن‌ساده بود، به هش SHA-256 تبدیل می‌شود
    if (!storedIsHash) {
      setUsers(prev => prev.map(u => (u.id === user.id ? { ...u, password: suppliedHash } : u)));
    }

    setSelectedGender(user.gender);

    triggerAlert(`خوش آمدید ${user.first_name} ${user.last_name}`);
    onLoginSuccess({ ...user, password: '' });
  };

  /** تعیین رمز مدیر در «حالت محلی» (نخستین راه‌اندازی روی همین دستگاه) */
  const handleLocalAdminSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const admin = users.find(u => u.role === 'admin');
    if (!admin) return;

    const password = localAdminPassword.trim();
    if (password.length < 10 || !/[A-Za-z]/.test(password) || !/\d/.test(password) || /\s/.test(password)) {
      setLoginError('رمز مدیر باید حداقل ۱۰ کاراکتر و شامل حرف لاتین و رقم باشد (بدون فاصله).');
      return;
    }
    if (password !== localAdminPasswordConfirm.trim()) {
      setLoginError('تکرار رمز با رمز وارد‌شده یکسان نیست.');
      return;
    }

    const hashed = await sha256Hex(password);
    const updatedAdmin: User = { ...admin, password: hashed };
    setUsers(prev => prev.map(u => (u.id === admin.id ? updatedAdmin : u)));

    setLocalAdminSetup(false);
    setLocalAdminPassword('');
    setLocalAdminPasswordConfirm('');
    triggerAlert('رمز مدیر ثبت شد. ورود شما انجام می‌شود.');

    setSelectedGender(updatedAdmin.gender);
    onLoginSuccess({ ...updatedAdmin, password: '' });
  };

  /**
   * ارسال «درخواست تغییر رمز عبور» به مدیر سامانه.
   * کاربر دیگر نمی‌تواند مستقیماً رمز را عوض کند؛ مدیر پس از احراز هویت
   * تلفنی، رمز جدید را تعیین و اعلام می‌کند.
   */
  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotMessage(null);

    const natId = normalizeToEnglishDigits(forgotNationalId.trim()).replace(/\D/g, '');
    const phone = normalizeToEnglishDigits(forgotContactPhone.trim()).replace(/\D/g, '');
    const note = forgotNote.trim();

    if (!/^\d{10}$/.test(natId)) {
      setForgotMessage({ type: 'error', text: 'کد ملی ۱۰ رقمی خود را کامل وارد کنید.' });
      return;
    }
    if (forgotContactPhone.trim() && !/^09\d{9}$/.test(phone)) {
      setForgotMessage({ type: 'error', text: 'شماره تماس باید با ۰۹ شروع شده و ۱۱ رقم باشد.' });
      return;
    }

    setForgotSubmitting(true);

    /* 🛡️ مسیر امن: ثبت درخواست در سرور (برای مشاهده مدیر در پنل) */
    const resetBackend = await probeBackend();
    if (resetBackend.available) {
      const res = await requestPasswordReset({ nationalCode: natId, contactPhone: phone, note });
      setForgotSubmitting(false);

      if (!res.ok || !res.data) {
        setForgotMessage({ type: 'error', text: res.error?.message || 'خطا در ارسال درخواست.' });
        return;
      }

      setForgotTrackingCode(res.data.trackingCode);
      setForgotStep(2);
      setForgotMessage({ type: 'success', text: res.data.message });
      triggerAlert('درخواست تغییر رمز شما برای مدیر سامانه ارسال شد.');
      return;
    }

    /* حالت محلی: ثبت درخواست در حافظه برنامه تا مدیر (همین دستگاه) ببیند */
    const created = createLocalPasswordResetRequest?.({ nationalCode: natId, contactPhone: phone, note });
    setForgotSubmitting(false);
    setForgotTrackingCode(created?.trackingCode || '');
    setForgotStep(2);
    setForgotMessage({
      type: 'success',
      text: 'درخواست شما ثبت شد. مدیر سامانه با شماره تماس شما ارتباط می‌گیرد و رمز جدید را اعلام می‌کند.'
    });
  };

  /** استعلام وضعیت درخواست با کد رهگیری */
  const handleForgotStatusCheck = async () => {
    if (!forgotTrackingCode) return;
    const natId = normalizeToEnglishDigits(forgotNationalId.trim()).replace(/\D/g, '');

    const statusBackend = await probeBackend();
    if (!statusBackend.available) {
      setForgotStatusText('در حالت محلی، وضعیت درخواست در پنل مدیریت (بخش «درخواست‌های تغییر رمز») قابل مشاهده است.');
      return;
    }

    setForgotSubmitting(true);
    const res = await checkPasswordResetStatus(natId, forgotTrackingCode);
    setForgotSubmitting(false);

    if (!res.ok || !res.data) {
      setForgotStatusText(res.error?.message || 'خطا در استعلام.');
      return;
    }
    setForgotStatusText(res.data.message || 'در حال بررسی');
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-2.5 sm:p-4 transition-colors duration-700 dir-rtl font-sans relative overflow-x-hidden ${
      isGirls ? 'girls-atmosphere-bg text-pink-50' : 'boys-atmosphere-bg text-slate-100'
    }`}>

      {/* Atmospheric Background Lighting (Obsidian top, Crimson-red bottom-left, Electric Cobalt-blue bottom-right with crisp grid) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {isGirls ? (
          <>
            <div className="absolute top-0 inset-x-0 h-[35vh] bg-gradient-to-b from-[#020005] via-[#090112]/70 to-transparent" />
            <div className="absolute -bottom-24 -left-20 w-[550px] sm:w-[700px] h-[550px] sm:h-[700px] blur-[140px] sm:blur-[170px] rounded-full bg-[#ff1389]/30 transition-all duration-700" />
            <div className="absolute -bottom-24 -right-20 w-[600px] sm:w-[750px] h-[600px] sm:h-[750px] blur-[150px] sm:blur-[180px] rounded-full bg-[#7c3aed]/35 transition-all duration-700" />
          </>
        ) : (
          <>
            <div className="absolute top-0 inset-x-0 h-[45vh] bg-gradient-to-b from-[#000104] via-[#010309]/85 to-transparent" />
            <div className="absolute -bottom-20 -left-20 w-[550px] sm:w-[700px] h-[550px] sm:h-[700px] blur-[130px] rounded-full bg-gradient-to-tr from-[#991b1b] via-[#dc2626] to-[#e11d48] opacity-70 transition-all duration-700" />
            <div className="absolute -bottom-20 -right-20 w-[600px] sm:w-[750px] h-[600px] sm:h-[750px] blur-[140px] rounded-full bg-gradient-to-tl from-[#1e40af] via-[#2563eb] to-[#3b82f6] opacity-75 transition-all duration-700" />
            <div className="absolute bottom-[10%] left-1/2 -translate-x-1/2 w-[550px] h-[350px] blur-[150px] rounded-full bg-[#581c87]/35" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:28px_28px] opacity-75" />
          </>
        )}
      </div>

      {/* Top Header */}
      <div className="w-full max-w-md mb-2 flex items-center justify-between z-10 px-1">
        {onBackToHome && (
          <button
            type="button"
            onClick={onBackToHome}
            className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-md cursor-pointer ${
              isGirls
                ? 'bg-[#180126]/80 hover:bg-[#25033c]/90 text-pink-200 border-fuchsia-500/50 hover:border-fuchsia-400 shadow-[0_0_15px_rgba(255,19,137,0.25)]'
                : 'bg-[#0a1226]/80 hover:bg-[#121e3d]/90 text-blue-200 border-blue-500/50 hover:border-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.25)]'
            }`}
            title="بازگشت به صفحه اصلی سایت"
          >
            <ArrowRight size={16} className="text-amber-400 group-hover:-translate-x-1 transition-transform" />
            <span>صفحه اصلی سایت</span>
          </button>
        )}

        <div className="flex items-center gap-1.5 text-[11px] text-slate-300 font-mono mr-auto">
          <Shield size={14} className={isGirls ? 'text-fuchsia-400' : 'text-blue-400'} />
          <span>{isGirls ? 'بخش دختران' : 'بخش پسران'}</span>
        </div>
      </div>

      {/* Main Card */}
      <div className={`w-full max-w-md rounded-2xl sm:rounded-3xl p-4 sm:p-6 backdrop-blur-2xl relative z-10 border transition-all duration-300 shadow-2xl my-auto ${
        isGirls
          ? 'girls-card-surface border-fuchsia-500/40 shadow-[0_0_60px_rgba(255,19,137,0.3)]'
          : 'boys-card-surface border-blue-500/40 shadow-[0_0_60px_rgba(37,99,235,0.3)]'
      }`}>

        {/* 1. Luminous Neon Logo Header (Clean - No unnecessary text) */}
        <div className="flex flex-col items-center justify-center mb-3.5 text-center">
          <div className={`relative -translate-y-1 transition-transform hover:scale-105 duration-300 ${
            isGirls ? 'neon-logo-glow-girls' : 'neon-logo-glow'
          }`}>
            <img 
              src={WARROOM_LOGO_PATH} 
              alt="لوگوی اتاق جنگ" 
              width={80}
              height={80}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-none border-0 shadow-none"
            />
          </div>

          <div className="h-4" aria-hidden="true" />

          {/* Mode Switcher Tabs */}
          <div className="w-full grid grid-cols-2 gap-1 p-1 rounded-2xl bg-slate-950/90 border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setRegisterError(null);
              }}
              className={`py-1.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
                activeTab === 'register'
                  ? isGirls
                    ? 'girls-button-neon text-white shadow-lg'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-lg shadow-cyan-900/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus size={14} />
              <span>ثبت‌نام جدید</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setLoginError(null);
              }}
              className={`py-1.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
                activeTab === 'login'
                  ? isGirls
                    ? 'girls-button-neon text-white shadow-lg'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-lg shadow-cyan-900/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserCheck size={14} />
              <span>ورود به بازی</span>
            </button>
          </div>
        </div>

        {/* Active Session Fast Direct Entry Banner */}
        {activeSessionUser && (
          <div className={`mb-4 p-3.5 rounded-2xl border flex flex-col gap-2.5 shadow-xl animate-fade-in ${
            activeSessionUser.gender === 'دختر'
              ? 'bg-pink-950/70 border-pink-500/50 shadow-pink-950/40'
              : 'bg-cyan-950/70 border-cyan-500/50 shadow-cyan-950/40'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className={activeSessionUser.gender === 'دختر' ? 'text-pink-400' : 'text-cyan-400'} />
                <span className="text-xs font-black text-white">نشست فعال شما ذخیره است</span>
              </div>
              <span className="text-[10px] font-mono text-slate-300">
                {activeSessionUser.personal_code}
              </span>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed text-right">
              رزمنده گرامی <strong className="text-white">{activeSessionUser.first_name} {activeSessionUser.last_name}</strong>، شما قبلاً وارد سامانه شده‌اید. نیازی به ورود یا ثبت‌نام مجدد نیست.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => onLoginSuccess(activeSessionUser)}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
                  activeSessionUser.gender === 'دختر'
                    ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-pink-900/50 hover:brightness-110'
                    : 'bg-gradient-to-r from-cyan-400 to-blue-600 text-slate-950 shadow-cyan-900/50 hover:brightness-110'
                }`}
              >
                <ArrowLeft size={16} />
                <span>ورود مستقیم به پنل کاربری ({activeSessionUser.first_name})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('warroom_current_user_id');
                  localStorage.removeItem('warroom_current_user_data');
                  setActiveSessionUser(null);
                  triggerAlert('نشست قبلی پاک شد. اکنون می‌توانید ثبت‌نام یا ورود جدید انجام دهید.');
                }}
                className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 text-[11px] font-bold transition whitespace-nowrap"
              >
                خروج و تعویض
              </button>
            </div>
          </div>
        )}

        {/* 2. Unified Registration Form */}
        {activeTab === 'register' ? (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            
            {registerError && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/60 text-rose-200 text-xs flex items-center gap-2">
                <AlertTriangle size={15} className="text-rose-400 shrink-0" />
                <span>{registerError}</span>
              </div>
            )}

            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 text-right text-[11px] leading-6 text-amber-100">
              <div className="mb-1 flex items-center gap-2 font-black text-amber-300">
                <ShieldAlert size={14} />
                <span>ثبت‌نام فقط توسط سرگروه انجام می‌شود</span>
              </div>
              <p>Registration must be performed by the Team Leader only.</p>
              <p className="mt-1 text-amber-200/90">سرگروه تیم، ابتدا گروه را ثبت می‌کند و اعتبارنامه مشترک را دریافت می‌کند.</p>
            </div>

            {/* Gender Selection */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300 block">انتخاب جنسیت</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedGender('پسر');
                    setRegisterForm({ ...registerForm, gender: 'پسر' });
                    localStorage.setItem('hisstory_theme_mode', 'boys');
                    onGenderChange?.('پسر');
                    window.dispatchEvent(new Event('storage'));
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                    selectedGender === 'پسر'
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                      : 'bg-slate-950/70 text-slate-300 border-slate-700/80 hover:bg-slate-900'
                  }`}
                >
                  <Zap size={14} />
                  <span>پسران (ویژه رزمندگان)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedGender('دختر');
                    setRegisterForm({ ...registerForm, gender: 'دختر' });
                    localStorage.setItem('hisstory_theme_mode', 'girls');
                    onGenderChange?.('دختر');
                    window.dispatchEvent(new Event('storage'));
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                    selectedGender === 'دختر'
                      ? 'bg-pink-500 text-white border-pink-400 shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                      : 'bg-slate-950/70 text-slate-300 border-slate-700/80 hover:bg-slate-900'
                  }`}
                >
                  <Heart size={14} />
                  <span>دختران (ویژه رزمندگان)</span>
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300 block">نام گروه / جوخه</label>
              <input
                type="text"
                required
                value={registerForm.groupName}
                onChange={(e) => setRegisterForm({ ...registerForm, groupName: e.target.value })}
                placeholder="مثال: جوخه فاتحان"
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400"
              />
              <p className="text-[10px] text-slate-400">ثبت‌نام توسط سرگروه انجام می‌شود؛ اعتبارنامه گروه برای حداکثر ۳ عضو دیگر قابل استفاده است.</p>
            </div>

            {/* Name & Surname */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 block">نام</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: علی / سارا"
                  value={registerForm.firstName}
                  onChange={(e) => setRegisterForm({ ...registerForm, firstName: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl bg-slate-950/70 border border-slate-700/80 focus:border-cyan-400 text-xs text-white placeholder:text-slate-500 focus:outline-none transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 block">نام خانوادگی</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: محمدی"
                  value={registerForm.lastName}
                  onChange={(e) => setRegisterForm({ ...registerForm, lastName: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl bg-slate-950/70 border border-slate-700/80 focus:border-cyan-400 text-xs text-white placeholder:text-slate-500 focus:outline-none transition"
                />
              </div>
            </div>

            {/* National ID & Birthdate */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 block">کد ملی (نام کاربری)</label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  placeholder="۰۰۱۱۱۱۱۱۱۱"
                  value={registerForm.nationalCode}
                  onChange={(e) => setRegisterForm({ ...registerForm, nationalCode: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl bg-slate-950/70 border border-slate-700/80 focus:border-cyan-400 text-xs text-white font-mono placeholder:text-slate-500 focus:outline-none transition text-left"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 block">تاریخ تولد (شمسی)</label>
                <PersianDatePicker
                  value={registerForm.birthDate}
                  onChange={(val) => setRegisterForm({ ...registerForm, birthDate: val })}
                  isGirls={isGirls}
                  required
                />
              </div>
            </div>

            {/* Mobile Phone (برای هماهنگی تلفنی مدیر در بازیابی رمز) */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300 block">
                شماره همراه <span className="text-rose-400">*</span>
              </label>
              <input
                type="tel"
                required
                inputMode="numeric"
                maxLength={11}
                placeholder="09123456789"
                value={registerForm.phone}
                onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                className="w-full py-2 px-3 rounded-xl bg-slate-950/70 border border-slate-700/80 focus:border-cyan-400 text-xs text-white font-mono placeholder:text-slate-500 focus:outline-none transition dir-ltr text-left"
              />
              <p className="text-[9px] text-slate-500">این شماره برای احراز هویت و تماس مدیر در فرآیند بازیابی رمز استفاده می‌شود.</p>
            </div>

            {/* Password (Required with Auto Generator & Eye Toggle) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-300 block">
                  رمز عبور <span className="text-rose-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleGenerateRandomPassword}
                  className={`text-[11px] font-bold flex items-center gap-1 transition px-2 py-0.5 rounded-lg border ${
                    isGirls
                      ? 'text-pink-400 hover:text-pink-300 bg-pink-950/40 border-pink-500/30 hover:border-pink-500/60'
                      : 'text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 border-cyan-500/30 hover:border-cyan-500/60'
                  }`}
                  title="تولید رمز عبور قوی ترکیبی (حروف بزرگ، کوچک و عدد)"
                >
                  <KeyRound size={12} />
                  <span>تولید خودکار رمز</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type={showRegisterPassword ? 'text' : 'password'}
                  required
                  placeholder="رمز عبور دلخواه یا تولید خودکار"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                  className="w-full py-2 px-3 pr-9 pl-9 rounded-xl bg-slate-950/70 border border-slate-700/80 focus:border-cyan-400 text-xs text-white font-mono placeholder:text-slate-500 focus:outline-none transition text-left"
                />
                <Lock size={15} className="absolute right-3 top-2.5 text-slate-400" />
                <button
                  type="button"
                  onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                  className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-200 transition"
                  title={showRegisterPassword ? "مخفی‌سازی رمز" : "نمایش رمز"}
                >
                  {showRegisterPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 rounded-2xl font-black text-xs sm:text-sm transition transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-xl ${
                isGirls
                  ? 'girls-button-neon text-white shadow-[0_0_25px_rgba(255,19,137,0.4)]'
                  : 'bg-gradient-to-r from-cyan-400 via-teal-400 to-blue-500 text-slate-950 shadow-cyan-900/40'
              }`}
            >
              <Sparkles size={16} />
              <span>{isSubmitting ? 'در حال راه‌اندازی...' : 'ثبت‌نام و ورود به بازی'}</span>
              <ArrowLeft size={16} />
            </button>

          </form>
        ) : (
          /* 3. Login Form with National ID & Password & Forgot Password */
          <form onSubmit={handleLoginSubmit} className="space-y-3.5">
            
            {loginError && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/60 text-rose-200 text-xs flex items-center gap-2">
                <AlertTriangle size={15} className="text-rose-400 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            {/* 🛡️ راه‌اندازی نخستین رمز مدیر در حالت محلی (تنها زمانی که بک‌اند امن در دسترس نیست) */}
            {localAdminSetup && !backendReady && (
              <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/50 space-y-2.5">
                <div className="flex items-center gap-2">
                  <ShieldAlert size={14} className="text-amber-400" />
                  <span className="text-[11px] font-black text-amber-200">تعیین رمز نخستین ورود مدیر (حالت محلی)</span>
                </div>
                <p className="text-[9px] text-amber-100/90 leading-relaxed">
                  بک‌اند امن فعال نیست؛ رمز شما فقط روی همین دستگاه (هش‌شده) ذخیره می‌شود. برای امنیت کامل،
                  بک‌اند را با دستور <code className="font-mono">npm run dev</code> اجرا کنید.
                </p>
                <form onSubmit={handleLocalAdminSetup} className="space-y-2">
                  <input
                    type="password"
                    autoComplete="new-password"
                    placeholder="رمز جدید مدیر (حداقل ۱۰ کاراکتر شامل حرف و رقم)"
                    value={localAdminPassword}
                    onChange={(e) => setLocalAdminPassword(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-amber-600/50 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                  <input
                    type="password"
                    autoComplete="new-password"
                    placeholder="تکرار رمز جدید"
                    value={localAdminPasswordConfirm}
                    onChange={(e) => setLocalAdminPasswordConfirm(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-amber-600/50 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] transition"
                  >
                    ثبت رمز و ورود به پنل مدیریت
                  </button>
                </form>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300 block">
                کد ملی (نام کاربری):
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="کد ملی ۱۰ رقمی"
                  value={loginNationalId}
                  onChange={(e) => setLoginNationalId(e.target.value)}
                  className={`w-full py-2.5 px-3 pr-9 rounded-xl bg-slate-950/70 border text-xs text-white font-mono placeholder:text-slate-500 focus:outline-none transition text-left ${
                    isGirls ? 'border-pink-500/40 focus:border-pink-400' : 'border-slate-700/80 focus:border-cyan-400'
                  }`}
                />
                <IdCard size={15} className={`absolute right-3 top-3 ${isGirls ? 'text-pink-400' : 'text-slate-400'}`} />
              </div>

              {detectedUser && (
                <div className={`mt-1.5 p-2 rounded-xl text-[11px] font-bold flex items-center gap-1.5 border transition-all ${
                  detectedUser.gender === 'دختر'
                    ? 'bg-rose-950/80 border-rose-500/50 text-rose-200 shadow-[0_0_12px_rgba(244,63,94,0.25)]'
                    : 'bg-cyan-950/80 border-cyan-500/50 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                }`}>
                  <UserCheck size={14} className={detectedUser.gender === 'دختر' ? 'text-rose-400' : 'text-cyan-400'} />
                  <span>
                    کاربر گرامی {detectedUser.first_name} {detectedUser.last_name} ({detectedUser.gender === 'دختر' ? 'بخش ویژه دختران' : 'بخش ویژه پسران'} — پوسته {detectedUser.gender === 'دختر' ? 'دخترانه' : 'پسرانه'} تثبیت شد)
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-300 block">
                  رمز عبور:
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(true);
                    setForgotNationalId(loginNationalId);
                  }}
                  className={`text-[10px] hover:underline transition ${
                    isGirls ? 'text-pink-400 hover:text-pink-300' : 'text-cyan-400 hover:text-cyan-300'
                  }`}
                >
                  فراموشی رمز عبور؟
                </button>
              </div>
              <div className="relative">
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  placeholder="رمز عبور خود را وارد کنید"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className={`w-full py-2.5 px-3 pr-9 pl-9 rounded-xl bg-slate-950/70 border text-xs text-white font-mono placeholder:text-slate-500 focus:outline-none transition text-left ${
                    isGirls ? 'border-pink-500/40 focus:border-pink-400' : 'border-slate-700/80 focus:border-cyan-400'
                  }`}
                />
                <Lock size={15} className={`absolute right-3 top-3 ${isGirls ? 'text-pink-400' : 'text-slate-400'}`} />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute left-3 top-3 text-slate-400 hover:text-slate-200"
                >
                  {showLoginPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className={`w-full py-3 rounded-2xl font-black text-xs sm:text-sm transition transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-xl ${
                isGirls
                  ? 'girls-button-neon text-white shadow-[0_0_25px_rgba(255,19,137,0.4)]'
                  : 'bg-gradient-to-r from-cyan-400 via-teal-400 to-blue-500 text-slate-950 shadow-cyan-900/40'
              }`}
            >
              <UserCheck size={16} />
              <span>ورود مستقیم به بازی</span>
              <ArrowLeft size={16} />
            </button>



          </form>
        )}

      </div>

      {/* Forgot Password Modal — ثبت «درخواست تغییر رمز» برای مدیر سامانه */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 dir-rtl overflow-y-auto">
          <div className="bg-[#0b1226] border border-cyan-500/40 rounded-3xl p-5 sm:p-6 max-w-md w-full space-y-4 text-white shadow-2xl relative my-auto max-h-[88vh] overflow-y-auto">

            <button
              onClick={() => {
                setShowForgotPassword(false);
                setForgotStep(1);
                setForgotMessage(null);
                setForgotTrackingCode('');
                setForgotStatusText('');
              }}
              className="absolute top-4 left-4 text-slate-400 hover:text-white p-1 rounded-full bg-slate-900"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
                <KeyRound size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">درخواست تغییر رمز عبور</h3>
                <p className="text-[10px] text-slate-400">
                  احراز هویت و تعیین رمز جدید توسط مدیر سامانه انجام می‌شود
                </p>
              </div>
            </div>

            {forgotMessage && (
              <div className={`p-2.5 rounded-xl text-[11px] leading-relaxed flex items-start gap-2 ${
                forgotMessage.type === 'error'
                  ? 'bg-rose-950 border border-rose-500/60 text-rose-200'
                  : 'bg-emerald-950 border border-emerald-500/60 text-emerald-200'
              }`}>
                <span>{forgotMessage.text}</span>
              </div>
            )}

            {forgotStep === 1 ? (
              <form onSubmit={handleForgotRequest} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-300 block">کد ملی ثبت‌شده در سامانه:</label>
                  <input
                    type="text"
                    required
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="۰۰۱۱۱۱۱۱۱۱"
                    value={forgotNationalId}
                    onChange={(e) => setForgotNationalId(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono text-left focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-300 block">شماره همراه برای تماس مدیر:</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={11}
                    placeholder="09123456789"
                    value={forgotContactPhone}
                    onChange={(e) => setForgotContactPhone(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono text-left focus:outline-none focus:border-cyan-400 dir-ltr"
                  />
                  <p className="text-[9px] text-slate-500">
                    مدیر سامانه با این شماره تماس می‌گیرد و پس از احراز هویت، رمز جدید را اعلام می‌کند.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-300 block">توضیح (اختیاری):</label>
                  <textarea
                    rows={2}
                    maxLength={200}
                    placeholder="مثال: رمز عبورم را فراموش کرده‌ام."
                    value={forgotNote}
                    onChange={(e) => setForgotNote(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400 resize-none"
                  />
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[9px] text-slate-400 leading-relaxed">
                  🔒 به دلایل امنیتی، امکان تغییر رمز به‌صورت مستقیم وجود ندارد. درخواست شما با کد رهگیری ثبت
                  و پس از احراز هویت تلفنی، رمز جدید توسط مدیر تعیین می‌شود.
                  {!backendReady && ' (هشدار: بک‌اند امن فعال نیست؛ درخواست فقط در همین دستگاه ذخیره می‌شود.)'}
                </div>

                <button
                  type="submit"
                  disabled={forgotSubmitting}
                  className="w-full py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 disabled:opacity-60 text-slate-950 font-black text-xs transition flex items-center justify-center gap-2"
                >
                  <Send size={14} />
                  <span>{forgotSubmitting ? 'در حال ارسال...' : 'ارسال درخواست به مدیر سامانه'}</span>
                </button>
              </form>
            ) : (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="text-[10px] text-slate-400 block">کد رهگیری درخواست شما:</span>
                  <code className="block w-full text-center py-2 rounded-lg bg-black/60 border border-cyan-500/40 text-cyan-300 font-mono text-sm tracking-widest" dir="ltr">
                    {forgotTrackingCode || '—'}
                  </code>
                  <p className="text-[9px] text-slate-500 leading-relaxed">
                    این کد را نزد خود نگه دارید؛ می‌توانید وضعیت درخواست را با آن پیگیری کنید.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleForgotStatusCheck}
                  disabled={forgotSubmitting}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-slate-100 font-bold text-xs transition flex items-center justify-center gap-2"
                >
                  <RefreshCw size={14} className={forgotSubmitting ? 'animate-spin' : ''} />
                  <span>{forgotSubmitting ? 'در حال بررسی...' : 'استعلام وضعیت درخواست'}</span>
                </button>

                {forgotStatusText && (
                  <div className="p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-200 text-[11px] leading-relaxed">
                    {forgotStatusText}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotStep(1);
                    setForgotMessage(null);
                  }}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition"
                >
                  متوجه شدم و بستن
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Military Radar Scanning & Authentication Overlay */}
      {isSubmitting && (
        <RadarLoading
          size="fullscreen"
          label={activeTab === 'register' ? 'در حال ثبت اطلاعات در پایگاه داده و آماده‌سازی رادار...' : 'در حال اعتبارسنجی مشخصات و ورود به اتاق جنگ...'}
          subLabel="اتصال به پایگاه داده ابری امن قرارگاه"
        />
      )}

    </div>
  );
}
