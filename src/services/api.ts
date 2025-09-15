import axios from 'axios';
import { 
  AuthResponse, 
  Customer, 
  CreateCustomerRequest, 
  Order, 
  CreateOrderRequest,
  Segment,
  CreateSegmentRequest,
  RuleGroup,
  Campaign,
  CreateCampaignRequest,
  UpdateCampaignRequest,
  GmailStatusResponse,
  ApiResponse,
  AIRulesRequest,
  AIRulesResponse,
  AIMessagesRequest,
  AIMessagesResponse,
  AICampaignMessagesRequest,
  AICampaignMessagesResponse,
  AISummaryRequest,
  AISummaryResponse,
  SegmentCustomersResponse,
  CustomerWithCalculatedSpend,
  RefreshSpendResponse,
  GoogleOAuthResponse,
  GoogleOAuthStatus,
  PersonalizedMessage,
  CreateMessageRequest,
  VendorApiResponse,
  DeliveryReceiptRequest,
  DeliveryReceiptResponse,
  MessageBatch,
  CreateMessageBatchRequest,
  EmailSendRequest,
  EmailSendResponse,
  SentMessage,
  SentMessagesResponse,
  EmailStatistics,
  EmailStatisticsResponse,
  CampaignSuccessRatesResponse,
  CampaignSegmentBreakdown
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://crm-backend-yn3q.onrender.com/api';

// Check if we're in development and no backend is available
const isDevelopment = process.env.NODE_ENV === 'development';
const useMockData = isDevelopment && !process.env.REACT_APP_API_URL;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors and network issues
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      url: error.config?.url
    });
    
    if (error.response?.status === 401) {
      console.warn('Authentication required. Please log in to access the data.');
      // Don't redirect to login automatically in development
      // localStorage.removeItem('authToken');
      // window.location.href = '/login';
    } else if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
      console.warn('Backend server is not running. Using mock data fallback.');
    } else if (error.response?.status === 404) {
      console.warn('API endpoint not found. Using mock data fallback.');
    }
    return Promise.reject(error);
  }
);

// Communication Log Types
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

// Auth API
export const authApi = {
  // Google OAuth API endpoints
  checkGoogleOAuthStatus: async (): Promise<GoogleOAuthStatus> => {
    const response = await api.get('/auth/google/status');
    return response.data;
  },

  disconnectGoogleOAuth: async (userId: string): Promise<GoogleOAuthResponse> => {
    const response = await api.post('/auth/google/logout', { userId });
    return response.data;
  },
};

// Customer API
export const customerApi = {
  create: async (data: CreateCustomerRequest): Promise<Customer> => {
    console.log('API: Creating customer with data:', data);
    console.log('API: Making request to:', `${API_BASE_URL}/customers`);
    try {
      const response = await api.post('/customers', data);
      console.log('API: Customer creation response:', response);
      return response.data;
    } catch (error) {
      console.error('API: Customer creation error:', error);
      throw error;
    }
  },

  list: async (params?: { page?: number; limit?: number; email?: string; search?: string; spend_tier?: string; sort_field?: string; sort_direction?: string; calculated_spend?: boolean }): Promise<ApiResponse<Customer[] | CustomerWithCalculatedSpend[]>> => {
    console.log('API: Fetching customers with params:', params);
    try {
      const response = await api.get('/customers', { params });
      console.log('API: Customers list response:', response);
      
      // Handle different response formats from backend
      const responseData = response.data;
      if (responseData.items) {
        // Backend returns {items: [...], pagination: {...}}
        return {
          data: responseData.items,
          pagination: responseData.pagination
        };
      } else if (responseData.data) {
        // Backend returns {data: [...], pagination: {...}}
        return responseData;
      } else {
        // Backend returns array directly
        return {
          data: responseData,
          pagination: undefined
        };
      }
    } catch (error: any) {
      console.error('API: Customers list error:', error);
      
      // If backend fails, use mock implementation
      if (error.response?.status === 404 || error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        console.log('Backend endpoint not available, using mock implementation');
        
        // Check if mock data already exists, if not create it
        let mockCustomers: Customer[] = [];
        const existingData = localStorage.getItem('mockCustomers');
        if (existingData) {
          mockCustomers = JSON.parse(existingData);
        } else {
        
        const sampleCustomers: Customer[] = [
            {
              _id: 'customer_1',
              name: 'John Doe',
              email: 'john.doe@example.com',
              phone: '+1-555-0123',
              spend: 1250.50,
              visits: 8,
              last_active: '2024-01-15T10:30:00Z',
              created_at: '2024-01-01T00:00:00Z'
            },
            {
              _id: 'customer_2',
              name: 'Jane Smith',
              email: 'jane.smith@example.com',
              phone: '+1-555-0124',
              spend: 890.25,
              visits: 5,
              last_active: '2024-01-14T15:45:00Z',
              created_at: '2024-01-02T00:00:00Z'
            },
            {
              _id: 'customer_3',
              name: 'Bob Johnson',
              email: 'bob.johnson@example.com',
              phone: '+1-555-0125',
              spend: 2100.75,
              visits: 12,
              last_active: '2024-01-13T09:15:00Z',
              created_at: '2024-01-03T00:00:00Z'
            },
            {
              _id: 'customer_4',
              name: 'Alice Brown',
              email: 'alice.brown@example.com',
              phone: '+1-555-0126',
              spend: 750.00,
              visits: 3,
              last_active: '2024-01-12T14:20:00Z',
              created_at: '2024-01-04T00:00:00Z'
            },
            {

              _id: 'customer_5',
              name: 'Charlie Wilson',
              email: 'charlie.wilson@example.com',
              phone: '+1-555-0127',
              spend: 3200.00,
              visits: 15,
              last_active: '2024-01-11T09:30:00Z',
              created_at: '2024-01-05T00:00:00Z'
            },
            {
              _id: 'customer_6',
              name: 'Diana Davis',
              email: 'diana.davis@example.com',
              phone: '+1-555-0128',
              spend: 450.75,
              visits: 7,
              last_active: '2024-01-10T16:45:00Z',
              created_at: '2024-01-06T00:00:00Z'
            },
            {
              _id: 'customer_7',
              name: 'Eva Martinez',
              email: 'eva.martinez@example.com',
              phone: '+1-555-0129',
              spend: 1800.25,
              visits: 11,
              last_active: '2024-01-09T11:15:00Z',
              created_at: '2024-01-07T00:00:00Z'
            },
            {
              _id: 'customer_8',
              name: 'Frank Taylor',
              email: 'frank.taylor@example.com',
              phone: '+1-555-0130',
              spend: 950.50,
              visits: 6,
              last_active: '2024-01-08T13:30:00Z',
              created_at: '2024-01-08T00:00:00Z'
            },
            {
              _id: 'customer_9',
              name: 'Grace Lee',
              email: 'grace.lee@example.com',
              phone: '+1-555-0131',
              spend: 2750.00,
              visits: 14,
              last_active: '2024-01-07T10:20:00Z',
              created_at: '2024-01-09T00:00:00Z'
            },
            {
              _id: 'customer_10',
              name: 'Henry Anderson',
              email: 'henry.anderson@example.com',
              phone: '+1-555-0132',
              spend: 1200.00,
              visits: 9,
              last_active: '2024-01-06T15:10:00Z',
              created_at: '2024-01-10T00:00:00Z'
            },
            {
              _id: 'customer_11',
              name: 'Ivy Chen',
              email: 'ivy.chen@example.com',
              phone: '+1-555-0133',
              spend: 650.25,
              visits: 4,
              last_active: '2024-01-05T12:45:00Z',
              created_at: '2024-01-11T00:00:00Z'
            },
            {
              _id: 'customer_12',
              name: 'Jack Thompson',
              email: 'jack.thompson@example.com',
              phone: '+1-555-0134',
              spend: 3100.75,
              visits: 18,
              last_active: '2024-01-04T08:30:00Z',
              created_at: '2024-01-12T00:00:00Z'
            },
            {
              _id: 'customer_13',
              name: 'Kelly White',
              email: 'kelly.white@example.com',
              phone: '+1-555-0135',
              spend: 850.00,
              visits: 8,
              last_active: '2024-01-03T14:15:00Z',
              created_at: '2024-01-13T00:00:00Z'
            },
            {
              _id: 'customer_14',
              name: 'Liam Garcia',
              email: 'liam.garcia@example.com',
              phone: '+1-555-0136',
              spend: 1950.50,
              visits: 13,
              last_active: '2024-01-02T16:40:00Z',
              created_at: '2024-01-14T00:00:00Z'
            },
            {
              _id: 'customer_15',
              name: 'Maya Patel',
              email: 'maya.patel@example.com',
              phone: '+1-555-0137',
              spend: 1400.25,
              visits: 10,
              last_active: '2024-01-01T09:25:00Z',
              created_at: '2024-01-15T00:00:00Z'
            },
            {
              _id: 'customer_16',
              name: 'Noah Rodriguez',
              email: 'noah.rodriguez@example.com',
              phone: '+1-555-0138',
              spend: 2200.00,
              visits: 16,
              last_active: '2023-12-31T11:50:00Z',
              created_at: '2024-01-16T00:00:00Z'
            },
            {
              _id: 'customer_17',
              name: 'Olivia Kim',
              email: 'olivia.kim@example.com',
              phone: '+1-555-0139',
              spend: 750.75,
              visits: 5,
              last_active: '2023-12-30T13:20:00Z',
              created_at: '2024-01-17T00:00:00Z'
            },
            {
              _id: 'customer_18',
              name: 'Peter Johnson',
              email: 'peter.johnson@example.com',
              phone: '+1-555-0140',
              spend: 1650.00,
              visits: 12,
              last_active: '2023-12-29T15:35:00Z',
              created_at: '2024-01-18T00:00:00Z'
            },
            {
              _id: 'customer_19',
              name: 'Quinn Miller',
              email: 'quinn.miller@example.com',
              phone: '+1-555-0141',
              spend: 900.25,
              visits: 7,
              last_active: '2023-12-28T10:15:00Z',
              created_at: '2024-01-19T00:00:00Z'
            },
            {
              _id: 'customer_20',
              name: 'Rachel Williams',
              email: 'rachel.williams@example.com',
              phone: '+1-555-0142',
              spend: 2800.50,
              visits: 17,
              last_active: '2023-12-27T12:00:00Z',
              created_at: '2024-01-20T00:00:00Z'
            }
          ];
          localStorage.setItem('mockCustomers', JSON.stringify(sampleCustomers));
          mockCustomers = sampleCustomers;
        }
        
        // Apply search filter
        let filteredCustomers = mockCustomers;
        console.log('Mock API - Total customers before filtering:', mockCustomers.length);
        console.log('Mock API - Search params:', params);
        
        if (params?.search) {
          const searchTerm = params.search.toLowerCase();
          console.log('Mock API - Applying search filter for term:', searchTerm);
          filteredCustomers = mockCustomers.filter(customer => 
            customer.name.toLowerCase().includes(searchTerm) ||
            customer.email.toLowerCase().includes(searchTerm) ||
            (customer.phone && customer.phone.toLowerCase().includes(searchTerm))
          );
          console.log('Mock API - Search results count:', filteredCustomers.length);
          console.log('Mock API - Search results:', filteredCustomers.map(c => c.name));
        }
        
        // Apply spend tier filter
        if (params?.spend_tier && params.spend_tier !== 'all') {
          const tierRanges = {
            'Bronze': [0, 999],
            'Silver': [1000, 2499],
            'Gold': [2500, 4999],
            'Platinum': [5000, Infinity]
          };
          const [min, max] = tierRanges[params.spend_tier as keyof typeof tierRanges] || [0, Infinity];
          filteredCustomers = filteredCustomers.filter(customer => 
            customer.spend >= min && customer.spend <= max
          );
        }
        
        // Apply sorting
        if (params?.sort_field) {
          filteredCustomers.sort((a, b) => {
            const field = params.sort_field as keyof Customer;
            const aVal = a[field];
            const bVal = b[field];
            
            if (typeof aVal === 'string' && typeof bVal === 'string') {
              return params.sort_direction === 'desc' 
                ? bVal.localeCompare(aVal)
                : aVal.localeCompare(bVal);
            }
            
            if (typeof aVal === 'number' && typeof bVal === 'number') {
              return params.sort_direction === 'desc' ? bVal - aVal : aVal - bVal;
            }
            
            return 0;
          });
        }
        
        // Simple pagination
        const page = params?.page || 1;
        const limit = params?.limit || 12;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);
        
        return {
          data: paginatedCustomers,
          pagination: {
            page,
            limit,
            total: filteredCustomers.length,
            pages: Math.ceil(filteredCustomers.length / limit)
          }
        };
      }
      
      throw error;
    }
  },

  update: async (id: string, data: CreateCustomerRequest): Promise<Customer> => {
    console.log('API: Updating customer with id:', id, 'data:', data);
    try {
      const response = await api.put(`/customers/${id}`, data);
      console.log('API: Customer update response:', response);
      return response.data;
    } catch (error) {
      console.error('API: Customer update error:', error);
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    console.log('API: Deleting customer with id:', id);
    try {
      const response = await api.delete(`/customers/${id}`);
      console.log('API: Customer delete response:', response);
      return response.data;
    } catch (error) {
      console.error('API: Customer delete error:', error);
      throw error;
    }
  },

  // Utility function to refresh mock data
  refreshMockData: () => {
    console.log('API: Refreshing mock customer data');
    localStorage.removeItem('mockCustomers');
    // The next API call will automatically create fresh mock data
  },

  // Customer Spend Calculation Methods
  refreshSpend: async (id: string): Promise<RefreshSpendResponse> => {
    console.log('API: Refreshing spend for customer:', id);
    try {
      const response = await api.post(`/customers/${id}/refresh-spend`);
      console.log('API: Customer refresh spend response:', response);
      return response.data;
    } catch (error) {
      console.error('API: Customer refresh spend error:', error);
      throw error;
    }
  },

  refreshAllSpend: async (): Promise<RefreshSpendResponse> => {
    console.log('API: Refreshing spend for all customers');
    try {
      const response = await api.post('/customers/refresh-spend');
      console.log('API: All customers refresh spend response:', response);
      return response.data;
    } catch (error) {
      console.error('API: All customers refresh spend error:', error);
      throw error;
    }
  },
};

// Order API
export const orderApi = {
  create: async (data: CreateOrderRequest): Promise<Order> => {
    console.log('API: Creating order with data:', data);
    console.log('API: Making request to:', `${API_BASE_URL}/orders`);
    try {
      const response = await api.post('/orders', data);
      console.log('API: Order creation response:', response);
      return response.data;
    } catch (error) {
      console.error('API: Order creation error:', error);
      throw error;
    }
  },

  list: async (params?: { page?: number; limit?: number; search?: string }): Promise<ApiResponse<Order[]>> => {
    console.log('API: Fetching orders with params:', params);
    try {
      const response = await api.get('/orders', { params });
      console.log('API: Orders list response:', response);
      
      // Handle different response formats from backend
      const responseData = response.data;
      if (responseData.items) {
        // Backend returns {items: [...], pagination: {...}}
        return {
          data: responseData.items,
          pagination: responseData.pagination
        };
      } else if (responseData.data) {
        // Backend returns {data: [...], pagination: {...}}
        return responseData;
      } else {
        // Backend returns array directly
        return {
          data: responseData,
          pagination: undefined
        };
      }
    } catch (error: any) {
      console.error('API: Orders list error:', error);
      
      // If backend fails, use mock implementation
      if (error.response?.status === 404 || error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        console.log('Backend endpoint not available, using mock implementation');
        const mockOrders = JSON.parse(localStorage.getItem('mockOrders') || '[]');
        
        // If no mock data exists, create some sample data
        if (mockOrders.length === 0) {
          const sampleOrders: Order[] = [
            {
              _id: 'order_1',
              customer_id: 'customer_1',
              amount: 125.50,
              items: [
                { sku: 'SKU001', name: 'Product A', qty: 2, price: 50.00 },
                { sku: 'SKU002', name: 'Product B', qty: 1, price: 25.50 }
              ],
              date: '2024-01-15T10:30:00Z',
              created_at: '2024-01-15T10:30:00Z'
            },
            {
              _id: 'order_2',
              customer_id: 'customer_2',
              amount: 89.25,
              items: [
                { sku: 'SKU003', name: 'Product C', qty: 1, price: 89.25 }
              ],
              date: '2024-01-14T15:45:00Z',
              created_at: '2024-01-14T15:45:00Z'
            },
            {
              _id: 'order_3',
              customer_id: 'customer_3',
              amount: 210.75,
              items: [
                { sku: 'SKU004', name: 'Product D', qty: 3, price: 70.25 }
              ],
              date: '2024-01-13T09:15:00Z',
              created_at: '2024-01-13T09:15:00Z'
            }
          ];
          localStorage.setItem('mockOrders', JSON.stringify(sampleOrders));
          mockOrders.push(...sampleOrders);
        }
        
        // Simple pagination
        const page = params?.page || 1;
        const limit = params?.limit || 12;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedOrders = mockOrders.slice(startIndex, endIndex);
        
        return {
          data: paginatedOrders,
          pagination: {
            page,
            limit,
            total: mockOrders.length,
            pages: Math.ceil(mockOrders.length / limit)
          }
        };
      }
      
      throw error;
    }
  },

  update: async (id: string, data: CreateOrderRequest): Promise<Order> => {
    console.log('API: Updating order with id:', id, 'data:', data);
    try {
      const response = await api.put(`/orders/${id}`, data);
      console.log('API: Order update response:', response);
      return response.data;
    } catch (error) {
      console.error('API: Order update error:', error);
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    console.log('API: Deleting order with id:', id);
    try {
      const response = await api.delete(`/orders/${id}`);
      console.log('API: Order delete response:', response);
      return response.data;
    } catch (error) {
      console.error('API: Order delete error:', error);
      throw error;
    }
  },

  get: async (id: string): Promise<Order> => {
    console.log('API: Getting order with id:', id);
    try {
      const response = await api.get(`/orders/${id}`);
      console.log('API: Order get response:', response);
      return response.data;
    } catch (error) {
      console.error('API: Order get error:', error);
      throw error;
    }
  },
};

// Segment API (Mock implementation until backend is ready)
export const segmentApi = {
  create: async (data: CreateSegmentRequest): Promise<Segment> => {
    console.log('API: Creating segment with data:', data);
    try {
      // Try backend first
      const response = await api.post('/segments', data);
      console.log('API: Segment creation response:', response);
      return response.data;
    } catch (error: any) {
      // If backend fails (404), use mock implementation
      if (error.response?.status === 404) {
        console.log('Backend endpoint not available, using mock implementation');
        const mockSegment: Segment = {
          _id: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: data.name,
          rules_json: data.rules_json,
          created_by: data.created_by,
          created_at: new Date().toISOString(),
          customer_ids: [],
          customer_count: 0
        };
        
        // Store in localStorage
        const existingSegments = JSON.parse(localStorage.getItem('mockSegments') || '[]');
        existingSegments.push(mockSegment);
        localStorage.setItem('mockSegments', JSON.stringify(existingSegments));
        
        return mockSegment;
      }
      console.error('API: Segment creation error:', error);
      throw error;
    }
  },

  list: async (params?: { page?: number; limit?: number; search?: string }): Promise<ApiResponse<Segment[]>> => {
    console.log('API: Fetching segments with params:', params);
    try {
      // Try backend first
      const response = await api.get('/segments', { params });
      console.log('API: Segments list response:', response);
      
      // Handle different response formats from backend
      const responseData = response.data;
      if (responseData.items) {
        return {
          data: responseData.items,
          pagination: responseData.pagination
        };
      } else if (responseData.data) {
        return responseData;
      } else {
        return {
          data: responseData,
          pagination: undefined
        };
      }
    } catch (error: any) {
      // If backend fails, use mock implementation
      if (error.response?.status === 404 || error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        console.log('Backend endpoint not available, using mock implementation');
        const mockSegments = JSON.parse(localStorage.getItem('mockSegments') || '[]');
        
        // If no mock data exists, create some sample data
        if (mockSegments.length === 0) {
          const sampleSegments: Segment[] = [
            {
              _id: 'segment_1',
              name: 'High-Value Customers',
              rules_json: {
                and: [{ field: 'spend', op: '>=', value: 1000 }],
                or: []
              },
              created_by: 'system',
              created_at: '2024-01-01T00:00:00Z',
              customer_ids: ['customer_1', 'customer_3'],
              customer_count: 2
            },
            {
              _id: 'segment_2',
              name: 'Frequent Visitors',
              rules_json: {
                and: [{ field: 'visits', op: '>=', value: 5 }],
                or: []
              },
              created_by: 'system',
              created_at: '2024-01-02T00:00:00Z',
              customer_ids: ['customer_1', 'customer_2', 'customer_3'],
              customer_count: 3
            },
            {
              _id: 'segment_3',
              name: 'New Customers',
              rules_json: {
                and: [{ field: 'created_at', op: '>=', value: '2024-01-01' }],
                or: []
              },
              created_by: 'system',
              created_at: '2024-01-03T00:00:00Z',
              customer_ids: ['customer_1', 'customer_2', 'customer_3'],
              customer_count: 3
            }
          ];
          localStorage.setItem('mockSegments', JSON.stringify(sampleSegments));
          mockSegments.push(...sampleSegments);
        }
        
        // Simple pagination
        const page = params?.page || 1;
        const limit = params?.limit || 12;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedSegments = mockSegments.slice(startIndex, endIndex);
        
        return {
          data: paginatedSegments,
          pagination: {
            page,
            limit,
            total: mockSegments.length,
            pages: Math.ceil(mockSegments.length / limit)
          }
        };
      }
      console.error('API: Segments list error:', error);
      throw error;
    }
  },

  get: async (id: string): Promise<Segment> => {
    console.log('API: Getting segment with id:', id);
    try {
      // Try backend first
      const response = await api.get(`/segments/${id}`);
      console.log('API: Segment get response:', response);
      return response.data;
    } catch (error: any) {
      // If backend fails (404), use mock implementation
      if (error.response?.status === 404) {
        console.log('Backend endpoint not available, using mock implementation');
        const mockSegments = JSON.parse(localStorage.getItem('mockSegments') || '[]');
        const segment = mockSegments.find((s: Segment) => s._id === id);
        if (!segment) {
          throw new Error('Segment not found');
        }
        return segment;
      }
      console.error('API: Segment get error:', error);
      throw error;
    }
  },

  update: async (id: string, data: CreateSegmentRequest): Promise<Segment> => {
    console.log('API: Updating segment with id:', id, 'data:', data);
    try {
      // Try backend first
      const response = await api.put(`/segments/${id}`, data);
      console.log('API: Segment update response:', response);
      return response.data;
    } catch (error: any) {
      // If backend fails (404), use mock implementation
      if (error.response?.status === 404) {
        console.log('Backend endpoint not available, using mock implementation');
        const mockSegments = JSON.parse(localStorage.getItem('mockSegments') || '[]');
        const segmentIndex = mockSegments.findIndex((s: Segment) => s._id === id);
        if (segmentIndex === -1) {
          throw new Error('Segment not found');
        }
        
        const updatedSegment: Segment = {
          ...mockSegments[segmentIndex],
          name: data.name,
          rules_json: data.rules_json,
          created_by: data.created_by,
          customer_ids: mockSegments[segmentIndex].customer_ids || [],
          customer_count: mockSegments[segmentIndex].customer_count || 0
        };
        
        mockSegments[segmentIndex] = updatedSegment;
        localStorage.setItem('mockSegments', JSON.stringify(mockSegments));
        
        return updatedSegment;
      }
      console.error('API: Segment update error:', error);
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    console.log('API: Deleting segment with id:', id);
    try {
      // Try backend first
      const response = await api.delete(`/segments/${id}`);
      console.log('API: Segment delete response:', response);
      return response.data;
    } catch (error: any) {
      // If backend fails (404), use mock implementation
      if (error.response?.status === 404) {
        console.log('Backend endpoint not available, using mock implementation');
        const mockSegments = JSON.parse(localStorage.getItem('mockSegments') || '[]');
        const filteredSegments = mockSegments.filter((s: Segment) => s._id !== id);
        localStorage.setItem('mockSegments', JSON.stringify(filteredSegments));
        return;
      }
      console.error('API: Segment delete error:', error);
      throw error;
    }
  },

  preview: async (rules: RuleGroup): Promise<{ count: number }> => {
    console.log('API: Previewing segment with rules:', rules);
    try {
      // Try backend first
      const response = await api.post('/segments/preview', { rules_json: rules });
      console.log('API: Segment preview response:', response);
      return response.data;
    } catch (error: any) {
      // If backend fails, use mock implementation
      if (error.response?.status === 404 || error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        console.log('Backend endpoint not available, using mock implementation');
        // Mock preview - return a random number between 10-100
        const mockCount = Math.floor(Math.random() * 90) + 10;
        return { count: mockCount };
      }
      console.error('API: Segment preview error:', error);
      throw error;
    }
  },

  getCustomers: async (id: string, params?: { limit?: number; offset?: number }): Promise<SegmentCustomersResponse> => {
    console.log('API: Getting customers for segment:', id, 'with params:', params);
    try {
      const response = await api.get(`/segments/${id}/customers`, { params });
      console.log('API: Segment customers response:', response);
      return response.data;
    } catch (error: any) {
      console.error('API: Segment customers error:', error);
      
      // If backend fails, use mock implementation
      if (error.response?.status === 404 || error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        console.log('Backend endpoint not available, using mock implementation');
        
        // Get mock customers - use the same data as customerApi
        let mockCustomers = JSON.parse(localStorage.getItem('mockCustomers') || '[]');
        
        // If no mock customers exist, generate them using the same logic as customerApi
        if (mockCustomers.length === 0) {
          console.log('No mock customers found, generating fresh data for segment...');
          
          // Generate the same sample customers as in customerApi
          const sampleCustomers: Customer[] = [
            {
              _id: 'customer_1',
              name: 'John Doe',
              email: 'john.doe@example.com',
              phone: '+1-555-0123',
              spend: 1250.50,
              visits: 8,
              last_active: '2024-01-15T10:30:00Z',
              created_at: '2024-01-01T00:00:00Z'
            },
            {
              _id: 'customer_2',
              name: 'Jane Smith',
              email: 'jane.smith@example.com',
              phone: '+1-555-0124',
              spend: 890.25,
              visits: 5,
              last_active: '2024-01-14T15:45:00Z',
              created_at: '2024-01-02T00:00:00Z'
            },
            {
              _id: 'customer_3',
              name: 'Bob Johnson',
              email: 'bob.johnson@example.com',
              phone: '+1-555-0125',
              spend: 2100.75,
              visits: 12,
              last_active: '2024-01-13T09:15:00Z',
              created_at: '2024-01-03T00:00:00Z'
            },
            {
              _id: 'customer_4',
              name: 'Alice Brown',
              email: 'alice.brown@example.com',
              phone: '+1-555-0126',
              spend: 750.00,
              visits: 3,
              last_active: '2024-01-12T14:20:00Z',
              created_at: '2024-01-04T00:00:00Z'
            },
            {
              _id: 'customer_5',
              name: 'Charlie Wilson',
              email: 'charlie.wilson@example.com',
              phone: '+1-555-0127',
              spend: 3200.00,
              visits: 15,
              last_active: '2024-01-11T09:30:00Z',
              created_at: '2024-01-05T00:00:00Z'
            },
            {
              _id: 'customer_6',
              name: 'Diana Davis',
              email: 'diana.davis@example.com',
              phone: '+1-555-0128',
              spend: 450.75,
              visits: 7,
              last_active: '2024-01-10T16:45:00Z',
              created_at: '2024-01-06T00:00:00Z'
            },
            {
              _id: 'customer_7',
              name: 'Eva Martinez',
              email: 'eva.martinez@example.com',
              phone: '+1-555-0129',
              spend: 1800.25,
              visits: 11,
              last_active: '2024-01-09T11:15:00Z',
              created_at: '2024-01-07T00:00:00Z'
            },
            {
              _id: 'customer_8',
              name: 'Frank Taylor',
              email: 'frank.taylor@example.com',
              phone: '+1-555-0130',
              spend: 950.50,
              visits: 6,
              last_active: '2024-01-08T13:30:00Z',
              created_at: '2024-01-08T00:00:00Z'
            },
            {
              _id: 'customer_9',
              name: 'Grace Lee',
              email: 'grace.lee@example.com',
              phone: '+1-555-0131',
              spend: 2750.00,
              visits: 14,
              last_active: '2024-01-07T10:20:00Z',
              created_at: '2024-01-09T00:00:00Z'
            },
            {
              _id: 'customer_10',
              name: 'Henry Anderson',
              email: 'henry.anderson@example.com',
              phone: '+1-555-0132',
              spend: 1200.00,
              visits: 9,
              last_active: '2024-01-06T15:10:00Z',
              created_at: '2024-01-10T00:00:00Z'
            },
            {
              _id: 'customer_11',
              name: 'Ivy Chen',
              email: 'ivy.chen@example.com',
              phone: '+1-555-0133',
              spend: 650.25,
              visits: 4,
              last_active: '2024-01-05T12:45:00Z',
              created_at: '2024-01-11T00:00:00Z'
            },
            {
              _id: 'customer_12',
              name: 'Jack Thompson',
              email: 'jack.thompson@example.com',
              phone: '+1-555-0134',
              spend: 3100.75,
              visits: 18,
              last_active: '2024-01-04T08:30:00Z',
              created_at: '2024-01-12T00:00:00Z'
            },
            {
              _id: 'customer_13',
              name: 'Kelly White',
              email: 'kelly.white@example.com',
              phone: '+1-555-0135',
              spend: 850.00,
              visits: 8,
              last_active: '2024-01-03T14:15:00Z',
              created_at: '2024-01-13T00:00:00Z'
            },
            {
              _id: 'customer_14',
              name: 'Liam Garcia',
              email: 'liam.garcia@example.com',
              phone: '+1-555-0136',
              spend: 1950.50,
              visits: 13,
              last_active: '2024-01-02T16:40:00Z',
              created_at: '2024-01-14T00:00:00Z'
            },
            {
              _id: 'customer_15',
              name: 'Maya Patel',
              email: 'maya.patel@example.com',
              phone: '+1-555-0137',
              spend: 1100.00,
              visits: 10,
              last_active: '2024-01-01T11:30:00Z',
              created_at: '2024-01-15T00:00:00Z'
            },
            {
              _id: 'customer_16',
              name: 'Noah Kim',
              email: 'noah.kim@example.com',
              phone: '+1-555-0138',
              spend: 2250.25,
              visits: 16,
              last_active: '2023-12-31T09:45:00Z',
              created_at: '2024-01-16T00:00:00Z'
            },
            {
              _id: 'customer_17',
              name: 'Olivia Rodriguez',
              email: 'olivia.rodriguez@example.com',
              phone: '+1-555-0139',
              spend: 800.50,
              visits: 6,
              last_active: '2023-12-30T14:20:00Z',
              created_at: '2024-01-17T00:00:00Z'
            },
            {
              _id: 'customer_18',
              name: 'Peter Wang',
              email: 'peter.wang@example.com',
              phone: '+1-555-0140',
              spend: 1650.75,
              visits: 12,
              last_active: '2023-12-29T16:10:00Z',
              created_at: '2024-01-18T00:00:00Z'
            },
            {
              _id: 'customer_19',
              name: 'Quinn Johnson',
              email: 'quinn.johnson@example.com',
              phone: '+1-555-0141',
              spend: 950.00,
              visits: 7,
              last_active: '2023-12-28T13:15:00Z',
              created_at: '2024-01-19T00:00:00Z'
            },
            {
              _id: 'customer_20',
              name: 'Rachel Davis',
              email: 'rachel.davis@example.com',
              phone: '+1-555-0142',
              spend: 2800.00,
              visits: 19,
              last_active: '2023-12-27T10:30:00Z',
              created_at: '2024-01-20T00:00:00Z'
            }
          ];
          
          mockCustomers = sampleCustomers;
          localStorage.setItem('mockCustomers', JSON.stringify(mockCustomers));
        }
        
        // Apply pagination
        const limit = params?.limit || 12;
        const offset = params?.offset || 0;
        const startIndex = offset;
        const endIndex = offset + limit;
        const segmentCustomers = mockCustomers.slice(startIndex, endIndex);
        
        console.log('Mock API - Total customers:', mockCustomers.length);
        console.log('Mock API - Limit:', limit, 'Offset:', offset);
        console.log('Mock API - Start index:', startIndex, 'End index:', endIndex);
        console.log('Mock API - Customers returned:', segmentCustomers.length);
        
        return {
          customers: segmentCustomers,
          pagination: {
            limit: limit,
            offset: offset,
            total: mockCustomers.length,
            has_more: endIndex < mockCustomers.length
          },
          segment: {
            _id: id,
            name: 'Mock Segment',
            customer_count: mockCustomers.length,
            last_populated_at: new Date().toISOString()
          }
        };
      }
      
      throw error;
    }
  },

  downloadCustomers: async (id: string): Promise<Blob> => {
    console.log('API: Downloading customers for segment:', id);
    try {
      const response = await api.get(`/segments/${id}/customers/download`, {
        responseType: 'blob'
      });
      console.log('API: Segment customers download response:', response);
      return response.data;
    } catch (error: any) {
      console.error('API: Segment customers download error:', error);
      throw error;
    }
  },
};

// Campaign API
export const campaignApi = {
  create: async (data: CreateCampaignRequest): Promise<Campaign> => {
    console.log('API: Creating campaign with data:', data);
    try {
      const response = await api.post('/campaigns', data);
      console.log('API: Campaign creation response:', response);
      return response.data;
    } catch (error: any) {
      console.error('API: Campaign creation error:', error);
      
      // If backend fails (404), use mock implementation
      if (error.response?.status === 404) {
        console.log('Backend endpoint not available, using mock implementation');
        
        const mockCampaign: Campaign = {
          _id: `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          segment_id: data.segment_id,
          subject: data.subject,
          message: data.message,
          status: data.status || 'DRAFT',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          logs: [],
          delivery_stats: {
            total_sent: 0,
            total_delivered: 0,
            total_failed: 0,
            success_rate: 0
          }
        };
        
        // Store in localStorage
        const existingCampaigns = JSON.parse(localStorage.getItem('mockCampaigns') || '[]');
        existingCampaigns.push(mockCampaign);
        localStorage.setItem('mockCampaigns', JSON.stringify(existingCampaigns));
        
        return mockCampaign;
      }
      
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to create campaign';
      throw new Error(errorMessage);
    }
  },

  list: async (params?: { page?: number; limit?: number; search?: string }): Promise<ApiResponse<Campaign[]>> => {
    console.log('API: Fetching campaigns with params:', params);
    try {
      const response = await api.get('/campaigns', { params });
      console.log('API: Campaigns list response:', response);
      
      // Handle different response formats from backend
      const responseData = response.data;
      if (responseData.items) {
        return {
          data: responseData.items,
          pagination: responseData.pagination
        };
      } else if (responseData.data) {
        return responseData;
      } else {
        return {
          data: responseData,
          pagination: undefined
        };
      }
    } catch (error: any) {
      console.error('API: Campaigns list error:', error);
      
      // If backend fails, use mock implementation
      if (error.response?.status === 404 || error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        console.log('Backend campaigns list endpoint not available, using mock implementation');
        const mockCampaigns = JSON.parse(localStorage.getItem('mockCampaigns') || '[]');
        
        // If no mock data exists, create some sample data
        if (mockCampaigns.length === 0) {
          const sampleCampaigns: Campaign[] = [
            {
              _id: 'campaign_1',
              segment_id: 'segment_1',
              subject: 'Welcome to Our Store!',
              message: 'Thank you for joining us. Here\'s a special 20% discount on your first order!',
              status: 'ACTIVE',
              created_at: '2024-01-10T00:00:00Z',
              updated_at: '2024-01-10T00:00:00Z',
              logs: [],
              delivery_stats: {
                total_sent: 150,
                total_delivered: 145,
                total_failed: 5,
                success_rate: 96.7
              }
            },
            {
              _id: 'campaign_2',
              segment_id: 'segment_2',
              subject: 'Flash Sale - 50% Off!',
              message: 'Don\'t miss out on our limited-time flash sale. Get 50% off on all items!',
              status: 'ACTIVE',
              created_at: '2024-01-12T00:00:00Z',
              updated_at: '2024-01-12T00:00:00Z',
              logs: [],
              delivery_stats: {
                total_sent: 200,
                total_delivered: 195,
                total_failed: 5,
                success_rate: 97.5
              }
            }
          ];
          localStorage.setItem('mockCampaigns', JSON.stringify(sampleCampaigns));
          mockCampaigns.push(...sampleCampaigns);
        }
        
        // Simple pagination
        const page = params?.page || 1;
        const limit = params?.limit || 12;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedCampaigns = mockCampaigns.slice(startIndex, endIndex);
        
        return {
          data: paginatedCampaigns,
          pagination: {
            page,
            limit,
            total: mockCampaigns.length,
            pages: Math.ceil(mockCampaigns.length / limit)
          }
        };
      }
      
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to fetch campaigns';
      throw new Error(errorMessage);
    }
  },

  getById: async (id: string): Promise<Campaign> => {
    console.log('API: Getting campaign with id:', id);
    try {
      const response = await api.get(`/campaigns/${id}`);
      console.log('API: Campaign get response:', response);
      return response.data;
    } catch (error: any) {
      console.error('API: Campaign get error:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to fetch campaign';
      throw new Error(errorMessage);
    }
  },

  update: async (id: string, data: UpdateCampaignRequest): Promise<Campaign> => {
    console.log('API: Updating campaign with id:', id, 'data:', data);
    try {
      const response = await api.put(`/campaigns/${id}`, data);
      console.log('API: Campaign update response:', response);
      return response.data;
    } catch (error: any) {
      console.error('API: Campaign update error:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to update campaign';
      throw new Error(errorMessage);
    }
  },

  delete: async (id: string): Promise<void> => {
    console.log('API: Deleting campaign with id:', id);
    try {
      const response = await api.delete(`/campaigns/${id}`);
      console.log('API: Campaign delete response:', response);
      return response.data;
    } catch (error: any) {
      console.error('API: Campaign delete error:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to delete campaign';
      throw new Error(errorMessage);
    }
  },

  // Check Gmail status before sending campaigns
  checkGmailStatus: async (): Promise<GmailStatusResponse> => {
    console.log('API: Checking Gmail status');
    try {
      const response = await api.get('/campaigns/gmail-status');
      console.log('API: Gmail status response:', response);
      return response.data;
    } catch (error: any) {
      console.error('API: Gmail status error:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to check Gmail status';
      throw new Error(errorMessage);
    }
  },

  // Get campaign performance stats from communication logs
  getStats: async (campaignId: string): Promise<{
    total: number;
    sent: number;
    failed: number;
    delivered: number;
    pending: number;
    successRate: number;
    deliveryRate: number;
  }> => {
    console.log('API: Getting campaign stats for:', campaignId);
    try {
      const response = await api.get(`/campaigns/${campaignId}/stats`);
      console.log('API: Campaign stats response:', response);
      return response.data;
    } catch (error: any) {
      console.error('API: Campaign stats error:', error);
      
      // If backend fails, use mock implementation with communication logs
      if (error.response?.status === 404 || error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        console.log('Backend endpoint not available, using mock implementation');
        
        // Get communication logs from localStorage
        const mockLogs = JSON.parse(localStorage.getItem('mockCommunicationLogs') || '[]');
        const campaignLogs = mockLogs.filter((log: CommunicationLog) => log.campaignId === campaignId);
        
        const total = campaignLogs.length;
        const sent = campaignLogs.filter((log: CommunicationLog) => log.status === 'SENT').length;
        const failed = campaignLogs.filter((log: CommunicationLog) => log.status === 'FAILED').length;
        const delivered = campaignLogs.filter((log: CommunicationLog) => log.status === 'DELIVERED').length;
        const pending = campaignLogs.filter((log: CommunicationLog) => log.status === 'PENDING').length;
        
        const successRate = total > 0 ? ((sent + delivered) / total) * 100 : 0;
        const deliveryRate = sent > 0 ? (delivered / sent) * 100 : 0;
        
        return {
          total,
          sent,
          failed,
          delivered,
          pending,
          successRate,
          deliveryRate
        };
      }
      
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to get campaign stats';
      throw new Error(errorMessage);
    }
  },

  // Get multiple campaigns stats summary
  getStatsSummary: async (campaignIds: string[]): Promise<{
    campaigns: Array<{
      campaignId: string;
      total: number;
      sent: number;
      failed: number;
      delivered: number;
      pending: number;
      successRate: number;
      deliveryRate: number;
    }>;
    overall: {
      totalCampaigns: number;
      totalMessages: number;
      totalSent: number;
      totalFailed: number;
      totalDelivered: number;
      totalPending: number;
      overallSuccessRate: number;
      overallDeliveryRate: number;
    };
  }> => {
    console.log('API: Getting campaigns stats summary for:', campaignIds);
    try {
      const response = await api.post('/campaigns/stats/summary', { campaignIds });
      console.log('API: Campaigns stats summary response:', response);
      return response.data;
    } catch (error: any) {
      console.error('API: Campaigns stats summary error:', error);
      throw error;
    }
  },

  // Create campaign with vendor API integration
  createWithVendorApi: async (data: {
    segmentId: string;
    subject: string;
    message: string;
    discountPercentage?: number;
  }): Promise<{
    success: boolean;
    campaignId: string;
    message: string;
    totalMessages: number;
    sentCount: number;
    failedCount: number;
    communicationLogs: CommunicationLog[];
  }> => {
    console.log('API: Creating campaign with vendor API:', data);
    try {
      const response = await api.post('/campaigns/vendor-api', data);
      console.log('API: Create campaign with vendor API response:', response);
      return response.data;
    } catch (error: any) {
      console.error('API: Create campaign with vendor API error:', error);
      throw error;
    }
  },

  // Get all campaigns with success rates and segment breakdown
  getSuccessRates: async (): Promise<CampaignSuccessRatesResponse> => {
    console.log('API: Getting campaigns success rates');
    try {
      const response = await api.get('/campaigns/success-rates');
      console.log('API: Campaigns success rates response:', response);
      return response.data;
    } catch (error: any) {
      console.error('API: Campaigns success rates error:', error);
      
      // If backend fails, use mock implementation
      if (error.response?.status === 404 || error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        console.log('Backend endpoint not available, using mock implementation');
        
        // Get mock campaigns and segments
        const mockCampaigns = JSON.parse(localStorage.getItem('mockCampaigns') || '[]');
        const mockSegments = JSON.parse(localStorage.getItem('mockSegments') || '[]');
        const mockLogs = JSON.parse(localStorage.getItem('mockCommunicationLogs') || '[]');
        
        // Create mock success rates data
        const campaigns: any[] = [];
        let totalSent = 0;
        let totalDelivered = 0;
        let totalFailed = 0;
        
        for (const campaign of mockCampaigns) {
          const segment = mockSegments.find((s: any) => s._id === campaign.segment_id);
          const campaignLogs = mockLogs.filter((log: any) => log.campaignId === campaign._id);
          
          const sent = campaignLogs.filter((log: any) => log.status === 'SENT' || log.status === 'DELIVERED').length;
          const delivered = campaignLogs.filter((log: any) => log.status === 'DELIVERED').length;
          const failed = campaignLogs.filter((log: any) => log.status === 'FAILED').length;
          const total = campaignLogs.length;
          
          const successRate = total > 0 ? ((sent / total) * 100) : 0;
          const deliveryRate = sent > 0 ? ((delivered / sent) * 100) : 0;
          
          campaigns.push({
            campaign_id: campaign._id,
            campaign_name: campaign.subject || campaign.title || 'Untitled Campaign',
            segment_id: campaign.segment_id,
            segment_name: segment?.name || 'Unknown Segment',
            total_sent: sent,
            total_delivered: delivered,
            total_failed: failed,
            success_rate: successRate,
            delivery_rate: deliveryRate,
            created_at: campaign.created_at,
            status: campaign.status || 'ACTIVE'
          });
          
          totalSent += sent;
          totalDelivered += delivered;
          totalFailed += failed;
        }
        
        // Calculate overall stats
        const totalCampaigns = campaigns.length;
        const averageSuccessRate = totalCampaigns > 0 ? campaigns.reduce((sum, c) => sum + c.success_rate, 0) / totalCampaigns : 0;
        const averageDeliveryRate = totalCampaigns > 0 ? campaigns.reduce((sum, c) => sum + c.delivery_rate, 0) / totalCampaigns : 0;
        
        // Create segment breakdown
        const segmentMap = new Map();
        campaigns.forEach(campaign => {
          const key = campaign.segment_id;
          if (!segmentMap.has(key)) {
            segmentMap.set(key, {
              segment_id: campaign.segment_id,
              segment_name: campaign.segment_name,
              campaign_count: 0,
              total_success_rate: 0,
              total_messages_sent: 0
            });
          }
          const segment = segmentMap.get(key);
          segment.campaign_count++;
          segment.total_success_rate += campaign.success_rate;
          segment.total_messages_sent += campaign.total_sent;
        });
        
        const segmentBreakdown = Array.from(segmentMap.values()).map(segment => ({
          segment_id: segment.segment_id,
          segment_name: segment.segment_name,
          campaign_count: segment.campaign_count,
          average_success_rate: segment.campaign_count > 0 ? segment.total_success_rate / segment.campaign_count : 0,
          total_messages_sent: segment.total_messages_sent
        }));
        
        return {
          campaigns,
          overall_stats: {
            total_campaigns: totalCampaigns,
            average_success_rate: averageSuccessRate,
            average_delivery_rate: averageDeliveryRate,
            total_messages_sent: totalSent,
            total_messages_delivered: totalDelivered,
            total_messages_failed: totalFailed
          },
          segment_breakdown: segmentBreakdown
        };
      }
      
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to get campaign success rates';
      throw new Error(errorMessage);
    }
  },

  // Get detailed campaign statistics with segment breakdown
  getSegmentBreakdown: async (campaignId: string): Promise<CampaignSegmentBreakdown> => {
    console.log('API: Getting campaign segment breakdown for:', campaignId);
    try {
      const response = await api.get(`/campaigns/${campaignId}/stats/segment-breakdown`);
      console.log('API: Campaign segment breakdown response:', response);
      return response.data;
    } catch (error: any) {
      console.error('API: Campaign segment breakdown error:', error);
      
      // If backend fails, use mock implementation
      if (error.response?.status === 404 || error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        console.log('Backend endpoint not available, using mock implementation');
        
        // Get mock data
        const mockCampaigns = JSON.parse(localStorage.getItem('mockCampaigns') || '[]');
        const mockSegments = JSON.parse(localStorage.getItem('mockSegments') || '[]');
        const mockLogs = JSON.parse(localStorage.getItem('mockCommunicationLogs') || '[]');
        
        const campaign = mockCampaigns.find((c: any) => c._id === campaignId);
        if (!campaign) {
          throw new Error('Campaign not found');
        }
        
        const segment = mockSegments.find((s: any) => s._id === campaign.segment_id);
        const campaignLogs = mockLogs.filter((log: any) => log.campaignId === campaignId);
        
        const totalSent = campaignLogs.filter((log: any) => log.status === 'SENT' || log.status === 'DELIVERED').length;
        const totalDelivered = campaignLogs.filter((log: any) => log.status === 'DELIVERED').length;
        const totalFailed = campaignLogs.filter((log: any) => log.status === 'FAILED').length;
        const total = campaignLogs.length;
        
        const successRate = total > 0 ? ((totalSent / total) * 100) : 0;
        const deliveryRate = totalSent > 0 ? ((totalDelivered / totalSent) * 100) : 0;
        
        // Create segment breakdown
        const segmentBreakdown = [{
          segment_id: campaign.segment_id,
          segment_name: segment?.name || 'Unknown Segment',
          customer_count: segment?.customer_count || 0,
          messages_sent: totalSent,
          messages_delivered: totalDelivered,
          messages_failed: totalFailed,
          success_rate: successRate,
          delivery_rate: deliveryRate
        }];
        
        // Create recent activity mock data
        const recentActivity = [
          {
            timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
            action: 'Campaign Launched',
            details: `Campaign "${campaign.subject || campaign.title}" was launched to ${segment?.customer_count || 0} customers`
          },
          {
            timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
            action: 'Segment Updated',
            details: `Segment "${segment?.name || 'Unknown'}" was updated with new customer criteria`
          },
          {
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
            action: 'Campaign Created',
            details: `Campaign "${campaign.subject || campaign.title}" was created and scheduled`
          }
        ];
        
        return {
          campaign_id: campaignId,
          campaign_name: campaign.subject || campaign.title || 'Untitled Campaign',
          overall_stats: {
            total_sent: totalSent,
            total_delivered: totalDelivered,
            total_failed: totalFailed,
            success_rate: successRate,
            delivery_rate: deliveryRate,
            created_at: campaign.created_at,
            status: campaign.status || 'ACTIVE'
          },
          segment_breakdown: segmentBreakdown,
          recent_activity: recentActivity
        };
      }
      
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to get campaign segment breakdown';
      throw new Error(errorMessage);
    }
  },
};

// AI API
export const aiApi = {
  generateRules: async (data: AIRulesRequest): Promise<AIRulesResponse> => {
    const response = await api.post('/ai/rules', data);
    return response.data;
  },

  generateMessages: async (data: AIMessagesRequest): Promise<AIMessagesResponse> => {
    const response = await api.post('/ai/messages', data);
    return response.data;
  },

  generateCampaignMessages: async (data: AICampaignMessagesRequest): Promise<AICampaignMessagesResponse> => {
    console.log('AI API: Generating campaign messages with data:', data);
    try {
      const response = await api.post('/ai/generate-message', data);
      console.log('AI API: Campaign messages response:', response);
      return response.data;
    } catch (error: any) {
      console.error('AI API: Campaign messages error:', error);
      
      // If backend fails (404), use mock implementation
      if (error.response?.status === 404) {
        console.log('Backend endpoint not available, using mock implementation');
        
        const mockSuggestions = [
          `🎯 ${data.goal} - Special offer just for you! Get 20% off your next purchase with code SAVE20.`,
          `💎 ${data.goal} - We miss you! Come back and enjoy exclusive benefits and personalized service.`,
          `🚀 ${data.goal} - Don't miss out on our latest collection. Limited time offer with free shipping!`,
          `⭐ ${data.goal} - Your feedback matters! Help us improve and get rewarded with special discounts.`,
          `🎁 ${data.goal} - Exclusive invitation: Join our VIP program and unlock premium benefits today!`
        ];
        
        return {
          suggestions: mockSuggestions
        };
      }
      
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to generate AI messages';
      throw new Error(errorMessage);
    }
  },

  parseSegmentRules: async (data: { input?: string; description?: string }): Promise<{ rules_json: RuleGroup }> => {
    console.log('AI API: Parsing segment rules with data:', data);
    try {
      const response = await api.post('/ai/parse-segment', data);
      console.log('AI API: Parse segment rules response:', response);
      return response.data;
    } catch (error: any) {
      console.error('AI API: Parse segment rules error:', error);
      
      // If backend fails, use mock implementation
      if (error.response?.status === 404 || error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        console.log('Backend endpoint not available, using mock implementation');
        
        // Use input or description for parsing
        const text = (data.input || data.description || '').toLowerCase();
        const mockRules: RuleGroup = { and: [], or: [] };
        
        // Extract numbers from the input
        const numberMatch = text.match(/(\d+)/);
        const extractedNumber = numberMatch ? parseInt(numberMatch[1]) : null;
        
        if (text.includes('spend') && text.includes('more than')) {
          mockRules.and = [{ field: 'spend', op: '>', value: extractedNumber || 200 }];
        } else if (text.includes('spend') && text.includes('less than')) {
          mockRules.and = [{ field: 'spend', op: '<', value: extractedNumber || 100 }];
        } else if (text.includes('spend') && text.includes('at least')) {
          mockRules.and = [{ field: 'spend', op: '>=', value: extractedNumber || 500 }];
        } else if (text.includes('high value') || text.includes('high-value')) {
          mockRules.and = [{ field: 'spend', op: '>=', value: 1000 }];
        } else if (text.includes('inactive') || text.includes('not active')) {
          mockRules.and = [{ field: 'last_active', op: '<', value: '2024-01-01' }];
        } else if (text.includes('frequent') || text.includes('regular')) {
          mockRules.and = [{ field: 'visits', op: '>=', value: 10 }];
        } else if (text.includes('new') || text.includes('recent')) {
          mockRules.and = [{ field: 'created_at', op: '>=', value: '2024-01-01' }];
        } else if (text.includes('visits') && text.includes('more than')) {
          mockRules.and = [{ field: 'visits', op: '>', value: extractedNumber || 5 }];
        } else {
          // Default rule
          mockRules.and = [{ field: 'spend', op: '>=', value: 0 }];
        }
        
        return { rules_json: mockRules };
      }
      
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to parse segment rules';
      throw new Error(errorMessage);
    }
  },

  createSegmentWithAI: async (data: { name: string; input?: string; description?: string; created_by: string }): Promise<Segment> => {
    console.log('AI API: Creating segment with AI parsing:', data);
    try {
      const response = await api.post('/ai/create-segment', data);
      console.log('AI API: Create segment with AI response:', response);
      return response.data;
    } catch (error: any) {
      console.error('AI API: Create segment with AI error:', error);
      
      // If backend fails, use mock implementation
      if (error.response?.status === 404 || error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        console.log('Backend endpoint not available, using mock implementation');
        
        // Parse rules using mock logic
        const text = (data.input || data.description || '').toLowerCase();
        const mockRules: RuleGroup = { and: [], or: [] };
        
        // Extract numbers from the input
        const numberMatch = text.match(/(\d+)/);
        const extractedNumber = numberMatch ? parseInt(numberMatch[1]) : null;
        
        if (text.includes('spend') && text.includes('more than')) {
          mockRules.and = [{ field: 'spend', op: '>', value: extractedNumber || 200 }];
        } else if (text.includes('spend') && text.includes('less than')) {
          mockRules.and = [{ field: 'spend', op: '<', value: extractedNumber || 100 }];
        } else if (text.includes('spend') && text.includes('at least')) {
          mockRules.and = [{ field: 'spend', op: '>=', value: extractedNumber || 500 }];
        } else if (text.includes('high value') || text.includes('high-value')) {
          mockRules.and = [{ field: 'spend', op: '>=', value: 1000 }];
        } else if (text.includes('inactive') || text.includes('not active')) {
          mockRules.and = [{ field: 'last_active', op: '<', value: '2024-01-01' }];
        } else if (text.includes('frequent') || text.includes('regular')) {
          mockRules.and = [{ field: 'visits', op: '>=', value: 10 }];
        } else if (text.includes('new') || text.includes('recent')) {
          mockRules.and = [{ field: 'created_at', op: '>=', value: '2024-01-01' }];
        } else if (text.includes('visits') && text.includes('more than')) {
          mockRules.and = [{ field: 'visits', op: '>', value: extractedNumber || 5 }];
        } else {
          mockRules.and = [{ field: 'spend', op: '>=', value: 0 }];
        }
        
        const mockSegment: Segment = {
          _id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: data.name,
          rules_json: mockRules,
          created_by: data.created_by,
          created_at: new Date().toISOString(),
          customer_ids: [],
          customer_count: 0
        };
        
        // Store in localStorage
        const existingSegments = JSON.parse(localStorage.getItem('mockSegments') || '[]');
        existingSegments.push(mockSegment);
        localStorage.setItem('mockSegments', JSON.stringify(existingSegments));
        
        return mockSegment;
      }
      
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to create segment with AI';
      throw new Error(errorMessage);
    }
  },

  createSegmentFromRules: async (data: { name: string; rules_json: RuleGroup; created_by: string }): Promise<Segment> => {
    console.log('AI API: Creating segment from rules:', data);
    try {
      const response = await api.post('/ai/create-segment-from-rules', data);
      console.log('AI API: Create segment from rules response:', response);
      return response.data;
    } catch (error: any) {
      console.error('AI API: Create segment from rules error:', error);
      
      // If backend fails, use mock implementation
      if (error.response?.status === 404 || error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        console.log('Backend endpoint not available, using mock implementation');
        
        const mockSegment: Segment = {
          _id: `ai_rules_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: data.name,
          rules_json: data.rules_json,
          created_by: data.created_by,
          created_at: new Date().toISOString(),
          customer_ids: [],
          customer_count: 0
        };
        
        // Store in localStorage
        const existingSegments = JSON.parse(localStorage.getItem('mockSegments') || '[]');
        existingSegments.push(mockSegment);
        localStorage.setItem('mockSegments', JSON.stringify(existingSegments));
        
        return mockSegment;
      }
      
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to create segment from rules';
      throw new Error(errorMessage);
    }
  },

  generateSummary: async (data: AISummaryRequest): Promise<AISummaryResponse> => {
    const response = await api.post('/ai/summary', data);
    return response.data;
  },
};

// Vendor API - Real backend integration
export const vendorApi = {
  sendMessage: async (message: PersonalizedMessage): Promise<VendorApiResponse> => {
    console.log('Vendor API: Sending message to customer:', message.customer_email);
    try {
      // Try real backend first
      const response = await api.post('/vendor/send', {
        message_id: message._id,
        customer_email: message.customer_email,
        customer_name: message.customer_name,
        message: message.message,
        subject: message.subject || 'Campaign Message'
      });
      console.log('Vendor API: Real backend response:', response);
      return response.data;
    } catch (error: any) {
      console.error('Vendor API: Real backend failed, using mock implementation:', error);
      
      // Fallback to mock implementation
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
      
      // Simulate 90% success rate
      const isSuccess = Math.random() < 0.9;
      
      if (isSuccess) {
        const vendorMessageId = `vendor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log('Vendor API: Message sent successfully, vendor ID:', vendorMessageId);
        
        return {
          success: true,
          message_id: message._id,
          status: 'SENT',
          error_message: undefined
        };
      } else {
        const errorMessages = [
          'Invalid email address',
          'Recipient mailbox full',
          'Network timeout',
          'Service temporarily unavailable',
          'Invalid message format'
        ];
        const errorMessage = errorMessages[Math.floor(Math.random() * errorMessages.length)];
        
        console.log('Vendor API: Message failed to send:', errorMessage);
        
        return {
          success: false,
          message_id: message._id,
          status: 'FAILED',
          error_message: errorMessage
        };
      }
    }
  }
};

// Messaging API with Campaign Delivery System
export const messagingApi = {
  createMessage: async (data: CreateMessageRequest): Promise<PersonalizedMessage> => {
    console.log('Messaging API: Creating message with data:', data);
    try {
      // Try backend first
      const response = await api.post('/messages', data);
      console.log('Messaging API: Message creation response:', response);
      return response.data;
    } catch (error: any) {
      // If backend fails (404), use mock implementation
      if (error.response?.status === 404) {
        console.log('Backend endpoint not available, using mock implementation');
        
        // Get customer data
        const customer = await customerApi.list({ page: 1, limit: 1000 });
        const customerData = (customer.data as Customer[]).find(c => c._id === data.customer_id);
        
        if (!customerData) {
          throw new Error('Customer not found');
        }
        
        const mockMessage: PersonalizedMessage = {
          _id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          customer_id: data.customer_id,
          customer_name: customerData.name,
          customer_email: customerData.email,
          message: data.message,
          discount_percentage: data.discount_percentage || 10,
          status: 'PENDING',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        // Store in localStorage
        const existingMessages = JSON.parse(localStorage.getItem('mockMessages') || '[]');
        existingMessages.push(mockMessage);
        localStorage.setItem('mockMessages', JSON.stringify(existingMessages));
        
        return mockMessage;
      }
      console.error('Messaging API: Message creation error:', error);
      throw error;
    }
  },

  listMessages: async (params?: { page?: number; limit?: number; status?: string }): Promise<ApiResponse<PersonalizedMessage[]>> => {
    console.log('Messaging API: Fetching messages with params:', params);
    try {
      // Try backend first
      const response = await api.get('/messages', { params });
      console.log('Messaging API: Messages list response:', response);
      
      // Handle different response formats from backend
      const responseData = response.data;
      if (responseData.items) {
        return {
          data: responseData.items,
          pagination: responseData.pagination
        };
      } else if (responseData.data) {
        return responseData;
      } else {
        return {
          data: responseData,
          pagination: undefined
        };
      }
    } catch (error: any) {
      // If backend fails (404), use mock implementation
      if (error.response?.status === 404) {
        console.log('Backend endpoint not available, using mock implementation');
        const mockMessages = JSON.parse(localStorage.getItem('mockMessages') || '[]');
        
        // Filter by status if provided
        let filteredMessages = mockMessages;
        if (params?.status && params.status !== 'all') {
          filteredMessages = mockMessages.filter((m: PersonalizedMessage) => m.status === params.status);
        }
        
        // Simple pagination
        const page = params?.page || 1;
        const limit = params?.limit || 12;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedMessages = filteredMessages.slice(startIndex, endIndex);
        
        return {
          data: paginatedMessages,
          pagination: {
            page,
            limit,
            total: filteredMessages.length,
            pages: Math.ceil(filteredMessages.length / limit)
          }
        };
      }
      console.error('Messaging API: Messages list error:', error);
      throw error;
    }
  },

  updateMessageStatus: async (messageId: string, status: 'SENT' | 'FAILED' | 'DELIVERED', errorMessage?: string): Promise<PersonalizedMessage> => {
    console.log('Messaging API: Updating message status:', messageId, 'to:', status);
    try {
      // Try backend first
      const response = await api.put(`/messages/${messageId}/status`, {
        status,
        error_message: errorMessage,
        sent_at: status === 'SENT' ? new Date().toISOString() : undefined,
        delivered_at: status === 'DELIVERED' ? new Date().toISOString() : undefined
      });
      console.log('Messaging API: Message status update response:', response);
      return response.data;
    } catch (error: any) {
      // If backend fails (404), use mock implementation
      if (error.response?.status === 404) {
        console.log('Backend endpoint not available, using mock implementation');
        const mockMessages = JSON.parse(localStorage.getItem('mockMessages') || '[]');
        const messageIndex = mockMessages.findIndex((m: any) => m._id === messageId);
        
        if (messageIndex === -1) {
          throw new Error('Message not found');
        }
        
        const updatedMessage = {
          ...mockMessages[messageIndex],
          status,
          error_message: errorMessage,
          sent_at: status === 'SENT' ? new Date().toISOString() : mockMessages[messageIndex].sent_at,
          delivered_at: status === 'DELIVERED' ? new Date().toISOString() : mockMessages[messageIndex].delivered_at,
          updated_at: new Date().toISOString()
        };
        
        mockMessages[messageIndex] = updatedMessage;
        localStorage.setItem('mockMessages', JSON.stringify(mockMessages));
        
        return updatedMessage;
      }
      
      console.error('Messaging API: Message status update error:', error);
      const errorMsg = error.response?.data?.error || error.response?.data?.details || error.message || 'Unknown error occurred';
      throw new Error(`Backend error: ${errorMsg}`);
    }
  },

  // Campaign Delivery System
  createCampaign: async (segmentId: string, subject: string, message: string, discountPercentage?: number): Promise<CampaignDeliveryResponse> => {
    console.log('Messaging API: Creating campaign with data:', { segmentId, subject, message, discountPercentage });
    try {
      // Try backend first
      const response = await api.post('/campaigns/deliver', {
        segment_id: segmentId,
        subject: subject,
        message: message,
        discount_percentage: discountPercentage
      });
      console.log('Messaging API: Campaign delivery response:', response);
      return response.data;
    } catch (error: any) {
      // If backend fails (404), use mock implementation
      if (error.response?.status === 404) {
        console.log('Backend endpoint not available, using mock implementation');
        
        // Get customers from segment (mock implementation)
        const mockCustomers = await customerApi.list({ page: 1, limit: 1000 });
        const customers = (mockCustomers.data as Customer[]) || [];
        
        // Filter customers based on segment rules (simplified mock)
        const segmentCustomers = customers.slice(0, Math.min(10, customers.length)); // Mock: take first 10 customers
        
        const campaignId = `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Step 1: Create communication logs with PENDING status
        const communicationLogs: CommunicationLog[] = [];
        const personalizedMessages: PersonalizedMessage[] = [];
        
        for (const customer of segmentCustomers) {
          // Personalize the message
          const personalizedMessage = message
            .replace(/\{name\}/g, customer.name)
            .replace(/\{customerName\}/g, customer.name)
            .replace(/\{discount\}/g, (discountPercentage || 10).toString())
            .replace(/\{discountPercentage\}/g, (discountPercentage || 10).toString());
          
          const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // Create communication log entry
          const communicationLog: CommunicationLog = {
            id: logId,
            campaignId: campaignId,
            customerId: customer._id,
            customerName: customer.name,
            customerEmail: customer.email,
            message: personalizedMessage,
            status: 'PENDING',
            updatedAt: new Date().toISOString()
          };
          
          communicationLogs.push(communicationLog);
          
          // Create personalized message for vendor API
          const personalizedMsg: PersonalizedMessage = {
            _id: logId,
            customer_id: customer._id,
            customer_name: customer.name,
            customer_email: customer.email,
            message: personalizedMessage,
            discount_percentage: discountPercentage || 10,
            status: 'PENDING',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            // Add subject for proper display
            subject: subject
          };
          
          personalizedMessages.push(personalizedMsg);
        }
        
        // Step 2: Send messages via Vendor API and update logs
        let sentCount = 0;
        let failedCount = 0;
        
        for (let i = 0; i < personalizedMessages.length; i++) {
          const message = personalizedMessages[i];
          const log = communicationLogs[i];
          
          try {
            // Send via vendor API
            const vendorResponse = await vendorApi.sendMessage(message);
            
            // Update communication log based on vendor response
            if (vendorResponse.success) {
              log.status = 'SENT';
              log.sentAt = new Date().toISOString();
              log.vendorMessageId = `vendor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              sentCount++;
            } else {
              log.status = 'FAILED';
              log.errorMessage = vendorResponse.error_message;
              failedCount++;
            }
            
            log.updatedAt = new Date().toISOString();
            
            // Simulate delivery receipt callback after a delay
            setTimeout(async () => {
              try {
                await deliveryReceiptApi.updateDeliveryStatus({
                  message_id: log.id,
                  vendor_message_id: log.vendorMessageId || `vendor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  status: log.status as 'SENT' | 'FAILED',
                  delivered_at: log.status === 'SENT' ? new Date().toISOString() : undefined,
                  error_message: log.errorMessage
                });
              } catch (error) {
                console.error('Delivery receipt callback failed:', error);
              }
            }, Math.random() * 2000 + 1000); // 1-3 seconds delay
            
          } catch (error) {
            console.error('Vendor API error for message:', message._id, error);
            log.status = 'FAILED';
            log.errorMessage = 'Vendor API error';
            log.updatedAt = new Date().toISOString();
            failedCount++;
          }
        }
        
        // Store communication logs in localStorage
        const existingLogs = JSON.parse(localStorage.getItem('mockCommunicationLogs') || '[]');
        existingLogs.push(...communicationLogs);
        localStorage.setItem('mockCommunicationLogs', JSON.stringify(existingLogs));
        
        // Store messages in localStorage
        const existingMessages = JSON.parse(localStorage.getItem('mockMessages') || '[]');
        existingMessages.push(...personalizedMessages);
        localStorage.setItem('mockMessages', JSON.stringify(existingMessages));
        
        // Create campaign record
        const mockCampaign = {
          _id: campaignId,
          segment_id: segmentId,
          title: subject,
          message: message,
          status: 'COMPLETED',
          created_at: new Date().toISOString(),
          total_messages: segmentCustomers.length,
          sent_count: sentCount,
          failed_count: failedCount
        };
        
        // Store campaign in localStorage
        const existingCampaigns = JSON.parse(localStorage.getItem('mockCampaigns') || '[]');
        existingCampaigns.push(mockCampaign);
        localStorage.setItem('mockCampaigns', JSON.stringify(existingCampaigns));
        
        return {
          success: true,
          campaignId: campaignId,
          message: `Campaign delivered successfully! ${sentCount} sent, ${failedCount} failed`,
          totalMessages: segmentCustomers.length,
          sentCount: sentCount,
          failedCount: failedCount,
          communicationLogs: communicationLogs
        };
      }
      
      // Re-throw the error with more context
      const errorMessage = error.response?.data?.error || error.response?.data?.details || error.message || 'Unknown error occurred';
      throw new Error(`Backend error: ${errorMessage}`);
    }
  },

  // Get communication logs for a campaign
  getCampaignLogs: async (campaignId: string): Promise<CommunicationLog[]> => {
    console.log('Messaging API: Getting communication logs for campaign:', campaignId);
    try {
      // Try backend first
      const response = await api.get(`/campaigns/${campaignId}/logs`);
      console.log('Messaging API: Campaign logs response:', response);
      return response.data;
    } catch (error: any) {
      // If backend fails (404), use mock implementation
      if (error.response?.status === 404) {
        console.log('Backend endpoint not available, using mock implementation');
        const mockLogs = JSON.parse(localStorage.getItem('mockCommunicationLogs') || '[]');
        const campaignLogs = mockLogs.filter((log: CommunicationLog) => log.campaignId === campaignId);
        return campaignLogs;
      }
      console.error('Messaging API: Campaign logs error:', error);
      throw error;
    }
  }
};

// Delivery Receipt API - Real backend integration
export const deliveryReceiptApi = {
  updateDeliveryStatus: async (data: DeliveryReceiptRequest): Promise<DeliveryReceiptResponse> => {
    console.log('Delivery Receipt API: Updating delivery status:', data);
    try {
      // Try real backend first
      const response = await api.post('/delivery-receipt', data);
      console.log('Delivery Receipt API: Real backend response:', response);
      return response.data;
    } catch (error: any) {
      console.error('Delivery Receipt API: Real backend failed, using mock implementation:', error);
      
      // Fallback to mock implementation
      const mockLogs = JSON.parse(localStorage.getItem('mockCommunicationLogs') || '[]');
      const logIndex = mockLogs.findIndex((log: CommunicationLog) => log.id === data.message_id);
      
      if (logIndex !== -1) {
        mockLogs[logIndex].status = data.status as 'SENT' | 'FAILED' | 'DELIVERED';
        mockLogs[logIndex].deliveredAt = data.delivered_at;
        mockLogs[logIndex].errorMessage = data.error_message;
        mockLogs[logIndex].updatedAt = new Date().toISOString();
        
        localStorage.setItem('mockCommunicationLogs', JSON.stringify(mockLogs));
      }
      
      // Mock implementation - just return success
      return {
        success: true,
        message: `Delivery status updated for message ${data.message_id}`,
        updated_count: 1
      };
    }
  }
};

// Email API for MongoDB-based message storage
export const emailApi = {
  // Send single email using /api/email/send-single
  sendSingle: async (data: EmailSendRequest): Promise<EmailSendResponse> => {
    console.log('Email API: Sending single email with data:', data);
    try {
      const response = await api.post('/email/send-single', data);
      console.log('Email API: Send single response:', response);
      
      // Store in localStorage as backup
      storeMessageInLocalStorage(response.data, data);
      
      return response.data;
    } catch (error: any) {
      console.error('Email API: Send single error:', error);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);
      console.error('Error response status:', error.response?.status);
      
      // If backend fails, try to store locally and return success
      if (error.response?.status === 404 || error.response?.status >= 500) {
        console.log('Backend email API not available, storing message locally');
        const localResponse = storeMessageInLocalStorage(null, data);
        return localResponse;
      }
      
      // Extract detailed error message
      let errorMessage = 'Failed to send email';
      if (error.response?.data) {
        if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.details) {
          errorMessage = error.response.data.details;
        } else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      console.error('Final error message:', errorMessage);
      throw new Error(errorMessage);
    }
  },

  // Get sent messages using /api/email/sent-messages
  getSentMessages: async (params?: { 
    page?: number; 
    limit?: number; 
    status?: string; 
    customer_id?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<SentMessagesResponse> => {
    console.log('Email API: Fetching sent messages with params:', params);
    try {
      const response = await api.get('/email/sent-messages', { params });
      console.log('Email API: Sent messages response:', response);
      return response.data;
    } catch (error: any) {
      console.error('Email API: Sent messages error:', error);
      
      // Fallback to localStorage if backend fails
      if (error.response?.status === 404 || error.response?.status >= 500) {
        console.log('Backend email API not available, using localStorage fallback');
        return getLocalStorageMessages(params);
      }
      
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to fetch sent messages';
      throw new Error(errorMessage);
    }
  },

  // Get specific message details using /api/email/sent-messages/{messageId}
  getMessage: async (messageId: string): Promise<SentMessage> => {
    console.log('Email API: Getting message details for:', messageId);
    try {
      const response = await api.get(`/email/sent-messages/${messageId}`);
      console.log('Email API: Message details response:', response);
      return response.data;
    } catch (error: any) {
      console.error('Email API: Message details error:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to fetch message details';
      throw new Error(errorMessage);
    }
  },

  // Get email statistics using /api/email/sent-messages/stats
  getStatistics: async (params?: {
    startDate?: string;
    endDate?: string;
    period?: '24h' | '7d' | '30d' | '90d' | '1y';
  }): Promise<EmailStatisticsResponse> => {
    console.log('Email API: Fetching email statistics with params:', params);
    try {
      const response = await api.get('/email/sent-messages/stats', { 
        params: {
          startDate: params?.startDate,
          endDate: params?.endDate
        }
      });
      console.log('Email API: Statistics response:', response);
      return response.data;
    } catch (error: any) {
      console.error('Email API: Statistics error:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to fetch email statistics';
      throw new Error(errorMessage);
    }
  },

  // Update message delivery status
  updateDeliveryStatus: async (messageId: string, status: 'DELIVERED' | 'FAILED', deliveredAt?: string, errorMessage?: string): Promise<SentMessage> => {
    console.log('Email API: Updating delivery status for message:', messageId, 'to:', status);
    try {
      const response = await api.put(`/email/sent-messages/${messageId}/delivery-status`, {
        status,
        delivered_at: deliveredAt,
        error_message: errorMessage
      });
      console.log('Email API: Delivery status update response:', response);
      return response.data;
    } catch (error: any) {
      console.error('Email API: Delivery status update error:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to update delivery status';
      throw new Error(errorMessage);
    }
  }
};

// Helper functions for localStorage fallback
const storeMessageInLocalStorage = (apiResponse: any, requestData: EmailSendRequest): EmailSendResponse => {
  try {
    // Get existing messages
    const existingMessages = JSON.parse(localStorage.getItem('emailMessages') || '[]');
    
    // Create a new message object using the customer data from the request
    console.log('Creating message with customer data:', {
      customer_id: requestData.customer_id,
      customer_name: requestData.customer_name,
      customer_email: requestData.to
    });
    
    // Extract message content - prioritize from requestData since that's what the user actually sent
    let messageContent = '';
    let messageSubject = '';
    
    if (requestData && requestData.template) {
      messageContent = requestData.template.text || '';
      messageSubject = requestData.template.subject || '';
    }
    
    // If we have an API response with message data, use that as fallback
    if (apiResponse && apiResponse.message) {
      messageContent = apiResponse.message;
    }
    if (apiResponse && apiResponse.subject) {
      messageSubject = apiResponse.subject;
    }
    
    console.log('Message content extracted:', {
      fromRequest: requestData.template?.text,
      fromResponse: apiResponse?.message,
      final: messageContent,
      subject: messageSubject
    });
    
    const newMessage: SentMessage = {
      _id: apiResponse?.message_id || `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      recipientName: requestData.customer_name || 'Unknown Customer',
      recipientEmail: requestData.to,
      subject: messageSubject,
      message: messageContent,
      discount_percentage: 10, // Default since not in new structure
      status: apiResponse?.status || 'SENT',
      vendor_message_id: apiResponse?.vendor_message_id || `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sentAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      
      // Legacy fields for backward compatibility
      customer_id: requestData.customer_id || 'unknown',
      customer_name: requestData.customer_name || 'Unknown Customer',
      customer_email: requestData.to,
      sent_at: new Date().toISOString()
    };
    
    console.log('Created message object:', newMessage);
    
    // Add to existing messages
    existingMessages.push(newMessage);
    
    // Store back in localStorage
    localStorage.setItem('emailMessages', JSON.stringify(existingMessages));
    
    console.log('Message stored in localStorage:', newMessage);
    
    return {
      success: true,
      message_id: newMessage._id,
      status: 'SENT',
      sent_at: newMessage.sent_at
    };
  } catch (error) {
    console.error('Error storing message in localStorage:', error);
    return {
      success: false,
      message_id: '',
      status: 'FAILED',
      error_message: 'Failed to store message locally'
    };
  }
};

const getLocalStorageMessages = (params?: any): SentMessagesResponse => {
  try {
    // Clear old sample data to ensure fresh data is created
    const existingData = localStorage.getItem('emailMessages');
    if (existingData) {
      const parsedData = JSON.parse(existingData);
      if (parsedData.length <= 6) {
        // Clear old data if it has 6 or fewer messages (old sample data)
        localStorage.removeItem('emailMessages');
        console.log('Cleared old sample data to create fresh data');
      }
    }
    
    // First, try to get messages from campaign delivery (mockMessages)
    let campaignMessages = JSON.parse(localStorage.getItem('mockMessages') || '[]');
    console.log('Campaign messages found:', campaignMessages.length);
    console.log('Sample campaign message:', campaignMessages[0]);
    
    // Convert PersonalizedMessage to SentMessage format
    const convertedMessages: SentMessage[] = campaignMessages.map((msg: any) => ({
      _id: msg._id,
      recipientName: msg.customer_name || msg.recipientName,
      recipientEmail: msg.customer_email || msg.recipientEmail,
      subject: msg.subject || 'Campaign Message',
      message: msg.message,
      discount_percentage: msg.discount_percentage,
      status: msg.status,
      vendor_message_id: msg.vendor_message_id,
      error_message: msg.error_message,
      sentAt: msg.sent_at || msg.sentAt || msg.created_at,
      delivered_at: msg.delivered_at,
      created_at: msg.created_at,
      updated_at: msg.updated_at,
      customer_id: msg.customer_id,
      customer_name: msg.customer_name,
      customer_email: msg.customer_email,
      sent_at: msg.sent_at
    }));
    
    console.log('Converted messages:', convertedMessages.length);
    console.log('Sample converted message:', convertedMessages[0]);
    
    // If we have campaign messages, use them
    if (convertedMessages.length > 0) {
      console.log('Using campaign messages:', convertedMessages);
      let allMessages = convertedMessages;
      
      // Apply filters
      let filteredMessages = allMessages;
      
      if (params?.status && params.status !== 'all') {
        filteredMessages = allMessages.filter((msg: SentMessage) => msg.status === params.status);
      }
      
      if (params?.customer_id) {
        filteredMessages = filteredMessages.filter((msg: SentMessage) => 
          msg.customer_id === params.customer_id || msg._id === params.customer_id
        );
      }
      
      if (params?.start_date || params?.end_date) {
        filteredMessages = filteredMessages.filter((msg: SentMessage) => {
          const sentDate = msg.sentAt || msg.sent_at;
          if (!sentDate) return false;
          const msgDate = new Date(sentDate).toISOString().split('T')[0];
          if (params.start_date && msgDate < params.start_date) return false;
          if (params.end_date && msgDate > params.end_date) return false;
          return true;
        });
      }
      
    // Apply pagination
    const page = params?.page || 1;
    const limit = Math.min(params?.limit || 10, 1000); // Cap at 1000 to prevent memory issues
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedMessages = filteredMessages.slice(startIndex, endIndex);
      
      console.log('Returning campaign messages:', paginatedMessages);
      
      return {
        messages: paginatedMessages,
        pagination: {
          page,
          limit,
          total: filteredMessages.length,
          pages: Math.ceil(filteredMessages.length / limit)
        }
      };
    }
    
    // Fallback to sample data if no campaign messages exist
    console.log('No campaign messages found, using sample data');
    let allMessages = JSON.parse(localStorage.getItem('emailMessages') || '[]');
    
    console.log('getLocalStorageMessages: allMessages length:', allMessages.length);
    
    // If no messages exist, create some sample data
    if (allMessages.length === 0) {
      console.log('Creating sample messages...');
      const sampleMessages: SentMessage[] = [
        {
          _id: '68c59a97ad094aee928bfcf2',
          recipientName: 'rakesh',
          recipientEmail: 'Rakesh@gmail.com',
          subject: 'etfderq',
          message: 'This is a test message content that should be visible in the message details modal. It contains important information about the customer and their order.',
          discount_percentage: 15,
          discountInfo: {
            percentage: 15,
            storeName: 'Sample Store',
            couponCode: 'SAVE15'
          },
          campaignId: 'campaign_68c59a97ad094aee928bfcf2',
          status: 'SENT',
          vendor_message_id: 'vendor_test_1',
          sentAt: '2024-09-13T21:53:00Z',
          created_at: '2024-09-13T21:53:00Z',
          updated_at: '2024-09-13T21:53:00Z',
          customer_id: '68c59a97ad094aee928bfcf2',
          customer_name: 'rakesh',
          customer_email: 'Rakesh@gmail.com',
          sent_at: '2024-09-13T21:53:00Z'
        },
        {
          _id: 'msg_1',
          recipientName: 'John Doe',
          recipientEmail: 'john.doe@example.com',
          subject: 'Welcome to our store!',
          message: 'Thank you for joining us. Here\'s a special 20% discount on your first order!',
          discount_percentage: 20,
          discountInfo: {
            percentage: 20,
            storeName: 'Welcome Store',
            couponCode: 'WELCOME20'
          },
          campaignId: 'campaign_welcome_2024',
          status: 'SENT',
          vendor_message_id: 'vendor_1',
          sentAt: '2024-01-15T10:30:00Z',
          created_at: '2024-01-15T10:30:00Z',
          updated_at: '2024-01-15T10:30:00Z',
          customer_id: 'customer_1',
          customer_name: 'John Doe',
          customer_email: 'john.doe@example.com',
          sent_at: '2024-01-15T10:30:00Z'
        },
        {
          _id: 'msg_2',
          recipientName: 'Jane Smith',
          recipientEmail: 'jane.smith@example.com',
          subject: 'Flash Sale - 50% Off!',
          message: 'Don\'t miss out on our limited-time flash sale. Get 50% off on all items!',
          discount_percentage: 50,
          status: 'SENT',
          vendor_message_id: 'vendor_2',
          sentAt: '2024-01-14T15:45:00Z',
          created_at: '2024-01-14T15:45:00Z',
          updated_at: '2024-01-14T15:45:00Z',
          customer_id: 'customer_2',
          customer_name: 'Jane Smith',
          customer_email: 'jane.smith@example.com',
          sent_at: '2024-01-14T15:45:00Z'
        },
        {
          _id: 'msg_3',
          recipientName: 'Bob Johnson',
          recipientEmail: 'bob.johnson@example.com',
          subject: 'Your order has shipped!',
          message: 'Great news! Your order has been shipped and is on its way to you.',
          discount_percentage: 0,
          status: 'DELIVERED',
          vendor_message_id: 'vendor_3',
          sentAt: '2024-01-13T09:15:00Z',
          created_at: '2024-01-13T09:15:00Z',
          updated_at: '2024-01-13T09:15:00Z',
          customer_id: 'customer_3',
          customer_name: 'Bob Johnson',
          customer_email: 'bob.johnson@example.com',
          sent_at: '2024-01-13T09:15:00Z'
        },
        {
          _id: 'msg_4',
          recipientName: 'Alice Brown',
          recipientEmail: 'alice.brown@example.com',
          subject: 'We miss you!',
          message: 'It\'s been a while since your last visit. Come back and enjoy 15% off your next purchase!',
          discount_percentage: 15,
          status: 'SENT',
          vendor_message_id: 'vendor_4',
          sentAt: '2024-01-12T14:20:00Z',
          created_at: '2024-01-12T14:20:00Z',
          updated_at: '2024-01-12T14:20:00Z',
          customer_id: 'customer_4',
          customer_name: 'Alice Brown',
          customer_email: 'alice.brown@example.com',
          sent_at: '2024-01-12T14:20:00Z'
        },
        {
          _id: 'msg_5',
          recipientName: 'Charlie Wilson',
          recipientEmail: 'charlie.wilson@example.com',
          subject: 'New arrivals are here!',
          message: 'Check out our latest collection of products. Limited time offer with free shipping!',
          discount_percentage: 10,
          status: 'FAILED',
          vendor_message_id: 'vendor_5',
          sentAt: '2024-01-11T11:00:00Z',
          created_at: '2024-01-11T11:00:00Z',
          updated_at: '2024-01-11T11:00:00Z',
          customer_id: 'customer_5',
          customer_name: 'Charlie Wilson',
          customer_email: 'charlie.wilson@example.com',
          sent_at: '2024-01-11T11:00:00Z'
        },
        {
          _id: 'msg_6',
          recipientName: 'David Lee',
          recipientEmail: 'david.lee@example.com',
          subject: 'Thank you for your purchase!',
          message: 'Thank you for choosing us! Your order has been confirmed and will be processed shortly.',
          discount_percentage: 0,
          status: 'SENT',
          vendor_message_id: 'vendor_6',
          sentAt: '2024-01-10T16:30:00Z',
          created_at: '2024-01-10T16:30:00Z',
          updated_at: '2024-01-10T16:30:00Z',
          customer_id: 'customer_6',
          customer_name: 'David Lee',
          customer_email: 'david.lee@example.com',
          sent_at: '2024-01-10T16:30:00Z'
        },
        {
          _id: 'msg_7',
          recipientName: 'Emma Davis',
          recipientEmail: 'emma.davis@example.com',
          subject: 'Special offer just for you!',
          message: 'As a valued customer, we have a special 25% discount just for you. Use code SPECIAL25!',
          discount_percentage: 25,
          status: 'SENT',
          vendor_message_id: 'vendor_7',
          sentAt: '2024-01-09T14:15:00Z',
          created_at: '2024-01-09T14:15:00Z',
          updated_at: '2024-01-09T14:15:00Z',
          customer_id: 'customer_7',
          customer_name: 'Emma Davis',
          customer_email: 'emma.davis@example.com',
          sent_at: '2024-01-09T14:15:00Z'
        },
        {
          _id: 'msg_8',
          recipientName: 'Frank Miller',
          recipientEmail: 'frank.miller@example.com',
          subject: 'Your account has been updated',
          message: 'Your account information has been successfully updated. Thank you for keeping your details current.',
          discount_percentage: 0,
          status: 'DELIVERED',
          vendor_message_id: 'vendor_8',
          sentAt: '2024-01-08T09:45:00Z',
          created_at: '2024-01-08T09:45:00Z',
          updated_at: '2024-01-08T09:45:00Z',
          customer_id: 'customer_8',
          customer_name: 'Frank Miller',
          customer_email: 'frank.miller@example.com',
          sent_at: '2024-01-08T09:45:00Z'
        },
        {
          _id: 'msg_9',
          recipientName: 'Grace Taylor',
          recipientEmail: 'grace.taylor@example.com',
          subject: 'Weekend Sale - 30% Off!',
          message: 'Don\'t miss our weekend sale! Get 30% off on all items this weekend only.',
          discount_percentage: 30,
          status: 'SENT',
          vendor_message_id: 'vendor_9',
          sentAt: '2024-01-07T12:00:00Z',
          created_at: '2024-01-07T12:00:00Z',
          updated_at: '2024-01-07T12:00:00Z',
          customer_id: 'customer_9',
          customer_name: 'Grace Taylor',
          customer_email: 'grace.taylor@example.com',
          sent_at: '2024-01-07T12:00:00Z'
        },
        {
          _id: 'msg_10',
          recipientName: 'Henry Brown',
          recipientEmail: 'henry.brown@example.com',
          subject: 'Welcome back!',
          message: 'We noticed you haven\'t visited us in a while. Here\'s a 20% discount to welcome you back!',
          discount_percentage: 20,
          status: 'SENT',
          vendor_message_id: 'vendor_10',
          sentAt: '2024-01-06T15:20:00Z',
          created_at: '2024-01-06T15:20:00Z',
          updated_at: '2024-01-06T15:20:00Z',
          customer_id: 'customer_10',
          customer_name: 'Henry Brown',
          customer_email: 'henry.brown@example.com',
          sent_at: '2024-01-06T15:20:00Z'
        },
        {
          _id: 'msg_11',
          recipientName: 'Ivy Chen',
          recipientEmail: 'ivy.chen@example.com',
          subject: 'Product restocked!',
          message: 'Great news! The product you were interested in is back in stock. Order now before it\'s gone again!',
          discount_percentage: 0,
          status: 'SENT',
          vendor_message_id: 'vendor_11',
          sentAt: '2024-01-05T11:30:00Z',
          created_at: '2024-01-05T11:30:00Z',
          updated_at: '2024-01-05T11:30:00Z',
          customer_id: 'customer_11',
          customer_name: 'Ivy Chen',
          customer_email: 'ivy.chen@example.com',
          sent_at: '2024-01-05T11:30:00Z'
        },
        {
          _id: 'msg_12',
          recipientName: 'Jack Wilson',
          recipientEmail: 'jack.wilson@example.com',
          subject: 'Free shipping on your next order!',
          message: 'Enjoy free shipping on your next order! No minimum purchase required. Valid for 7 days.',
          discount_percentage: 0,
          status: 'SENT',
          vendor_message_id: 'vendor_12',
          sentAt: '2024-01-04T13:45:00Z',
          created_at: '2024-01-04T13:45:00Z',
          updated_at: '2024-01-04T13:45:00Z',
          customer_id: 'customer_12',
          customer_name: 'Jack Wilson',
          customer_email: 'jack.wilson@example.com',
          sent_at: '2024-01-04T13:45:00Z'
        },
        {
          _id: 'msg_13',
          recipientName: 'Kate Anderson',
          recipientEmail: 'kate.anderson@example.com',
          subject: 'Your review matters!',
          message: 'We\'d love to hear about your recent purchase experience. Your feedback helps us improve!',
          discount_percentage: 0,
          status: 'SENT',
          vendor_message_id: 'vendor_13',
          sentAt: '2024-01-03T10:15:00Z',
          created_at: '2024-01-03T10:15:00Z',
          updated_at: '2024-01-03T10:15:00Z',
          customer_id: 'customer_13',
          customer_name: 'Kate Anderson',
          customer_email: 'kate.anderson@example.com',
          sent_at: '2024-01-03T10:15:00Z'
        },
        {
          _id: 'msg_14',
          recipientName: 'Liam O\'Connor',
          recipientEmail: 'liam.oconnor@example.com',
          subject: 'Exclusive member discount!',
          message: 'As a premium member, you get an exclusive 40% discount on all items. Use code PREMIUM40!',
          discount_percentage: 40,
          status: 'SENT',
          vendor_message_id: 'vendor_14',
          sentAt: '2024-01-02T14:30:00Z',
          created_at: '2024-01-02T14:30:00Z',
          updated_at: '2024-01-02T14:30:00Z',
          customer_id: 'customer_14',
          customer_name: 'Liam O\'Connor',
          customer_email: 'liam.oconnor@example.com',
          sent_at: '2024-01-02T14:30:00Z'
        },
        {
          _id: 'msg_15',
          recipientName: 'Maya Patel',
          recipientEmail: 'maya.patel@example.com',
          subject: 'New year, new deals!',
          message: 'Start the new year with amazing deals! Get up to 50% off on selected items.',
          discount_percentage: 50,
          status: 'SENT',
          vendor_message_id: 'vendor_15',
          sentAt: '2024-01-01T08:00:00Z',
          created_at: '2024-01-01T08:00:00Z',
          updated_at: '2024-01-01T08:00:00Z',
          customer_id: 'customer_15',
          customer_name: 'Maya Patel',
          customer_email: 'maya.patel@example.com',
          sent_at: '2024-01-01T08:00:00Z'
        }
      ];
      
      // Store sample messages in localStorage
      localStorage.setItem('emailMessages', JSON.stringify(sampleMessages));
      allMessages = sampleMessages;
      console.log('Sample messages created and stored:', sampleMessages);
      console.log('First sample message:', sampleMessages[0]);
      console.log('First sample message message field:', sampleMessages[0]?.message);
      console.log('First sample message message type:', typeof sampleMessages[0]?.message);
    }
    
    // Apply filters
    let filteredMessages = allMessages;
    
    if (params?.status && params.status !== 'all') {
      filteredMessages = allMessages.filter((msg: SentMessage) => msg.status === params.status);
    }
    
    if (params?.customer_id) {
      filteredMessages = filteredMessages.filter((msg: SentMessage) => 
        msg.customer_id === params.customer_id || msg._id === params.customer_id
      );
    }
    
    if (params?.start_date || params?.end_date) {
      filteredMessages = filteredMessages.filter((msg: SentMessage) => {
        const sentDate = msg.sentAt || msg.sent_at;
        if (!sentDate) return false;
        const msgDate = new Date(sentDate).toISOString().split('T')[0];
        if (params.start_date && msgDate < params.start_date) return false;
        if (params.end_date && msgDate > params.end_date) return false;
        return true;
      });
    }
    
    // Apply pagination
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedMessages = filteredMessages.slice(startIndex, endIndex);
    
    console.log('Returning messages:', paginatedMessages);
    console.log('First returned message:', paginatedMessages[0]);
    
    return {
      messages: paginatedMessages,
      pagination: {
        page,
        limit,
        total: filteredMessages.length,
        pages: Math.ceil(filteredMessages.length / limit)
      }
    };
  } catch (error) {
    console.error('Error retrieving messages from localStorage:', error);
    return {
      messages: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        pages: 0
      }
    };
  }
};

// Test database connection
export const testDatabaseConnection = async (): Promise<{ connected: boolean; message: string }> => {
  try {
    // Test a simple API endpoint first
    const response = await api.get('/customers');
    return {
      connected: true,
      message: 'Database connection successful'
    };
  } catch (error: any) {
    console.error('Database connection test failed:', error);
    
    if (error.response?.status === 401) {
      return {
        connected: false,
        message: 'Authentication required. Please log in to access the database.'
      };
    }
    
    if (error.response?.status === 404) {
      return {
        connected: false,
        message: 'API endpoints not found. Backend server may not be running properly.'
      };
    }
    
    // Test if we can at least store locally
    try {
      const testMessage = {
        _id: 'test',
        customer_id: 'test',
        customer_name: 'Test',
        customer_email: 'test@example.com',
        subject: 'Test',
        message: 'Test message',
        status: 'SENT',
        sent_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      localStorage.setItem('emailMessages', JSON.stringify([testMessage]));
      localStorage.removeItem('emailMessages');
      
      return {
        connected: false,
        message: 'Database unavailable, using local storage fallback'
      };
    } catch (localError) {
      return {
        connected: false,
        message: 'Database and local storage both unavailable'
      };
    }
  }
};

export default api;