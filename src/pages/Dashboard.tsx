import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, ShoppingCart, Target, Megaphone, DollarSign, Plus, Mail, CheckCircle, XCircle, Clock,
  TrendingUp, TrendingDown, Activity, BarChart3, PieChart, ArrowUpRight, ArrowDownRight,
  Calendar, Star, Zap, Globe, Shield, Award, RefreshCw, Eye, Filter, Sparkles
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from 'recharts';
import { customerApi, orderApi, campaignApi, emailApi, segmentApi, testDatabaseConnection } from '../services/api';
import { Customer, Order, Campaign, Segment } from '../types';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalOrders: 0,
    totalCampaigns: 0,
    totalRevenue: 0,
    conversionRate: 0,
    avgOrderValue: 0,
    activeUsers: 0,
    monthlyGrowth: 0,
  });
  const [recentCustomers, setRecentCustomers] = useState<Customer[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [recentCampaigns, setRecentCampaigns] = useState<Campaign[]>([]);
  const [recentMessages, setRecentMessages] = useState<any[]>([]);
  const [recentSegments, setRecentSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; message: string } | null>(null);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [customerGrowthData, setCustomerGrowthData] = useState<any[]>([]);

  // Generate revenue data for the last 30 days
  const generateRevenueData = (orders: Order[]) => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date;
    });

    return last30Days.map(date => {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const dayOrders = orders.filter(order => {
        const orderDate = new Date(order.date);
        return orderDate >= dayStart && orderDate <= dayEnd;
      });

      const dailyRevenue = dayOrders.reduce((sum, order) => {
        const amount = typeof order.amount === 'number' ? order.amount : parseFloat(order.amount) || 0;
        return sum + amount;
      }, 0);

      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: Math.round(dailyRevenue * 100) / 100,
        orders: dayOrders.length
      };
    });
  };

  // Generate customer growth data for the last 30 days
  const generateCustomerGrowthData = (customers: Customer[]) => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date;
    });

    let cumulativeCustomers = 0;
    return last30Days.map(date => {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const dayCustomers = customers.filter(customer => {
        const customerDate = new Date(customer.created_at);
        return customerDate >= dayStart && customerDate <= dayEnd;
      });

      cumulativeCustomers += dayCustomers.length;

      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        customers: cumulativeCustomers,
        newCustomers: dayCustomers.length
      };
    });
  };

  useEffect(() => {
    // Clear any mock data from localStorage to ensure we only show real data
    const clearMockData = () => {
      const mockDataKeys = ['mockMessages', 'mockSegments', 'mockCampaigns', 'mockCommunicationLogs'];
      mockDataKeys.forEach(key => {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            const parsed = JSON.parse(data);
            console.log(`Clearing mock data from ${key}:`, Array.isArray(parsed) ? parsed.length : 'object');
            localStorage.removeItem(key);
          } catch (e) {
            console.log(`Clearing mock data from ${key}: invalid JSON`);
            localStorage.removeItem(key);
          }
        }
      });
    };
    
    clearMockData();
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Test database connection first
      const dbTest = await testDatabaseConnection();
      setDbStatus(dbTest);
      console.log('Database connection test:', dbTest);
      
      // Fetch all data for accurate calculations
      const [customersRes, ordersRes, campaignsRes, messagesRes, segmentsRes] = await Promise.all([
        customerApi.list({ limit: 1000 }), // Get all customers for accurate stats
        orderApi.list({ limit: 1000 }), // Get all orders for accurate stats
        campaignApi.list({ limit: 1000 }), // Get all campaigns for accurate stats
        emailApi.getSentMessages({ limit: 1000 }).catch(err => {
          console.warn('Failed to fetch messages:', err);
          return { messages: [] };
        }),
        segmentApi.list({ limit: 1000 }).catch(err => {
          console.warn('Failed to fetch segments:', err);
          return { data: [] };
        }),
      ]);

      // Set recent data for display (limit to 6 for UI)
      setRecentCustomers(customersRes.data?.slice(0, 6) || []);
      setRecentOrders(ordersRes.data?.slice(0, 6) || []);
      setRecentCampaigns(campaignsRes.data?.slice(0, 6) || []);
      setRecentSegments(segmentsRes.data?.slice(0, 6) || []);
      
      console.log('Dashboard - Messages response:', messagesRes);
      console.log('Dashboard - Messages count:', messagesRes.messages?.length || 0);
      setRecentMessages(messagesRes.messages?.slice(0, 6) || []);
      
      // Calculate comprehensive stats from all data
      const allCustomers = customersRes.data || [];
      const allOrders = ordersRes.data || [];
      const allCampaigns = campaignsRes.data || [];
      const allMessages = messagesRes.messages || [];
      const allSegments = segmentsRes.data || [];

      // Calculate total revenue from all orders
      const totalRevenue = allOrders.reduce((sum, order) => {
        const amount = typeof order.amount === 'number' ? order.amount : parseFloat(order.amount) || 0;
        return sum + amount;
      }, 0);

      // Calculate average order value
      const avgOrderValue = allOrders.length > 0 ? totalRevenue / allOrders.length : 0;

      // Calculate conversion rate (customers who have made orders)
      const customersWithOrders = new Set(allOrders.map(order => order.customer_id));
      const conversionRate = allCustomers.length > 0 ? 
        (customersWithOrders.size / allCustomers.length) * 100 : 0;

      // Calculate active campaigns (campaigns with recent activity or status)
      const activeCampaigns = allCampaigns.filter(campaign => {
        // Consider a campaign active if it was created in the last 30 days or has a specific status
        const createdDate = new Date(campaign.created_at);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return createdDate >= thirtyDaysAgo || campaign.status === 'ACTIVE';
      }).length;

      // Calculate total customers with valid data
      const validCustomers = allCustomers.filter(customer => 
        customer && customer._id && customer.name
      ).length;

      // Calculate total orders with valid data
      const validOrders = allOrders.filter(order => 
        order && order._id && typeof order.amount === 'number'
      ).length;

      // Calculate active users (customers with recent activity)
      const activeUsers = allCustomers.filter(customer => {
        const lastActivity = customer.last_active || customer.created_at;
        const lastActivityDate = new Date(lastActivity);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return lastActivityDate >= thirtyDaysAgo;
      }).length;

      // Calculate monthly growth (mock calculation for demo)
      const monthlyGrowth = Math.random() * 20 + 5;
      
      console.log('Dashboard Stats Calculation:', {
        totalCustomers: validCustomers,
        totalOrders: validOrders,
        totalCampaigns: allCampaigns.length,
        activeCampaigns,
        totalRevenue,
        avgOrderValue,
        conversionRate,
        activeUsers
      });
      
      setStats({
        totalCustomers: validCustomers,
        totalOrders: validOrders,
        totalCampaigns: activeCampaigns, // Use active campaigns instead of total
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        conversionRate: Math.round(conversionRate * 100) / 100,
        avgOrderValue: Math.round(avgOrderValue * 100) / 100,
        activeUsers,
        monthlyGrowth: Math.round(monthlyGrowth * 100) / 100,
      });

      // Generate chart data
      const revenueChartData = generateRevenueData(allOrders);
      const customerGrowthChartData = generateCustomerGrowthData(allCustomers);
      
      setRevenueData(revenueChartData);
      setCustomerGrowthData(customerGrowthChartData);
      
      console.log('Chart Data Generated:', {
        revenueData: revenueChartData.length,
        customerGrowthData: customerGrowthChartData.length
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Set default values on error
      setStats({
        totalCustomers: 0,
        totalOrders: 0,
        totalCampaigns: 0,
        totalRevenue: 0,
        conversionRate: 0,
        avgOrderValue: 0,
        activeUsers: 0,
        monthlyGrowth: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    if (isNaN(amount) || amount === null || amount === undefined) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Helper function to format percentage
  const formatPercentage = (value: number) => {
    if (isNaN(value) || value === null || value === undefined) return '0%';
    return `${Math.round(value * 100) / 100}%`;
  };

  // Helper function to format number
  const formatNumber = (value: number) => {
    if (isNaN(value) || value === null || value === undefined) return '0';
    return value.toLocaleString();
  };

  const statCards = [
    {
      name: 'Total Customers',
      value: formatNumber(stats.totalCustomers),
      icon: Users,
      gradient: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-gradient-to-br from-blue-50 to-cyan-50',
      iconColor: 'text-blue-600',
      cardGradient: 'from-blue-500 to-cyan-500',
      change: '+12%',
      changeType: 'positive' as const,
      trend: 'up',
    },
    {
      name: 'Total Orders',
      value: formatNumber(stats.totalOrders),
      icon: ShoppingCart,
      gradient: 'from-emerald-500 to-green-500',
      bgColor: 'bg-gradient-to-br from-emerald-50 to-green-50',
      iconColor: 'text-emerald-600',
      cardGradient: 'from-emerald-500 to-green-500',
      change: '+8%',
      changeType: 'positive' as const,
      trend: 'up',
    },
    {
      name: 'Total Revenue',
      value: formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      gradient: 'from-amber-500 to-yellow-500',
      bgColor: 'bg-gradient-to-br from-amber-50 to-yellow-50',
      iconColor: 'text-amber-600',
      cardGradient: 'from-amber-500 to-yellow-500',
      change: '+15%',
      changeType: 'positive' as const,
      trend: 'up',
    },
    {
      name: 'Active Campaigns',
      value: formatNumber(stats.totalCampaigns),
      icon: Megaphone,
      gradient: 'from-purple-500 to-violet-500',
      bgColor: 'bg-gradient-to-br from-purple-50 to-violet-50',
      iconColor: 'text-purple-600',
      cardGradient: 'from-purple-500 to-violet-500',
      change: '+3',
      changeType: 'positive' as const,
      trend: 'up',
    },
    {
      name: 'Conversion Rate',
      value: formatPercentage(stats.conversionRate),
      icon: Target,
      gradient: 'from-indigo-500 to-blue-500',
      bgColor: 'bg-gradient-to-br from-indigo-50 to-blue-50',
      iconColor: 'text-indigo-600',
      cardGradient: 'from-indigo-500 to-blue-500',
      change: '+2.3%',
      changeType: 'positive' as const,
      trend: 'up',
    },
    {
      name: 'Avg Order Value',
      value: formatCurrency(stats.avgOrderValue),
      icon: BarChart3,
      gradient: 'from-rose-500 to-pink-500',
      bgColor: 'bg-gradient-to-br from-rose-50 to-pink-50',
      iconColor: 'text-rose-600',
      cardGradient: 'from-rose-500 to-pink-500',
      change: '+5.2%',
      changeType: 'positive' as const,
      trend: 'up',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-200 border-t-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading dashboard...</p>
        </div>
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
                    <BarChart3 className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-white sm:text-4xl">
                      Dashboard
                    </h2>
                    <div className="flex items-center space-x-2 mt-2">
                      <Sparkles className="h-4 w-4 text-yellow-300" />
                      <p className="text-blue-100 text-lg">
                        Welcome back! Here's what's happening with your CRM.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-6 text-white">
                  <div className="flex items-center space-x-2">
                    <Activity className="h-5 w-5 text-green-300" />
                    <span className="text-sm">Real-time analytics</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Target className="h-5 w-5 text-yellow-300" />
                    <span className="text-sm">Smart insights</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-purple-300" />
                    <span className="text-sm">Performance tracking</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex md:mt-0 md:ml-4 space-x-3">
                <button
                  onClick={fetchDashboardData}
                  className="group relative px-6 py-3 bg-white bg-opacity-20 hover:bg-opacity-30 backdrop-blur-sm text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg"
                  title="Refresh Dashboard"
                >
                  <RefreshCw className="h-5 w-5 mr-2 inline group-hover:rotate-180 transition-transform duration-500" />
                  Refresh
                </button>
                <Link
                  to="/customers"
                  className="group relative px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 hover:shadow-xl"
                >
                  <Plus className="h-5 w-5 mr-2 inline group-hover:rotate-90 transition-transform duration-300" />
                  Add Customer
                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 rounded-xl transition-opacity duration-300"></div>
                </Link>
              </div>
            </div>
          </div>
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-32 translate-x-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full translate-y-24 -translate-x-24"></div>
        </div>

        {/* Database Status */}
        {dbStatus && (
          <div className={`mb-8 rounded-xl p-6 shadow-sm border-l-4 ${
            dbStatus.connected 
              ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-400' 
              : 'bg-gradient-to-r from-red-50 to-red-100 border-red-400'
          }`}>
            <div className="flex items-center">
              <div className={`p-2 rounded-full ${
                dbStatus.connected ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {dbStatus.connected ? (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-600" />
                )}
              </div>
              <div className="ml-4">
                <h3 className={`text-lg font-semibold ${
                  dbStatus.connected ? 'text-green-800' : 'text-red-800'
                }`}>
                  Database Status: {dbStatus.connected ? 'Connected' : 'Disconnected'}
                </h3>
                <p className={`text-sm ${
                  dbStatus.connected ? 'text-green-700' : 'text-red-700'
                }`}>
                  {dbStatus.message}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            const TrendIcon = stat.trend === 'up' ? TrendingUp : TrendingDown;
            return (
              <div 
                key={stat.name} 
                className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 border border-gray-100 hover:border-gray-200 transform hover:-translate-y-2 hover:scale-105 overflow-hidden"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Gradient overlay on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.cardGradient} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300`}></div>
                
                {/* Subtle gradient border */}
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.cardGradient} opacity-0 group-hover:opacity-20 rounded-2xl transition-opacity duration-300`} style={{ padding: '1px' }}>
                  <div className="w-full h-full bg-white rounded-2xl"></div>
                </div>
                
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-4 rounded-xl bg-gradient-to-br ${stat.cardGradient} group-hover:scale-110 transition-transform duration-200 shadow-lg`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div className={`flex items-center text-sm font-medium px-3 py-1 rounded-full ${
                      stat.changeType === 'positive' 
                        ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 group-hover:from-green-200 group-hover:to-emerald-200' 
                        : 'bg-gradient-to-r from-red-100 to-rose-100 text-red-700 group-hover:from-red-200 group-hover:to-rose-200'
                    } transition-colors duration-200 shadow-sm`}>
                      <TrendIcon className="h-4 w-4 mr-1" />
                      {stat.change}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-2 group-hover:text-gray-800 transition-colors duration-200">{stat.name}</p>
                    <p className="text-3xl font-bold text-gray-900 group-hover:text-gray-700 transition-colors duration-200">{stat.value}</p>
                  </div>
                  <div className="mt-4 flex items-center text-xs text-gray-500 group-hover:text-gray-600 transition-colors duration-200">
                    <Activity className="h-3 w-3 mr-1" />
                    <span>Live data</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Charts and Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Revenue Chart */}
          <div className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl border border-gray-100 p-6 transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Revenue Overview</h3>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 px-3 py-1 bg-green-100 rounded-full">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-green-700 font-medium">Last 30 Days</span>
                </div>
                <button
                  onClick={fetchDashboardData}
                  className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-100 rounded-lg transition-all duration-200 group"
                  title="Refresh chart data"
                >
                  <RefreshCw className="h-4 w-4 group-hover:rotate-180 transition-transform duration-500" />
                </button>
              </div>
            </div>
            <div className="h-64">
              {revenueData && revenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#6b7280"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="#6b7280"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                      formatter={(value: any, name: string) => [
                        `$${value}`,
                        name === 'revenue' ? 'Revenue' : 'Orders'
                      ]}
                      labelStyle={{ color: '#374151', fontWeight: '600' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#revenueGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 text-green-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">No revenue data available</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Customer Growth Chart */}
          <div className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl border border-gray-100 p-6 transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                  <PieChart className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Customer Growth</h3>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 px-3 py-1 bg-blue-100 rounded-full">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-blue-700 font-medium">Last 30 Days</span>
                </div>
                <button
                  onClick={fetchDashboardData}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-all duration-200 group"
                  title="Refresh chart data"
                >
                  <RefreshCw className="h-4 w-4 group-hover:rotate-180 transition-transform duration-500" />
                </button>
              </div>
            </div>
            <div className="h-64">
              {customerGrowthData && customerGrowthData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={customerGrowthData}>
                    <defs>
                      <linearGradient id="customerGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#6b7280"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="#6b7280"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => value.toString()}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                      formatter={(value: any, name: string) => [
                        value,
                        name === 'customers' ? 'Total Customers' : 'New Customers'
                      ]}
                      labelStyle={{ color: '#374151', fontWeight: '600' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="customers"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="newCustomers"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 3 }}
                      activeDot={{ r: 5, stroke: '#8b5cf6', strokeWidth: 2 }}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: '20px' }}
                      formatter={(value) => (
                        <span style={{ color: value === 'customers' ? '#3b82f6' : '#8b5cf6', fontSize: '12px' }}>
                          {value === 'customers' ? 'Total Customers' : 'New Customers'}
                        </span>
                      )}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                  <div className="text-center">
                    <PieChart className="h-12 w-12 text-blue-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">No customer data available</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
          {/* Recent Customers */}
          <div className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl border border-gray-100 p-6 transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Recent Customers</h3>
              </div>
              <Link
                to="/customers"
                className="group/link inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors duration-200 px-3 py-1 rounded-lg hover:bg-blue-50"
              >
                View all
                <ArrowUpRight className="h-4 w-4 ml-1 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform duration-200" />
              </Link>
            </div>
            <div className="space-y-4">
              {recentCustomers && recentCustomers.length > 0 ? (
                recentCustomers.slice(0, 5).map((customer, index) => (
                  <div key={customer._id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors duration-200 group">
                    <div className="flex items-center">
                      <div className="relative">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-sm">
                          <span className="text-sm font-semibold text-white">
                            {customer.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-white"></div>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-semibold text-gray-900 group-hover:text-primary-600 transition-colors duration-200">
                          {customer.name}
                        </p>
                        <p className="text-sm text-gray-500">{customer.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(customer.spend || 0)}
                      </p>
                      <p className="text-xs text-gray-500">Total Spend</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No customers yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Orders */}
          <div className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl border border-gray-100 p-6 transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg">
                  <ShoppingCart className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
              </div>
              <Link
                to="/orders"
                className="group/link inline-flex items-center text-sm font-medium text-green-600 hover:text-green-500 transition-colors duration-200 px-3 py-1 rounded-lg hover:bg-green-50"
              >
                View all
                <ArrowUpRight className="h-4 w-4 ml-1 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform duration-200" />
              </Link>
            </div>
            <div className="space-y-4">
              {recentOrders && recentOrders.length > 0 ? (
                recentOrders.slice(0, 5).map((order, index) => (
                  <div key={order._id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors duration-200 group">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-sm">
                        <ShoppingCart className="h-5 w-5 text-white" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-semibold text-gray-900 group-hover:text-primary-600 transition-colors duration-200">
                          Order #{order._id.slice(-6)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(order.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(order.amount || 0)}
                      </p>
                      <div className="flex items-center text-xs text-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Completed
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No orders yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Messages and Segments */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
          {/* Recent Messages */}
          <div className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl border border-gray-100 p-6 transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg">
                  <Mail className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Recent Messages</h3>
              </div>
              <Link
                to="/messaging"
                className="group/link inline-flex items-center text-sm font-medium text-purple-600 hover:text-purple-500 transition-colors duration-200 px-3 py-1 rounded-lg hover:bg-purple-50"
              >
                View all
                <ArrowUpRight className="h-4 w-4 ml-1 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform duration-200" />
              </Link>
            </div>
            <div className="space-y-4">
              {recentMessages && recentMessages.length > 0 ? (
                recentMessages.slice(0, 5).map((message, index) => (
                  <div key={message._id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors duration-200 group">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
                        <Mail className="h-5 w-5 text-white" />
                      </div>
                      <div className="ml-4 flex-1">
                        <p className="text-sm font-semibold text-gray-900 group-hover:text-primary-600 transition-colors duration-200">
                          {message.recipientName || message.customer_name || 'Unknown Customer'}
                        </p>
                        <p className="text-sm text-gray-500 truncate max-w-48">
                          {message.message}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      {message.status === 'SENT' && <CheckCircle className="h-5 w-5 text-green-500" />}
                      {message.status === 'FAILED' && <XCircle className="h-5 w-5 text-red-500" />}
                      {message.status === 'PENDING' && <Clock className="h-5 w-5 text-yellow-500" />}
                      {message.status === 'DELIVERED' && <CheckCircle className="h-5 w-5 text-blue-500" />}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Mail className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No messages yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Segments */}
          <div className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl border border-gray-100 p-6 transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg">
                  <Target className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Recent Segments</h3>
              </div>
              <Link
                to="/segments"
                className="group/link inline-flex items-center text-sm font-medium text-orange-600 hover:text-orange-500 transition-colors duration-200 px-3 py-1 rounded-lg hover:bg-orange-50"
              >
                View all
                <ArrowUpRight className="h-4 w-4 ml-1 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform duration-200" />
              </Link>
            </div>
            <div className="space-y-4">
              {recentSegments && recentSegments.length > 0 ? (
                recentSegments.slice(0, 5).map((segment, index) => (
                  <div key={segment._id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors duration-200 group">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-sm">
                        <Target className="h-5 w-5 text-white" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-semibold text-gray-900 group-hover:text-primary-600 transition-colors duration-200">
                          {segment.name || 'Unnamed Segment'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {segment.customer_count} customers
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        {new Date(segment.created_at).toLocaleDateString()}
                      </p>
                      <div className="flex items-center text-xs text-purple-600">
                        <Activity className="h-3 w-3 mr-1" />
                        Active
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Target className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No segments yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Campaigns */}
        <div className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl border border-gray-100 p-6 mb-8 transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg">
                <Megaphone className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Recent Campaigns</h3>
            </div>
            <Link
              to="/campaigns"
              className="group/link inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors duration-200 px-3 py-1 rounded-lg hover:bg-indigo-50"
            >
              View all
              <ArrowUpRight className="h-4 w-4 ml-1 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform duration-200" />
            </Link>
          </div>
          <div className="space-y-4">
            {recentCampaigns && recentCampaigns.length > 0 ? (
              recentCampaigns.slice(0, 6).map((campaign, index) => (
                <div key={campaign._id} className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 transition-colors duration-200 group border border-gray-100">
                  <div className="flex items-center">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-sm">
                      <Megaphone className="h-6 w-6 text-white" />
                    </div>
                    <div className="ml-4 flex-1">
                      <p className="text-sm font-semibold text-gray-900 group-hover:text-primary-600 transition-colors duration-200">
                        Campaign #{campaign._id.slice(-6)}
                      </p>
                      <p className="text-sm text-gray-500 truncate max-w-md">
                        {campaign.message}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">
                      {new Date(campaign.created_at).toLocaleDateString()}
                    </p>
                    <div className="flex items-center text-xs text-orange-600">
                      <Zap className="h-3 w-3 mr-1" />
                      Active
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Megaphone className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No campaigns yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Quick Actions */}
        <div className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl border border-gray-100 p-6 transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-gradient-to-r from-gray-500 to-gray-600 rounded-lg">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              to="/customers"
              className="group/action flex items-center p-6 border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-blue-50 hover:scale-105"
            >
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg group-hover/action:scale-110 transition-transform duration-200">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <span className="text-sm font-semibold text-gray-900 group-hover/action:text-blue-600 transition-colors duration-200">
                  Manage Customers
                </span>
                <p className="text-xs text-gray-500 group-hover/action:text-gray-600 transition-colors duration-200">Add, edit, view customers</p>
              </div>
            </Link>
            
            <Link
              to="/orders"
              className="group/action flex items-center p-6 border border-gray-200 rounded-xl hover:border-green-300 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-green-50 hover:scale-105"
            >
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg group-hover/action:scale-110 transition-transform duration-200">
                <ShoppingCart className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <span className="text-sm font-semibold text-gray-900 group-hover/action:text-green-600 transition-colors duration-200">
                  View Orders
                </span>
                <p className="text-xs text-gray-500 group-hover/action:text-gray-600 transition-colors duration-200">Track order history</p>
              </div>
            </Link>
            
            <Link
              to="/segments"
              className="group/action flex items-center p-6 border border-gray-200 rounded-xl hover:border-purple-300 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-purple-50 hover:scale-105"
            >
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg group-hover/action:scale-110 transition-transform duration-200">
                <Target className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <span className="text-sm font-semibold text-gray-900 group-hover/action:text-purple-600 transition-colors duration-200">
                  Create Segment
                </span>
                <p className="text-xs text-gray-500 group-hover/action:text-gray-600 transition-colors duration-200">Target customer groups</p>
              </div>
            </Link>
            
            <Link
              to="/campaigns"
              className="group/action flex items-center p-6 border border-gray-200 rounded-xl hover:border-orange-300 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-orange-50 hover:scale-105"
            >
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg group-hover/action:scale-110 transition-transform duration-200">
                <Megaphone className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <span className="text-sm font-semibold text-gray-900 group-hover/action:text-orange-600 transition-colors duration-200">
                  Launch Campaign
                </span>
                <p className="text-xs text-gray-500 group-hover/action:text-gray-600 transition-colors duration-200">Start marketing campaigns</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

