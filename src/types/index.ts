export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  type: 'profile_card' | 'exclusive_club';
  owners: string[];
  created_at: string;
}

export interface Asset {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  type: 'unique' | 'generic';
  created_at: string;
}

export interface ProjectTag {
  id: string;
  project_id: string;
  public_id: string;
  nfc_uid?: string;
  claim_mode: 'code' | 'secure_tap';
  status: 'active' | 'disabled' | 'claimed';
  claimed_by?: string;
  claimed_at?: string;
  created_at: string;
}

export interface Tag {
  id: string;
  tagId: string;
  project_id: string;
  project?: Project;
  created_at: string;
}

export interface Account {
  id: string;
  type: 'user' | 'owner';
  projects: number;
  created_at: string;
}

export interface DashboardStats {
  projects: number;
  tags: number;
  accounts: number;
  activeUsers: number;
  projectsTrend: 'up' | 'down' | 'flat';
  tagsTrend: 'up' | 'down' | 'flat';
  accountsTrend: 'up' | 'down' | 'flat';
  activeUsersTrend: 'up' | 'down' | 'flat';
}

export interface Resource {
  id: string;
  project_id: string;
  type: 'video' | 'playlist' | 'doc' | 'blog_post';
  name: string;
  description?: string;
  content?: string; // For blog posts
  url?: string; // For videos, playlists, docs
  image_url?: string; // For blog posts
  category?: string; // For blog posts
  author_name?: string; // For blog posts
  author_description?: string; // For blog posts
  author_profile_pic?: string; // For blog posts
  access_type: 'public' | 'private';
  required_assets?: string[]; // Asset IDs required for private access
  created_at: string;
}

export interface ProfileCardSettings {
  id: string;
  project_id: string;
  allow_bio: boolean;
  allowed_social_media: string[];
  created_at: string;
  updated_at: string;
}

export const SOCIAL_MEDIA_OPTIONS = [
  { id: 'instagram', name: 'Instagram', icon: 'Instagram' },
  { id: 'twitter', name: 'Twitter/X', icon: 'Twitter' },
  { id: 'linkedin', name: 'LinkedIn', icon: 'Linkedin' },
  { id: 'facebook', name: 'Facebook', icon: 'Facebook' },
  { id: 'youtube', name: 'YouTube', icon: 'Youtube' },
  { id: 'tiktok', name: 'TikTok', icon: 'Music' },
  { id: 'github', name: 'GitHub', icon: 'Github' },
  { id: 'website', name: 'Website', icon: 'Globe' },
] as const;