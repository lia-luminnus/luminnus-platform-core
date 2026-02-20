
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
  status: 'active' | 'paused' | 'error' | 'draft' | 'archived';
  trigger_type?: string;
  trigger_config?: any;
  flow_definition?: any;
  updated_at?: string;
}

export interface Transaction {
  id: string;
  tenantId?: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  date: string;
  status: 'completed' | 'pending' | 'failed' | 'in_progress' | 'scheduled';
  relatedOrderId?: string;
  createdAt?: string;
}

export interface OrderItem {
  id?: string;
  orderId?: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Order {
  id: string;
  tenantId: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string; // WhatsApp number
  status: 'pending' | 'completed' | 'cancelled' | 'refunded';
  totalAmount: number;
  paymentMethod: string;
  notes?: string;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
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
  stage: 'lead' | 'contacted' | 'proposal' | 'negotiation' | 'closed' | 'lost';
  email: string;
  phone: string;
  lastContact: string;
  // Expanded fields
  priority: 'low' | 'medium' | 'high' | 'urgent';
  probability: number; // 0-100
  expectedCloseDate: string | null;
  source: string;
  tags: string[];
  notes: string;
  assignedTo: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  stock: number;
  minStock: number;
  price: number;
  costPrice?: number;
  description?: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  image?: string;
  createdAt?: string;
  updatedAt?: string;
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
  | 'integrations'
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
  | 'support'
  | 'whatsapp_agent';

export interface ModuleDefinition {
  id: ModuleId;
  translationKey: string; // Key for i18n
  icon: string;
  path: string;
  isCore?: boolean; // If true, cannot be disabled (e.g., Dashboard, Settings)
  descriptionKey?: string;
}

export interface Property {
  id: string;
  tenantId: string;
  address: string;
  city: string;
  type: 'House' | 'Apartment' | 'Condo' | 'Office';
  status: 'For Sale' | 'For Rent' | 'Sold';
  price: number;
  bedrooms: number;
  date: string;
  images: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface HistoryEntry {
  id: string;
  date: string;
  text: string;
  icon: string;
  color: string;
  type: string;
}

export interface Prescription {
  id: string;
  date: string;
  doctor: string;
  medications: string;
}

export interface MedicalBudget {
  id: string;
  title: string;
  value: string;
  status: 'Aprovado' | 'Pendente' | 'Rejeitado';
}

export interface MedicalFile {
  id: string;
  name: string;
  type: string; // 'picture_as_pdf', 'image', 'description'
}

export interface Patient {
  id: string;
  name: string;
  phone: string;
  age: string;
  plan: string;
  tags: { label: string; color: string }[];
  appointments: { title: string; doctor: string; date: string; time: string }[];
  observations: string;
  privateObservations: string;
  stats: {
    consults: number;
    exams: number;
    vaccines: number;
    surgeries: number;
    procedures: number;
    cancelled: number;
  };
  history: HistoryEntry[];
  prescriptions: Prescription[];
  budgets: MedicalBudget[];
  files: MedicalFile[];
  financial: {
    totalBilled: number;
    totalPaid: number;
    totalOpen: number;
  };
}
