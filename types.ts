
export enum Permission {
  VIEW_DASHBOARD = 'VIEW_DASHBOARD',
  USE_CALCULATOR = 'USE_CALCULATOR',
  VIEW_HISTORY = 'VIEW_HISTORY',
  MANAGE_STAFF = 'MANAGE_STAFF',
  MANAGE_PARTS = 'MANAGE_PARTS',
  MANAGE_SETTINGS = 'MANAGE_SETTINGS',
  MANAGE_ROLES = 'MANAGE_ROLES',
  MANAGE_ANNOUNCEMENTS = 'MANAGE_ANNOUNCEMENTS',
  VIEW_TIME_TRACKER = 'VIEW_TIME_TRACKER',
  MANAGE_TIME_TRACKER = 'MANAGE_TIME_TRACKER'
}

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
}

export interface User {
  id: string;
  username: string;
  name: string;
  roleId: string;
  workshopId: string;
  password?: string;
  avatar?: string;
  pendingTax?: number; // New field for tax tracking
}

export interface Part {
  id: string;
  name: string;
  category: string;
  price: number;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  targetUserId: string | 'all';
  timestamp: number;
  type: 'info' | 'warning' | 'urgent';
}

export interface WorkSession {
  id: string;
  mechanicId: string;
  mechanicName: string;
  startTime: number;
  endTime?: number;
  pauses: Array<{ start: number; end?: number }>;
  status: 'active' | 'paused' | 'completed';
}

export interface ServiceRecord {
  id: string;
  mechanicId: string;
  mechanicName: string;
  customerName: string;
  customerId: string;
  authorizedBy: string;
  vehicleModel?: string;
  plate?: string;
  parts: Array<{ partId: string; name: string; price: number; quantity: number }>;
  inGameCost: number;
  freelanceFee: number;
  totalAmount: number;
  tax: number;
  finalPrice: number;
  screenshot?: string;
  timestamp: number;
  notes?: string;
}

export type CategoryGroup = 'Estetica' | 'Performance';

export interface AppSettings {
  workshopName: string;
  logoUrl?: string;
  taxRate: number; 
  freelanceMultiplier: number;
  primaryColor: string;
  currencySymbol: string;
  categories: string[];
  categoryGroups: Record<string, CategoryGroup>; // Map category name to its group
  esteticaWebhook: string;
  performanceWebhook: string;
}

export interface Workshop {
  id: string;
  name: string;
  ownerId: string;
  settings: AppSettings;
  parts: Part[];
  roles: Role[];
  history: ServiceRecord[];
  announcements: Announcement[];
  workSessions: WorkSession[];
}
