// User types
export type UserRole = "admin" | "staff";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  store_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserCreate {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  store_id?: string;
}

// Auth types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

// Store types
export interface Store {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StoreCreate {
  name: string;
  code: string;
}

export interface StoreUpdate {
  name?: string;
  code?: string;
  is_active?: boolean;
}

// Area types
export interface Area {
  id: string;
  store_id: string;
  name: string;
  code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AreaCreate {
  name: string;
  code: string;
}

export interface AreaUpdate {
  name?: string;
  code?: string;
  is_active?: boolean;
}

// Device types
export type DeviceStatus = "online" | "offline" | "unknown";

export interface Device {
  id: string;
  device_code: string;
  area_id: string;
  name: string | null;
  status: DeviceStatus;
  last_sync_at: string | null;
  registered_at: string;
  created_at: string;
  updated_at: string;
}

export interface DeviceRegister {
  area_id: string;
  device_code?: string;
}

export interface DeviceUpdate {
  name?: string;
  area_id?: string;
}

// Campaign types
export interface Campaign {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  weight: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CampaignCreate {
  store_id: string;
  name: string;
  description?: string;
  weight: number;
  start_date: string;
  end_date: string;
}

export interface CampaignUpdate {
  name?: string;
  description?: string;
  weight?: number;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
}

// Media types
export type MediaType = "image" | "video";

export interface Media {
  id: string;
  campaign_id: string;
  type: MediaType;
  filename: string;
  gcs_path: string;
  gcs_url: string | null;
  duration_seconds: number;
  file_size: number | null;
  mime_type: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface MediaUpdate {
  duration_seconds?: number;
  sort_order?: number;
}

// Playlist types
export interface PlaylistItem {
  media_id: string;
  campaign_id: string;
  url: string;
  type: MediaType;
  duration_seconds: number;
  filename: string;
}

export interface Playlist {
  version: string;
  items: PlaylistItem[];
  generated_at: string;
}

// Playback log types
export interface PlaybackLogCreate {
  device_id: string;
  media_id: string;
  campaign_id: string;
  played_at: string;
}

// Report types
export interface CampaignReport {
  campaign_id: string;
  campaign_name: string;
  play_count: number;
  unique_devices: number;
}

export interface StoreReport {
  store_id: string;
  store_name: string;
  play_count: number;
  device_count: number;
}

export interface DeviceReport {
  device_id: string;
  device_code: string;
  device_name: string | null;
  store_name: string;
  area_name: string;
  play_count: number;
}

export interface ReportSummary {
  period: {
    start_date: string;
    end_date: string;
  };
  playback: {
    total_plays: number;
    active_devices: number;
    active_campaigns: number;
  };
  inventory: {
    total_stores: number;
    total_areas: number;
    total_devices: number;
    total_campaigns: number;
  };
}

// Area campaign assignment types
export interface CampaignInfo {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export interface AreaCampaignAssignment {
  area_id: string;
  area_name: string;
  area_code: string;
  store_id: string;
  store_name: string;
  assigned_campaigns: CampaignInfo[];
  has_conflict: boolean;
  conflicting_campaigns: CampaignInfo[];
}

export interface AreaCampaignAssignmentResponse {
  areas: AreaCampaignAssignment[];
}

// Campaign conflict check types
export interface CampaignConflict {
  area_id: string;
  area_name: string;
  store_name: string;
  conflicting_campaign: CampaignInfo;
}

export interface CampaignConflictCheckRequest {
  area_ids: string[];
  start_date: string;
  end_date: string;
  exclude_campaign_id?: string;
}

export interface CampaignConflictCheckResponse {
  has_conflicts: boolean;
  conflicts: CampaignConflict[];
}
