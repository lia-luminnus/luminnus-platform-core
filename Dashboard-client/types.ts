
export interface NavItem {
  label: string;
  icon: string;
  path: string;
}

export interface User {
  name: string;
  email: string;
  avatar: string;
  role: string;
}

export interface FileItem {
  id: string;
  name: string;
  type: 'folder' | 'pdf' | 'image' | 'video' | 'doc' | 'sheet' | 'zip';
  size?: string;
  date: string;
  itemCount?: number;
}

export interface Automation {
  id: string;
  name: string;
  trigger: string;
  lastRun: string;
  status: 'active' | 'paused' | 'error';
}

export interface Transaction {
  id: string;
  description: string;
  date: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed' | 'in_progress';
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  status: 'active' | 'pending';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO Date string YYYY-MM-DD
  time: string;
  type: 'meeting' | 'deadline' | 'review' | 'other';
  description?: string;
}

export interface Deal {
  id: string;
  clientName: string;
  company: string;
  value: number;
  stage: 'lead' | 'contacted' | 'proposal' | 'negotiation' | 'closed';
  email: string;
  phone: string;
  lastContact: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  stock: number;
  minStock: number;
  price: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  image?: string;
}

export interface BusinessCategory {
  id: string;
  title: string;
  description: string;
  icon: string;
}

// --- Modular System Types ---

export type ModuleId = 
  | 'dashboard' 
  | 'crm' 
  | 'lia' 
  | 'calendar' 
  | 'files' 
  | 'automations' 
  | 'financial' 
  | 'team' 
  | 'stock' 
  | 'projects' 
  | 'logistics' 
  | 'properties' 
  | 'medical_records' 
  | 'sales'
  | 'reports'
  | 'settings' 
  | 'plan' 
  | 'support';

export interface ModuleDefinition {
  id: ModuleId;
  translationKey: string; // Key for i18n
  icon: string;
  path: string;
  isCore?: boolean; // If true, cannot be disabled (e.g., Dashboard, Settings)
  descriptionKey?: string;
}