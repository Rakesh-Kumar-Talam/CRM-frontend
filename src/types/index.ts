// API Response Types
export interface ApiResponse<T> {
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Authentication Types
export interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  profile_picture?: string;
  last_login?: string;
  email_verified?: boolean;
  google_id?: string;
}

export interface AuthResponse {
  token: string;
  user?: User;
}

// Google OAuth Types
export interface GoogleOAuthProfile {
  id: string;
  displayName: string;
  emails: Array<{
    value: string;
    verified: boolean;
  }>;
  photos: Array<{
    value: string;
  }>;
  provider: string;
}

export interface GoogleOAuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: User;
  redirect_url?: string;
}

export interface GoogleOAuthStatus {
  connected: boolean;
  user?: User;
  last_login?: string;
}

export interface GoogleOAuthError {
  error: string;
  error_description?: string;
  state?: string;
}

// Customer Types
export interface Customer {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  spend: number;
  visits: number;
  last_active: string;
  created_at: string;
}

export interface CreateCustomerRequest {
  name: string;
  email: string;
  phone?: string;
  spend?: number; // Made optional since spend will be calculated automatically
  visits: number;
  last_active: string;
  status: 'draft' | 'active' | 'completed' | 'paused';
}

// Customer Spend Calculation Types
export interface CustomerSpendCalculation {
  customer_id: string;
  total_spend: number;
  order_count: number;
  last_order_date?: string;
}

export interface RefreshSpendResponse {
  success: boolean;
  message: string;
  updated_count?: number;
  total_customers?: number;
}

export interface CustomerWithCalculatedSpend extends Customer {
  calculated_spend: number;
  order_count: number;
  last_order_date?: string;
}

// Order Types
export interface OrderItem {
  sku: string;
  name: string;
  qty: number;
  price: number;
}

export interface Order {
  _id: string;
  customer_id: string;
  amount: number;
  items: OrderItem[];
  date: string;
  created_at: string;
}

export interface CreateOrderRequest {
  customer_id: string;
  amount: number;
  items: OrderItem[];
  date: string;
}

// Segment Types
export interface Rule {
  field: string;
  op: '>' | '>=' | '<' | '<=' | '=' | '!=' | 'contains' | 'not_contains';
  value: string | number;
}

export interface RuleGroup {
  and?: Rule[];
  or?: Rule[];
}

export interface Segment {
  _id: string;
  name?: string;
  rules_json: RuleGroup;
  created_by: string;
  created_at: string;
  customer_ids: string[];
  customer_count: number;
  last_populated_at?: string;
}

export interface CreateSegmentRequest {
  name?: string;
  rules_json: RuleGroup;
  created_by: string;
}

export interface SegmentCustomersResponse {
  customers: Customer[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    has_more: boolean;
  };
  segment: {
    _id: string;
    name?: string;
    customer_count: number;
    last_populated_at?: string;
  };
}

// Campaign Types
export interface Campaign {
  _id: string;
  segment_id: string;
  segment_name?: string; // Added segment_name field from API response
  message: string;
  subject: string;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'DRAFT';
  created_at: string;
  updated_at?: string;
  logs?: CommunicationLog[];
  delivery_stats?: {
    total_sent: number;
    total_delivered: number;
    total_failed: number;
    success_rate: number;
  };
}

export interface CreateCampaignRequest {
  segment_id: string;
  message: string;
  subject: string;
  status?: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'DRAFT';
}

export interface UpdateCampaignRequest {
  message?: string;
  subject?: string;
  status?: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'DRAFT';
}

export interface GmailStatusResponse {
  connected: boolean;
  status: string;
  message: string;
  last_checked?: string;
}

export interface CommunicationLog {
  id: string;
  campaignId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  message: string;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'DELIVERED';
  sentAt?: string;
  deliveredAt?: string;
  updatedAt: string;
  errorMessage?: string;
  vendorMessageId?: string;
}

export interface CampaignDeliveryRequest {
  segmentId: string;
  subject: string;
  message: string;
  discountPercentage?: number;
}

export interface CampaignDeliveryResponse {
  success: boolean;
  campaignId: string;
  message: string;
  totalMessages: number;
  sentCount: number;
  failedCount: number;
  communicationLogs: CommunicationLog[];
}

// AI Types
export interface AIRulesRequest {
  input: string;
}

export interface AIRulesResponse {
  rules_json: RuleGroup;
}

export interface AIMessagesRequest {
  goal: string;
  segmentType?: string;
  customerType?: string;
}

export interface AIMessagesResponse {
  suggestions: string[];
}

export interface AICampaignMessagesRequest {
  goal: string;
  segmentType?: string;
  customerType?: string;
}

export interface AICampaignMessagesResponse {
  suggestions: string[];
}

export interface AISummaryRequest {
  sent: number;
  failed: number;
}

export interface AISummaryResponse {
  summary: string;
}


// Messaging Types
export interface PersonalizedMessage {
  _id: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  message: string;
  subject?: string;
  discount_percentage?: number;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'DELIVERED';
  vendor_message_id?: string;
  error_message?: string;
  sent_at?: string;
  delivered_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateMessageRequest {
  customer_id: string;
  message: string;
  discount_percentage?: number;
}

export interface VendorApiResponse {
  success: boolean;
  message_id: string;
  status: 'SENT' | 'FAILED';
  error_message?: string;
}

export interface DeliveryReceiptRequest {
  message_id: string;
  vendor_message_id: string;
  status: 'SENT' | 'FAILED' | 'DELIVERED';
  error_message?: string;
  delivered_at?: string;
}

export interface DeliveryReceiptResponse {
  success: boolean;
  message: string;
  updated_count?: number;
}

export interface MessageBatch {
  _id: string;
  messages: PersonalizedMessage[];
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  created_at: string;
  completed_at?: string;
  total_messages: number;
  sent_count: number;
  failed_count: number;
}

export interface CreateMessageBatchRequest {
  customer_ids: string[];
  message_template: string;
  discount_percentage?: number;
}

// Email API Types for MongoDB Storage
export interface EmailTemplate {
  subject: string;
  text: string;
  html: string;
  personalization: {
    customerName: boolean;
    customerEmail: boolean;
    customFields: string[];
  };
}

export interface EmailSendRequest {
  to: string;
  customer_id?: string;
  customer_name?: string;
  template: EmailTemplate;
}

export interface EmailSendResponse {
  success: boolean;
  message_id: string;
  status: 'SENT' | 'FAILED';
  error_message?: string;
  sent_at?: string;
}

export interface SentMessage {
  _id: string; // Customer ID / Message ID
  recipientName: string; // Customer name
  recipientEmail: string; // Customer email
  subject: string;
  message: string;
  discount_percentage?: number;
  status: 'SENT' | 'FAILED' | 'DELIVERED';
  vendor_message_id?: string;
  error_message?: string;
  sentAt: string; // Correct API field name (camelCase)
  delivered_at?: string;
  created_at?: string;
  updated_at?: string;
  
  // New fields from enhanced backend
  campaignId?: string; // Link to original campaign
  discountInfo?: {
    percentage: number;
    storeName?: string;
    couponCode?: string;
  };
  
  // Legacy fields for backward compatibility
  customer_id?: string;
  customer_name?: string;
  customer_email?: string;
  sent_at?: string;
}

export interface SentMessagesResponse {
  messages: SentMessage[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface EmailStatistics {
  total_messages: number;
  sent_count: number;
  failed_count: number;
  delivered_count: number;
  pending_count: number;
  success_rate: number;
  delivery_rate: number;
  average_delivery_time: number; // in minutes
  recent_activity: {
    last_24h: number;
    last_7d: number;
    last_30d: number;
  };
}

export interface EmailStatisticsResponse {
  statistics: EmailStatistics;
  period: {
    start_date: string;
    end_date: string;
  };
}

// Campaign Success Rates Types
export interface CampaignSuccessRate {
  campaign_id: string;
  campaign_name: string;
  segment_id: string;
  segment_name: string;
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  success_rate: number;
  delivery_rate: number;
  created_at: string;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'DRAFT';
}

export interface CampaignSuccessRatesResponse {
  campaigns: CampaignSuccessRate[];
  overall_stats: {
    total_campaigns: number;
    average_success_rate: number;
    average_delivery_rate: number;
    total_messages_sent: number;
    total_messages_delivered: number;
    total_messages_failed: number;
  };
  segment_breakdown: {
    segment_id: string;
    segment_name: string;
    campaign_count: number;
    average_success_rate: number;
    total_messages_sent: number;
  }[];
}

// Campaign Segment Breakdown Types
export interface CampaignSegmentBreakdown {
  campaign_id: string;
  campaign_name: string;
  overall_stats: {
    total_sent: number;
    total_delivered: number;
    total_failed: number;
    success_rate: number;
    delivery_rate: number;
    created_at: string;
    status: string;
  };
  segment_breakdown: {
    segment_id: string;
    segment_name: string;
    customer_count: number;
    messages_sent: number;
    messages_delivered: number;
    messages_failed: number;
    success_rate: number;
    delivery_rate: number;
  }[];
  recent_activity: {
    timestamp: string;
    action: string;
    details: string;
  }[];
}

// UI State Types
export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}



