export type MediaKind = 'banner' | 'video' | 'aviso';

export type MediaFilter = 'all' | MediaKind;

export interface MediaItem {
  id: string;
  type: MediaKind;
  title: string;
  description: string;
  category: string;
  mediaUrl: string;
  externalVideoUrl?: string;
  mimeType?: string;
  pinned: boolean;
  createdAt: string;
  authorName: string;
}

export interface AudioMessage {
  id: string;
  title: string;
  description: string;
  audioUrl: string;
  durationSeconds?: number;
  authorName: string;
  createdAt: string;
}

export interface DailyWord {
  verse: string;
  reference: string;
  reflection: string;
  pastorName: string;
  updatedAt: string;
}

export interface ServiceScheduleItem {
  id: string;
  title: string;
  dayOfWeek: string;
  time: string;
  location: string;
  leader: string;
  rsvpCount: number;
}

export interface PrayerRequest {
  id: string;
  authorName: string;
  message: string;
  isPrivate: boolean;
  amens: number;
  createdAt: string;
}

export interface PendingPrayerPayload {
  tempId: string;
  authorName: string;
  message: string;
  isPrivate: boolean;
  queuedAt: string;
}

export interface MemberProfile {
  id: string;
  username: string;
  avatarUrl: string;
  birthDate?: string;
  roleTitle?: string;
  showInMembers?: boolean;
  createdAt: string;
}

export interface PublicMemberCard {
  id: string;
  username: string;
  avatarUrl: string;
  roleTitle: string;
  birthMonthDay?: string;
}

export interface ChurchSettings {
  churchName: string;
  tagline: string;
  address: string;
  pixKey: string;
  pixBeneficiary: string;
  whatsapp: string;
  pastorName: string;
  pastorTitle: string;
  pastorAvatarUrl: string;
  pastorPin?: string;
  radioEnabled?: boolean;
  radioStationName?: string;
  radioStreamUrl?: string;
}

export interface EventPhotoItem {
  id: string;
  title: string;
  eventName: string;
  eventDate?: string;
  caption?: string;
  photoUrl: string;
  authorName: string;
  createdAt: string;
}

export interface ChurchSnapshot {
  media: MediaItem[];
  eventPhotos?: EventPhotoItem[];
  audios: AudioMessage[];
  dailyWord: DailyWord;
  schedule: ServiceScheduleItem[];
  prayers: PrayerRequest[];
  members?: MemberProfile[];
  publicMembers?: PublicMemberCard[];
  birthdays?: PublicMemberCard[];
  settings: ChurchSettings;
  updatedAt: string;
}
