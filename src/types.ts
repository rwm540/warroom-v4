export type RoleType = 'admin' | 'leader' | 'user' | 'member';
export type SquadRank = 'soldier' | 'farmando' | 'jokhedar' | 'commander';
export type WalletTransactionType = 'payment' | 'deposit' | 'withdrawal' | 'reward' | 'transfer_in' | 'transfer_out' | 'adjustment';
export type EducationLevel = 'ابتدایی' | 'متوسطه اول' | 'متوسطه دوم';
export type Gender = 'پسر' | 'دختر';
export type SubmissionStatus = 'pending' | 'approved' | 'rejected';
export type TicketType = 'technical' | 'content' | 'judge' | 'other';
export type TicketStatus = 'open' | 'in_progress' | 'answered' | 'closed';
export type TicketPriority = 'normal' | 'important' | 'urgent';
export type TargetRole = 'all' | 'user' | 'leader';

export type PaymentGateway = 'zarinpal' | 'custom';
export type PaymentTransactionStatus = 'pending' | 'paid' | 'failed' | 'cancelled';

export interface PaymentSettings {
  id: string;
  enabled: boolean;
  amount: number;
  currency: 'IRR' | 'IRT';
  gateway: PaymentGateway;
  api_key: string;
  redirect_url: string;
  callback_url: string;
  description: string;
  updated_at: string;
}

export interface PaymentTransaction {
  id: string;
  user_id?: string;
  national_code: string;
  full_name: string;
  amount: number;
  currency: 'IRR' | 'IRT';
  gateway: PaymentGateway;
  authority?: string;
  ref_id?: string;
  status: PaymentTransactionStatus;
  payment_url?: string;
  created_at: string;
  paid_at?: string;
}

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  national_code: string; // 10 digits
  phone: string; // 11 digits
  password: string;
  role: RoleType;
  education_level: EducationLevel;
  grade: string; // پایه تحصیلی (e.g. هفتم، هشتم، نهم، دهم...)
  gender: Gender;
  province: string;
  city: string;
  birth_date: string; // Jalali Solar Hijri string e.g. 1387/05/12
  school_name: string;
  personal_code: string; // Unique 9-digit code e.g. "839201745"
  group_id?: string;
  postal_code?: string;
  address?: string;
  avatar_url?: string;
  level?: number;
  points?: number;
  completed_stages?: string[];
  shared_username?: string;
  shared_password?: string;
  is_group_member?: boolean;
  squad_rank?: SquadRank;
  mustChangePassword?: boolean;
  nationalCode?: string;
  personalCode?: string;
}

export interface Group {
  id: string;
  leader_id: string;
  name: string; // نام جوخه
  members_count: number; // 2 to 6
  education_level: EducationLevel;
  gender: Gender;
  province: string;
  city: string;
  registration_code: string; // کد ثبت‌نام جوخه
  created_at: string;
  points?: number;
  shared_username?: string;
  shared_password?: string;
  max_members?: number;
  member_ids?: string[];
  parent_group_id?: string;
  status?: 'pending' | 'active' | 'complete' | 'merged';
}

export interface WalletTransaction {
  id: string;
  user_id: string;
  group_id?: string;
  transaction_type: WalletTransactionType;
  amount: number;
  currency: 'points' | 'IRR' | 'IRT';
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  reference_id?: string;
  description?: string;
  created_at: string;
}

export interface PointTransfer {
  id: string;
  sender_user_id: string;
  receiver_user_id: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  note?: string;
  created_at: string;
  completed_at?: string;
}

export type GroupJoinRequestStatus = 'pending' | 'accepted' | 'rejected';

export interface GroupJoinRequest {
  id: string;
  source_group_id?: string;
  target_group_id: string;
  requester_id: string;
  requester_name: string;
  target_group_name: string;
  status: GroupJoinRequestStatus;
  created_at: string;
  resolved_at?: string;
  resolved_by?: string;
}

export interface GroupChatRoom {
  id: string;
  group_id: string;
  name: string;
  member_ids: string[];
  created_at: string;
  updated_at: string;
  unread_count?: number;
}

export interface GroupChatMessage {
  id: string;
  room_id: string;
  group_id: string;
  user_id: string;
  user_name: string;
  avatar_url?: string;
  text: string;
  created_at: string;
  updated_at?: string;
  is_system?: boolean;
}

export interface TeamRegistrationSession {
  id: string;
  group_id: string;
  team_name: string;
  leader_id: string;
  shared_username: string;
  shared_password: string;
  max_members: number;
  active_session_count: number;
  created_at: string;
  status: 'pending' | 'active' | 'completed';
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  banner_path: string;
  video_url?: string;
  media_path?: string;
  media_type: 'image' | 'video' | 'audio' | 'document';
  max_score: number;
  is_active: boolean;
  is_optional: boolean;
  deadline?: string;
  created_at: string;
}

export interface MissionSubmission {
  id: string;
  user_id: string;
  user_name: string;
  personal_code: string;
  group_id?: string;
  mission_id: string;
  mission_title: string;
  file_path: string;
  file_name: string;
  file_size: string; // e.g. "12.4 MB"
  file_type: string; // extension
  user_note?: string;
  status: SubmissionStatus;
  awarded_score: number;
  admin_note?: string;
  submitted_at: string;
  is_in_vitrin?: boolean;
}

export interface Training {
  id: string;
  title: string;
  description: string;
  video_url?: string;
  media_path?: string;
  media_type: 'video' | 'audio' | 'image' | 'document' | 'iframe';
  target_role: TargetRole;
  is_active: boolean;
  category: string;
  created_at: string;
}

export interface GamePortal {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  status: 'active' | 'coming_soon' | 'disabled';
  badgeText: string;
  badgeColor?: string;
  link?: string;
  targetAudience?: 'all' | 'girls' | 'boys';
  tag?: string;
  featured?: boolean;
}

export interface StageQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  timeLimitSeconds?: number;
}

export interface JourneyStage {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  status: 'completed' | 'in_progress' | 'locked';
  iconName: 'flag' | 'heart' | 'shield' | 'service' | 'users' | 'shrine' | 'star' | 'trophy' | 'custom' | string;
  customIconUrl?: string;
  customBannerUrl?: string;
  requiredPoints: number;
  description: string;
  missionsCount: number;
  completedMissions: number;
  bgThemeUrl?: string;
  xOffsetPercent: number; // Position on winding map path
  quizQuestions?: StageQuizQuestion[];
}

export interface DailyChallengeConfig {
  id: string;
  title: string;
  description: string;
  badge?: string;
  pointsReward: number;
  question: string;
  questionText?: string;
  options: string[];
  correctOptionIndex: number;
  timeLimitSeconds?: number;
  isActive: boolean;
  bannerUrl?: string;
}

export interface PrizeItem {
  id: string;
  title: string;
  category: string;
  requiredPoints: number;
  imageUrl: string;
  tag: string;
  isAvailable?: boolean;
  stockCount: number;
}

export interface Medal {
  id: string;
  name: string;
  description: string;
  image: string; // Icon or URL
  category?: string;
  is_active: boolean;
}

export interface UserMedal {
  id: string;
  user_id?: string;
  personal_code: string;
  medal_id: string;
  medal_name?: string;
  note?: string;
  awarded_at: string;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  user_name: string;
  personal_code: string;
  subject: string;
  message: string;
  type: TicketType;
  status: TicketStatus;
  priority?: TicketPriority;
  attachment_url?: string;
  admin_id?: string;
  admin_type?: TicketType | 'general';
  created_at: string;
  updated_at: string;
}

export interface SupportReply {
  id: string;
  ticket_id: string;
  user_id: string;
  user_name: string;
  message: string;
  is_admin: boolean;
  created_at: string;
}

export interface SupportRole {
  user_id: string;
  role_type: TicketType | 'general';
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  image_path?: string;
  is_active: boolean;
  created_at: string;
  type?: 'urgent' | 'normal' | 'victory';
}

export interface News {
  id: string;
  title: string;
  description: string;
  image_path?: string;
  is_active: boolean;
  created_at: string;
  category?: string;
}

export type NotificationType = 'urgent' | 'mission' | 'score' | 'medal' | 'announcement' | 'squad' | 'system' | 'custom';
export type NotificationTarget = 'all' | 'girls' | 'boys' | 'leaders' | 'users' | 'specific_user' | 'specific_squad';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  target: NotificationTarget;
  target_user_id?: string;
  target_personal_code?: string;
  target_group_id?: string;
  action_tab?: string;
  action_label?: string;
  sender_name: string;
  is_read_by: string[];
  created_at: string;
  timestamp: number;
}

export interface StudentShowcase {
  id: string;
  title: string;
  description: string;
  student_name: string;
  squad_name?: string;
  gender: Gender;
  education_level: EducationLevel;
  grade: string;
  province: string;
  cover_image: string;
  category: 'سناریو و استراتژی' | 'طراحی و گرافیک' | 'ویدیو و پادکست' | 'فنی و کدنویسی' | 'شبیه‌سازی تاکتیکی';
  likes_count: number;
  views_count: number;
  tags: string[];
  created_at: string;
}

export type AudioPlaybackMode = 'random' | 'sequential' | 'repeat_one';

export interface SoundtrackItem {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  color: string;
  sourceType: 'url' | 'synth';
  url?: string;
  synthTrackId?: 'epic_march' | 'cyber_mission' | 'triumph_anthem' | 'strategic_zen';
  tempo?: number;
  durationSeconds?: number;
  is_active: boolean;
  order: number;
}

export interface AudioSettings {
  playbackMode: AudioPlaybackMode;
  autoPlayEnabled: boolean;
  defaultVolume: number;
  activeTrackId: string;
}

export interface HomeButtonConfig {
  id: string;
  text: string;
  actionTab: string;
  iconName: string;
  shape: 'rounded-xl' | 'rounded-2xl' | 'rounded-full' | 'rounded-3xl' | 'rounded-lg';
  size: 'sm' | 'md' | 'lg' | 'full';
  color: 'cyan' | 'red' | 'amber' | 'emerald' | 'purple' | 'slate';
  order: number;
  isActive: boolean;
}

export type HomePageBlockType = 
  | 'hero' 
  | 'video_player' 
  | 'action_buttons' 
  | 'stats_strip' 
  | 'prizes_awards' 
  | 'announcements' 
  | 'about_section' 
  | 'faqs' 
  | 'social_messengers' 
  | 'custom_banner';

export interface HomePageBlock {
  id: string;
  type: HomePageBlockType;
  title: string;
  subtitle?: string;
  isVisible: boolean;
  order: number;
  content?: string;
  imageUrl?: string;
  videoUrl?: string;
  buttonText?: string;
  buttonTab?: string;
  badgeText?: string;
  bgColor?: string;
  customData?: Record<string, any>;
}

export interface SiteSettings {
  siteName?: string;
  siteTagline?: string;
  badgeText?: string;
  heroTitle?: string;
  heroProgress?: string;
  heroCountdown?: string;
  heroImage?: string;
  heroVideoUrl?: string;
  girlsBannerImage?: string;
  boysBannerImage?: string;
  heroButtonText?: string;
  contactPhone?: string;
  contactEmail?: string;
  telegram?: string;
  baleLink?: string;
  eitaaLink?: string;
  address?: string;
  aboutText?: string;
  prizeTitle?: string;
  prizeDescription?: string;
  prizeImage?: string;
  homeButtons?: HomeButtonConfig[];
  homeBlocks?: HomePageBlock[];
}



/* ------------------------------------------------------------------ */
/* 🛡️ درخواست تغییر/بازیابی رمز عبور (جریان امن با تأیید مدیر)        */
/* ------------------------------------------------------------------ */
export type PasswordResetStatus = 'pending' | 'contacted' | 'resolved' | 'rejected';

export interface PasswordResetRequest {
  id: string;
  /** کد رهگیری اعلام‌شده به کاربر */
  tracking_code?: string;
  user_id?: string;
  national_code: string;
  personal_code?: string;
  full_name?: string;
  /** شماره همراه ثبت‌شده در سامانه */
  account_phone?: string;
  /** شماره تماسی که کاربر برای هماهنگی اعلام کرده است */
  contact_phone?: string;
  contact_phone_dial?: string;
  account_phone_dial?: string;
  note?: string;
  status: PasswordResetStatus;
  created_at: string;
  contacted_at?: string;
  contacted_by?: string;
  contact_note?: string;
  resolved_at?: string;
  resolved_by?: string;
  resolution_note?: string;
  /** منبع رکورد: سرور (امن) یا حافظه محلی (حالت بدون بک‌اند) */
  source?: 'user' | 'admin' | 'server' | 'local';
  /** آخرین رمز موقتی که مدیر تعیین کرده (هرگز ذخیره نمی‌شود؛ فقط برای نمایش یک‌باره) */
  lastDeliveredPassword?: string;
}
