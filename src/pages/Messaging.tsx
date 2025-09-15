import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Eye, 
  Send, 
  Mail, 
  Clock,
  CheckCircle, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  MessageSquare,
  User,
  TrendingUp,
  BarChart3,
  Zap,
  Sparkles,
  Star,
  Target,
  Activity,
  Bell,
  Filter,
  Calendar,
  Copy,
  MoreVertical,
  ChevronRight,
  ChevronDown,
  RotateCcw
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { messagingApi, customerApi, emailApi } from '../services/api';
import { 
  CreateMessageRequest, 
  Customer,
  SentMessage,
  EmailSendRequest,
  EmailStatistics
} from '../types';
import toast from 'react-hot-toast';

interface MessageTemplate {
  id: string;
  name: string;
  subject: string;
  template: string;
  placeholders: string[];
}

const Messaging: React.FC = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<SentMessage[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<SentMessage | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [previewCustomer, setPreviewCustomer] = useState<Customer | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [emailStats, setEmailStats] = useState<EmailStatistics | null>(null);
  const [statisticsData, setStatisticsData] = useState<{
    totalMessages: number;
    dailyData: Array<{
      date: string;
      hourlyData: Array<{
        hour: number;
        count: number;
      }>;
    }>;
  } | null>(null);
  const [statisticsLoading, setStatisticsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hoveredPoint, setHoveredPoint] = useState<{
    dayIndex: number;
    hourIndex: number;
    x: number;
    y: number;
    count: number;
  } | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Message templates
  const messageTemplates: MessageTemplate[] = [
    // Welcome Templates
    {
      id: 'welcome_premium',
      name: 'Premium Welcome',
      subject: 'Welcome to our premium store!',
      template: 'Hi {name}, welcome to our premium store! As a valued customer, enjoy {discount}% off your first order with code WELCOME{discount}. We\'re excited to have you join our community!',
      placeholders: ['name', 'discount']
    },
    {
      id: 'welcome_simple',
      name: 'Simple Welcome',
      subject: 'Welcome to our store!',
      template: 'Hi {name}, welcome to our store! Get {discount}% off your first order with code WELCOME{discount}.',
      placeholders: ['name', 'discount']
    },
    
    // Discount Templates
    {
      id: 'discount_exclusive',
      name: 'Exclusive Discount',
      subject: 'Exclusive offer just for you!',
      template: 'Hi {name}, here\'s an exclusive {discount}% off on your next order! This special offer is just for you. Use code EXCLUSIVE{discount} at checkout. Limited time only!',
      placeholders: ['name', 'discount']
    },
    {
      id: 'discount_seasonal',
      name: 'Seasonal Discount',
      subject: 'Special seasonal offer!',
      template: 'Hi {name}, celebrate the season with {discount}% off! Use code SEASON{discount} and enjoy amazing savings on your favorite items.',
      placeholders: ['name', 'discount']
    },
    
    // New Stock Templates
    {
      id: 'new_stock_premium',
      name: 'Premium New Arrivals',
      subject: 'Exciting new arrivals just for you!',
      template: 'Hi {name}, we\'ve just added amazing new products to our collection! Get {discount}% off on these fresh arrivals with code NEW{discount}. Don\'t miss out!',
      placeholders: ['name', 'discount']
    },
    {
      id: 'new_stock_limited',
      name: 'Limited New Stock',
      subject: 'Limited edition items now available!',
      template: 'Hi {name}, limited edition items are now in stock! Get {discount}% off with code LIMITED{discount}. These won\'t last long!',
      placeholders: ['name', 'discount']
    },
    
    // Abandoned Cart Templates
    {
      id: 'abandoned_cart_urgent',
      name: 'Urgent Cart Reminder',
      subject: 'Your items are waiting!',
      template: 'Hi {name}, your items are still in your cart! Complete your purchase now and get {discount}% off. Don\'t let these great deals slip away!',
      placeholders: ['name', 'discount']
    },
    {
      id: 'abandoned_cart_friendly',
      name: 'Friendly Cart Reminder',
      subject: 'Don\'t forget your items!',
      template: 'Hi {name}, you left some items in your cart. Complete your purchase and get {discount}% off! We\'re here if you need any help.',
      placeholders: ['name', 'discount']
    },
    
    // Birthday Templates
    {
      id: 'birthday_special',
      name: 'Special Birthday Offer',
      subject: 'Happy Birthday! Special gift inside!',
      template: 'Happy Birthday {name}! 🎉 We have a special {discount}% off gift just for you! Use code BIRTHDAY{discount} and celebrate with us!',
      placeholders: ['name', 'discount']
    },
    {
      id: 'birthday_vip',
      name: 'VIP Birthday Celebration',
      subject: 'VIP Birthday Celebration!',
      template: 'Happy Birthday {name}! As our VIP member, enjoy an exclusive {discount}% off on your special day. Code: VIP{discount}. Let\'s celebrate!',
      placeholders: ['name', 'discount']
    }
  ];

  const createForm = useForm<{
    customer_id: string;
    template_id: string;
    subject: string;
    message: string;
    discount_percentage: number;
  }>({
    defaultValues: {
      customer_id: '',
      template_id: '',
      subject: '',
      message: '',
      discount_percentage: 10
    }
  });

  const [activeTab, setActiveTab] = useState<'send' | 'sent' | 'statistics'>('send');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: ''
  });

  const fetchCustomers = async () => {
    try {
      const response = await customerApi.list({ page: 1, limit: 1000 });
      setCustomers(response.data as Customer[]);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
    }
  };

  const fetchEmailStats = useCallback(async () => {
    try {
      const response = await emailApi.getStatistics({
        startDate: dateRange.start,
        endDate: dateRange.end
      });
      setEmailStats(response.statistics);
    } catch (error) {
      console.error('Error fetching email statistics:', error);
      // Set default stats if API fails
      setEmailStats({
        total_messages: 0,
        sent_count: 0,
        failed_count: 0,
        delivered_count: 0,
        pending_count: 0,
        success_rate: 0,
        delivery_rate: 0,
        average_delivery_time: 0,
        recent_activity: {
          last_24h: 0,
          last_7d: 0,
          last_30d: 0
        }
      });
    }
  }, [dateRange.start, dateRange.end]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchCustomers(),
        fetchEmailStats()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [fetchEmailStats]);

  const fetchSentMessages = async (page = 1, searchQuery = '', status = statusFilter, dateStart = dateRange.start, dateEnd = dateRange.end) => {
    try {
      console.log('Fetching ALL sent messages from database...');
      // Fetch ALL messages from database without pagination
      const response = await emailApi.getSentMessages({
        page: 1,
        limit: 1000, // Get all messages
        status: status === 'all' ? undefined : status,
        start_date: dateStart,
        end_date: dateEnd
      });
      console.log('Fetched ALL messages from database:', response.messages.length);
      
      // Apply client-side filtering for search, status, and date range
      let filteredMessages = response.messages;
      
      // Apply search filter
      if (searchQuery && searchQuery.trim() !== '') {
        const searchTerm = searchQuery.toLowerCase();
        filteredMessages = filteredMessages.filter(message => 
          (message.recipientName || message.customer_name || '').toLowerCase().includes(searchTerm) ||
          (message.recipientEmail || message.customer_email || '').toLowerCase().includes(searchTerm) ||
          (message._id || '').toLowerCase().includes(searchTerm) ||
          (message.subject || '').toLowerCase().includes(searchTerm) ||
          (message.message || '').toLowerCase().includes(searchTerm)
        );
      }
      
      // Apply status filter
      if (status && status !== 'all') {
        filteredMessages = filteredMessages.filter(message => 
          (message.status || '').toUpperCase() === status.toUpperCase()
        );
      }
      
      // Apply date range filter
      if (dateStart || dateEnd) {
        filteredMessages = filteredMessages.filter(message => {
          const messageDate = message.sentAt || message.sent_at || message.created_at;
          if (!messageDate) return false;
          
          const msgDate = new Date(messageDate).toISOString().split('T')[0];
          
          if (dateStart && msgDate < dateStart) return false;
          if (dateEnd && msgDate > dateEnd) return false;
          return true;
        });
      }
      
      console.log('Total filtered messages:', filteredMessages.length);
      
      // Apply client-side pagination
      const startIndex = (page - 1) * pagination.limit;
      const endIndex = startIndex + pagination.limit;
      const paginatedMessages = filteredMessages.slice(startIndex, endIndex);
      
      // Update pagination based on filtered results
      const filteredPagination = {
        page: page,
        limit: pagination.limit,
        total: filteredMessages.length,
        pages: Math.ceil(filteredMessages.length / pagination.limit)
      };
      
      console.log('Paginated messages for page', page, ':', paginatedMessages.length);
      console.log('Showing messages', startIndex + 1, 'to', Math.min(endIndex, filteredMessages.length), 'of', filteredMessages.length);
      
      setMessages(paginatedMessages);
      setPagination(filteredPagination);
    } catch (error) {
      console.error('Error fetching sent messages:', error);
      toast.error('Failed to fetch sent messages');
    }
  };

  useEffect(() => {
    fetchData();
    // Load statistics data when component mounts
    generateStatisticsData();
    
    const interval = setInterval(() => {
      if (activeTab === 'sent') {
        fetchEmailStats();
      }
      if (activeTab === 'statistics') {
        // Refresh statistics data every minute for real-time updates
        generateStatisticsData();
      }
    }, 60000); // Update every minute for real-time data
    return () => clearInterval(interval);
  }, [activeTab, fetchData, fetchEmailStats]);

  // Real-time clock update
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update every second
    return () => clearInterval(clockInterval);
  }, []);

  // Debounced search function
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    
    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Set new timeout for debounced search
    const timeout = setTimeout(() => {
      if (activeTab === 'sent') {
        fetchSentMessages(1, value, statusFilter, dateRange.start, dateRange.end);
      }
    }, 500); // 500ms delay
    
    setSearchTimeout(timeout);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, [searchTimeout]);




  const handleTemplateChange = (templateId: string) => {
    const template = messageTemplates.find(t => t.id === templateId);
    if (template) {
      createForm.setValue('subject', template.subject);
      createForm.setValue('message', template.template);
    }
  };

  const handleTemplateSelect = (template: MessageTemplate) => {
    setSelectedTemplate(template);
    createForm.setValue('subject', template.subject);
    createForm.setValue('message', template.template);
    setShowTemplateModal(false);
    setShowCreateModal(true);
    toast.success(`Template "${template.name}" selected!`);
  };

  const openTemplateModal = () => {
    setShowTemplateModal(true);
  };

  const generateStatisticsData = async () => {
    try {
      setStatisticsLoading(true);
      const now = new Date();
      const dailyData = [];
      let totalMessages = 0;

      // Calculate date range for the last 7 days (including today)
      // Ensure we get the current date properly
      const endDate = new Date(now);
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 6); // 7 days total including today
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      console.log('Date range for API call:', {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        currentDate: now.toISOString().split('T')[0]
      });

      // Fetch all messages for the last 7 days
      const response = await emailApi.getSentMessages({
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        limit: 1000 // Get more messages to ensure we have complete data
      });

      const messages = response.messages || [];

      // Group messages by date and hour
      const messageGroups: { [key: string]: { [key: number]: number } } = {};

      messages.forEach(message => {
        const sentDate = new Date(message.sentAt || message.sent_at || new Date());
        const dateStr = sentDate.toISOString().split('T')[0];
        const hour = sentDate.getHours();

        if (!messageGroups[dateStr]) {
          messageGroups[dateStr] = {};
        }
        if (!messageGroups[dateStr][hour]) {
          messageGroups[dateStr][hour] = 0;
        }
        messageGroups[dateStr][hour]++;
      });

      // Generate data for the last 7 days in descending order (most recent first)
      // This ensures we always show the current 7-day period
      for (let i = 0; i <= 6; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        console.log(`Generating data for day ${i}: ${dateStr}`);
        
        const hourlyData = [];
        for (let hour = 0; hour < 24; hour++) {
          const count = messageGroups[dateStr]?.[hour] || 0;
          hourlyData.push({ hour, count });
          totalMessages += count;
        }
        
        dailyData.push({
          date: dateStr,
          hourlyData
        });
      }

      console.log('Generated daily data:', dailyData.map(d => d.date));

      setStatisticsData({
        totalMessages,
        dailyData
      });
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error generating statistics data:', error);
      // Fallback to empty data if API fails - still show current 7-day period
      const now = new Date();
      const dailyData = [];

      for (let i = 0; i <= 6; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const hourlyData = [];
        for (let hour = 0; hour < 24; hour++) {
          hourlyData.push({ hour, count: 0 });
        }
        
        dailyData.push({
          date: dateStr,
          hourlyData
        });
      }

      setStatisticsData({
        totalMessages: 0,
        dailyData
      });
    } finally {
      setStatisticsLoading(false);
    }
  };

  const handleStatisticsClick = async () => {
    await generateStatisticsData();
    toast.success('Charts data refreshed successfully');
  };

  const handleSendMessage = async (data: any) => {
    try {
      setSending(true);
      
      console.log('=== EMAIL SENDING DEBUG ===');
      console.log('Form data received:', data);
      console.log('Customer ID:', data.customer_id);
      console.log('Subject:', data.subject);
      console.log('Message:', data.message);
      console.log('Discount percentage:', data.discount_percentage);
      
      // Validate message
      if (!data.message || data.message.trim() === '') {
        toast.error('Message is required');
        return;
      }
      
      // Validate subject
      if (!data.subject || data.subject.trim() === '') {
        toast.error('Subject is required');
        return;
      }
      
      // Validate customer selection
      if (!data.customer_id) {
        toast.error('Please select a customer');
        return;
      }
      
      // Validate discount percentage
      if (data.discount_percentage < 0 || data.discount_percentage > 100) {
        toast.error('Discount percentage must be between 0 and 100');
        return;
      }
      
      console.log('All validations passed, sending to email API...');
      
      // Get customer details for additional validation
      const selectedCustomer = customers.find(c => c._id === data.customer_id);
      if (!selectedCustomer) {
        toast.error('Selected customer not found');
        return;
      }
      
      console.log('Selected customer:', selectedCustomer);
      console.log('Customer ID:', selectedCustomer._id);
      console.log('Customer Name:', selectedCustomer.name);
      console.log('Customer Email:', selectedCustomer.email);
      
      // Send email using the new MongoDB-based API
      const emailData: EmailSendRequest = {
        to: selectedCustomer.email,
        customer_id: selectedCustomer._id,
        customer_name: selectedCustomer.name,
        template: {
          subject: data.subject,
          text: data.message,
          html: `<h1>${data.subject}</h1><p>${data.message}</p>`,
          personalization: {
            customerName: true,
            customerEmail: true,
            customFields: ['phone', 'spend']
          }
        }
      };
      
      console.log('Email data being sent:', JSON.stringify(emailData, null, 2));
      
      // Store customer data for localStorage fallback
      if (selectedCustomer) {
        localStorage.setItem('currentCustomer', JSON.stringify(selectedCustomer));
      }
      
      try {
        const response = await emailApi.sendSingle(emailData);
        
        console.log('Email API response received:', response);
        
        if (response.success) {
          toast.success('Email sent successfully!');
          // Refresh sent messages if we're on that tab
          if (activeTab === 'sent') {
            await fetchSentMessages();
          }
          // Refresh statistics
          await fetchEmailStats();
        } else {
          toast.error(response.error_message || 'Failed to send email');
        }
      } catch (emailError: any) {
        console.error('Email API failed, trying fallback to messaging API:', emailError);
        
        // Fallback to old messaging API if email API fails
        try {
          const fallbackData: CreateMessageRequest = {
            customer_id: data.customer_id,
            message: data.message,
            discount_percentage: data.discount_percentage
          };
          
          const fallbackResponse = await messagingApi.createMessage(fallbackData);
          console.log('Fallback messaging API response:', fallbackResponse);
          
          toast.success('Message sent successfully (using fallback API)!');
          
          // Refresh sent messages if we're on that tab
          if (activeTab === 'sent') {
            await fetchSentMessages();
          }
        } catch (fallbackError: any) {
          console.error('Fallback API also failed:', fallbackError);
          throw emailError; // Re-throw the original email API error
        }
      }
      
      setShowCreateModal(false);
      createForm.reset();
    } catch (error: any) {
      console.error('=== ERROR DEBUG ===');
      console.error('Error object:', error);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Error message:', error.message);
      
      // Handle specific error messages from backend
      let errorMessage = 'Failed to send email';
      
      // Check if it's a validation error with details
      if (error.response?.data) {
        if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.details) {
          errorMessage = error.response.data.details;
        } else if (Array.isArray(error.response.data)) {
          // Handle validation errors array
          errorMessage = error.response.data.join(', ');
        } else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Show detailed error in console for debugging
      console.error('Final error message to show user:', errorMessage);
      
      toast.error(errorMessage);
    } finally {
      setSending(false);
    }
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SENT':
        return 'bg-green-100 text-green-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'DELIVERED':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SENT':
        return <CheckCircle className="h-4 w-4" />;
      case 'FAILED':
        return <XCircle className="h-4 w-4" />;
      case 'PENDING':
        return <Clock className="h-4 w-4" />;
      case 'DELIVERED':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No date';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return 'Invalid date';
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="space-y-8 p-6">
        {/* Enhanced Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-2xl shadow-2xl">
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="relative px-8 py-12">
            <div className="md:flex md:items-center md:justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="p-3 bg-white bg-opacity-20 rounded-xl backdrop-blur-sm">
                    <MessageSquare className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-white sm:text-4xl">
                      Messaging Center
                    </h2>
                    <div className="flex items-center space-x-2 mt-2">
                      <Sparkles className="h-4 w-4 text-yellow-300" />
                      <p className="text-blue-100 text-lg">
                        Send personalized emails with AI-powered insights
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-6 text-white">
                  <div className="flex items-center space-x-2">
                    <Activity className="h-5 w-5 text-green-300" />
                    <span className="text-sm">Real-time tracking</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Target className="h-5 w-5 text-yellow-300" />
                    <span className="text-sm">Smart targeting</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5 text-purple-300" />
                    <span className="text-sm">Analytics dashboard</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex md:mt-0 md:ml-4 space-x-3">
                {activeTab === 'sent' && (
                  <button
                    onClick={() => fetchSentMessages(pagination.page, searchTerm, statusFilter, dateRange.start, dateRange.end)}
                    className="group relative px-6 py-3 bg-white bg-opacity-20 hover:bg-opacity-30 backdrop-blur-sm text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg"
                    title="Refresh Messages"
                  >
                    <RefreshCw className="h-5 w-5 mr-2 inline group-hover:rotate-180 transition-transform duration-500" />
                    Refresh
                  </button>
                )}
                {activeTab === 'send' && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="group relative px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 hover:shadow-xl"
                  >
                    <Plus className="h-5 w-5 mr-2 inline group-hover:rotate-90 transition-transform duration-300" />
                    Send Email
                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 rounded-xl transition-opacity duration-300"></div>
                  </button>
                )}
              </div>
            </div>
          </div>
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-32 translate-x-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full translate-y-24 -translate-x-24"></div>
        </div>

        {/* Enhanced Tab Navigation */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <nav className="flex space-x-1 p-2">
            <button
              onClick={() => setActiveTab('send')}
              className={`group relative flex-1 flex items-center justify-center px-6 py-4 rounded-xl font-medium text-sm transition-all duration-300 ${
                activeTab === 'send'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 hover:scale-102'
              }`}
            >
              <Send className={`h-5 w-5 mr-2 transition-transform duration-300 ${
                activeTab === 'send' ? 'animate-pulse' : 'group-hover:scale-110'
              }`} />
              Send Email
              {activeTab === 'send' && (
                <div className="absolute inset-0 bg-white opacity-10 rounded-xl"></div>
              )}
            </button>
            <button
              onClick={() => {
                setActiveTab('sent');
                fetchSentMessages(1, searchTerm, statusFilter, dateRange.start, dateRange.end);
              }}
              className={`group relative flex-1 flex items-center justify-center px-6 py-4 rounded-xl font-medium text-sm transition-all duration-300 ${
                activeTab === 'sent'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg transform scale-105'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 hover:scale-102'
              }`}
            >
              <Mail className={`h-5 w-5 mr-2 transition-transform duration-300 ${
                activeTab === 'sent' ? 'animate-pulse' : 'group-hover:scale-110'
              }`} />
              Sent Messages
              {activeTab === 'sent' && (
                <div className="absolute inset-0 bg-white opacity-10 rounded-xl"></div>
              )}
            </button>
            <button
              onClick={() => {
                setActiveTab('statistics');
                fetchEmailStats();
                handleStatisticsClick();
              }}
              className={`group relative flex-1 flex items-center justify-center px-6 py-4 rounded-xl font-medium text-sm transition-all duration-300 ${
                activeTab === 'statistics'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg transform scale-105'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 hover:scale-102'
              }`}
            >
              <TrendingUp className={`h-5 w-5 mr-2 transition-transform duration-300 ${
                activeTab === 'statistics' ? 'animate-pulse' : 'group-hover:scale-110'
              }`} />
              Statistics
              {activeTab === 'statistics' && (
                <div className="absolute inset-0 bg-white opacity-10 rounded-xl"></div>
              )}
            </button>
          </nav>
        </div>


        {/* Tab Content */}
        {activeTab === 'send' && (
          <div className="space-y-8">
            {/* Quick Actions Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="group bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer" onClick={() => setShowCreateModal(true)}>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-white bg-opacity-20 rounded-xl">
                    <Send className="h-6 w-6" />
                  </div>
                  <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                </div>
                <h3 className="text-xl font-bold mb-2">Send Email</h3>
                <p className="text-blue-100 text-sm">Create and send personalized emails to customers</p>
              </div>

              <div 
                className="group bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer"
                onClick={() => navigate('/campaigns')}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-white bg-opacity-20 rounded-xl">
                    <Target className="h-6 w-6" />
                  </div>
                  <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                </div>
                <h3 className="text-xl font-bold mb-2">Smart Campaigns</h3>
                <p className="text-green-100 text-sm">Create targeted campaigns with AI recommendations</p>
              </div>

              <div 
                className="group bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer"
                onClick={openTemplateModal}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-white bg-opacity-20 rounded-xl">
                    <Zap className="h-6 w-6" />
                  </div>
                  <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                </div>
                <h3 className="text-xl font-bold mb-2">Templates</h3>
                <p className="text-purple-100 text-sm">Use pre-built templates for quick messaging</p>
              </div>
            </div>

            {/* Enhanced Send Email Form */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-8 py-6 border-b border-gray-100">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <Mail className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Send New Email</h3>
                    <p className="text-gray-600 mt-1">Create personalized emails with advanced tracking and analytics</p>
                  </div>
                </div>
              </div>
              
              <div className="p-8">
                <div className="text-center py-12">
                  <div className="relative inline-block">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full blur-lg opacity-30"></div>
                    <div className="relative bg-gradient-to-r from-blue-500 to-purple-600 rounded-full p-6">
                      <Mail className="h-16 w-16 text-white" />
                    </div>
                  </div>
                  <h3 className="mt-6 text-2xl font-bold text-gray-900">Ready to Send?</h3>
                  <p className="mt-2 text-lg text-gray-600 max-w-md mx-auto">
                    Create personalized emails with our smart composer. Choose from templates or start from scratch.
                  </p>
                  <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="group relative px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-semibold text-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
                    >
                      <Plus className="h-5 w-5 mr-2 inline group-hover:rotate-90 transition-transform duration-300" />
                      Create New Email
                      <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 rounded-xl transition-opacity duration-300"></div>
                    </button>
                    <button 
                      onClick={openTemplateModal}
                      className="px-8 py-4 border-2 border-gray-300 hover:border-gray-400 text-gray-700 hover:text-gray-900 rounded-xl font-semibold text-lg transition-all duration-300 hover:scale-105"
                    >
                      <Zap className="h-5 w-5 mr-2 inline" />
                      Use Template
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sent' && (
          <div className="space-y-8">
            {/* Enhanced Statistics Cards */}
            {emailStats && (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="group relative bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300"></div>
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-white bg-opacity-20 rounded-xl">
                        <Mail className="h-6 w-6" />
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold">{emailStats.total_messages}</div>
                        <div className="text-blue-100 text-sm">Total Messages</div>
                      </div>
                    </div>
                    <div className="flex items-center text-blue-100 text-sm">
                      <Activity className="h-4 w-4 mr-1" />
                      All time
                    </div>
                  </div>
                </div>

                <div className="group relative bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300"></div>
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-white bg-opacity-20 rounded-xl">
                        <CheckCircle className="h-6 w-6" />
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold">{emailStats.sent_count}</div>
                        <div className="text-green-100 text-sm">Successfully Sent</div>
                      </div>
                    </div>
                    <div className="flex items-center text-green-100 text-sm">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      +12% this week
                    </div>
                  </div>
                </div>

                <div className="group relative bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300"></div>
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-white bg-opacity-20 rounded-xl">
                        <XCircle className="h-6 w-6" />
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold">{emailStats.failed_count}</div>
                        <div className="text-red-100 text-sm">Failed</div>
                      </div>
                    </div>
                    <div className="flex items-center text-red-100 text-sm">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      Need attention
                    </div>
                  </div>
                </div>

                <div className="group relative bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300"></div>
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-white bg-opacity-20 rounded-xl">
                        <BarChart3 className="h-6 w-6" />
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold">{emailStats.success_rate.toFixed(1)}%</div>
                        <div className="text-purple-100 text-sm">Success Rate</div>
                      </div>
                    </div>
                    <div className="flex items-center text-purple-100 text-sm">
                      <Star className="h-4 w-4 mr-1" />
                      Excellent
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Filters and Search */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Filter className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Filters & Search</h3>
              </div>
              
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-200" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search by customer name, ID, email, subject, or message content..."
                      value={searchTerm}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="w-full pl-12 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => handleSearchChange('')}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-200"
                        title="Clear search"
                      >
                        <XCircle className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-3">
                  <div className="relative">
                    <select
                      value={statusFilter}
                      onChange={(e) => {
                        const newStatus = e.target.value;
                        setStatusFilter(newStatus);
                        setPagination(prev => ({ ...prev, page: 1 }));
                        fetchSentMessages(1, searchTerm, newStatus, dateRange.start, dateRange.end);
                      }}
                      className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-3 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 min-w-[140px]"
                    >
                      <option value="all">All Status</option>
                      <option value="SENT">Sent</option>
                      <option value="PENDING">Pending</option>
                      <option value="DELIVERED">Delivered</option>
                      <option value="FAILED">Failed</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => {
                        const newStartDate = e.target.value;
                        setDateRange({ ...dateRange, start: newStartDate });
                        setPagination(prev => ({ ...prev, page: 1 }));
                        fetchSentMessages(1, searchTerm, statusFilter, newStartDate, dateRange.end);
                      }}
                      className="border border-gray-200 rounded-xl px-3 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="From"
                      title="From date"
                    />
                    <span className="text-gray-400">to</span>
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => {
                        const newEndDate = e.target.value;
                        setDateRange({ ...dateRange, end: newEndDate });
                        setPagination(prev => ({ ...prev, page: 1 }));
                        fetchSentMessages(1, searchTerm, statusFilter, dateRange.start, newEndDate);
                      }}
                      className="border border-gray-200 rounded-xl px-3 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="To"
                      title="To date"
                    />
                  </div>
                  
                  <button
                    onClick={() => {
                      setStatusFilter('all');
                      setDateRange({ start: '', end: '' });
                      setSearchTerm('');
                      setPagination(prev => ({ ...prev, page: 1 }));
                      fetchSentMessages(1, '', 'all', '', '');
                    }}
                    className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all duration-200 hover:scale-105 flex items-center space-x-2"
                    title="Clear all filters"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Clear</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Enhanced Active Filters Info */}
            {(searchTerm || statusFilter !== 'all' || dateRange.start || dateRange.end) && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center flex-wrap gap-3">
                    <div className="flex items-center space-x-2">
                      <div className="p-1 bg-blue-100 rounded-lg">
                        <Search className="h-4 w-4 text-blue-600" />
                      </div>
                      <span className="text-sm font-medium text-blue-800">
                        {messages.length} message{messages.length !== 1 ? 's' : ''} found
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {searchTerm && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                          <Search className="h-3 w-3 mr-1" />
                          "{searchTerm}"
                        </span>
                      )}
                      {statusFilter !== 'all' && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {statusFilter}
                        </span>
                      )}
                      {(dateRange.start || dateRange.end) && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                          <Calendar className="h-3 w-3 mr-1" />
                          {dateRange.start || 'Any'} to {dateRange.end || 'Any'}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setStatusFilter('all');
                      setDateRange({ start: '', end: '' });
                      setSearchTerm('');
                      setPagination(prev => ({ ...prev, page: 1 }));
                      fetchSentMessages(1, '', 'all', '', '');
                    }}
                    className="flex items-center space-x-1 px-3 py-1 text-blue-600 hover:text-blue-800 text-sm font-medium hover:bg-blue-100 rounded-lg transition-all duration-200"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Clear all</span>
                  </button>
                </div>
              </div>
            )}

            {/* Enhanced Sent Messages Table */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Sent Messages</h3>
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <Bell className="h-4 w-4" />
                    <span>Real-time updates</span>
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {messages.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-16 text-center">
                          <div className="flex flex-col items-center">
                            <div className="relative mb-6">
                              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full blur-lg opacity-20"></div>
                              <div className="relative bg-gradient-to-r from-blue-500 to-purple-600 rounded-full p-4">
                                <Search className="h-12 w-12 text-white" />
                              </div>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">
                              {searchTerm || statusFilter !== 'all' || dateRange.start || dateRange.end ? 'No messages found' : 'No messages available'}
                            </h3>
                            <p className="text-gray-500 mb-6 max-w-md">
                              {searchTerm || statusFilter !== 'all' || dateRange.start || dateRange.end
                                ? `No messages match your current filters. Try adjusting your search terms, status, or date range.`
                                : 'No messages have been sent yet. Send your first message to get started.'
                              }
                            </p>
                            {(searchTerm || statusFilter !== 'all' || dateRange.start || dateRange.end) && (
                              <button
                                onClick={() => {
                                  setStatusFilter('all');
                                  setDateRange({ start: '', end: '' });
                                  setSearchTerm('');
                                  setPagination(prev => ({ ...prev, page: 1 }));
                                  fetchSentMessages(1, '', 'all', '', '');
                                }}
                                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                              >
                                Clear All Filters
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      messages.map((message, index) => (
                        <tr key={message._id} className="group hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200">
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-4">
                              <div className="relative">
                                <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                                  <User className="h-6 w-6 text-white" />
                                </div>
                                <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-400 rounded-full border-2 border-white"></div>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-semibold text-gray-900 truncate">
                                  {message.recipientName || message.customer_name || 'Unknown Customer'}
                                </div>
                                <div className="text-sm text-gray-500 truncate">
                                  {message.recipientEmail || message.customer_email || 'No email'}
                                </div>
                                <div className="text-xs text-gray-400 font-mono">
                                  ID: {message._id?.slice(-8)}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                              {message.subject || 'No subject'}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {formatDate(message.sentAt || message.sent_at || '')}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col space-y-2">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(message.status || 'UNKNOWN')} shadow-sm`}>
                                {getStatusIcon(message.status || 'UNKNOWN')}
                                <span className="ml-1">{message.status || 'UNKNOWN'}</span>
                              </span>
                              {message.error_message && (
                                <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                                  {message.error_message}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => {
                                  console.log('🔍 Selected message for viewing:', message);
                                  console.log('🔍 Message keys:', Object.keys(message));
                                  console.log('🔍 Message content:', message.message);
                                  console.log('🔍 Message type:', typeof message.message);
                                  setSelectedMessage(message);
                                }}
                                className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-all duration-200 group"
                                title="View Details"
                              >
                                <Eye className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                              </button>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(message.message);
                                  toast.success('Message copied to clipboard');
                                }}
                                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all duration-200 group"
                                title="Copy Message"
                              >
                                <Copy className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                              </button>
                              <button
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200 group"
                                title="More options"
                              >
                                <MoreVertical className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Enhanced Pagination */}
            {pagination.pages > 1 && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-gray-700">
                      Showing{' '}
                      <span className="font-semibold text-gray-900">
                        {(pagination.page - 1) * pagination.limit + 1}
                      </span>{' '}
                      to{' '}
                      <span className="font-semibold text-gray-900">
                        {Math.min(pagination.page * pagination.limit, pagination.total)}
                      </span>{' '}
                      of{' '}
                      <span className="font-semibold text-gray-900">{pagination.total}</span>
                      {' '}results
                    </div>
                    <div className="h-4 w-px bg-gray-300"></div>
                    <div className="text-sm text-gray-500">
                      Page {pagination.page} of {pagination.pages}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => fetchSentMessages(pagination.page - 1, searchTerm, statusFilter, dateRange.start, dateRange.end)}
                      disabled={pagination.page <= 1}
                      className="group relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
                    >
                      <ChevronRight className="h-4 w-4 mr-1 rotate-180 group-hover:-translate-x-0.5 transition-transform duration-200" />
                      Previous
                    </button>
                    
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                        const pageNum = i + 1;
                        const isActive = pageNum === pagination.page;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => fetchSentMessages(pageNum, searchTerm, statusFilter, dateRange.start, dateRange.end)}
                            className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 hover:scale-105 ${
                              isActive
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => fetchSentMessages(pagination.page + 1, searchTerm, statusFilter, dateRange.start, dateRange.end)}
                      disabled={pagination.page >= pagination.pages}
                      className="group relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition-transform duration-200" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'statistics' && statisticsData && (
          <div className="space-y-8">
            {/* 7-Day Message Count */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Last 7 Days Statistics</h3>
                  <p className="text-gray-600">Message activity overview</p>
                </div>
              </div>
              
              <div className="text-center py-8">
                <div className="text-6xl font-bold text-blue-600 mb-4">{statisticsData.totalMessages}</div>
                <p className="text-xl text-gray-600">Messages Sent</p>
                <p className="text-sm text-gray-500 mt-2">Over the last 7 days</p>
              </div>
            </div>

            {/* Hourly Line Graph */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-2xl font-bold text-gray-900">Hourly Message Activity</h3>
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full flex items-center space-x-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span>Live</span>
                      </span>
                    </div>
                    <p className="text-gray-600">Messages sent per hour over the last 7 days</p>
                    {lastUpdated && (
                      <p className="text-sm text-gray-500 mt-1 flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleStatisticsClick}
                  disabled={statisticsLoading}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors shadow-sm ${
                    statisticsLoading 
                      ? 'bg-gray-400 text-white cursor-not-allowed' 
                      : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'
                  }`}
                >
                  <RefreshCw className={`h-4 w-4 ${statisticsLoading ? 'animate-spin' : ''}`} />
                  <span>{statisticsLoading ? 'Refreshing...' : 'Refresh Data'}</span>
                </button>
              </div>

              {statisticsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center space-x-3">
                    <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                    <span className="text-gray-600">Loading real-time data...</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {statisticsData.dailyData.map((day, dayIndex) => {
                  const maxCount = Math.max(...day.hourlyData.map(h => h.count));
                  const date = new Date(day.date);
                  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
                  const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  const year = date.getFullYear();
                  const isToday = date.toDateString() === new Date().toDateString();
                  
                  console.log(`Rendering chart for: ${day.date}, isToday: ${isToday}, current date: ${new Date().toDateString()}`);
                  
                  return (
                    <div key={day.date} data-day={dayIndex} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <h4 className={`text-lg font-semibold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                            {dayName}, {monthDay}, {year}
                          </h4>
                          {isToday && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                              Today
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-gray-500">
                          Total: {day.hourlyData.reduce((sum, h) => sum + h.count, 0)} messages
                        </span>
                      </div>
                      
                      <div className="relative h-32">
                        {isToday && (
                          <div className="absolute top-2 right-2 z-10">
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                              Current time: {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                          </div>
                        )}
                        <svg className="w-full h-full" viewBox="0 0 800 120">
                          {/* Grid lines */}
                          {Array.from({ length: 25 }, (_, i) => (
                            <line
                              key={i}
                              x1={i * 32}
                              y1="0"
                              x2={i * 32}
                              y2="120"
                              stroke="#f3f4f6"
                              strokeWidth="1"
                            />
                          ))}
                          {Array.from({ length: 6 }, (_, i) => (
                            <line
                              key={i}
                              x1="0"
                              y1={i * 24}
                              x2="800"
                              y2={i * 24}
                              stroke="#f3f4f6"
                              strokeWidth="1"
                            />
                          ))}
                          
                          {/* Line graph */}
                          <polyline
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="3"
                            className="transition-all duration-500 ease-in-out"
                            points={day.hourlyData.map((hour, index) => {
                              const x = index * 32 + 16;
                              const y = 120 - (hour.count / maxCount) * 100;
                              return `${x},${y}`;
                            }).join(' ')}
                          />
                          
                          {/* Current hour indicator for today */}
                          {isToday && (
                            <line
                              x1={(currentTime.getHours()) * 32 + 16}
                              y1="0"
                              x2={(currentTime.getHours()) * 32 + 16}
                              y2="120"
                              stroke="#ef4444"
                              strokeWidth="2"
                              strokeDasharray="4 4"
                              opacity="0.7"
                            />
                          )}
                          
                          {/* Data points with hover functionality */}
                          {day.hourlyData.map((hour, index) => {
                            const x = index * 32 + 16;
                            const y = 120 - (hour.count / maxCount) * 100;
                            const isHovered = hoveredPoint?.dayIndex === dayIndex && hoveredPoint?.hourIndex === index;
                            const isCurrentHour = isToday && index === currentTime.getHours();
                            
                            return (
                              <g key={index}>
                                {/* Invisible larger circle for better hover area */}
                                <circle
                                  cx={x}
                                  cy={y}
                                  r="15"
                                  fill="transparent"
                                  onMouseEnter={(e) => {
                                    e.stopPropagation();
                                    // Clear any existing timeout
                                    if (hoverTimeoutRef.current) {
                                      clearTimeout(hoverTimeoutRef.current);
                                      hoverTimeoutRef.current = null;
                                    }
                                    
                                    const rect = document.querySelector(`[data-day="${dayIndex}"]`)?.getBoundingClientRect();
                                    if (rect) {
                                      setHoveredPoint({
                                        dayIndex,
                                        hourIndex: index,
                                        x: rect.left + (x / 800) * rect.width,
                                        y: rect.top + (y / 120) * rect.height,
                                        count: hour.count
                                      });
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    e.stopPropagation();
                                    // Clear any existing timeout
                                    if (hoverTimeoutRef.current) {
                                      clearTimeout(hoverTimeoutRef.current);
                                    }
                                    // Add a small delay to prevent flickering
                                    hoverTimeoutRef.current = setTimeout(() => {
                                      setHoveredPoint(null);
                                      hoverTimeoutRef.current = null;
                                    }, 100);
                                  }}
                                  className="cursor-pointer"
                                />
                                {/* Visible data point */}
                                <circle
                                  cx={x}
                                  cy={y}
                                  r={isHovered ? "6" : (isCurrentHour ? "5" : "4")}
                                  fill={isHovered ? "#1d4ed8" : (isCurrentHour ? "#ef4444" : "#3b82f6")}
                                  className="transition-all duration-500 ease-in-out"
                                  onMouseEnter={(e) => {
                                    e.stopPropagation();
                                    // Clear any existing timeout
                                    if (hoverTimeoutRef.current) {
                                      clearTimeout(hoverTimeoutRef.current);
                                      hoverTimeoutRef.current = null;
                                    }
                                    
                                    const rect = document.querySelector(`[data-day="${dayIndex}"]`)?.getBoundingClientRect();
                                    if (rect) {
                                      setHoveredPoint({
                                        dayIndex,
                                        hourIndex: index,
                                        x: rect.left + (x / 800) * rect.width,
                                        y: rect.top + (y / 120) * rect.height,
                                        count: hour.count
                                      });
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    e.stopPropagation();
                                    // Clear any existing timeout
                                    if (hoverTimeoutRef.current) {
                                      clearTimeout(hoverTimeoutRef.current);
                                    }
                                    // Add a small delay to prevent flickering
                                    hoverTimeoutRef.current = setTimeout(() => {
                                      setHoveredPoint(null);
                                      hoverTimeoutRef.current = null;
                                    }, 100);
                                  }}
                                />
                              </g>
                            );
                          })}
                        </svg>
                        
                        {/* X-axis labels (hours) */}
                        <div className="flex justify-between mt-2 text-xs text-gray-500">
                          {Array.from({ length: 25 }, (_, i) => (
                            <span key={i} className="w-8 text-center">
                              {i % 4 === 0 ? i : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Hover Tooltip */}
        {hoveredPoint && (
          <div
            className="fixed z-50 bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg text-sm font-medium pointer-events-none transition-opacity duration-200"
            style={{
              left: Math.max(10, Math.min(window.innerWidth - 100, hoveredPoint.x - 30)),
              top: Math.max(10, hoveredPoint.y - 50),
            }}
          >
            <div className="text-center">
              <div className="text-blue-300">
                Hour {hoveredPoint.hourIndex}
                {statisticsData?.dailyData[hoveredPoint.dayIndex] && 
                 new Date(statisticsData.dailyData[hoveredPoint.dayIndex].date).toDateString() === currentTime.toDateString() &&
                 hoveredPoint.hourIndex === currentTime.getHours() && 
                 " (Current)"}
              </div>
              <div className="text-white font-bold">{hoveredPoint.count} messages</div>
            </div>
            {/* Tooltip arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          </div>
        )}

      {/* Create Message Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowCreateModal(false)} />
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <form onSubmit={createForm.handleSubmit(handleSendMessage)}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                        Send Message to Customer
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Message Template
                          </label>
                          <select
                            {...createForm.register('template_id')}
                            onChange={(e) => handleTemplateChange(e.target.value)}
                            className="input mt-1"
                          >
                            <option value="">Select a template</option>
                            {messageTemplates.map((template) => (
                              <option key={template.id} value={template.id}>
                                {template.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Target Customer *
                          </label>
                          <select
                            {...createForm.register('customer_id', { required: 'Customer is required' })}
                            className="input mt-1"
                            disabled={customers.length === 0}
                          >
                            <option value="">
                              {customers.length === 0 ? 'Loading customers...' : 'Select a customer'}
                            </option>
                            {customers.map((customer) => (
                              <option key={customer._id} value={customer._id}>
                                {customer.name} ({customer.email})
                              </option>
                            ))}
                          </select>
                          {customers.length === 0 && (
                            <p className="mt-1 text-sm text-yellow-600">
                              Loading customers... If this persists, check console for errors.
                            </p>
                          )}
                          {createForm.formState.errors.customer_id && (
                            <p className="mt-1 text-sm text-red-600">
                              {createForm.formState.errors.customer_id.message}
                            </p>
                          )}
                          <div className="mt-1 flex justify-between items-center">
                            <div className="text-xs text-gray-500">
                              Available customers: {customers.length}
                            </div>
                            {customers.length === 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  console.log('Manually refreshing customers...');
                                  fetchCustomers();
                                }}
                                className="text-xs bg-blue-100 hover:bg-blue-200 px-2 py-1 rounded"
                              >
                                Refresh Customers
                              </button>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Email Subject *
                          </label>
                          <input
                            {...createForm.register('subject', {
                              required: 'Subject is required',
                              validate: (value: string) => {
                                if (!value || value.trim() === '') {
                                  return 'Subject is required';
                                }
                                return true;
                              }
                            })}
                            type="text"
                            className="input mt-1"
                            placeholder="Enter email subject..."
                          />
                          {createForm.formState.errors.subject && (
                            <p className="mt-1 text-sm text-red-600">
                              {createForm.formState.errors.subject.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Message *
                          </label>
                          <textarea
                            {...createForm.register('message', {
                              required: 'Message is required',
                              validate: (value: string) => {
                                if (!value || value.trim() === '') {
                                  return 'Message is required';
                                }
                                return true;
                              }
                            })}
                            rows={4}
                            className="input mt-1"
                            placeholder="Enter your message..."
                          />
                          <div className="mt-2 flex justify-between items-center">
                            <div className="text-xs text-gray-500">
                              Available placeholders: <code className="bg-gray-100 px-1 rounded">{'{name}'}</code>, <code className="bg-gray-100 px-1 rounded">{'{discount}'}</code>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const formData = createForm.getValues();
                                if (formData.message && formData.discount_percentage && formData.customer_id) {
                                  const selectedCustomer = customers.find(c => c._id === formData.customer_id);
                                  if (selectedCustomer) {
                                    setPreviewCustomer(selectedCustomer);
                                    setShowPreviewModal(true);
                                  } else {
                                    toast.error('Please select a customer to preview');
                                  }
                                } else {
                                  toast.error('Please fill in the message, discount percentage, and select a customer to preview');
                                }
                              }}
                              className="text-xs text-blue-600 hover:text-blue-800 underline"
                            >
                              Preview Message
                            </button>
                          </div>
                          {createForm.formState.errors.message && (
                            <p className="mt-1 text-sm text-red-600">
                              {createForm.formState.errors.message.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Discount Percentage
                          </label>
                          <input
                            {...createForm.register('discount_percentage', { 
                              required: 'Discount is required',
                              valueAsNumber: true,
                              min: 0,
                              max: 100
                            })}
                            type="number"
                            className="input mt-1"
                            placeholder="10"
                          />
                          {createForm.formState.errors.discount_percentage && (
                            <p className="mt-1 text-sm text-red-600">
                              {createForm.formState.errors.discount_percentage.message}
                            </p>
                          )}
                        </div>


                        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                          <div className="flex">
                            <User className="h-5 w-5 text-blue-400" />
                            <div className="ml-3">
                              <h4 className="text-sm font-medium text-blue-800">Individual Customer Messaging</h4>
                              <p className="mt-1 text-sm text-blue-700">
                                This message will be sent to the selected customer. Use placeholders like {'{name}'} and {'{discount}'} to personalize the message.
                              </p>
                              <div className="mt-2 text-xs text-blue-600">
                                💡 <strong>Tip:</strong> The message will be automatically personalized with the customer's name and discount percentage
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={sending}
                    className="btn btn-primary w-full sm:w-auto sm:ml-3"
                  >
                    {sending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Message
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="btn btn-secondary w-full sm:w-auto mt-3 sm:mt-0"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Message Preview Modal */}
      {showPreviewModal && previewCustomer && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowPreviewModal(false)} />
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Message Preview
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Customer</label>
                        <p className="mt-1 text-sm text-gray-900">{previewCustomer.name} ({previewCustomer.email})</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Personalized Message</label>
                        <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-900">
                            {createForm.watch('message')
                              ?.replace(/\{name\}/g, previewCustomer.name)
                              ?.replace(/\{discount\}/g, createForm.watch('discount_percentage')?.toString() || '10')
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="btn btn-secondary w-full sm:w-auto"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Message Details Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setSelectedMessage(null)} />
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Message Details
                    </h3>
                    <div className="space-y-4">
                      {/* Message Content */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">Message Content</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs font-medium text-gray-600">Subject</label>
                            <p className="text-sm text-gray-900 mt-1">{selectedMessage.subject || 'No subject'}</p>
                          </div>
                          {selectedMessage.discount_percentage && (
                            <div>
                              <label className="text-xs font-medium text-gray-600">Discount</label>
                              <p className="text-sm text-gray-900 mt-1">{selectedMessage.discount_percentage}% off</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Message Details */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">Message Details</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <label className="text-xs font-medium text-gray-600">Recipient</label>
                            <p className="text-gray-900 mt-1">
                              {selectedMessage.recipientName || selectedMessage.customer_name || 'Unknown'}
                            </p>
                            <p className="text-gray-600 text-xs">
                              {selectedMessage.recipientEmail || selectedMessage.customer_email || 'No email'}
                            </p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600">Status</label>
                            <div className="mt-1">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedMessage.status)}`}>
                                {getStatusIcon(selectedMessage.status)}
                                <span className="ml-1">{selectedMessage.status || 'UNKNOWN'}</span>
                              </span>
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600">Sent At</label>
                            <p className="text-gray-900 mt-1">
                              {formatDate(selectedMessage.sentAt || selectedMessage.created_at || '')}
                            </p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600">Message ID</label>
                            <p className="text-gray-900 mt-1 font-mono text-xs">
                              {selectedMessage._id || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="btn btn-secondary w-full sm:w-auto"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template Selection Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowTemplateModal(false)} />
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl">
                        <Zap className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">Message Templates</h3>
                        <p className="text-gray-600 mt-1">Choose from our collection of professional email templates</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                      {messageTemplates.map((template) => (
                        <div
                          key={template.id}
                          className="group border border-gray-200 rounded-xl p-4 hover:border-purple-300 hover:shadow-lg transition-all duration-200 cursor-pointer"
                          onClick={() => handleTemplateSelect(template)}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h4 className="text-lg font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                                {template.name}
                              </h4>
                              <p className="text-sm text-gray-500 mt-1">{template.subject}</p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-purple-500 group-hover:translate-x-1 transition-all duration-200" />
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3 mb-3">
                            <p className="text-sm text-gray-700 line-clamp-3">
                              {template.template}
                            </p>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex flex-wrap gap-1">
                              {template.placeholders.map((placeholder) => (
                                <span
                                  key={placeholder}
                                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                                >
                                  {`{${placeholder}}`}
                                </span>
                              ))}
                            </div>
                            <button className="text-purple-600 hover:text-purple-700 text-sm font-medium">
                              Use Template
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="w-full sm:w-auto px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg font-medium transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default Messaging;



