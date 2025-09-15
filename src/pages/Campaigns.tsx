import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit3, Trash2, Play, Pause, Sparkles, Brain, Target, Calendar, CheckCircle, AlertCircle, ChevronRight } from 'lucide-react';
import { campaignApi, segmentApi, aiApi, messagingApi } from '../services/api';
import { Campaign, CreateCampaignRequest, UpdateCampaignRequest, Segment, AICampaignMessagesRequest } from '../types';
import toast from 'react-hot-toast';

const Campaigns: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [allCampaigns, setAllCampaigns] = useState<Campaign[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessages, setAiMessages] = useState<string[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    pages: 0,
  });

  // Form states
  const [formData, setFormData] = useState<CreateCampaignRequest>({
    segment_id: '',
    subject: '',
    message: '',
    status: 'DRAFT'
  });

  // AI form states
  const [aiFormData, setAiFormData] = useState<AICampaignMessagesRequest>({
    goal: '',
    segmentType: ''
  });

  // Filter campaigns function
  const filterCampaigns = useCallback((campaigns: Campaign[], searchTerm: string) => {
    if (!searchTerm.trim()) return campaigns;
    
    const term = searchTerm.toLowerCase();
    return campaigns.filter(campaign =>
      campaign.subject.toLowerCase().includes(term) ||
      campaign.message.toLowerCase().includes(term) ||
      getSegmentName(campaign).toLowerCase().includes(term)
    );
  }, []);

  useEffect(() => {
    const loadData = async () => {
      console.log('Loading data on component mount...');
      await Promise.all([fetchAllCampaigns(), fetchSegments()]);
      console.log('Data loading completed');
    };
    loadData();
  }, []);


  const fetchAllCampaigns = async () => {
    try {
      setLoading(true);
      console.log('Fetching all campaigns...');
      console.log('API Base URL:', process.env.REACT_APP_API_URL || 'http://localhost:4000/api');
      
      const response = await campaignApi.list();
      const campaignsData = response.data || [];
      setAllCampaigns(campaignsData);
      console.log('All campaigns set:', campaignsData);
      
      // Debug: Check if campaigns have segment_name
      campaignsData.forEach((campaign, index) => {
        console.log(`Campaign ${index + 1}:`, {
          subject: campaign.subject,
          segment_id: campaign.segment_id,
          segment_name: campaign.segment_name || 'NOT PROVIDED'
        });
      });
      
      // Set pagination
      setPagination(prev => ({
        ...prev,
        total: campaignsData.length,
        pages: Math.ceil(campaignsData.length / prev.limit)
      }));
    } catch (error: any) {
      console.error('Error fetching campaigns:', error);
      console.error('Error details:', error.response?.data || error.message);
      console.error('Request URL:', error.config?.url);
      console.error('Request method:', error.config?.method);
      toast.error('Failed to fetch campaigns. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaigns = useCallback(() => {
    if (searchTerm.trim()) {
      // Use client-side filtering for immediate results
      const filtered = filterCampaigns(allCampaigns, searchTerm);
      const startIndex = (pagination.page - 1) * pagination.limit;
      const endIndex = startIndex + pagination.limit;
      const paginatedResults = filtered.slice(startIndex, endIndex);
      
      setCampaigns(paginatedResults);
      setPagination(prev => ({ 
        ...prev, 
        total: filtered.length,
        pages: Math.ceil(filtered.length / prev.limit)
      }));
    } else {
      // If no search term, show all campaigns with pagination
      const startIndex = (pagination.page - 1) * pagination.limit;
      const endIndex = startIndex + pagination.limit;
      const paginatedResults = allCampaigns.slice(startIndex, endIndex);
      
      setCampaigns(paginatedResults);
      setPagination(prev => ({ 
        ...prev, 
        total: allCampaigns.length,
        pages: Math.ceil(allCampaigns.length / prev.limit)
      }));
    }
  }, [searchTerm, allCampaigns, filterCampaigns, pagination.page, pagination.limit]);

  // Handle pagination and search changes
  useEffect(() => {
    if (allCampaigns.length > 0) {
      fetchCampaigns();
    }
  }, [fetchCampaigns, allCampaigns]);

  const fetchSegments = async () => {
    try {
      const response = await segmentApi.list();
      setSegments(response.data || []);
    } catch (error) {
      console.error('Error fetching segments:', error);
      toast.error('Failed to fetch segments');
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newCampaign = await campaignApi.create(formData);
      toast.success('Campaign created successfully');
      
      // Simple success message for active campaigns
      if (formData.status === 'ACTIVE') {
        toast.success('Campaign created and is now active!');
      }
      
      setShowCreateModal(false);
      setFormData({ segment_id: '', subject: '', message: '', status: 'DRAFT' });
      fetchAllCampaigns();
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error('Failed to create campaign');
    }
  };

  const handleUpdateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaign) return;

    try {
      const updateData: UpdateCampaignRequest = {
        subject: formData.subject,
        message: formData.message,
        status: formData.status
      };
      
      console.log('Update campaign:', { 
        campaignId: selectedCampaign._id, 
        currentStatus: selectedCampaign.status, 
        newStatus: formData.status 
      });
      
      await campaignApi.update(selectedCampaign._id, updateData);
      
      // Simple success message
      if (formData.status === 'ACTIVE' && selectedCampaign.status !== 'ACTIVE') {
        toast.success('Campaign updated and is now active!');
      } else {
        toast.success('Campaign updated successfully');
      }
      
      setShowEditModal(false);
      setSelectedCampaign(null);
      fetchAllCampaigns();
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast.error('Failed to update campaign');
    }
  };

  const handleDeleteCampaign = async () => {
    if (!selectedCampaign) return;

    try {
      await campaignApi.delete(selectedCampaign._id);
      toast.success('Campaign deleted successfully');
      setShowDeleteModal(false);
      setSelectedCampaign(null);
      fetchAllCampaigns();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast.error('Failed to delete campaign');
    }
  };


  const handleStatusChange = async (campaign: Campaign, newStatus: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'DRAFT') => {
    try {
      console.log('Status change:', { 
        campaignId: campaign._id, 
        currentStatus: campaign.status, 
        newStatus 
      });
      
      await campaignApi.update(campaign._id, { status: newStatus });
      
      // Simple success message
      if (newStatus === 'ACTIVE') {
        toast.success('Campaign is now active!');
      } else if (newStatus === 'PAUSED') {
        toast.success('Campaign has been paused');
      } else {
        toast.success(`Campaign status changed to ${newStatus.toLowerCase()}`);
      }
      
      // Update the campaign status in both allCampaigns and campaigns state
      const updatedCampaign = { ...campaign, status: newStatus };
      
      setAllCampaigns(prev => 
        prev.map(c => c._id === campaign._id ? updatedCampaign : c)
      );
      
      setCampaigns(prev => 
        prev.map(c => c._id === campaign._id ? updatedCampaign : c)
      );
      
      // Update pagination totals if needed
      setPagination(prev => ({
        ...prev,
        total: allCampaigns.length,
        pages: Math.ceil(allCampaigns.length / prev.limit)
      }));
    } catch (error) {
      console.error('Error updating campaign status:', error);
      toast.error('Failed to update campaign status');
    }
  };

  const openEditModal = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setFormData({
      segment_id: campaign.segment_id,
      subject: campaign.subject,
      message: campaign.message,
      status: campaign.status
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setShowDeleteModal(true);
  };

  const handleAIGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setAiLoading(true);
      const response = await aiApi.generateCampaignMessages(aiFormData);
      setAiMessages(response.suggestions);
      toast.success('AI messages generated successfully!');
    } catch (error) {
      console.error('Error generating AI messages:', error);
      toast.error('Failed to generate AI messages');
    } finally {
      setAiLoading(false);
    }
  };

  const applyAIMessage = (message: string) => {
    setFormData({ ...formData, message });
    setShowAIModal(false);
    setShowCreateModal(true);
    toast.success('AI message applied to campaign');
  };

  const getSegmentName = (campaign: Campaign) => {
    // First try to get segment_name from the campaign object (if provided by API)
    if (campaign.segment_name) {
      return campaign.segment_name;
    }
    
    // Fallback to looking up by segment_id
    const segment = segments.find(s => s._id === campaign.segment_id);
    return segment?.name || 'Unknown Segment';
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    // Reset to first page when search term changes
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setPagination(prev => ({ ...prev, page: 1 }));
  };


  // Use campaigns directly since filtering is handled in fetchCampaigns
  const filteredCampaigns = campaigns;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="space-y-8 p-6">
        {/* Enhanced Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-700 rounded-2xl shadow-2xl">
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="relative px-8 py-12">
            <div className="md:flex md:items-center md:justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-4 mb-4">
                  <div>
                    <h2 className="text-3xl font-bold text-white sm:text-4xl">
                      Campaign Management
                    </h2>
                    <div className="flex items-center space-x-2 mt-2">
                      <p className="text-purple-100 text-lg">
                        Create and manage marketing campaigns with AI-powered insights
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-6 text-white">
                  <div className="flex items-center space-x-2">
                    <Play className="h-5 w-5 text-purple-300" />
                    <span className="text-sm">Active campaigns</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Brain className="h-5 w-5 text-blue-300" />
                    <span className="text-sm">AI-powered</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Sparkles className="h-5 w-5 text-indigo-300" />
                    <span className="text-sm">Smart targeting</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex md:mt-0 md:ml-4 space-x-3">
                <button
                  onClick={() => setShowAIModal(true)}
                  className="group relative px-6 py-3 bg-white bg-opacity-20 hover:bg-opacity-30 backdrop-blur-sm text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg"
                  title="Create AI Campaign"
                >
                  <Brain className="h-5 w-5 mr-2 inline group-hover:scale-110 transition-transform duration-200" />
                  AI Campaign
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="group relative px-6 py-3 bg-white bg-opacity-20 hover:bg-opacity-30 backdrop-blur-sm text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg"
                  title="Create New Campaign"
                >
                  <Plus className="h-5 w-5 mr-2 inline group-hover:scale-110 transition-transform duration-200" />
                  Create Campaign
                </button>
              </div>
            </div>
          </div>
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-32 translate-x-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full translate-y-24 -translate-x-24"></div>
        </div>


        {/* Analytics Dashboard */}
        <div className="grid grid-cols-1 gap-8">
          {/* Campaign Performance Analysis */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Sparkles className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Campaign Performance</h3>
                  <p className="text-gray-600 text-sm">Overview of campaign status distribution</p>
                </div>
              </div>
              <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {allCampaigns.length} total campaigns
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Active Campaigns */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-100 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600 mb-1">Active Campaigns</p>
                    <p className="text-3xl font-bold text-green-900">
                      {allCampaigns.filter(c => c.status === 'ACTIVE').length}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      {allCampaigns.length > 0 ? Math.round((allCampaigns.filter(c => c.status === 'ACTIVE').length / allCampaigns.length) * 100) : 0}% of total
                    </p>
                  </div>
                  <div className="p-3 bg-green-200 rounded-lg">
                    <Play className="h-8 w-8 text-green-600" />
                  </div>
                </div>
              </div>

              {/* Draft Campaigns */}
              <div className="bg-gradient-to-r from-yellow-50 to-amber-100 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-yellow-600 mb-1">Draft Campaigns</p>
                    <p className="text-3xl font-bold text-yellow-900">
                      {allCampaigns.filter(c => c.status === 'DRAFT').length}
                    </p>
                    <p className="text-xs text-yellow-600 mt-1">
                      {allCampaigns.length > 0 ? Math.round((allCampaigns.filter(c => c.status === 'DRAFT').length / allCampaigns.length) * 100) : 0}% of total
                    </p>
                  </div>
                  <div className="p-3 bg-yellow-200 rounded-lg">
                    <Edit3 className="h-8 w-8 text-yellow-600" />
                  </div>
                </div>
              </div>

              {/* Paused Campaigns */}
              <div className="bg-gradient-to-r from-orange-50 to-red-100 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-600 mb-1">Paused Campaigns</p>
                    <p className="text-3xl font-bold text-orange-900">
                      {allCampaigns.filter(c => c.status === 'PAUSED').length}
                    </p>
                    <p className="text-xs text-orange-600 mt-1">
                      {allCampaigns.length > 0 ? Math.round((allCampaigns.filter(c => c.status === 'PAUSED').length / allCampaigns.length) * 100) : 0}% of total
                    </p>
                  </div>
                  <div className="p-3 bg-orange-200 rounded-lg">
                    <Pause className="h-8 w-8 text-orange-600" />
                  </div>
                </div>
              </div>

              {/* Completed Campaigns */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-100 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600 mb-1">Completed</p>
                    <p className="text-3xl font-bold text-blue-900">
                      {allCampaigns.filter(c => c.status === 'COMPLETED').length}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      {allCampaigns.length > 0 ? Math.round((allCampaigns.filter(c => c.status === 'COMPLETED').length / allCampaigns.length) * 100) : 0}% of total
                    </p>
                  </div>
                  <div className="p-3 bg-blue-200 rounded-lg">
                    <CheckCircle className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* Enhanced Search and Filters */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Search className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Search & Filter</h3>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search campaigns by name, subject, or status..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
            />
          </div>
        </div>

        {/* Enhanced Campaigns List */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-purple-50 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Marketing Campaigns</h3>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Sparkles className="h-4 w-4" />
                <span>AI-powered campaigns</span>
              </div>
            </div>
          </div>
          
          {filteredCampaigns.length === 0 ? (
            <div className="text-center py-16">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-blue-500 rounded-full blur-lg opacity-20"></div>
                <div className="relative bg-gradient-to-r from-purple-500 to-blue-600 rounded-full p-4 mx-auto w-24 h-24 flex items-center justify-center">
                  <Sparkles className="h-12 w-12 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No campaigns found</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                Get started by creating your first campaign or use AI to generate campaign ideas.
              </p>
              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-blue-700 transition-all duration-200 hover:scale-105"
                >
                  <Plus className="h-5 w-5 mr-2 inline" />
                  Create Campaign
                </button>
                <button
                  onClick={() => setShowAIModal(true)}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 hover:scale-105"
                >
                  <Brain className="h-5 w-5 mr-2 inline" />
                  AI Campaign
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <div className="grid grid-cols-1 gap-6">
                {filteredCampaigns.map((campaign) => (
                  <div 
                    key={campaign._id} 
                    className="group relative bg-gradient-to-r from-white to-gray-50 rounded-2xl border border-gray-200 p-6 hover:shadow-xl hover:scale-105 transition-all duration-300 hover:border-purple-300"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <div className="relative">
                            <div className="h-12 w-12 rounded-full bg-gradient-to-r from-purple-500 to-blue-600 flex items-center justify-center shadow-lg">
                              <Sparkles className="h-6 w-6 text-white" />
                            </div>
                            <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white ${
                              campaign.status === 'ACTIVE' ? 'bg-green-400' : 
                              campaign.status === 'PAUSED' ? 'bg-yellow-400' : 
                              campaign.status === 'COMPLETED' ? 'bg-blue-400' : 'bg-gray-400'
                            }`}></div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-xl font-bold text-gray-900 truncate">
                              {campaign.subject}
                            </h3>
                            <div className="flex items-center space-x-6 text-sm text-gray-500 mt-2">
                              <span className="flex items-center">
                                <Target className="h-4 w-4 mr-1" />
                                {getSegmentName(campaign)}
                              </span>
                              <span className="flex items-center">
                                <Calendar className="h-4 w-4 mr-1" />
                                Created {new Date(campaign.created_at).toLocaleDateString()}
                              </span>
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium shadow-sm ${
                                campaign.status === 'ACTIVE' ? 'bg-green-100 text-green-800 border border-green-200' :
                                campaign.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                                campaign.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                'bg-gray-100 text-gray-800 border border-gray-200'
                              }`}>
                                {campaign.status === 'ACTIVE' ? (
                                  <>
                                    <Play className="h-3 w-3 mr-1" />
                                    Active
                                  </>
                                ) : campaign.status === 'PAUSED' ? (
                                  <>
                                    <Pause className="h-3 w-3 mr-1" />
                                    Paused
                                  </>
                                ) : campaign.status === 'COMPLETED' ? (
                                  <>
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Completed
                                  </>
                                ) : (
                                  <>
                                    <Edit3 className="h-3 w-3 mr-1" />
                                    Draft
                                  </>
                                )}
                              </span>
                            </div>
                            <div className="mt-3 text-sm text-gray-600 line-clamp-2">
                              {campaign.message}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleStatusChange(campaign, campaign.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE')}
                          className="group p-3 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-xl transition-all duration-200 hover:scale-110"
                          title={campaign.status === 'ACTIVE' ? 'Pause' : 'Activate'}
                        >
                          {campaign.status === 'ACTIVE' ? <Pause className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" /> : <Play className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />}
                        </button>
                        <button
                          onClick={() => openEditModal(campaign)}
                          className="group p-3 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-100 rounded-xl transition-all duration-200 hover:scale-110"
                          title="Edit"
                        >
                          <Edit3 className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(campaign)}
                          className="group p-3 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-xl transition-all duration-200 hover:scale-110"
                          title="Delete"
                        >
                          <Trash2 className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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

      {/* Enhanced Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowCreateModal(false)}></div>
          <div className="relative bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Plus className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Create New Campaign</h3>
                <p className="text-gray-600 text-sm">Design and launch your marketing campaign</p>
              </div>
            </div>
                <form onSubmit={handleCreateCampaign}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Target Segment
                      </label>
                      <select
                        value={formData.segment_id}
                        onChange={(e) => setFormData({ ...formData, segment_id: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                        required
                      >
                        <option value="">Select a segment</option>
                        {segments.map((segment) => (
                          <option key={segment._id} value={segment._id}>
                            {segment.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Campaign Status
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                      >
                        <option value="DRAFT">Draft</option>
                        <option value="ACTIVE">Active</option>
                        <option value="PAUSED">Paused</option>
                        <option value="COMPLETED">Completed</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Campaign Subject
                    </label>
                    <input
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter campaign subject line"
                      required
                    />
                  </div>
                  
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Campaign Message
                    </label>
                    <textarea
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                      rows={6}
                      placeholder="Write your campaign message here..."
                      required
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all duration-200 hover:scale-105"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="group relative px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg"
                    >
                      <Plus className="h-4 w-4 mr-2 inline group-hover:rotate-90 transition-transform duration-300" />
                      Create Campaign
                      <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 rounded-xl transition-opacity duration-300"></div>
                    </button>
                  </div>
                </form>
          </div>
        </div>
      )}

      {/* Enhanced Edit Campaign Modal */}
      {showEditModal && selectedCampaign && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowEditModal(false)}></div>
            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Edit3 className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Edit Campaign</h3>
                    <p className="text-gray-600 text-sm">Update campaign details and settings</p>
                  </div>
                </div>
              </div>
              <div className="bg-white px-6 py-6">
                <form onSubmit={handleUpdateCampaign}>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Campaign Subject
                    </label>
                    <input
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter campaign subject line"
                      required
                    />
                  </div>
                  
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Campaign Message
                    </label>
                    <textarea
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200"
                      rows={6}
                      placeholder="Write your campaign message here..."
                      required
                    />
                  </div>
                  
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Campaign Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="ACTIVE">Active</option>
                      <option value="PAUSED">Paused</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                  </div>
                  
                  <div className="flex justify-end space-x-3">
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
                      <Edit3 className="h-4 w-4 mr-2 inline group-hover:rotate-12 transition-transform duration-300" />
                      Update Campaign
                      <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 rounded-xl transition-opacity duration-300"></div>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Delete Campaign Modal */}
      {showDeleteModal && selectedCampaign && (
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
                    <h3 className="text-xl font-bold text-gray-900">Delete Campaign</h3>
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
                    Are you sure you want to delete this campaign?
                  </h4>
                  <p className="text-gray-600 mb-4">
                    <strong className="text-gray-900">"{selectedCampaign.subject}"</strong> will be permanently removed.
                  </p>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-800">Warning</span>
                    </div>
                    <p className="text-sm text-yellow-700 mt-1">
                      This campaign is currently {selectedCampaign.status.toLowerCase()}. 
                      Deleting it will remove all campaign data and cannot be undone.
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
                    onClick={handleDeleteCampaign}
                    className="group relative px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg"
                  >
                    <Trash2 className="h-4 w-4 mr-2 inline group-hover:scale-110 transition-transform duration-200" />
                    Delete Campaign
                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 rounded-xl transition-opacity duration-300"></div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced AI Campaign Modal */}
      {showAIModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowAIModal(false)}></div>
            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Brain className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">AI Campaign Generator</h3>
                    <p className="text-gray-600 text-sm">Generate intelligent campaign messages with AI</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white px-6 py-6">
                <form onSubmit={handleAIGenerate} className="mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Campaign Goal
                      </label>
                      <input
                        type="text"
                        value={aiFormData.goal}
                        onChange={(e) => setAiFormData({ ...aiFormData, goal: e.target.value })}
                        placeholder="e.g., Increase sales, Re-engage customers, Promote new products"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Target Segment Type
                      </label>
                      <select
                        value={aiFormData.segmentType}
                        onChange={(e) => setAiFormData({ ...aiFormData, segmentType: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      >
                        <option value="">Select segment type</option>
                        <option value="high-value">High-Value Customers</option>
                        <option value="frequent">Frequent Buyers</option>
                        <option value="inactive">Inactive Customers</option>
                        <option value="new">New Customers</option>
                        <option value="vip">VIP Members</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowAIModal(false)}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all duration-200 hover:scale-105"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={aiLoading}
                      className="group relative px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
                    >
                      {aiLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 group-hover:rotate-12 transition-transform duration-300" />
                          Generate Messages
                        </>
                      )}
                      <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 rounded-xl transition-opacity duration-300"></div>
                    </button>
                  </div>
                </form>

                {/* AI Generated Messages */}
                {aiMessages.length > 0 && (
                  <div className="border-t pt-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Sparkles className="h-5 w-5 text-purple-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">Generated Campaign Messages</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      {aiMessages.map((message, index) => (
                        <div key={index} className="group bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-200">
                          <div className="flex items-start space-x-4">
                            <div className="flex-shrink-0">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-600 flex items-center justify-center">
                                <Brain className="h-5 w-5 text-white" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-700 leading-relaxed">{message}</p>
                              <div className="mt-4 flex items-center justify-between">
                                <span className="text-xs text-gray-500">AI Generated Message #{index + 1}</span>
                                <button
                                  onClick={() => applyAIMessage(message)}
                                  className="group/btn inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white text-sm font-medium rounded-lg transition-all duration-200 hover:scale-105"
                                >
                                  <Plus className="h-3 w-3 mr-1 group-hover/btn:rotate-90 transition-transform duration-300" />
                                  Use this message
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default Campaigns;
