// Centralized Avatar Assets categorized strictly by gender (woman & male)
// Woman Avatars
import woman1 from '../assets/images/avatar/woman/Commander_giving_orders_2K_202608210108.jpeg';
import woman2 from '../assets/images/avatar/woman/Female_commander_in_military_uni…_202608210116.jpeg';
import woman3 from '../assets/images/avatar/woman/Female_commander_in_victory_pose_202608210116.jpeg';
import woman4 from '../assets/images/avatar/woman/Female_commando_commander_charac…_2K_202608210111.jpeg';
import woman5 from '../assets/images/avatar/woman/Female_commando_presenting_gesture_2K_202608210116.jpeg';
import woman6 from '../assets/images/avatar/woman/Female_commando_showing_stop_ges…_202608210111.jpeg';
import woman7 from '../assets/images/avatar/woman/Tactical_commander_character_design_2K_202608210119.jpeg';
import woman8 from '../assets/images/avatar/woman/Woman_scanning_horizon_with_bino…_202608210111.jpeg';

// Male Avatars
import male1 from '../assets/images/avatar/male/Commander_in_tactical_uniform_ready_202608210056.jpeg';
import male2 from '../assets/images/avatar/male/Commander_wearing_tactical_uniform_2K_202608210049.jpeg';
import male3 from '../assets/images/avatar/male/Commander_doing_victory_pose_2K_202608210056.jpeg';
import male4 from '../assets/images/avatar/male/Cartoon_commander_saluting_2K_202608210048.jpeg';
import male5 from '../assets/images/avatar/male/Commander_crossing_arms_2K_202608210055.jpeg';
import male6 from '../assets/images/avatar/male/Commander_gesturing_quiet_sign_2K_202608210056.jpeg';
import male7 from '../assets/images/avatar/male/Commander_pointing_forward_in_un…_202608210049 (1).jpeg';
import male8 from '../assets/images/avatar/male/Commander_scanning_horizon_with_…_202608210055.jpeg';

export interface AvatarItem {
  id: string;
  name: string;
  url: string;
  gender: 'دختر' | 'پسر';
}

export const WOMAN_AVATARS: AvatarItem[] = [
  { id: 'w_cmd_1', name: 'فرمانده نگار (ستاد نور)', url: woman1, gender: 'دختر' },
  { id: 'w_cmd_2', name: 'فرمانده ارشد دختران', url: woman2, gender: 'دختر' },
  { id: 'w_cmd_3', name: 'بانوی قهرمان پیروز', url: woman3, gender: 'دختر' },
  { id: 'w_cmd_4', name: 'تکاور سایبری دختران', url: woman4, gender: 'دختر' },
  { id: 'w_cmd_5', name: 'راهنمای عملیات دختران', url: woman5, gender: 'دختر' },
  { id: 'w_cmd_6', name: 'افسر مراقبت هوشمند', url: woman6, gender: 'دختر' },
  { id: 'w_cmd_7', name: 'طراح استراتژیک نور', url: woman7, gender: 'دختر' },
  { id: 'w_cmd_8', name: 'دیده‌بان پیشتاز دختران', url: woman8, gender: 'دختر' },
];

export const MALE_AVATARS: AvatarItem[] = [
  { id: 'm_cmd_1', name: 'فرمانده کاوه (ستاد فاتحان)', url: male1, gender: 'پسر' },
  { id: 'm_cmd_2', name: 'فرمانده تاکتیکی پسران', url: male2, gender: 'پسر' },
  { id: 'm_cmd_3', name: 'افسر پیروز میدان', url: male3, gender: 'پسر' },
  { id: 'm_cmd_4', name: 'رزمنده پیشتاز احترام', url: male4, gender: 'پسر' },
  { id: 'm_cmd_5', name: 'افسر اقتدار و رزم', url: male5, gender: 'پسر' },
  { id: 'm_cmd_6', name: 'تکاور عملیات ویژه', url: male6, gender: 'پسر' },
  { id: 'm_cmd_7', name: 'فرمانده تهاجم هوشمند', url: male7, gender: 'پسر' },
  { id: 'm_cmd_8', name: 'دیده‌بان استراتژیک پسران', url: male8, gender: 'پسر' },
];

/**
 * Returns avatars strictly filtered by user's gender or theme
 */
export function getAvatarsByGender(gender?: string, campaignTheme?: string): AvatarItem[] {
  const isFemale = gender === 'دختر' || gender === 'woman' || gender === 'female' || campaignTheme === 'girls';
  return isFemale ? WOMAN_AVATARS : MALE_AVATARS;
}

/**
 * Returns default avatar image URL based on gender
 */
export function getDefaultAvatar(gender?: string, campaignTheme?: string): string {
  const isFemale = gender === 'دختر' || gender === 'woman' || gender === 'female' || campaignTheme === 'girls';
  return isFemale ? woman1 : male1;
}
