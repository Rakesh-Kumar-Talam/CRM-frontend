import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit, Trash2, Eye, Mail, Phone, DollarSign, Calendar, RefreshCw, Calculator, Users, TrendingUp, Activity, Filter, SortAsc, SortDesc, Download, Star, Award, Target, Sparkles, XCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { customerApi } from '../services/api';
import { Customer, CreateCustomerRequest, ApiResponse, CustomerWithCalculatedSpend } from '../types';
import { getSpendTier, getSpendTierColor, formatSpendAmount } from '../services/customerSpendCalculation';
import toast from 'react-hot-toast';

// Utility functions




const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [createLoading, setCreateLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [useCalculatedSpend, setUseCalculatedSpend] = useState(true);
  const [refreshingSpend, setRefreshingSpend] = useState(false);
  const [refreshingData, setRefreshingData] = useState(false);
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [spendTierFilter, setSpendTierFilter] = useState('all');
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20, // Client-side pagination limit
    total: 0,
    pages: 0,
  });

  // Statistics calculation functions
  const calculateStats = (customers: Customer[]) => {
    const totalCustomers = customers.length;
    const totalSpend = customers.reduce((sum, customer) => sum + (customer.spend || 0), 0);
    const averageSpend = totalCustomers > 0 ? totalSpend / totalCustomers : 0;
    const highValueCustomers = customers.filter(c => (c.spend || 0) >= 1000).length;
    
    return {
      totalCustomers,
      totalSpend,
      averageSpend,
      highValueCustomers
    };
  };

  // Client-side filtering function
  const filterCustomers = useCallback((customers: Customer[], searchTerm: string, spendTierFilter: string) => {
    let filtered = customers;

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(customer => 
        customer.name?.toLowerCase().includes(searchLower) ||
        customer.email?.toLowerCase().includes(searchLower) ||
        customer.phone?.toLowerCase().includes(searchLower) ||
        customer._id?.toLowerCase().includes(searchLower) ||
        (customer.spend || 0).toString().includes(searchLower)
      );
    }

    // Apply spend tier filter
    if (spendTierFilter !== 'all') {
      filtered = filtered.filter(customer => getSpendTier(customer.spend || 0) === spendTierFilter);
    }

    return filtered;
  }, []);

  // Client-side sorting function
  const sortCustomers = useCallback((customers: Customer[], field: string, direction: 'asc' | 'desc') => {
    return [...customers].sort((a, b) => {
      let aValue: any = a[field as keyof Customer];
      let bValue: any = b[field as keyof Customer];

      // Handle special cases
      if (field === 'spend') {
        aValue = a.spend || 0;
        bValue = b.spend || 0;
      } else if (field === 'last_active') {
        aValue = new Date(aValue || 0).getTime();
        bValue = new Date(bValue || 0).getTime();
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue?.toLowerCase() || '';
      }

      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, []);

  // Debounced search handler
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    
    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Set new timeout for debounced search
    const timeout = setTimeout(() => {
      setPagination(prev => ({ ...prev, page: 1 }));
    }, 300);
    
    setSearchTimeout(timeout);
  }, [searchTimeout]);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const createForm = useForm<CreateCustomerRequest>({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      visits: 0,
      last_active: new Date().toISOString(),
    },
  });

  const editForm = useForm<CreateCustomerRequest>({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      visits: 0,
      last_active: new Date().toISOString(),
    },
  });

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        page: 1,
        limit: 1000, // Load all customers for client-side filtering
        calculated_spend: useCalculatedSpend,
      };

      const response: ApiResponse<Customer[] | CustomerWithCalculatedSpend[]> = await customerApi.list(params);
      console.log('Fetched customers:', response.data);
      const customersData = response.data as Customer[];
      setAllCustomers(customersData);
      
      // Update pagination with total count
      if (response.pagination) {
        setPagination(prev => ({
          ...prev,
          total: response.pagination!.total,
          pages: Math.ceil(response.pagination!.total / prev.limit),
        }));
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  }, [useCalculatedSpend]);

  // Reset pagination when search term or filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [searchTerm, spendTierFilter]);

  // Client-side filtering and sorting effect
  useEffect(() => {
    if (allCustomers.length === 0) return;

    // Apply filters
    let filtered = filterCustomers(allCustomers, searchTerm, spendTierFilter);
    
    // Apply sorting
    filtered = sortCustomers(filtered, sortField, sortDirection);
    
    setFilteredCustomers(filtered);
    
    // Update pagination for filtered results
    const totalPages = Math.ceil(filtered.length / pagination.limit);
    setPagination(prev => ({
      ...prev,
      total: filtered.length,
      pages: totalPages,
    }));
  }, [allCustomers, searchTerm, spendTierFilter, sortField, sortDirection, pagination.limit, filterCustomers, sortCustomers]);

  useEffect(() => {
    // Test backend connection and authentication
    const testBackendConnection = async () => {
      try {
        const backendUrl = process.env.REACT_APP_API_URL || 'https://crm-backend-yn3q.onrender.com/api';
        const healthUrl = backendUrl.replace('/api', '/health');
        const response = await fetch(healthUrl);
        console.log('Backend health check:', response.status);
        
        // Check authentication status
        const token = localStorage.getItem('authToken');
        console.log('Current auth token:', token ? 'Present' : 'Missing');
        console.log('Token value:', token);
        
        if (!token) {
          console.warn('No authentication token found. User needs to login.');
          toast.error('Please login to access customer data');
          return;
        }
      } catch (error) {
        console.error('Backend connection failed:', error);
        const backendUrl = process.env.REACT_APP_API_URL || 'https://crm-backend-yn3q.onrender.com/api';
        toast.error(`Cannot connect to backend. Please ensure the backend is running on ${backendUrl.replace('/api', '')}`);
      }
    };
    
    testBackendConnection();
    // Always refresh customers data when component mounts or updates
    fetchCustomers();
  }, [fetchCustomers]);

  // Additional useEffect to refresh when the component becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Customers page became visible, refreshing data...');
        fetchCustomers();
      }
    };

    // Listen for visibility changes (when user switches tabs or comes back to the page)
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also refresh when the window regains focus
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [fetchCustomers]);

  const handleRefreshSpend = async (customerId?: string) => {
    try {
      setRefreshingSpend(true);
      if (customerId) {
        const response = await customerApi.refreshSpend(customerId);
        toast.success(response.message || 'Customer spend refreshed successfully!');
      } else {
        const response = await customerApi.refreshAllSpend();
        toast.success(response.message || `Refreshed spend for ${response.updated_count || 0} customers!`);
      }
      // Refresh customers to show updated spend
      fetchCustomers();
    } catch (error: any) {
      console.error('Error refreshing spend:', error);
      toast.error(error.response?.data?.error || error.message || 'Failed to refresh spend');
    } finally {
      setRefreshingSpend(false);
    }
  };

  const handleRefreshData = async () => {
    try {
      setRefreshingData(true);
      // Call the same API as refresh all spend to refresh all customer data
      const response = await customerApi.refreshAllSpend();
      toast.success(response.message || `Refreshed data for ${response.updated_count || 0} customers!`);
      // Refresh customers to show updated data
      await fetchCustomers();
    } catch (error: any) {
      console.error('Error refreshing data:', error);
      toast.error(error.response?.data?.error || error.message || 'Failed to refresh data');
    } finally {
      setRefreshingData(false);
    }
  };

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowViewModal(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    editForm.reset({
      name: customer.name,
      email: customer.email,
      phone: customer.phone || '',
      visits: customer.visits,
      last_active: customer.last_active,
      status: 'active' as const,
    });
    setShowEditModal(true);
  };

  const handleDeleteCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowDeleteModal(true);
  };

  const handleUpdateCustomer = async (data: CreateCustomerRequest) => {
    if (!selectedCustomer) return;
    
    try {
      setCreateLoading(true);
      console.log('Updating customer with data:', data);
      const response = await customerApi.update(selectedCustomer._id, data);
      console.log('Customer updated successfully:', response);
      
      // Update the customer in the local state
      setAllCustomers(prev => prev?.map(customer => 
        customer._id === selectedCustomer._id ? response : customer
      ) || []);
      
      toast.success('Customer updated successfully!');
      setShowEditModal(false);
      setSelectedCustomer(null);
      editForm.reset();
    } catch (error: any) {
      console.error('Error updating customer:', error);
      toast.error(error.response?.data?.error || error.message || 'Failed to update customer');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedCustomer) return;
    
    try {
      setCreateLoading(true);
      console.log('Deleting customer:', selectedCustomer._id);
      await customerApi.delete(selectedCustomer._id);
      
      // Remove the customer from the local state
      setAllCustomers(prev => prev?.filter(customer => customer._id !== selectedCustomer._id) || []);
      
      // Update pagination
      setPagination(prev => ({
        ...prev,
        total: prev.total - 1
      }));
      
      toast.success('Customer deleted successfully!');
      setShowDeleteModal(false);
      setSelectedCustomer(null);
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      toast.error(error.response?.data?.error || error.message || 'Failed to delete customer');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleCreateCustomer = async (data: CreateCustomerRequest) => {
    try {
      setCreateLoading(true);
      console.log('Creating customer with data:', data);
      const response = await customerApi.create(data);
      console.log('Customer created successfully:', response);
      console.log('Response data structure:', JSON.stringify(response, null, 2));
      
      // Add the new customer to the local state immediately
      setAllCustomers(prev => [response, ...(prev || [])]);
      
      // Update pagination if needed
      setPagination(prev => ({
        ...prev,
        total: prev.total + 1
      }));
      
      toast.success('Customer created successfully!');
      setShowCreateModal(false);
      createForm.reset();
      
      // Also refresh from server to ensure consistency
      setTimeout(() => {
        fetchCustomers();
      }, 500);
    } catch (error: any) {
      console.error('Error creating customer:', error);
      console.error('Error response:', error.response);
      toast.error(error.response?.data?.error || error.message || 'Failed to create customer');
    } finally {
      setCreateLoading(false);
    }
  };


  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomers(prev => 
      prev.includes(customerId) 
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const handleSelectAll = () => {
    if (selectedCustomers.length === displayCustomers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(displayCustomers.map(c => c._id));
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedCustomers.length === 0) {
      toast.error('Please select customers first');
      return;
    }
    
    switch (action) {
      case 'delete':
        await handleBulkDelete();
        break;
      case 'export':
        handleBulkExport();
        break;
      default:
        break;
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCustomers.length === 0) return;
    
    setShowBulkDeleteModal(true);
  };

  const handleConfirmBulkDelete = async () => {
    try {
      setCreateLoading(true);
      
      // Delete customers one by one
      const deletePromises = selectedCustomers.map(customerId => 
        customerApi.delete(customerId)
      );
      
      await Promise.all(deletePromises);
      
      // Remove deleted customers from allCustomers state
      setAllCustomers(prev => prev.filter(customer => !selectedCustomers.includes(customer._id)));
      
      // Clear selection
      setSelectedCustomers([]);
      
      // Close modal
      setShowBulkDeleteModal(false);
      
      toast.success(`Successfully deleted ${selectedCustomers.length} customer${selectedCustomers.length > 1 ? 's' : ''}!`);
    } catch (error: any) {
      console.error('Error deleting customers:', error);
      toast.error('Failed to delete some customers. Please try again.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleBulkExport = () => {
    if (selectedCustomers.length === 0) return;
    
    // Get selected customers data
    const selectedCustomersData = allCustomers.filter(customer => 
      selectedCustomers.includes(customer._id)
    );
    
    // Convert to CSV format
    const csvHeaders = ['Name', 'Email', 'Phone', 'Spend', 'Tier', 'Visits', 'Last Active', 'ID'];
    const csvData = selectedCustomersData.map(customer => [
      customer.name || '',
      customer.email || '',
      customer.phone || '',
      customer.spend || 0,
      getSpendTier(customer.spend || 0),
      customer.visits || 0,
      customer.last_active ? new Date(customer.last_active).toLocaleDateString() : '',
      customer._id || ''
    ]);
    
    // Create CSV content
    const csvContent = [
      csvHeaders.join(','),
      ...csvData.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `customers_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Exported ${selectedCustomers.length} customer${selectedCustomers.length > 1 ? 's' : ''} successfully!`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Calculate statistics from all customers
  const stats = calculateStats(allCustomers);
  
  // Get paginated customers from filtered results
  const startIndex = (pagination.page - 1) * pagination.limit;
  const endIndex = startIndex + pagination.limit;
  const displayCustomers = filteredCustomers.slice(startIndex, endIndex);

  if (loading && (!allCustomers || allCustomers.length === 0)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
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
                    <Users className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-white sm:text-4xl">
                      Customer Management
                    </h2>
                    <div className="flex items-center space-x-2 mt-2">
                      <Sparkles className="h-4 w-4 text-yellow-300" />
                      <p className="text-blue-100 text-lg">
                        Manage your customer database and view comprehensive insights
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
                    <span className="text-sm">Smart segmentation</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-purple-300" />
                    <span className="text-sm">Performance tracking</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex md:mt-0 md:ml-4 space-x-3">
                <button
                  onClick={() => setUseCalculatedSpend(!useCalculatedSpend)}
                  className={`group relative px-6 py-3 bg-white bg-opacity-20 hover:bg-opacity-30 backdrop-blur-sm text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                    useCalculatedSpend ? 'bg-opacity-30' : ''
                  }`}
                  title="Toggle spend calculation method"
                >
                  <Calculator className="h-5 w-5 mr-2 inline group-hover:rotate-12 transition-transform duration-300" />
                  {useCalculatedSpend ? 'Calculated Spend' : 'Stored Spend'}
                </button>
                <button
                  onClick={() => handleRefreshSpend()}
                  disabled={refreshingSpend}
                  className="group relative px-6 py-3 bg-white bg-opacity-20 hover:bg-opacity-30 backdrop-blur-sm text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg disabled:opacity-50"
                  title="Refresh all customer spend data"
                >
                  <RefreshCw className={`h-5 w-5 mr-2 inline group-hover:rotate-180 transition-transform duration-500 ${refreshingSpend ? 'animate-spin' : ''}`} />
                  {refreshingSpend ? 'Refreshing...' : 'Refresh All Spend'}
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="group relative px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 hover:shadow-xl"
                >
                  <Plus className="h-5 w-5 mr-2 inline group-hover:rotate-90 transition-transform duration-300" />
                  Add Customer
                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 rounded-xl transition-opacity duration-300"></div>
                </button>
              </div>
            </div>
          </div>
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-32 translate-x-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full translate-y-24 -translate-x-24"></div>
        </div>

        {/* Enhanced Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="group relative bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden">
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white bg-opacity-20 rounded-xl group-hover:scale-110 transition-transform duration-200">
                  <Users className="h-6 w-6" />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">{stats.totalCustomers}</div>
                  <div className="text-blue-100 text-sm">Total Customers</div>
                </div>
              </div>
              <div className="flex items-center text-blue-100 text-sm">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span>All time</span>
              </div>
            </div>
          </div>

          <div className="group relative bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden">
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white bg-opacity-20 rounded-xl group-hover:scale-110 transition-transform duration-200">
                  <DollarSign className="h-6 w-6" />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">{formatCurrency(stats.totalSpend)}</div>
                  <div className="text-emerald-100 text-sm">Total Revenue</div>
                </div>
              </div>
              <div className="flex items-center text-emerald-100 text-sm">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span>Lifetime value</span>
              </div>
            </div>
          </div>


          <div className="group relative bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden">
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white bg-opacity-20 rounded-xl group-hover:scale-110 transition-transform duration-200">
                  <Award className="h-6 w-6" />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">{stats.highValueCustomers}</div>
                  <div className="text-amber-100 text-sm">High Value</div>
                </div>
              </div>
              <div className="flex items-center text-amber-100 text-sm">
                <Star className="h-4 w-4 mr-1" />
                <span>$1000+ spenders</span>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Data Visualization */}
        <div className="grid grid-cols-1 gap-6">

          {/* Spend Tier Distribution */}
          <div className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl border border-gray-100 p-6 transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg">
                <Award className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Customer Spend Tiers</h3>
            </div>
          <div className="space-y-3">
            {['Bronze', 'Silver', 'Gold', 'Platinum', 'VIP'].map((tier) => {
              const count = allCustomers.filter(c => getSpendTier(c.spend || 0) === tier).length;
              const percentage = allCustomers.length > 0 ? (count / allCustomers.length) * 100 : 0;
              return (
                <div key={tier} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${getSpendTierColor(tier)}`}></div>
                    <span className="text-sm font-medium text-gray-700">{tier} Tier</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${getSpendTierColor(tier)}`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-12 text-right">
                      {count}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

        {/* Enhanced Search and Filters */}
        <div className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl border border-gray-100 p-6 transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
              <Search className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Search & Filters</h3>
          </div>
          
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1">
              <form onSubmit={handleSearch}>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400 group-focus-within:text-purple-500 transition-colors duration-200" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search customers by name, email, phone, ID, or spend amount..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full pl-12 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-200"
                      title="Clear search"
                    >
                      <XCircle className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </form>
            </div>
            
            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="group relative px-6 py-3 border border-gray-200 rounded-xl text-gray-700 bg-white hover:border-purple-300 hover:bg-purple-50 transition-all duration-200 hover:scale-105 flex items-center gap-2"
            >
              <Filter className="h-4 w-4 group-hover:rotate-12 transition-transform duration-200" />
              Filters
              {showFilters && <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full">ON</span>}
            </button>
            
            {/* Refresh All Data Button */}
            <button 
              type="button" 
              disabled={refreshingData}
              onClick={handleRefreshData}
              className="group relative px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 hover:shadow-xl disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 inline group-hover:rotate-180 transition-transform duration-200 ${refreshingData ? 'animate-spin' : ''}`} />
              {refreshingData ? 'Refreshing...' : 'Refresh All Data'}
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 rounded-xl transition-opacity duration-300"></div>
            </button>
            
          </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Spend Tier</label>
                <select
                  value={spendTierFilter}
                  onChange={(e) => setSpendTierFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">All Tiers</option>
                  <option value="Bronze">Bronze ($0 - $999)</option>
                  <option value="Silver">Silver ($1,000 - $2,499)</option>
                  <option value="Gold">Gold ($2,500 - $4,999)</option>
                  <option value="Platinum">Platinum ($5,000 - $9,999)</option>
                  <option value="VIP">VIP ($10,000+)</option>
                </select>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSpendTierFilter('all');
                    handleClearSearch();
                  }}
                  className="btn btn-secondary w-full"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Search Results Info */}
      {(searchTerm || spendTierFilter !== 'all') && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
                <Search className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-purple-900">
                  Search Results
                </h3>
                <p className="text-sm text-purple-700">
                  Found {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''} matching your criteria
                  {searchTerm && ` for "${searchTerm}"`}
                  {spendTierFilter !== 'all' && ` in ${spendTierFilter} tier`}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                handleClearSearch();
                setSpendTierFilter('all');
              }}
              className="px-4 py-2 bg-white border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 transition-colors duration-200 flex items-center space-x-2"
            >
              <XCircle className="h-4 w-4" />
              <span>Clear All</span>
            </button>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedCustomers.length > 0 && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-primary-700 font-medium">
              {selectedCustomers.length} customer{selectedCustomers.length > 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkAction('export')}
                disabled={createLoading}
                className="btn btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="h-4 w-4 mr-1" />
                Export
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                disabled={createLoading}
                className="btn btn-danger text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                {createLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
          <button
            onClick={() => setSelectedCustomers([])}
            className="text-primary-600 hover:text-primary-800"
          >
            Clear Selection
          </button>
        </div>
      )}

        {/* Enhanced Customers Table */}
        <div className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl border border-gray-100 overflow-hidden transition-all duration-300 hover:-translate-y-1">
          <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Customers</h3>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Activity className="h-4 w-4" />
                <span>Real-time data</span>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-left">
                  <input
                    type="checkbox"
                    checked={selectedCustomers.length === displayCustomers.length && displayCustomers.length > 0}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                </th>
                <th 
                  className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-2">
                    Customer
                    {sortField === 'name' && (
                      sortDirection === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                  onClick={() => handleSort('email')}
                >
                  <div className="flex items-center gap-2">
                    Contact
                    {sortField === 'email' && (
                      sortDirection === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                  onClick={() => handleSort('spend')}
                >
                  <div className="flex items-center gap-2">
                    Spend
                    {sortField === 'spend' && (
                      sortDirection === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                  onClick={() => handleSort('visits')}
                >
                  <div className="flex items-center gap-2">
                    Visits
                    {sortField === 'visits' && (
                      sortDirection === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                  onClick={() => handleSort('last_active')}
                >
                  <div className="flex items-center gap-2">
                    Last Active
                    {sortField === 'last_active' && (
                      sortDirection === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayCustomers && displayCustomers.map((customer) => (
                <tr 
                  key={customer._id} 
                  className={`group hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200 ${
                    selectedCustomers.includes(customer._id) ? 'bg-gradient-to-r from-blue-50 to-purple-50' : ''
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedCustomers.includes(customer._id)}
                      onChange={() => handleSelectCustomer(customer._id)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-12 w-12">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg">
                          <span className="text-lg font-bold text-white">
                            {customer.name ? customer.name.charAt(0).toUpperCase() : '?'}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-semibold text-gray-900">
                          {customer.name || 'Unknown'}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">
                          ID: {customer._id ? customer._id.slice(-6) : 'N/A'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-900">
                        <Mail className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="truncate max-w-48">{customer.email || 'No email'}</span>
                      </div>
                      {customer.phone && (
                        <div className="flex items-center text-sm text-gray-500">
                          <Phone className="h-4 w-4 mr-2 text-gray-400" />
                          <span className="truncate max-w-48">{customer.phone}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-2">
                      <div className="flex items-center text-sm font-semibold text-gray-900">
                        <DollarSign className="h-4 w-4 mr-1 text-green-500" />
                        {formatSpendAmount(customer.spend || 0)}
                        {useCalculatedSpend && (
                          <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                            Calc
                          </span>
                        )}
                      </div>
                      <div className="flex items-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSpendTierColor(getSpendTier(customer.spend || 0))}`}>
                          {getSpendTier(customer.spend || 0)}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Target className="h-4 w-4 mr-2 text-blue-500" />
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        {customer.visits || 0} visits
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                      {customer.last_active ? formatDate(customer.last_active) : 'Never'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => handleViewCustomer(customer)}
                        className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-all duration-200 group/action"
                        title="View customer"
                      >
                        <Eye className="h-4 w-4 group-hover/action:scale-110 transition-transform duration-200" />
                      </button>
                      <button 
                        onClick={() => handleEditCustomer(customer)}
                        className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all duration-200 group/action"
                        title="Edit customer"
                      >
                        <Edit className="h-4 w-4 group-hover/action:scale-110 transition-transform duration-200" />
                      </button>
                      <button 
                        onClick={() => handleRefreshSpend(customer._id)}
                        disabled={refreshingSpend}
                        className="p-2 text-green-600 hover:text-green-800 hover:bg-green-100 disabled:opacity-50 rounded-lg transition-all duration-200 group/action"
                        title="Refresh spend calculation"
                      >
                        <RefreshCw className={`h-4 w-4 group-hover/action:scale-110 transition-transform duration-200 ${refreshingSpend ? 'animate-spin' : ''}`} />
                      </button>
                      <button 
                        onClick={() => handleDeleteCustomer(customer)}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-lg transition-all duration-200 group/action"
                        title="Delete customer"
                      >
                        <Trash2 className="h-4 w-4 group-hover/action:scale-110 transition-transform duration-200" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.pages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
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
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-lg shadow-sm -space-x-px">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                    className="relative inline-flex items-center px-3 py-2 rounded-l-lg border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    Previous
                  </button>
                  <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-primary-50 text-sm font-medium text-primary-600">
                    Page {pagination.page} of {pagination.pages}
                  </span>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page === pagination.pages}
                    className="relative inline-flex items-center px-3 py-2 rounded-r-lg border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

        {/* Enhanced Create Customer Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowCreateModal(false)} />
              <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <form onSubmit={createForm.handleSubmit((data) => {
                  console.log('Form submitted with data:', data);
                  handleCreateCustomer(data);
                })}>
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-6 pt-6 pb-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                          <Plus className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <h3 className="text-xl font-semibold text-gray-900">
                          Create New Customer
                        </h3>
                        <p className="text-sm text-gray-600">
                          Add a new customer to your database
                        </p>
                      </div>
                    </div>
                  </div>
                <div className="bg-white px-6 py-6">
                  <div className="w-full">
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Full Name *
                        </label>
                        <input
                          {...createForm.register('name', { required: 'Name is required' })}
                          type="text"
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                          placeholder="Enter customer name"
                        />
                        {createForm.formState.errors.name && (
                          <p className="mt-2 text-sm text-red-600 flex items-center">
                            <span className="w-1 h-1 bg-red-600 rounded-full mr-2"></span>
                            {createForm.formState.errors.name.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Email Address *
                        </label>
                        <input
                          {...createForm.register('email', { required: 'Email is required' })}
                          type="email"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                          placeholder="Enter email address"
                        />
                        {createForm.formState.errors.email && (
                          <p className="mt-2 text-sm text-red-600 flex items-center">
                            <span className="w-1 h-1 bg-red-600 rounded-full mr-2"></span>
                            {createForm.formState.errors.email.message}
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Phone Number
                        </label>
                        <input
                          {...createForm.register('phone')}
                          type="tel"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                          placeholder="Enter phone number"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Total Visits *
                          </label>
                          <input
                            {...createForm.register('visits', { 
                              required: 'Visits is required',
                              valueAsNumber: true,
                              min: 0
                            })}
                            type="number"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                            placeholder="0"
                          />
                          {createForm.formState.errors.visits && (
                            <p className="mt-2 text-sm text-red-600 flex items-center">
                              <span className="w-1 h-1 bg-red-600 rounded-full mr-2"></span>
                              {createForm.formState.errors.visits.message}
                            </p>
                          )}
                        </div>
                        
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Last Active Date *
                        </label>
                        <input
                          {...createForm.register('last_active', { required: 'Last active date is required' })}
                          type="datetime-local"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                        />
                        {createForm.formState.errors.last_active && (
                          <p className="mt-2 text-sm text-red-600 flex items-center">
                            <span className="w-1 h-1 bg-red-600 rounded-full mr-2"></span>
                            {createForm.formState.errors.last_active.message}
                          </p>
                        )}
                      </div>
                      
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start">
                          <div className="flex-shrink-0">
                            <DollarSign className="h-5 w-5 text-blue-400" />
                          </div>
                          <div className="ml-3">
                            <p className="text-sm text-blue-800">
                              <strong>Note:</strong> Customer spend will be automatically calculated from orders
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-6 py-4 flex flex-col sm:flex-row sm:justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="btn btn-secondary w-full sm:w-auto"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createLoading}
                    className="group relative w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {createLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating Customer...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                        Create Customer
                      </>
                    )}
                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 rounded-xl transition-opacity duration-300"></div>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Customer Modal */}
      {showViewModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowViewModal(false)} />
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Customer Details
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Name</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedCustomer.name || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedCustomer.email || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Phone</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedCustomer.phone || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Total Spend</label>
                        <div className="mt-1 space-y-2">
                          <p className="text-sm text-gray-900">{formatSpendAmount(selectedCustomer.spend || 0)}</p>
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSpendTierColor(getSpendTier(selectedCustomer.spend || 0))}`}>
                              {getSpendTier(selectedCustomer.spend || 0)} Tier
                            </span>
                            {useCalculatedSpend && (
                              <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                                Calculated from Orders
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Visits</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedCustomer.visits || 0}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Last Active</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {selectedCustomer.last_active ? formatDate(selectedCustomer.last_active) : 'Never'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Customer ID</label>
                        <p className="mt-1 text-sm text-gray-500 font-mono">{selectedCustomer._id}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="btn btn-secondary w-full sm:w-auto sm:ml-3"
                  onClick={() => setShowViewModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {showEditModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowEditModal(false)} />
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={editForm.handleSubmit(handleUpdateCustomer)}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                        Edit Customer
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Full Name</label>
                          <input
                            {...editForm.register('name', { required: 'Name is required' })}
                            type="text"
                            className="input mt-1"
                            placeholder="Enter customer name"
                          />
                          {editForm.formState.errors.name && (
                            <p className="mt-1 text-sm text-red-600">
                              {editForm.formState.errors.name.message}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Email</label>
                          <input
                            {...editForm.register('email', { required: 'Email is required' })}
                            type="email"
                            className="input mt-1"
                            placeholder="Enter email address"
                          />
                          {editForm.formState.errors.email && (
                            <p className="mt-1 text-sm text-red-600">
                              {editForm.formState.errors.email.message}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Phone</label>
                          <input
                            {...editForm.register('phone')}
                            type="tel"
                            className="input mt-1"
                            placeholder="Enter phone number"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Total Spend</label>
                          <div className="mt-1 p-3 bg-gray-50 rounded-md space-y-2">
                            <p className="text-sm text-gray-600">
                              {formatSpendAmount(selectedCustomer?.spend || 0)}
                            </p>
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSpendTierColor(getSpendTier(selectedCustomer?.spend || 0))}`}>
                                {getSpendTier(selectedCustomer?.spend || 0)} Tier
                              </span>
                            </div>
                            <p className="text-xs text-gray-500">
                              Spend is automatically calculated from orders. Use the refresh button to update.
                            </p>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Visits</label>
                          <input
                            {...editForm.register('visits', { valueAsNumber: true })}
                            type="number"
                            className="input mt-1"
                            placeholder="Enter number of visits"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={createLoading}
                    className="btn btn-primary w-full sm:w-auto sm:ml-3"
                  >
                    {createLoading ? 'Updating...' : 'Update Customer'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary w-full sm:w-auto sm:ml-3"
                    onClick={() => setShowEditModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowDeleteModal(false)} />
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <Trash2 className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Delete Customer
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete <strong>{selectedCustomer.name}</strong>? 
                        This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="btn btn-danger w-full sm:w-auto sm:ml-3"
                  onClick={handleConfirmDelete}
                  disabled={createLoading}
                >
                  {createLoading ? 'Deleting...' : 'Delete'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary w-full sm:w-auto sm:ml-3"
                  onClick={() => setShowDeleteModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowBulkDeleteModal(false)} />
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <Trash2 className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Delete Multiple Customers
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete <strong>{selectedCustomers.length} customer{selectedCustomers.length > 1 ? 's' : ''}</strong>? 
                        This action cannot be undone.
                      </p>
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <Trash2 className="h-5 w-5 text-red-400" />
                          </div>
                          <div className="ml-3">
                            <p className="text-sm text-red-800">
                              <strong>Warning:</strong> This will permanently remove all selected customers and their data from the system.
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
                  type="button"
                  className="btn btn-danger w-full sm:w-auto sm:ml-3"
                  onClick={handleConfirmBulkDelete}
                  disabled={createLoading}
                >
                  {createLoading ? 'Deleting...' : 'Delete All'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary w-full sm:w-auto sm:ml-3"
                  onClick={() => setShowBulkDeleteModal(false)}
                  disabled={createLoading}
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

export default Customers;

