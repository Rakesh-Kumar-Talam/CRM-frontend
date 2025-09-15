import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Plus, Search, Eye, ShoppingCart, Calendar, DollarSign, Package, Edit, Trash2,
  TrendingUp, TrendingDown, Activity, BarChart3, PieChart, ArrowUpRight, ArrowDownRight,
  RefreshCw, Filter, SortAsc, SortDesc, MoreVertical, CheckCircle, XCircle, Clock,
  Users, Target, Megaphone, Star, Zap, Globe, Shield, Award, FilterX, 
  ChevronDown, ChevronRight, User
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { orderApi, customerApi, authApi } from '../services/api';
import { Order, CreateOrderRequest, OrderItem, Customer, ApiResponse } from '../types';
import toast from 'react-hot-toast';

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]); // Store all orders for client-side filtering
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'customer'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    pages: 0,
  });

  const createForm = useForm<CreateOrderRequest>({
    defaultValues: {
      customer_id: '',
      amount: 0,
      items: [{ sku: '', name: '', qty: 1, price: 0 }],
      date: '', // Initially empty/null
    },
  });

  const editForm = useForm<CreateOrderRequest>({
    defaultValues: {
      customer_id: '',
      amount: 0,
      items: [{ sku: '', name: '', qty: 1, price: 0 }],
      date: '', // Initially empty/null
    },
  });

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
      };

      // Add search parameter if search term exists
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      const response: ApiResponse<Order[]> = await orderApi.list(params);
      console.log('Orders response:', response);
      console.log('Orders data:', response.data);
      console.log('Orders count:', response.data ? response.data.length : 0);
      
      // Ensure we have valid data
      const ordersData = response.data || [];
      
      // Store all orders for client-side filtering
      setAllOrders(ordersData);
      setOrders(ordersData);
      
      if (response.pagination) {
        setPagination(prev => ({
          ...prev,
          ...response.pagination!,
        }));
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      console.error('Error details:', error);
      
      // Set empty arrays on error to prevent undefined errors
      setAllOrders([]);
      setOrders([]);
      
      // Only show error toast if it's not a 404 (backend not available)
      if ((error as any).response?.status !== 404) {
        toast.error('Failed to fetch orders');
      }
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, searchTerm]);

  const fetchCustomers = useCallback(async () => {
    try {
      const response: ApiResponse<Customer[]> = await customerApi.list({ limit: 1000 });
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  }, []);

  // Initial data fetch - load all orders for client-side filtering
  useEffect(() => {
    const fetchAllOrders = async () => {
      try {
        setLoading(true);
        const response: ApiResponse<Order[]> = await orderApi.list({ limit: 1000 }); // Get all orders
        console.log('All orders loaded:', response.data);
        
        // Ensure we have valid data
        const ordersData = response.data || [];
        console.log('Orders data length:', ordersData.length);
        
        setAllOrders(ordersData);
        setOrders(ordersData);
        setPagination(prev => ({
          ...prev,
          total: ordersData.length,
          pages: Math.ceil(ordersData.length / prev.limit)
        }));
      } catch (error) {
        console.error('Error fetching all orders:', error);
        console.error('Error details:', error);
        
        // Set empty arrays on error to prevent undefined errors
        setAllOrders([]);
        setOrders([]);
        setPagination(prev => ({
          ...prev,
          total: 0,
          pages: 0
        }));
        
        // Only show error toast if it's not a 404 (backend not available)
        if ((error as any).response?.status !== 404) {
          toast.error('Failed to fetch orders');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAllOrders();
    fetchCustomers();
  }, [fetchCustomers]);


  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Reset to first page when searching
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchOrders();
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    // Reset to first page when search term changes
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Client-side filtering function
  const filterOrders = useCallback((orders: Order[], searchTerm: string) => {
    if (!searchTerm.trim()) return orders;
    
    const term = searchTerm.toLowerCase();
    return orders.filter(order => {
      // Search by order ID
      if (order._id && order._id.toLowerCase().includes(term)) return true;
      
      // Search by customer name
      const customerName = getCustomerName(order.customer_id).toLowerCase();
      if (customerName.includes(term)) return true;
      
      // Search by customer ID
      if (order.customer_id && order.customer_id.toLowerCase().includes(term)) return true;
      
      // Search by amount
      if (order.amount && order.amount.toString().includes(term)) return true;
      
      // Search by items
      if (order.items && Array.isArray(order.items) && order.items.some(item => 
        (item.name && item.name.toLowerCase().includes(term)) || 
        (item.sku && item.sku.toLowerCase().includes(term))
      )) return true;
      
      // Search by date
      if (formatDate(order.date).toLowerCase().includes(term)) return true;
      
      return false;
    });
  }, []);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim()) {
        // Use client-side filtering for immediate results
        const filtered = filterOrders(allOrders, searchTerm);
        const startIndex = (pagination.page - 1) * pagination.limit;
        const endIndex = startIndex + pagination.limit;
        const paginatedResults = filtered.slice(startIndex, endIndex);
        
        setOrders(paginatedResults);
        setPagination(prev => ({ 
          ...prev, 
          total: filtered.length,
          pages: Math.ceil(filtered.length / prev.limit)
        }));
      } else {
        // If no search term, show all orders with pagination
        const startIndex = (pagination.page - 1) * pagination.limit;
        const endIndex = startIndex + pagination.limit;
        const paginatedResults = allOrders.slice(startIndex, endIndex);
        
        setOrders(paginatedResults);
        setPagination(prev => ({ 
          ...prev, 
          total: allOrders.length,
          pages: Math.ceil(allOrders.length / prev.limit)
        }));
      }
    }, 300); // 300ms delay for better responsiveness

    return () => clearTimeout(timeoutId);
  }, [searchTerm, allOrders, filterOrders, pagination.page, pagination.limit]);

  const handleClearSearch = () => {
    setSearchTerm('');
    setPagination(prev => ({ ...prev, page: 1 }));
    // Clear search will be handled by the useEffect
  };

  const handleOpenCreateModal = () => {
    // Reset form with empty date initially
    createForm.reset({
      customer_id: '',
      amount: 0,
      items: [{ sku: '', name: '', qty: 1, price: 0 }],
      date: '', // Initially empty/null
    });
    setShowCreateModal(true);
  };

  const handleCreateOrder = async (data: CreateOrderRequest) => {
    try {
      // Validate order items
      if (!data.items || data.items.length === 0) {
        toast.error('Please add at least one order item');
        return;
      }

      // Validate each item
      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        
        if (!item.name || item.name.trim() === '') {
          toast.error(`Item ${i + 1}: Product name is required`);
          return;
        }
        if (!item.sku || item.sku.trim() === '') {
          toast.error(`Item ${i + 1}: SKU is required`);
          return;
        }
        if (item.qty <= 0) {
          toast.error(`Item ${i + 1}: Quantity must be greater than 0`);
          return;
        }
        if (item.price < 0) {
          toast.error(`Item ${i + 1}: Price cannot be negative`);
          return;
        }
      }

      console.log('Creating order with data:', data);
      
      // Ensure date is in proper format
      const orderData = {
        ...data,
        date: new Date(data.date).toISOString(),
        amount: Number(data.amount) || 0
      };
      
      const response = await orderApi.create(orderData);
      console.log('Order created successfully:', response);
      
      // Create a complete order object with all necessary data
      const completeOrder: Order = {
        _id: response._id || `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        customer_id: response.customer_id || data.customer_id,
        amount: response.amount || data.amount || 0,
        items: response.items || data.items || [],
        date: response.date || data.date || new Date().toISOString(),
        created_at: response.created_at || new Date().toISOString()
      };
      
      console.log('Complete order data:', completeOrder);
      
      toast.success('Order created successfully!');
      setShowCreateModal(false);
      createForm.reset();
      
      // Add new order to allOrders and refresh display (same as segments)
      setAllOrders(prev => [completeOrder, ...prev]);
      setOrders(prev => [completeOrder, ...prev]);
      setPagination(prev => ({ 
        ...prev, 
        total: prev.total + 1,
        pages: Math.ceil((prev.total + 1) / prev.limit)
      }));
      
    } catch (error: any) {
      console.error('Error creating order:', error);
      console.error('Error response:', error.response);
      toast.error(error.response?.data?.error || 'Failed to create order');
    }
  };

  const addOrderItem = () => {
    const currentItems = createForm.getValues('items');
    createForm.setValue('items', [...currentItems, { sku: '', name: '', qty: 1, price: 0 }]);
  };

  const removeOrderItem = (index: number) => {
    const currentItems = createForm.getValues('items');
    if (currentItems.length > 1) {
      createForm.setValue('items', currentItems.filter((_: any, i: number) => i !== index));
    }
  };

  const updateOrderItem = (index: number, field: keyof OrderItem, value: string | number) => {
    const currentItems = createForm.getValues('items');
    const updatedItems = [...currentItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    createForm.setValue('items', updatedItems);

    // Recalculate total amount
    const total = updatedItems.reduce((sum, item) => sum + (item.qty * item.price), 0);
    createForm.setValue('amount', total);
  };

  const formatCurrency = (amount: number) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '$0.00';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) {
      return 'Just now';
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Just now';
    }
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCustomerName = (customerId: string) => {
    if (!customerId) return 'Unknown Customer';
    const customer = customers.find(c => c._id === customerId);
    return customer ? customer.name : `Customer ${customerId.slice(-6)}`;
  };

  // Action handlers
  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowViewModal(true);
  };

  const handleEditOrder = (order: Order) => {
    setSelectedOrder(order);
    editForm.reset({
      customer_id: order.customer_id,
      amount: order.amount,
      items: order.items,
      date: new Date(order.date).toISOString().slice(0, 16),
    });
    setShowEditModal(true);
  };

  const handleDeleteOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowDeleteModal(true);
  };

  const handleUpdateOrder = async (data: CreateOrderRequest) => {
    if (!selectedOrder) return;
    
    try {
      // Validate order items
      if (!data.items || data.items.length === 0) {
        toast.error('Please add at least one order item');
        return;
      }

      // Validate each item
      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        if (!item.name || item.name.trim() === '') {
          toast.error(`Item ${i + 1}: Product name is required`);
          return;
        }
        if (!item.sku || item.sku.trim() === '') {
          toast.error(`Item ${i + 1}: SKU is required`);
          return;
        }
        if (item.qty <= 0) {
          toast.error(`Item ${i + 1}: Quantity must be greater than 0`);
          return;
        }
        if (item.price < 0) {
          toast.error(`Item ${i + 1}: Price cannot be negative`);
          return;
        }
      }

      console.log('Updating order with data:', data);
      const updatedOrder = await orderApi.update(selectedOrder._id, data);
      toast.success('Order updated successfully!');
      setShowEditModal(false);
      editForm.reset();
      
      // Update order in allOrders and refresh display
      setAllOrders(prev => prev.map(order => 
        order._id === selectedOrder._id ? updatedOrder : order
      ));
      setOrders(prev => prev.map(order => 
        order._id === selectedOrder._id ? updatedOrder : order
      ));
    } catch (error: any) {
      console.error('Error updating order:', error);
      toast.error('Failed to update order: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedOrder) return;
    
    try {
      console.log('Deleting order:', selectedOrder._id);
      await orderApi.delete(selectedOrder._id);
      toast.success('Order deleted successfully!');
      setShowDeleteModal(false);
      setSelectedOrder(null);
      
      // Remove order from allOrders and refresh display
      setAllOrders(prev => prev.filter(order => order._id !== selectedOrder._id));
      setOrders(prev => prev.filter(order => order._id !== selectedOrder._id));
      setPagination(prev => ({ 
        ...prev, 
        total: prev.total - 1,
        pages: Math.ceil((prev.total - 1) / prev.limit)
      }));
    } catch (error: any) {
      console.error('Error deleting order:', error);
      toast.error('Failed to delete order: ' + (error.response?.data?.error || error.message));
    }
  };

  const updateEditOrderItem = (index: number, field: keyof OrderItem, value: any) => {
    const currentItems = editForm.getValues('items');
    const updatedItems = [...currentItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    editForm.setValue('items', updatedItems);

    // Recalculate total amount
    const total = updatedItems.reduce((sum, item) => sum + (item.qty * item.price), 0);
    editForm.setValue('amount', total);
  };

  const addEditOrderItem = () => {
    const currentItems = editForm.getValues('items');
    editForm.setValue('items', [...currentItems, { sku: '', name: '', qty: 1, price: 0 }]);
  };

  // Sorting function
  const sortOrders = useCallback((orders: Order[], sortBy: string, sortOrder: string) => {
    return [...orders].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'date':
          // Ensure we have valid dates, fallback to creation time if needed
          const aDate = a.date ? new Date(a.date) : new Date(a.created_at || 0);
          const bDate = b.date ? new Date(b.date) : new Date(b.created_at || 0);
          aValue = aDate.getTime();
          bValue = bDate.getTime();
          break;
        case 'amount':
          aValue = typeof a.amount === 'number' ? a.amount : parseFloat(a.amount) || 0;
          bValue = typeof b.amount === 'number' ? b.amount : parseFloat(b.amount) || 0;
          break;
        case 'customer':
          aValue = getCustomerName(a.customer_id).toLowerCase();
          bValue = getCustomerName(b.customer_id).toLowerCase();
          break;
        default:
          return 0;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, []);

  // Apply sorting to orders
  const sortedOrders = useMemo(() => {
    return sortOrders(orders, sortBy, sortOrder);
  }, [orders, sortBy, sortOrder, sortOrders]);

  if (loading && (!orders || orders.length === 0)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-200 border-t-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="space-y-8 p-6">
        {/* Enhanced Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-green-600 via-emerald-600 to-teal-700 rounded-2xl shadow-2xl">
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="relative px-8 py-12">
            <div className="md:flex md:items-center md:justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="p-3 bg-white bg-opacity-20 rounded-xl backdrop-blur-sm">
                    <ShoppingCart className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-white sm:text-4xl">
                      Orders Management
                    </h2>
                    <div className="flex items-center space-x-2 mt-2">
                      <Package className="h-4 w-4 text-yellow-300" />
                      <p className="text-green-100 text-lg">
                        Track and manage customer orders with real-time insights
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
                    <span className="text-sm">Smart analytics</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5 text-teal-300" />
                    <span className="text-sm">Order insights</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex md:mt-0 md:ml-4 space-x-3">
                <button
                  onClick={fetchOrders}
                  className="group relative px-6 py-3 bg-white bg-opacity-20 hover:bg-opacity-30 backdrop-blur-sm text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg"
                  title="Refresh Orders"
                >
                  <RefreshCw className="h-5 w-5 mr-2 inline group-hover:rotate-180 transition-transform duration-500" />
                  Refresh
                </button>
                <button
                  onClick={handleOpenCreateModal}
                  className="group relative px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 hover:shadow-xl"
                >
                  <Plus className="h-5 w-5 mr-2 inline group-hover:rotate-90 transition-transform duration-300" />
                  Create Order
                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 rounded-xl transition-opacity duration-300"></div>
                </button>
              </div>
            </div>
          </div>
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-32 translate-x-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full translate-y-24 -translate-x-24"></div>
        </div>

        {/* Orders Statistics Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Orders Overview</h3>
              <p className="text-gray-600 text-sm">Key metrics and statistics</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Orders Count */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 mb-1">Total Orders</p>
                  <p className="text-3xl font-bold text-blue-900">{allOrders.length}</p>
                </div>
                <div className="p-3 bg-blue-200 rounded-lg">
                  <ShoppingCart className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Orders in Last 7 Days */}
            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 mb-1">Last 7 Days</p>
                  <p className="text-3xl font-bold text-green-900">
                    {allOrders.filter(order => {
                      const orderDate = new Date(order.date);
                      const sevenDaysAgo = new Date();
                      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                      return orderDate >= sevenDaysAgo;
                    }).length}
                  </p>
                </div>
                <div className="p-3 bg-green-200 rounded-lg">
                  <Calendar className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </div>

            {/* Total Value of Orders */}
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600 mb-1">Total Value</p>
                  <p className="text-3xl font-bold text-purple-900">
                    {formatCurrency(allOrders.reduce((total, order) => total + (order.amount || 0), 0))}
                  </p>
                </div>
                <div className="p-3 bg-purple-200 rounded-lg">
                  <DollarSign className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Search and Filters */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-green-100 rounded-lg">
              <Filter className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Filters & Search</h3>
          </div>
          
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400 group-focus-within:text-green-500 transition-colors duration-200" />
                </div>
                <input
                  type="text"
                  placeholder="Search orders by ID, customer, items, or amount..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-full pl-12 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-200"
                    title="Clear search"
                  >
                    <FilterX className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'amount' | 'customer')}
                  className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-3 pr-8 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 min-w-[120px]"
                >
                  <option value="date">📅 Sort by Date (Recent First)</option>
                  <option value="amount">💰 Sort by Amount</option>
                  <option value="customer">👤 Sort by Customer</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </div>
              </div>
              
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200 hover:scale-105 flex items-center space-x-2"
                title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
              >
                {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                <span className="text-sm font-medium text-gray-700">
                  {sortOrder === 'asc' ? 'Asc' : 'Desc'}
                </span>
              </button>
              
              <div className="flex border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-4 py-3 text-sm font-medium transition-all duration-200 hover:scale-105 ${
                    viewMode === 'cards' 
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg' 
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Package className="h-4 w-4 mr-2 inline" />
                  Cards
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-4 py-3 text-sm font-medium transition-all duration-200 hover:scale-105 ${
                    viewMode === 'table' 
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg' 
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <BarChart3 className="h-4 w-4 mr-2 inline" />
                  Table
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Search Results Info */}
        {searchTerm && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center flex-wrap gap-3">
                <div className="flex items-center space-x-2">
                  <div className="p-1 bg-green-100 rounded-lg">
                    <Search className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="text-sm font-medium text-green-800">
                    {sortedOrders && Array.isArray(sortedOrders) && sortedOrders.length > 0 ? (
                      <>Found {sortedOrders.length} order{sortedOrders.length !== 1 ? 's' : ''} matching "{searchTerm}"</>
                    ) : (
                      <>No orders found matching "{searchTerm}"</>
                    )}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                    <Search className="h-3 w-3 mr-1" />
                    "{searchTerm}"
                  </span>
                </div>
              </div>
              <button
                onClick={handleClearSearch}
                className="flex items-center space-x-1 px-3 py-1 text-green-600 hover:text-green-800 text-sm font-medium hover:bg-green-100 rounded-lg transition-all duration-200"
              >
                <FilterX className="h-4 w-4" />
                <span>Clear search</span>
              </button>
            </div>
          </div>
        )}

        {/* Recent Orders Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Recent Orders</h2>
                <p className="text-sm text-gray-600">Latest orders sorted by date (newest first)</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Activity className="h-4 w-4" />
              <span>Auto-sorted by date</span>
            </div>
          </div>
        </div>

        {/* Enhanced Orders Display */}
        {viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedOrders && Array.isArray(sortedOrders) && sortedOrders.length > 0 ? (
              sortedOrders.map((order, index) => (
                <div 
                  key={order._id || Math.random()} 
                  className="group relative bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-2xl transition-all duration-300 p-6 hover:-translate-y-2 hover:scale-105"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300"></div>
                  <div className="relative">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center">
                        <div className="relative">
                          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                            <ShoppingCart className="h-7 w-7 text-white" />
                          </div>
                          <div className="absolute -top-1 -right-1 h-5 w-5 bg-yellow-400 rounded-full border-2 border-white flex items-center justify-center">
                            <Star className="h-3 w-3 text-white" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="flex items-center space-x-2">
                            <h3 className="text-xl font-bold text-gray-900 group-hover:text-green-600 transition-colors duration-200">
                              Order #{order._id ? order._id.slice(-6) : 'New'}
                            </h3>
                            {(() => {
                              const orderDate = order.date ? new Date(order.date) : new Date(order.created_at || 0);
                              const now = new Date();
                              const hoursDiff = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60);
                              return hoursDiff < 24 ? (
                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                                  NEW
                                </span>
                              ) : hoursDiff < 168 ? (
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                                  RECENT
                                </span>
                              ) : null;
                            })()}
                          </div>
                          <p className="text-sm text-gray-500 flex items-center">
                            <Package className="h-4 w-4 mr-1" />
                            {order.items && Array.isArray(order.items) ? order.items.length : 0} item{(order.items && Array.isArray(order.items) ? order.items.length : 0) !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button 
                          onClick={() => handleViewOrder(order)}
                          className="p-2 text-gray-400 hover:text-blue-600 rounded-xl hover:bg-blue-50 transition-all duration-200 group/btn"
                          title="View Order"
                        >
                          <Eye className="h-4 w-4 group-hover/btn:scale-110 transition-transform duration-200" />
                        </button>
                        <button 
                          onClick={() => handleEditOrder(order)}
                          className="p-2 text-gray-400 hover:text-yellow-600 rounded-xl hover:bg-yellow-50 transition-all duration-200 group/btn"
                          title="Edit Order"
                        >
                          <Edit className="h-4 w-4 group-hover/btn:scale-110 transition-transform duration-200" />
                        </button>
                        <button 
                          onClick={() => handleDeleteOrder(order)}
                          className="p-2 text-gray-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition-all duration-200 group/btn"
                          title="Delete Order"
                        >
                          <Trash2 className="h-4 w-4 group-hover/btn:scale-110 transition-transform duration-200" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl group-hover:bg-white transition-colors duration-200">
                        <span className="text-sm font-medium text-gray-600 flex items-center">
                          <User className="h-4 w-4 mr-2" />
                          Customer
                        </span>
                        <span className="text-sm font-semibold text-gray-900">{getCustomerName(order.customer_id)}</span>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl group-hover:from-green-100 group-hover:to-emerald-100 transition-all duration-200">
                        <span className="text-sm font-medium text-gray-600 flex items-center">
                          <DollarSign className="h-4 w-4 mr-2" />
                          Amount
                        </span>
                        <div className="flex items-center text-lg font-bold text-green-600">
                          {formatCurrency(order.amount)}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl group-hover:bg-white transition-colors duration-200">
                        <span className="text-sm font-medium text-gray-600 flex items-center">
                          <Calendar className="h-4 w-4 mr-2" />
                          Date
                        </span>
                        <span className="text-sm text-gray-900">{formatDate(order.date)}</span>
                      </div>
                      
                      {order.items && Array.isArray(order.items) && order.items.length > 0 && (
                        <div className="pt-4 border-t border-gray-200">
                          <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                            <Package className="h-4 w-4 mr-2" />
                            Order Items
                          </p>
                          <div className="space-y-2">
                            {order.items.slice(0, 2).map((item, itemIndex) => (
                              <div key={itemIndex} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg group-hover:bg-white transition-colors duration-200">
                                <span className="text-sm text-gray-700 font-medium">{item.qty}x {item.name}</span>
                                <span className="text-sm font-semibold text-gray-900">{formatCurrency(item.price)}</span>
                              </div>
                            ))}
                            {order.items.length > 2 && (
                              <div className="text-center">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  +{order.items.length - 2} more items
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full">
                <div className="text-center py-16">
                  <div className="relative inline-block mb-6">
                    <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full blur-lg opacity-20"></div>
                    <div className="relative bg-gradient-to-r from-green-500 to-emerald-600 rounded-full p-6">
                      <ShoppingCart className="h-16 w-16 text-white" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    {searchTerm ? 'No orders found' : 'No orders yet'}
                  </h3>
                  <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
                    {searchTerm 
                      ? `No orders match your search for "${searchTerm}"`
                      : 'Get started by creating your first order and track your sales'
                    }
                  </p>
                  {!searchTerm && (
                    <button
                      onClick={handleOpenCreateModal}
                      className="group relative inline-flex items-center px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl font-semibold text-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
                    >
                      <Plus className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                      Create Order
                      <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 rounded-xl transition-opacity duration-300"></div>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Enhanced Table View */
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-green-50 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Orders Table</h3>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Activity className="h-4 w-4" />
                  <span>Real-time updates</span>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-green-50 to-emerald-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Order</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Items</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedOrders && Array.isArray(sortedOrders) && sortedOrders.length > 0 ? sortedOrders.map((order, index) => (
                    <tr key={order._id || Math.random()} className="group hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-200" style={{ animationDelay: `${index * 50}ms` }}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="relative">
                            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                              <ShoppingCart className="h-6 w-6 text-white" />
                            </div>
                            <div className="absolute -top-1 -right-1 h-4 w-4 bg-yellow-400 rounded-full border-2 border-white flex items-center justify-center">
                              <Star className="h-2 w-2 text-white" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-bold text-gray-900 group-hover:text-green-600 transition-colors duration-200">
                              Order #{order._id ? order._id.slice(-6) : 'New'}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center">
                              <Package className="h-3 w-3 mr-1" />
                              {order.items && Array.isArray(order.items) ? order.items.length : 0} item{(order.items && Array.isArray(order.items) ? order.items.length : 0) !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center shadow-sm mr-3">
                            <User className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{getCustomerName(order.customer_id)}</div>
                            <div className="text-sm text-gray-500 font-mono">ID: {order.customer_id ? order.customer_id.slice(-6) : 'New'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          {order.items && Array.isArray(order.items) && order.items.slice(0, 2).map((item, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg group-hover:bg-white transition-colors duration-200">
                              <span className="text-sm text-gray-900 font-medium">{item.qty}x {item.name}</span>
                              <span className="text-xs text-gray-500">{formatCurrency(item.price)}</span>
                            </div>
                          ))}
                          {order.items && Array.isArray(order.items) && order.items.length > 2 && (
                            <div className="text-center">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                +{order.items.length - 2} more
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-lg font-bold text-green-600">
                          <DollarSign className="h-5 w-5 mr-1" />
                          {formatCurrency(order.amount)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                          {formatDate(order.date)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => handleViewOrder(order)}
                            className="p-2 text-gray-400 hover:text-blue-600 rounded-xl hover:bg-blue-50 transition-all duration-200 group/btn"
                            title="View Order"
                          >
                            <Eye className="h-4 w-4 group-hover/btn:scale-110 transition-transform duration-200" />
                          </button>
                          <button 
                            onClick={() => handleEditOrder(order)}
                            className="p-2 text-gray-400 hover:text-yellow-600 rounded-xl hover:bg-yellow-50 transition-all duration-200 group/btn"
                            title="Edit Order"
                          >
                            <Edit className="h-4 w-4 group-hover/btn:scale-110 transition-transform duration-200" />
                          </button>
                          <button 
                            onClick={() => handleDeleteOrder(order)}
                            className="p-2 text-gray-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition-all duration-200 group/btn"
                            title="Delete Order"
                          >
                            <Trash2 className="h-4 w-4 group-hover/btn:scale-110 transition-transform duration-200" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center">
                          <div className="relative mb-6">
                            <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full blur-lg opacity-20"></div>
                            <div className="relative bg-gradient-to-r from-green-500 to-emerald-600 rounded-full p-4">
                              <ShoppingCart className="h-12 w-12 text-white" />
                            </div>
                          </div>
                          <h3 className="text-xl font-semibold text-gray-900 mb-3">
                            {searchTerm ? 'No orders found' : 'No orders yet'}
                          </h3>
                          <p className="text-gray-500 mb-6 max-w-sm">
                            {searchTerm 
                              ? `No orders match your search for "${searchTerm}"`
                              : 'Get started by creating your first order'
                            }
                          </p>
                          {!searchTerm && (
                            <button
                              onClick={handleOpenCreateModal}
                              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl font-medium transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Create Order
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

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
                  <span className="font-semibold text-gray-900">{pagination.total}</span>{' '}
                  results
                </div>
                <div className="h-4 w-px bg-gray-300"></div>
                <div className="text-sm text-gray-500">
                  Page {pagination.page} of {pagination.pages}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
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
                        onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                        className={`w-10 h-10 text-sm font-medium rounded-xl transition-all duration-200 hover:scale-105 ${
                          isActive
                            ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg'
                            : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
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

      {/* Enhanced Create Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" onClick={() => setShowCreateModal(false)} />
            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <form onSubmit={createForm.handleSubmit(handleCreateOrder)}>
                <div className="bg-gradient-to-r from-green-50 to-emerald-100 px-8 py-6 border-b border-green-200">
                  <div className="flex items-center">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                      <Plus className="h-6 w-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-2xl font-bold text-gray-900">
                        Create New Order
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">Add a new order to the system with detailed tracking</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white px-8 py-8">
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                          <User className="h-4 w-4 mr-2 text-green-600" />
                          Customer
                        </label>
                        <select
                          {...createForm.register('customer_id', { required: 'Customer is required' })}
                          className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                        >
                          <option value="">Select a customer</option>
                          {customers && customers.map((customer) => (
                            <option key={customer._id} value={customer._id}>
                              {customer.name} ({customer.email})
                            </option>
                          ))}
                        </select>
                        {createForm.formState.errors.customer_id && (
                          <p className="mt-2 text-sm text-red-600 flex items-center">
                            <XCircle className="h-4 w-4 mr-1" />
                            {createForm.formState.errors.customer_id.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-green-600" />
                          Order Date
                        </label>
                        <input
                          {...createForm.register('date', { required: 'Date is required' })}
                          type="datetime-local"
                          className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                        />
                        {createForm.formState.errors.date && (
                          <p className="mt-2 text-sm text-red-600 flex items-center">
                            <XCircle className="h-4 w-4 mr-1" />
                            {createForm.formState.errors.date.message}
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <label className="block text-xl font-bold text-gray-700 flex items-center">
                          <Package className="h-5 w-5 mr-2 text-green-600" />
                          Order Items
                        </label>
                        <button
                          type="button"
                          onClick={addOrderItem}
                          className="inline-flex items-center px-6 py-3 border border-green-300 rounded-xl text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Item
                        </button>
                      </div>
                      <div className="space-y-4">
                        {createForm.watch('items') && createForm.watch('items').map((item: any, index: number) => (
                          <div key={index} className="grid grid-cols-12 gap-3 items-end p-4 bg-gray-50 rounded-xl border border-gray-200">
                            <div className="col-span-3">
                              <label className="block text-xs font-medium text-gray-600 mb-1">SKU</label>
                              <input
                                type="text"
                                placeholder="e.g., PROD-001"
                                value={item.sku}
                                onChange={(e) => updateOrderItem(index, 'sku', e.target.value)}
                                className="w-full px-3 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm bg-white"
                                title="Stock Keeping Unit - unique product identifier"
                              />
                            </div>
                            <div className="col-span-4">
                              <label className="block text-xs font-medium text-gray-600 mb-1">Product Name</label>
                              <input
                                type="text"
                                placeholder="e.g., Premium Widget"
                                value={item.name}
                                onChange={(e) => updateOrderItem(index, 'name', e.target.value)}
                                className="w-full px-3 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm bg-white"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-xs font-medium text-gray-600 mb-1">Qty</label>
                              <input
                                type="number"
                                placeholder="1"
                                value={item.qty}
                                onChange={(e) => updateOrderItem(index, 'qty', parseInt(e.target.value) || 0)}
                                className="w-full px-3 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm bg-white"
                                min="1"
                                title="Number of units"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-xs font-medium text-gray-600 mb-1">Price</label>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={item.price}
                                onChange={(e) => updateOrderItem(index, 'price', parseFloat(e.target.value) || 0)}
                                className="w-full px-3 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm bg-white"
                                min="0"
                                title="Price per unit in USD"
                              />
                            </div>
                            <div className="col-span-1 flex items-end">
                              {createForm.watch('items') && createForm.watch('items').length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeOrderItem(index)}
                                  className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-all duration-200"
                                  title="Remove item"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-lg font-semibold text-gray-700 mb-3 flex items-center">
                        <DollarSign className="h-5 w-5 mr-2 text-green-600" />
                        Total Amount
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <DollarSign className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          {...createForm.register('amount', { 
                            required: 'Amount is required',
                            valueAsNumber: true,
                            min: 0
                          })}
                          type="number"
                          step="0.01"
                          className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-lg font-semibold"
                          placeholder="0.00"
                        />
                      </div>
                      {createForm.formState.errors.amount && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <XCircle className="h-4 w-4 mr-1" />
                          {createForm.formState.errors.amount.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-gray-50 to-green-50 px-8 py-6 flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-6 py-3 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-200 hover:scale-105"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-3 border border-transparent rounded-xl text-sm font-medium text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
                  >
                    <Plus className="h-4 w-4 mr-2 inline" />
                    Create Order
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Order Modal */}
      {showViewModal && selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-900 bg-opacity-50 transition-opacity" onClick={() => setShowViewModal(false)} />
            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b border-blue-200">
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
                    <Eye className="h-5 w-5 text-white" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-xl font-semibold text-gray-900">
                      Order Details
                    </h3>
                    <p className="text-sm text-gray-600">View order information</p>
                  </div>
                </div>
              </div>
              <div className="bg-white px-6 py-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Order ID</label>
                      <p className="mt-1 text-sm text-gray-900">#{selectedOrder._id ? selectedOrder._id.slice(-6) : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Customer</label>
                      <p className="mt-1 text-sm text-gray-900">{getCustomerName(selectedOrder.customer_id)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Date</label>
                      <p className="mt-1 text-sm text-gray-900">{formatDate(selectedOrder.date)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Total Amount</label>
                      <p className="mt-1 text-sm text-gray-900 font-medium">{formatCurrency(selectedOrder.amount)}</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Order Items</label>
                    <div className="space-y-2">
                      {selectedOrder.items && selectedOrder.items.map((item, index) => (
                        <div key={index} className="p-3 bg-gray-50 rounded-md">
                          <div className="grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-3">
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">SKU</p>
                              <p className="text-sm font-medium text-gray-900">{item.sku}</p>
                            </div>
                            <div className="col-span-4">
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Product Name</p>
                              <p className="text-sm font-medium text-gray-900">{item.name}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Quantity</p>
                              <p className="text-sm text-gray-900">{item.qty}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Unit Price</p>
                              <p className="text-sm text-gray-900">{formatCurrency(item.price)}</p>
                            </div>
                            <div className="col-span-1">
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total</p>
                              <p className="text-sm font-medium text-gray-900">{formatCurrency(item.qty * item.price)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {showEditModal && selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-900 bg-opacity-50 transition-opacity" onClick={() => setShowEditModal(false)} />
            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
              <form onSubmit={editForm.handleSubmit(handleUpdateOrder)}>
                <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 px-6 py-4 border-b border-yellow-200">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center shadow-sm">
                      <Edit className="h-5 w-5 text-white" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-xl font-semibold text-gray-900">
                        Edit Order #{selectedOrder._id ? selectedOrder._id.slice(-6) : 'N/A'}
                      </h3>
                      <p className="text-sm text-gray-600">Update order information</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white px-6 py-6">
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Customer
                        </label>
                        <select
                          {...editForm.register('customer_id', { required: 'Customer is required' })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                        >
                          <option value="">Select a customer</option>
                          {customers && customers.map((customer) => (
                            <option key={customer._id} value={customer._id}>
                              {customer.name} ({customer.email})
                            </option>
                          ))}
                        </select>
                        {editForm.formState.errors.customer_id && (
                          <p className="mt-2 text-sm text-red-600 flex items-center">
                            <XCircle className="h-4 w-4 mr-1" />
                            {editForm.formState.errors.customer_id.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Order Date
                        </label>
                        <input
                          {...editForm.register('date', { required: 'Date is required' })}
                          type="datetime-local"
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                        />
                        {editForm.formState.errors.date && (
                          <p className="mt-2 text-sm text-red-600 flex items-center">
                            <XCircle className="h-4 w-4 mr-1" />
                            {editForm.formState.errors.date.message}
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <label className="block text-lg font-semibold text-gray-700">
                          Order Items
                        </label>
                        <button
                          type="button"
                          onClick={addEditOrderItem}
                          className="inline-flex items-center px-4 py-2 border border-primary-300 rounded-lg text-sm font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-200"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Item
                        </button>
                      </div>
                      <div className="space-y-3">
                        {editForm.watch('items') && editForm.watch('items').map((item: any, index: number) => (
                          <div key={index} className="grid grid-cols-12 gap-2 items-end">
                            <div className="col-span-3">
                              <input
                                type="text"
                                placeholder="e.g., PROD-001"
                                value={item.sku}
                                onChange={(e) => updateEditOrderItem(index, 'sku', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                                title="Stock Keeping Unit - unique product identifier"
                              />
                            </div>
                            <div className="col-span-4">
                              <input
                                type="text"
                                placeholder="e.g., Premium Widget"
                                value={item.name}
                                onChange={(e) => updateEditOrderItem(index, 'name', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                              />
                            </div>
                            <div className="col-span-2">
                              <input
                                type="number"
                                placeholder="1"
                                value={item.qty}
                                onChange={(e) => updateEditOrderItem(index, 'qty', parseInt(e.target.value) || 0)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                                min="1"
                                title="Number of units"
                              />
                            </div>
                            <div className="col-span-2">
                              <input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={item.price}
                                onChange={(e) => updateEditOrderItem(index, 'price', parseFloat(e.target.value) || 0)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                                min="0"
                                title="Price per unit in USD"
                              />
                            </div>
                            <div className="col-span-1">
                              {editForm.watch('items') && editForm.watch('items').length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const currentItems = editForm.getValues('items');
                                    editForm.setValue('items', currentItems.filter((_: any, i: number) => i !== index));
                                  }}
                                  className="text-red-600 hover:text-red-800 p-1 rounded"
                                  title="Remove item"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Total Amount
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <DollarSign className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          {...editForm.register('amount', { 
                            required: 'Amount is required',
                            valueAsNumber: true,
                            min: 0
                          })}
                          type="number"
                          step="0.01"
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                          placeholder="0.00"
                        />
                      </div>
                      {editForm.formState.errors.amount && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <XCircle className="h-4 w-4 mr-1" />
                          {editForm.formState.errors.amount.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    Update Order
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Order Modal */}
      {showDeleteModal && selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-900 bg-opacity-50 transition-opacity" onClick={() => setShowDeleteModal(false)} />
            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-gradient-to-r from-red-50 to-red-100 px-6 py-4 border-b border-red-200">
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-sm">
                    <Trash2 className="h-5 w-5 text-white" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-xl font-semibold text-gray-900">
                      Delete Order
                    </h3>
                    <p className="text-sm text-gray-600">This action cannot be undone</p>
                  </div>
                </div>
              </div>
              <div className="bg-white px-6 py-6">
                <div className="space-y-4">
                  <p className="text-sm text-gray-700">
                    Are you sure you want to delete order #{selectedOrder._id ? selectedOrder._id.slice(-6) : 'N/A'}? 
                    This action cannot be undone.
                  </p>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">
                      <strong>Customer:</strong> {getCustomerName(selectedOrder.customer_id)}
                    </p>
                    <p className="text-sm text-gray-700">
                      <strong>Amount:</strong> {formatCurrency(selectedOrder.amount)}
                    </p>
                    <p className="text-sm text-gray-700">
                      <strong>Date:</strong> {formatDate(selectedOrder.date)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-6 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Delete Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
