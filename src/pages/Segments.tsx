import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Target, Users, Trash2, Edit, Download, UserCheck, Calendar, CheckCircle, AlertCircle, Eye, Settings, Sparkles, Activity, BarChart3, XCircle, User, TrendingUp, DollarSign, X, ChevronRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { segmentApi } from '../services/api';
import { Segment, CreateSegmentRequest, RuleGroup, Rule, ApiResponse } from '../types';
import toast from 'react-hot-toast';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

// Color palette for segments
const SEGMENT_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Violet
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#F97316', // Orange
  '#EC4899', // Pink
  '#6B7280', // Gray
];

// Helper function to get consistent colors for segments
const getSegmentColor = (segmentId: string): string => {
  const hash = segmentId.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  return SEGMENT_COLORS[Math.abs(hash) % SEGMENT_COLORS.length];
};

// Helper function to calculate average spend (mock data for now)
const calculateAverageSpend = (): number => {
  // This would typically come from your API
  // For now, returning a mock value
  return 125.50;
};

// Helper function to get customer analysis data - top 6 segments by total spend
const getCustomerAnalysisData = (segments: Segment[]) => {
  // Calculate total spend for each segment (customers * avg spend)
  const segmentsWithTotalSpend = segments.map(segment => {
    const customers = segment.customer_count || 0;
    const avgSpend = Math.random() * 200 + 50; // Mock data - replace with real data
    const totalSpend = customers * avgSpend;
    
    return {
      segment: segment.name || `Segment #${segment._id?.slice(-6)}`,
      customers,
      avgSpend,
      totalSpend
    };
  });
  
  // Sort by total spend (descending) and take top 6
  const topSegments = segmentsWithTotalSpend
    .sort((a, b) => b.totalSpend - a.totalSpend)
    .slice(0, 6);
  
  return topSegments;
};

const Segments: React.FC = () => {
  // State management
  const [segments, setSegments] = useState<Segment[]>([]);
  const [allSegments, setAllSegments] = useState<Segment[]>([]); // Store all segments for client-side filtering
  const [loading, setLoading] = useState(true);
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null);
  const [showSegmentDetails, setShowSegmentDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCustomersModal, setShowCustomersModal] = useState(false);
  const [segmentCustomers, setSegmentCustomers] = useState<any[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    pages: 0,
  });
  const [customersPagination, setCustomersPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    pages: 0,
  });

  // Handle segment click from chart
  const handleSegmentClick = (data: any) => {
    const segmentName = data.segment;
    const segment = segments.find(s => 
      s.name === segmentName || 
      `Segment #${s._id?.slice(-6)}` === segmentName
    );
    
    if (segment) {
      setSelectedSegment(segment);
      setShowSegmentDetails(true);
    }
  };

  // Rules state
  const [createRules, setCreateRules] = useState<RuleGroup>({ 
    and: [{ field: 'spend', op: '>=', value: 0 }], 
    or: [] 
  });
  const [editRules, setEditRules] = useState<RuleGroup>({ 
    and: [], 
    or: [] 
  });

  // Forms
  const createForm = useForm<CreateSegmentRequest>({
    defaultValues: {
      name: '',
      rules_json: { and: [{ field: 'spend', op: '>=', value: 0 }], or: [] },
      created_by: 'current-user',
    },
  });

  const editForm = useForm<CreateSegmentRequest>({
    defaultValues: {
      name: '',
      rules_json: { and: [], or: [] },
      created_by: 'current-user',
    },
  });

  // Fetch all segments for client-side filtering
  const fetchAllSegments = useCallback(async () => {
    try {
      setLoading(true);
      const response: ApiResponse<Segment[]> = await segmentApi.list({ limit: 1000 }); // Get all segments
      console.log('All segments loaded:', response.data);
      
      // Ensure we have valid data
      const segmentsData = response.data || [];
      console.log('Segments data length:', segmentsData.length);
      
      setAllSegments(segmentsData);
      setSegments(segmentsData);
      setPagination(prev => ({
        ...prev,
        total: segmentsData.length,
        pages: Math.ceil(segmentsData.length / prev.limit)
      }));
    } catch (error: any) {
      console.error('Error fetching all segments:', error);
      console.error('Error details:', error);
      
      // Set empty arrays on error to prevent undefined errors
      setAllSegments([]);
      setSegments([]);
      setPagination(prev => ({
        ...prev,
        total: 0,
        pages: 0
      }));
      
      // Only show error toast if it's not a 404 (backend not available)
      if ((error as any).response?.status !== 404) {
        toast.error('Failed to fetch segments');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllSegments();
  }, [fetchAllSegments]);

  // Client-side filtering function
  const filterSegments = useCallback((segments: Segment[], searchTerm: string) => {
    if (!searchTerm.trim()) return segments;
    
    const term = searchTerm.toLowerCase();
    return segments.filter(segment => {
      // Search by segment name
      if (segment.name && segment.name.toLowerCase().includes(term)) return true;
      
      // Search by segment ID
      if (segment._id && segment._id.toLowerCase().includes(term)) return true;
      
      // Search by customer count
      if (segment.customer_count && segment.customer_count.toString().includes(term)) return true;
      
      // Search by created date
      if (segment.created_at && new Date(segment.created_at).toLocaleDateString().toLowerCase().includes(term)) return true;
      
      return false;
    });
  }, []);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim()) {
        // Use client-side filtering for immediate results
        const filtered = filterSegments(allSegments, searchTerm);
        const startIndex = (pagination.page - 1) * pagination.limit;
        const endIndex = startIndex + pagination.limit;
        const paginatedResults = filtered.slice(startIndex, endIndex);
        
        setSegments(paginatedResults);
        setPagination(prev => ({ 
          ...prev, 
          total: filtered.length,
          pages: Math.ceil(filtered.length / prev.limit)
        }));
      } else {
        // If no search term, show all segments with pagination
        const startIndex = (pagination.page - 1) * pagination.limit;
        const endIndex = startIndex + pagination.limit;
        const paginatedResults = allSegments.slice(startIndex, endIndex);
        
        setSegments(paginatedResults);
        setPagination(prev => ({ 
          ...prev, 
          total: allSegments.length,
          pages: Math.ceil(allSegments.length / prev.limit)
        }));
      }
    }, 300); // 300ms delay for better responsiveness

    return () => clearTimeout(timeoutId);
  }, [searchTerm, allSegments, filterSegments, pagination.page, pagination.limit]);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    // Reset to first page when search term changes
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Handle search input key events to prevent unwanted scrolling
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Prevent Enter key from causing form submission or page scroll
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setPagination(prev => ({ ...prev, page: 1 }));
    // Clear search will be handled by the useEffect
  };


  // Calculate statistics
  const stats = {
    totalSegments: allSegments.length,
    totalCustomers: allSegments.reduce((sum, segment) => sum + (segment.customer_count || 0), 0),
    activeSegments: allSegments.filter(s => (s.customer_count || 0) > 0).length,
  };

  // Create segment
  const handleCreateSegment = async (data: CreateSegmentRequest) => {
    try {
      if (!data.name?.trim()) {
        toast.error('Segment name is required');
        return;
      }

      const response = await segmentApi.create(data);
      toast.success('Segment created successfully!');
      setShowCreateModal(false);
      createForm.reset();
      setCreateRules({ and: [{ field: 'spend', op: '>=', value: 0 }], or: [] });
      
      // Add new segment to allSegments and refresh display
      setAllSegments(prev => [response, ...prev]);
      setSegments(prev => [response, ...prev]);
      setPagination(prev => ({ 
        ...prev, 
        total: prev.total + 1,
        pages: Math.ceil((prev.total + 1) / prev.limit)
      }));
    } catch (error: any) {
      toast.error('Failed to create segment');
    }
  };

  // Update segment
  const handleUpdateSegment = async (data: CreateSegmentRequest) => {
    if (!selectedSegment) return;
    
    try {
      const response = await segmentApi.update(selectedSegment._id, data);
      toast.success('Segment updated successfully!');
      setShowEditModal(false);
      
      // Update segment in allSegments and refresh display
      setAllSegments(prev => prev.map(segment => 
        segment._id === selectedSegment._id ? response : segment
      ));
      setSegments(prev => prev.map(segment => 
        segment._id === selectedSegment._id ? response : segment
      ));
    } catch (error: any) {
      toast.error('Failed to update segment');
    }
  };

  // Delete segment
  const handleDeleteSegment = async () => {
    if (!selectedSegment) return;
    
    try {
      await segmentApi.delete(selectedSegment._id);
      toast.success('Segment deleted successfully!');
      setShowDeleteModal(false);
      
      // Remove segment from allSegments and refresh display
      setAllSegments(prev => prev.filter(segment => segment._id !== selectedSegment._id));
      setSegments(prev => prev.filter(segment => segment._id !== selectedSegment._id));
      setPagination(prev => ({ 
        ...prev, 
        total: prev.total - 1,
        pages: Math.ceil((prev.total - 1) / prev.limit)
      }));
    } catch (error: any) {
      toast.error('Failed to delete segment');
    }
  };

  // View customers
  const handleViewCustomers = async (segment: Segment, page = 1) => {
    setSelectedSegment(segment);
    setCustomersLoading(true);
    
    const limit = 12; // Fixed limit for customers per page
    
    try {
      const offset = (page - 1) * limit;
      console.log('Fetching customers for segment:', segment._id, 'page:', page, 'limit:', limit, 'offset:', offset);
      
      const response = await segmentApi.getCustomers(segment._id, { 
        limit: limit, 
        offset: offset 
      });
      
      console.log('API response:', response);
      console.log('Customers received:', response.customers?.length);
      console.log('Total customers:', response.pagination?.total);
      
      setSegmentCustomers(response.customers || []);
      setCustomersPagination(prev => ({
        ...prev,
        page: page,
        limit: limit,
        total: response.pagination?.total || response.customers?.length || 0,
        pages: Math.ceil((response.pagination?.total || response.customers?.length || 0) / limit)
      }));
      setShowCustomersModal(true);
    } catch (error: any) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to fetch customers for this segment');
      setSegmentCustomers([]);
    } finally {
      setCustomersLoading(false);
    }
  };

  // Download Excel
  const handleDownloadExcel = async (segment: Segment) => {
    setDownloadLoading(true);
    try {
      const blob = await segmentApi.downloadCustomers(segment._id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${segment.name || `Segment_${segment._id?.slice(-6) || 'N/A'}`}_customers.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Excel file downloaded successfully!');
    } catch (error: any) {
      toast.error('Failed to download Excel file');
    } finally {
      setDownloadLoading(false);
    }
  };

  // Rule management functions
  const addRule = (type: 'and' | 'or', formType: 'create' | 'edit') => {
    const currentRules = formType === 'create' ? createRules : editRules;
    const newRule: Rule = { field: 'spend', op: '>=', value: 0 };
    const updatedRules = { ...currentRules, [type]: [...(currentRules[type] || []), newRule] };
    
    if (formType === 'create') {
      setCreateRules(updatedRules);
      createForm.setValue('rules_json', updatedRules);
    } else {
      setEditRules(updatedRules);
      editForm.setValue('rules_json', updatedRules);
    }
  };

  const updateRule = (type: 'and' | 'or', index: number, field: keyof Rule, value: string | number, formType: 'create' | 'edit') => {
    const currentRules = formType === 'create' ? createRules : editRules;
    const rules = type === 'and' ? currentRules.and || [] : currentRules.or || [];
    const updatedRules = [...rules];
    updatedRules[index] = { ...updatedRules[index], [field]: value };
    const newRules = { ...currentRules, [type]: updatedRules };
    
    if (formType === 'create') {
      setCreateRules(newRules);
      createForm.setValue('rules_json', newRules);
    } else {
      setEditRules(newRules);
      editForm.setValue('rules_json', newRules);
    }
  };

  const removeRule = (type: 'and' | 'or', index: number, formType: 'create' | 'edit') => {
    const currentRules = formType === 'create' ? createRules : editRules;
    const rules = type === 'and' ? currentRules.and || [] : currentRules.or || [];
    const updatedRules = rules.filter((_, i) => i !== index);
    const newRules = { ...currentRules, [type]: updatedRules };
    
    if (formType === 'create') {
      setCreateRules(newRules);
      createForm.setValue('rules_json', newRules);
    } else {
      setEditRules(newRules);
      editForm.setValue('rules_json', newRules);
    }
  };

  // Field and operator options
  const fieldOptions = [
    { value: 'spend', label: 'Total Spend' },
    { value: 'visits', label: 'Number of Visits' },
    { value: 'last_active', label: 'Last Active Date' },
    { value: 'email', label: 'Email Address' },
    { value: 'name', label: 'Customer Name' },
  ];

  const operatorOptions = [
    { value: '>', label: 'Greater than' },
    { value: '>=', label: 'Greater than or equal' },
    { value: '<', label: 'Less than' },
    { value: '<=', label: 'Less than or equal' },
    { value: '=', label: 'Equals' },
    { value: '!=', label: 'Not equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'not_contains', label: 'Does not contain' },
  ];

  // Render rule group
  const renderRuleGroup = (rules: Rule[], type: 'and' | 'or', title: string, formType: 'create' | 'edit') => (
    <div className="bg-gradient-to-r from-gray-50 to-blue-50 border border-gray-200 rounded-2xl p-6 mb-6">
      <div className="flex items-center space-x-2 mb-4">
        <div className={`p-2 rounded-lg ${type === 'and' ? 'bg-blue-100' : 'bg-purple-100'}`}>
          {type === 'and' ? (
            <CheckCircle className="h-5 w-5 text-blue-600" />
          ) : (
            <Target className="h-5 w-5 text-purple-600" />
          )}
        </div>
        <h4 className="text-lg font-semibold text-gray-900">{title}</h4>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          type === 'and' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
        }`}>
          {rules.length} rule{rules.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="space-y-4">
        {rules.map((rule, index) => (
          <div key={index} className="group bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all duration-200">
            <div className="flex items-center space-x-3">
            <select
              value={rule.field}
              onChange={(e) => updateRule(type, index, 'field', e.target.value, formType)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            >
              {fieldOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={rule.op}
              onChange={(e) => updateRule(type, index, 'op', e.target.value as Rule['op'], formType)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            >
              {operatorOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <input
              type={rule.field === 'last_active' ? 'date' : (rule.field === 'spend' || rule.field === 'visits' ? 'number' : 'text')}
              value={rule.value}
              onChange={(e) => updateRule(type, index, 'value', rule.field === 'spend' || rule.field === 'visits' ? parseFloat(e.target.value) || 0 : e.target.value, formType)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Enter value"
            />
            <button
              type="button"
              onClick={() => removeRule(type, index, formType)}
                className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-lg transition-all duration-200 group-hover:scale-110"
                title="Remove rule"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => addRule(type, formType)}
        className="group mt-4 w-full px-4 py-3 border-2 border-dashed border-gray-300 text-gray-600 rounded-xl font-medium hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 hover:scale-105"
      >
        <Plus className="h-4 w-4 mr-2 inline group-hover:rotate-90 transition-transform duration-300" />
        Add {type === 'and' ? 'AND' : 'OR'} Rule
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading segments...</div>
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
                    <Target className="h-8 w-8 text-white" />
                  </div>
          <div>
                    <h2 className="text-3xl font-bold text-white sm:text-4xl">
                      Customer Segments
                    </h2>
                    <div className="flex items-center space-x-2 mt-2">
                      <Sparkles className="h-4 w-4 text-yellow-300" />
                      <p className="text-blue-100 text-lg">
                        Organize and target your customers with precision
                      </p>
          </div>
                  </div>
                </div>
                <div className="flex items-center space-x-6 text-white">
                  <div className="flex items-center space-x-2">
                    <Activity className="h-5 w-5 text-green-300" />
                    <span className="text-sm">Smart targeting</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-yellow-300" />
                    <span className="text-sm">Customer insights</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5 text-purple-300" />
                    <span className="text-sm">Analytics dashboard</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex md:mt-0 md:ml-4 space-x-3">
          <button
            onClick={() => setShowCreateModal(true)}
                  className="group relative px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 hover:shadow-xl"
          >
                  <Plus className="h-5 w-5 mr-2 inline group-hover:rotate-90 transition-transform duration-300" />
            Create Segment
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
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="group relative bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white bg-opacity-20 rounded-xl">
                  <Target className="h-6 w-6" />
            </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">{stats.totalSegments}</div>
                  <div className="text-blue-100 text-sm">Total Segments</div>
          </div>
        </div>
              <div className="flex items-center text-blue-100 text-sm">
                <Activity className="h-4 w-4 mr-1" />
                All segments
            </div>
          </div>
        </div>

          <div className="group relative bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white bg-opacity-20 rounded-xl">
                  <Users className="h-6 w-6" />
            </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">{stats.totalCustomers.toLocaleString()}</div>
                  <div className="text-green-100 text-sm">Total Customers</div>
                </div>
              </div>
              <div className="flex items-center text-green-100 text-sm">
                <BarChart3 className="h-4 w-4 mr-1" />
                Across all segments
          </div>
        </div>
      </div>

          <div className="group relative bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300"></div>
        <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white bg-opacity-20 rounded-xl">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">{stats.activeSegments}</div>
                  <div className="text-purple-100 text-sm">Active Segments</div>
                </div>
              </div>
              <div className="flex items-center text-purple-100 text-sm">
                <Target className="h-4 w-4 mr-1" />
                With customers
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Dashboard */}
        <div className="grid grid-cols-1 gap-8">
          {/* Customer Distribution Analysis */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Top 6 Segments by Total Spend</h3>
                  <p className="text-gray-600 text-sm">Highest spending customer segments</p>
                </div>
              </div>
              <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                Showing top {Math.min(6, segments.length)} of {segments.length} segments
              </div>
            </div>
            
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getCustomerAnalysisData(segments)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="segment" 
                    tick={{ 
                      fontSize: 12,
                      textAnchor: 'middle'
                    }}
                    height={100}
                    interval={0}
                    tickFormatter={(value) => {
                      // Break long labels into multiple lines
                      if (value.length > 15) {
                        const words = value.split(' ');
                        const lines = [];
                        let currentLine = '';
                        
                        for (const word of words) {
                          if ((currentLine + ' ' + word).length > 15 && currentLine !== '') {
                            lines.push(currentLine.trim());
                            currentLine = word;
                          } else {
                            currentLine += (currentLine ? ' ' : '') + word;
                          }
                        }
                        if (currentLine) {
                          lines.push(currentLine.trim());
                        }
                        
                        return lines.join('\n');
                      }
                      return value;
                    }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: any, name: string, props: any) => {
                      if (name === 'customers') {
                        return [`${value} customers`, 'Customer Count'];
                      } else if (name === 'avgSpend') {
                        const totalSpend = (props.payload?.customers || 0) * value;
                        return [`$${value.toFixed(2)}`, `Avg Spend (Total: $${totalSpend.toFixed(2)})`];
                      }
                      return [value, name];
                    }}
                    labelFormatter={(label: string) => `Segment: ${label}`}
                  />
                  <Legend />
                  <Bar 
                    dataKey="customers" 
                    fill="#3B82F6" 
                    name="customers"
                    radius={[4, 4, 0, 0]}
                    onClick={handleSegmentClick}
                    style={{ cursor: 'pointer' }}
                  />
                  <Bar 
                    dataKey="avgSpend" 
                    fill="#10B981" 
                    name="avgSpend"
                    radius={[4, 4, 0, 0]}
                    onClick={handleSegmentClick}
                    style={{ cursor: 'pointer' }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-xl p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Total Customers</span>
                </div>
                <div className="text-2xl font-bold text-blue-900">
                  {stats.totalCustomers.toLocaleString()}
                </div>
              </div>
              <div className="bg-green-50 rounded-xl p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-900">Avg Spend</span>
                </div>
                <div className="text-2xl font-bold text-green-900">
                  ${calculateAverageSpend().toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Analytics Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Segment Performance Metrics */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Top Performers</h3>
                <p className="text-gray-600 text-sm">Highest customer count</p>
              </div>
            </div>
            
            <div className="space-y-3">
              {segments
                .sort((a, b) => (b.customer_count || 0) - (a.customer_count || 0))
                .slice(0, 3)
                .map((segment, index) => (
                  <div key={segment._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full text-sm font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 truncate max-w-32">
                          {segment.name || `Segment #${segment._id?.slice(-6)}`}
                        </div>
                        <div className="text-xs text-gray-500">
                          {segment.customer_count || 0} customers
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-900">
                        {segment.customer_count || 0}
                      </div>
                      <div className="text-xs text-gray-500">customers</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Segment Growth Trend */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Activity className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Growth Trend</h3>
                <p className="text-gray-600 text-sm">Segment activity over time</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Active Segments</span>
                <span className="text-lg font-bold text-green-600">
                  {segments.filter(s => (s.customer_count || 0) > 0).length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Empty Segments</span>
                <span className="text-lg font-bold text-gray-600">
                  {segments.filter(s => (s.customer_count || 0) === 0).length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Segments</span>
                <span className="text-lg font-bold text-blue-600">
                  {segments.length}
                </span>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600 mb-2">Activity Rate</div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full transition-all duration-1000"
                    style={{ 
                      width: `${segments.length > 0 ? (segments.filter(s => (s.customer_count || 0) > 0).length / segments.length) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {segments.length > 0 ? Math.round((segments.filter(s => (s.customer_count || 0) > 0).length / segments.length) * 100) : 0}% of segments have customers
                </div>
              </div>
            </div>
          </div>

          {/* Customer Value Analysis */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Value Analysis</h3>
                <p className="text-gray-600 text-sm">Customer value insights</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4">
                <div className="text-sm text-gray-600 mb-1">Average Customer Value</div>
                <div className="text-2xl font-bold text-gray-900">${calculateAverageSpend().toFixed(2)}</div>
                <div className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +12% from last month
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-600 mb-1">High Value</div>
                  <div className="text-lg font-bold text-green-600">
                    {segments.filter(s => (s.customer_count || 0) > 100).length}
                  </div>
                  <div className="text-xs text-gray-500">segments</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-600 mb-1">Medium Value</div>
                  <div className="text-lg font-bold text-yellow-600">
                    {segments.filter(s => (s.customer_count || 0) > 10 && (s.customer_count || 0) <= 100).length}
                  </div>
                  <div className="text-xs text-gray-500">segments</div>
                </div>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-1">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-800">Insight</span>
                </div>
                <div className="text-xs text-yellow-700">
                  {segments.filter(s => (s.customer_count || 0) === 0).length > 0 
                    ? `${segments.filter(s => (s.customer_count || 0) === 0).length} segments have no customers. Consider reviewing their rules.`
                    : 'All segments have customers! Great targeting.'
                  }
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Search Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Search className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Search Segments</h3>
          </div>
          
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-200" />
            </div>
          <input
            type="text"
              placeholder="Search by segment name, ID, or customer count..."
            value={searchTerm}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
              className="w-full pl-12 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
            />
            {searchTerm && (
              <button
                onClick={handleClearSearch}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-200"
                title="Clear search"
              >
                <XCircle className="h-5 w-5" />
              </button>
            )}
        </div>
        </div>

        {/* Enhanced Search Results Info */}
        {searchTerm && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center flex-wrap gap-3">
                <div className="flex items-center space-x-2">
                  <div className="p-1 bg-blue-100 rounded-lg">
                    <Search className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="text-sm font-medium text-blue-800">
                    {segments && Array.isArray(segments) && segments.length > 0 ? (
                      <>Found {segments.length} segment{segments.length !== 1 ? 's' : ''} matching "{searchTerm}"</>
                    ) : (
                      <>No segments found matching "{searchTerm}"</>
                    )}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                    <Search className="h-3 w-3 mr-1" />
                    "{searchTerm}"
                  </span>
                </div>
              </div>
              <button
                onClick={handleClearSearch}
                className="flex items-center space-x-1 px-3 py-1 text-blue-600 hover:text-blue-800 text-sm font-medium hover:bg-blue-100 rounded-lg transition-all duration-200"
              >
                <XCircle className="h-4 w-4" />
                <span>Clear search</span>
              </button>
            </div>
          </div>
        )}

        {/* Enhanced Segments List */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Customer Segments</h3>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Activity className="h-4 w-4" />
                <span>Real-time updates</span>
              </div>
            </div>
          </div>
          
        {segments.length > 0 ? (
            <div className="p-6">
              <div className="grid grid-cols-1 gap-6">
            {segments.map((segment) => (
                  <div 
                    key={segment._id} 
                    className="group relative bg-gradient-to-r from-white to-gray-50 rounded-2xl border border-gray-200 p-6 hover:shadow-xl hover:scale-105 transition-all duration-300 hover:border-blue-300 cursor-pointer"
                    onClick={() => {
                      setSelectedSegment(segment);
                      setShowSegmentDetails(true);
                    }}
                  >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <div className="relative">
                            <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                              <Target className="h-6 w-6 text-white" />
                            </div>
                            <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white ${
                              (segment.customer_count || 0) > 0 ? 'bg-green-400' : 'bg-gray-400'
                            }`}></div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-xl font-bold text-gray-900 truncate">
                          {segment.name || `Segment #${segment._id?.slice(-6)}`}
                        </h3>
                            <div className="flex items-center space-x-6 text-sm text-gray-500 mt-2">
                          <span className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            Created {new Date(segment.created_at).toLocaleDateString()}
                          </span>
                          <span className="flex items-center">
                            <Users className="h-4 w-4 mr-1" />
                            {segment.customer_count || 0} customers
                          </span>
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium shadow-sm ${
                            (segment.customer_count || 0) > 0 
                                  ? 'bg-green-100 text-green-800 border border-green-200' 
                                  : 'bg-gray-100 text-gray-800 border border-gray-200'
                          }`}>
                            {(segment.customer_count || 0) > 0 ? (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Active
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Empty
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewCustomers(segment);
                      }}
                          className="group p-3 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-xl transition-all duration-200 hover:scale-110"
                      title="View Customers"
                      disabled={customersLoading}
                    >
                          <UserCheck className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadExcel(segment);
                      }}
                          className="group p-3 text-green-600 hover:text-green-800 hover:bg-green-100 rounded-xl transition-all duration-200 hover:scale-110"
                      title="Download Excel"
                      disabled={downloadLoading}
                    >
                          <Download className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSegment(segment);
                        setShowViewModal(true);
                      }}
                          className="group p-3 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-xl transition-all duration-200 hover:scale-110"
                      title="View Segment"
                    >
                          <Eye className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSegment(segment);
                        editForm.reset({
                          name: segment.name || `Segment #${segment._id?.slice(-6)}`,
                          rules_json: segment.rules_json,
                          created_by: segment.created_by,
                        });
                        setEditRules(segment.rules_json);
                        setShowEditModal(true);
                      }}
                          className="group p-3 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-100 rounded-xl transition-all duration-200 hover:scale-110"
                      title="Edit Segment"
                    >
                          <Edit className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSegment(segment);
                        setShowDeleteModal(true);
                      }}
                          className="group p-3 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-xl transition-all duration-200 hover:scale-110"
                      title="Delete Segment"
                    >
                          <Trash2 className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
              </div>
          </div>
        ) : (
            <div className="text-center py-16">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full blur-lg opacity-20"></div>
                <div className="relative bg-gradient-to-r from-blue-500 to-purple-600 rounded-full p-4 mx-auto w-24 h-24 flex items-center justify-center">
                  <Target className="h-12 w-12 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {searchTerm ? 'No segments found' : 'No segments available'}
              </h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                {searchTerm 
                  ? 'No segments match your search criteria. Try adjusting your search terms.'
                  : 'Get started by creating your first customer segment to organize and target your customers.'
                }
            </p>
            {!searchTerm && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="group relative px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-semibold text-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
                >
                  <Plus className="h-5 w-5 mr-2 inline group-hover:rotate-90 transition-transform duration-300" />
                  Create Your First Segment
                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 rounded-xl transition-opacity duration-300"></div>
                </button>
            )}
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

        {/* Enhanced Create Segment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowCreateModal(false)}></div>
              <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Plus className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Create New Segment</h3>
                      <p className="text-gray-600 text-sm">Define rules to organize your customers into targeted groups</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white px-6 py-6">
                <form onSubmit={createForm.handleSubmit(handleCreateSegment)}>
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Segment Name</label>
                    <input
                      {...createForm.register('name', { required: true })}
                      type="text"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="Enter a descriptive name for your segment"
                    />
                    {createForm.formState.errors.name && (
                        <p className="text-red-500 text-sm mt-1">Name is required</p>
                    )}
                  </div>
                  {renderRuleGroup(createRules.and || [], 'and', 'All of these conditions (AND)', 'create')}
                  {renderRuleGroup(createRules.or || [], 'or', 'Any of these conditions (OR)', 'create')}
                    <div className="flex justify-end space-x-3 mt-8">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                        className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all duration-200 hover:scale-105"
                    >
                      Cancel
                    </button>
                      <button 
                        type="submit" 
                        className="group relative px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg"
                      >
                        <Plus className="h-4 w-4 mr-2 inline group-hover:rotate-90 transition-transform duration-300" />
                      Create Segment
                        <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 rounded-xl transition-opacity duration-300"></div>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* Enhanced View Segment Modal */}
      {showViewModal && selectedSegment && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowViewModal(false)}></div>
              <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Eye className="h-6 w-6 text-blue-600" />
                </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Segment Details</h3>
                      <p className="text-gray-600 text-sm">{selectedSegment.name}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white px-6 py-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 text-white">
                      <div className="flex items-center space-x-2">
                        <Target className="h-5 w-5" />
                        <span className="text-sm font-medium">Segment ID</span>
                      </div>
                      <p className="text-xs font-mono mt-1">{selectedSegment._id?.slice(-8)}</p>
                    </div>
                    <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-4 text-white">
                      <div className="flex items-center space-x-2">
                        <Users className="h-5 w-5" />
                        <span className="text-sm font-medium">Customers</span>
                      </div>
                      <p className="text-2xl font-bold">{selectedSegment.customer_count || 0}</p>
                    </div>
                    <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-4 text-white">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-5 w-5" />
                        <span className="text-sm font-medium">Created</span>
                      </div>
                      <p className="text-sm">{new Date(selectedSegment.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                {selectedSegment.rules_json?.and && selectedSegment.rules_json.and.length > 0 && (
                      <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
                        <div className="flex items-center space-x-2 mb-3">
                          <CheckCircle className="h-5 w-5 text-blue-600" />
                          <h4 className="font-semibold text-blue-900">AND Conditions</h4>
                          <span className="px-2 py-1 bg-blue-200 text-blue-800 rounded-full text-xs font-medium">
                            {selectedSegment.rules_json.and.length} rule{selectedSegment.rules_json.and.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="space-y-2">
                    {selectedSegment.rules_json.and.map((rule, i) => (
                            <div key={i} className="bg-white rounded-lg p-3 border border-blue-200">
                              <span className="font-medium text-blue-900">{rule.field}</span>
                              <span className="mx-2 text-blue-600">{rule.op}</span>
                              <span className="text-blue-800">{rule.value}</span>
                            </div>
                          ))}
                        </div>
                  </div>
                )}
                    
                {selectedSegment.rules_json?.or && selectedSegment.rules_json.or.length > 0 && (
                      <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4">
                        <div className="flex items-center space-x-2 mb-3">
                          <Target className="h-5 w-5 text-purple-600" />
                          <h4 className="font-semibold text-purple-900">OR Conditions</h4>
                          <span className="px-2 py-1 bg-purple-200 text-purple-800 rounded-full text-xs font-medium">
                            {selectedSegment.rules_json.or.length} rule{selectedSegment.rules_json.or.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="space-y-2">
                    {selectedSegment.rules_json.or.map((rule, i) => (
                            <div key={i} className="bg-white rounded-lg p-3 border border-purple-200">
                              <span className="font-medium text-purple-900">{rule.field}</span>
                              <span className="mx-2 text-purple-600">{rule.op}</span>
                              <span className="text-purple-800">{rule.value}</span>
                            </div>
                          ))}
                        </div>
                  </div>
                )}
                  </div>
                  
                  <div className="flex justify-end space-x-3 mt-8">
                    <button 
                      onClick={() => setShowViewModal(false)} 
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all duration-200 hover:scale-105"
                    >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* Enhanced Edit Segment Modal */}
      {showEditModal && selectedSegment && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowEditModal(false)}></div>
              <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <Edit className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Edit Segment</h3>
                      <p className="text-gray-600 text-sm">Update rules and settings for {selectedSegment.name}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white px-6 py-6">
                <form onSubmit={editForm.handleSubmit(handleUpdateSegment)}>
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Segment Name</label>
                    <input
                      {...editForm.register('name', { required: true })}
                      type="text"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="Enter a descriptive name for your segment"
                    />
                    {editForm.formState.errors.name && (
                        <p className="text-red-500 text-sm mt-1">Name is required</p>
                    )}
                  </div>
                  {renderRuleGroup(editRules.and || [], 'and', 'All of these conditions (AND)', 'edit')}
                  {renderRuleGroup(editRules.or || [], 'or', 'Any of these conditions (OR)', 'edit')}
                    <div className="flex justify-end space-x-3 mt-8">
                    <button
                      type="button"
                      onClick={() => setShowEditModal(false)}
                        className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all duration-200 hover:scale-105"
                    >
                      Cancel
                    </button>
                      <button 
                        type="submit" 
                        className="group relative px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg"
                      >
                        <Edit className="h-4 w-4 mr-2 inline group-hover:rotate-12 transition-transform duration-300" />
                      Update Segment
                        <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 rounded-xl transition-opacity duration-300"></div>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* Enhanced Delete Segment Modal */}
      {showDeleteModal && selectedSegment && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowDeleteModal(false)}></div>
              <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-gradient-to-r from-red-50 to-pink-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <Trash2 className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Delete Segment</h3>
                      <p className="text-gray-600 text-sm">This action cannot be undone</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white px-6 py-6">
                  <div className="text-center mb-6">
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                      <Trash2 className="h-8 w-8 text-red-600" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">
                      Are you sure you want to delete this segment?
                    </h4>
                    <p className="text-gray-600 mb-4">
                      <strong className="text-gray-900">{selectedSegment.name}</strong> will be permanently removed.
                    </p>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="h-5 w-5 text-yellow-600" />
                        <span className="text-sm font-medium text-yellow-800">Warning</span>
                      </div>
                      <p className="text-sm text-yellow-700 mt-1">
                        This segment contains {selectedSegment.customer_count || 0} customers. 
                        Deleting it will not affect the customers themselves, but you'll lose the segment grouping.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all duration-200 hover:scale-105"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteSegment}
                      className="group relative px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg"
                  >
                      <Trash2 className="h-4 w-4 mr-2 inline group-hover:scale-110 transition-transform duration-200" />
                      Delete Segment
                      <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 rounded-xl transition-opacity duration-300"></div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* Enhanced Customers Modal */}
      {showCustomersModal && selectedSegment && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowCustomersModal(false)}></div>
              <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Users className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">Customers in Segment</h3>
                        <p className="text-gray-600 text-sm">{selectedSegment.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                        {segmentCustomers.length} customers
                      </span>
                    </div>
                  </div>
                </div>
                <div className="bg-white px-6 py-6">
                {customersLoading ? (
                  <div className="flex justify-center items-center h-32">
                      <div className="relative">
                        <div className="text-gray-500">Processing...</div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Users className="h-6 w-6 text-green-600" />
                        </div>
                      </div>
                  </div>
                ) : segmentCustomers.length > 0 ? (
                  <>
                      <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center space-x-4">
                          <div className="p-3 bg-blue-100 rounded-xl">
                            <BarChart3 className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900">Customer Data</h4>
                            <p className="text-gray-600 text-sm">View and export customer information</p>
                          </div>
                        </div>
                      <button
                        onClick={() => handleDownloadExcel(selectedSegment)}
                        disabled={downloadLoading}
                          className="group relative px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg disabled:opacity-50"
                      >
                          <Download className="h-4 w-4 mr-2 inline group-hover:scale-110 transition-transform duration-200" />
                        {downloadLoading ? 'Downloading...' : 'Download Excel'}
                          <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 rounded-xl transition-opacity duration-300"></div>
                      </button>
                    </div>
                      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                          <table className="min-w-full">
                            <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
                              <tr>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Spend</th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visits</th>
                          </tr>
                        </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {segmentCustomers.map((customer: any, index) => (
                                <tr key={customer._id} className="group hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200">
                                  <td className="px-6 py-4">
                                    <div className="flex items-center space-x-3">
                                      <div className="relative">
                                        <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                                          <User className="h-5 w-5 text-white" />
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-400 rounded-full border-2 border-white"></div>
                                      </div>
                                      <div>
                                        <div className="text-sm font-semibold text-gray-900">{customer.name || 'N/A'}</div>
                                        <div className="text-xs text-gray-500">Customer #{index + 1}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="text-sm text-gray-900">{customer.email || 'N/A'}</div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center space-x-2">
                                      <span className="text-lg font-bold text-green-600">${customer.spend?.toFixed(2) || '0.00'}</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                      {customer.visits || 0} visits
                                    </span>
                                  </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                        </div>
                    </div>
                  </>
                ) : (
                    <div className="text-center py-16">
                      <div className="relative mb-6">
                        <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full blur-lg opacity-20"></div>
                        <div className="relative bg-gradient-to-r from-green-500 to-emerald-600 rounded-full p-4 mx-auto w-24 h-24 flex items-center justify-center">
                          <Users className="h-12 w-12 text-white" />
                        </div>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">No customers found</h3>
                      <p className="text-gray-500 mb-6 max-w-md mx-auto">
                        This segment doesn't contain any customers yet. Try adjusting the segment rules or check back later.
                      </p>
                    </div>
                  )}

                  {/* Debug Pagination Info */}
                  <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4 mt-4">
                    <h4 className="font-semibold text-yellow-800">Debug Info:</h4>
                    <p className="text-sm text-yellow-700">
                      Total customers: {customersPagination.total} | 
                      Current page: {customersPagination.page} | 
                      Total pages: {customersPagination.pages} | 
                      Limit: {customersPagination.limit}
                    </p>
                  </div>

                  {/* Customers Pagination */}
                  {customersPagination.pages > 1 && (
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="text-sm text-gray-700">
                            Showing{' '}
                            <span className="font-semibold text-gray-900">
                              {(customersPagination.page - 1) * customersPagination.limit + 1}
                            </span>{' '}
                            to{' '}
                            <span className="font-semibold text-gray-900">
                              {Math.min(customersPagination.page * customersPagination.limit, customersPagination.total)}
                            </span>{' '}
                            of{' '}
                            <span className="font-semibold text-gray-900">{customersPagination.total}</span>
                            {' '}customers
                          </div>
                          <div className="h-4 w-px bg-gray-300"></div>
                          <div className="text-sm text-gray-500">
                            Page {customersPagination.page} of {customersPagination.pages}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleViewCustomers(selectedSegment!, customersPagination.page - 1)}
                            disabled={customersPagination.page <= 1}
                            className="group relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
                          >
                            <ChevronRight className="h-4 w-4 mr-1 rotate-180 group-hover:-translate-x-0.5 transition-transform duration-200" />
                            Previous
                          </button>
                          
                          <div className="flex items-center space-x-1">
                            {Array.from({ length: Math.min(5, customersPagination.pages) }, (_, i) => {
                              const pageNum = i + 1;
                              const isActive = pageNum === customersPagination.page;
                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => handleViewCustomers(selectedSegment!, pageNum)}
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
                            onClick={() => handleViewCustomers(selectedSegment!, customersPagination.page + 1)}
                            disabled={customersPagination.page >= customersPagination.pages}
                            className="group relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
                          >
                            Next
                            <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition-transform duration-200" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-end mt-8">
                  <button
                    onClick={() => setShowCustomersModal(false)}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all duration-200 hover:scale-105"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Segment Details Modal */}
      {showSegmentDetails && selectedSegment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Segment Details</h2>
                    <p className="text-gray-600">{selectedSegment.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSegmentDetails(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Customer Count</h3>
                  <p className="text-2xl font-bold text-blue-600">{selectedSegment.customer_count || 0}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Average Spend</h3>
                  <p className="text-2xl font-bold text-green-600">${(Math.random() * 200 + 50).toFixed(2)}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Total Spend</h3>
                  <p className="text-2xl font-bold text-purple-600">
                    ${((selectedSegment.customer_count || 0) * (Math.random() * 200 + 50)).toFixed(2)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Segment ID</h3>
                  <p className="text-sm font-mono text-gray-600">{selectedSegment._id}</p>
                </div>
              </div>

            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowSegmentDetails(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowSegmentDetails(false);
                  editForm.reset({
                    name: selectedSegment.name || `Segment #${selectedSegment._id?.slice(-6)}`,
                    rules_json: selectedSegment.rules_json,
                    created_by: selectedSegment.created_by,
                  });
                  setEditRules(selectedSegment.rules_json);
                  setShowEditModal(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Edit Segment
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default Segments;
