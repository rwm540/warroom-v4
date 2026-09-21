import { 
  User, 
  Group, 
  Mission, 
  MissionSubmission, 
  Training, 
  Medal, 
  UserMedal, 
  SupportTicket, 
  SupportReply, 
  Announcement, 
  News, 
  AppNotification 
} from '../types';

/**
 * داده‌های اولیه سامانه — پلتفرم اتاق جنگ
 * ---------------------------------------------------------------
 * ✅ تمام داده‌های پیش‌فرض/نمونه به پایگاه داده متصل هستند.
 * 🛡️ منبع اصلی داده منحصراً پایگاه داده Supabase است.
 */
export const initialUsers: User[] = [];

export const initialGroups: Group[] = [];

export const initialMissions: Mission[] = [];

export const initialSubmissions: MissionSubmission[] = [];

export const initialTrainings: Training[] = [];

export const initialMedals: Medal[] = [];

export const initialUserMedals: UserMedal[] = [];

export const initialSupportTickets: SupportTicket[] = [];

export const initialSupportReplies: SupportReply[] = [];

export const initialAnnouncements: Announcement[] = [];

export const initialNews: News[] = [];

export const initialNotifications: AppNotification[] = [];

export * from './home';
export * from './initialStages';
export * from './portalData';
export * from './vitrinData';
