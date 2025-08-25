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