import { customerApi } from './api';
import { Customer, CustomerWithCalculatedSpend, RefreshSpendResponse } from '../types';

/**
 * Customer Spend Calculation Service
 * 
 * This service provides functions to work with customer spend calculations
 * that are automatically computed from orders in the backend.
 */

export interface SpendCalculationOptions {
  useCalculatedSpend?: boolean;
  limit?: number;
  offset?: number;
}

export interface SpendSummary {
  totalCustomers: number;
  totalSpend: number;
  averageSpend: number;
  customersWithOrders: number;
}

/**
 * Get customers with calculated spend from orders
 */
export const getCustomersWithCalculatedSpend = async (
  options: SpendCalculationOptions = {}
): Promise<CustomerWithCalculatedSpend[]> => {
  try {
    const params = {
      calculated_spend: true,
      limit: options.limit || 100,
      offset: options.offset || 0,
    };

    const response = await customerApi.list(params);
    return response.data as CustomerWithCalculatedSpend[];
  } catch (error) {
    console.error('Error fetching customers with calculated spend:', error);
    throw error;
  }
};

/**
 * Refresh spend calculation for a specific customer
 */
export const refreshCustomerSpend = async (customerId: string): Promise<RefreshSpendResponse> => {
  try {
    return await customerApi.refreshSpend(customerId);
  } catch (error) {
    console.error('Error refreshing customer spend:', error);
    throw error;
  }
};

/**
 * Refresh spend calculation for all customers
 */
export const refreshAllCustomersSpend = async (): Promise<RefreshSpendResponse> => {
  try {
    return await customerApi.refreshAllSpend();
  } catch (error) {
    console.error('Error refreshing all customers spend:', error);
    throw error;
  }
};

/**
 * Calculate spend summary statistics
 */
export const calculateSpendSummary = (customers: Customer[]): SpendSummary => {
  const customersWithOrders = customers.filter(c => c.spend > 0);
  const totalSpend = customers.reduce((sum, customer) => sum + (customer.spend || 0), 0);
  const averageSpend = customersWithOrders.length > 0 ? totalSpend / customersWithOrders.length : 0;

  return {
    totalCustomers: customers.length,
    totalSpend,
    averageSpend,
    customersWithOrders: customersWithOrders.length,
  };
};

/**
 * Format spend amount for display
 */
export const formatSpendAmount = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

/**
 * Get spend tier based on amount
 */
export const getSpendTier = (amount: number): string => {
  if (amount >= 10000) return 'VIP';
  if (amount >= 5000) return 'Platinum';
  if (amount >= 2500) return 'Gold';
  if (amount >= 1000) return 'Silver';
  if (amount >= 0) return 'Bronze';
  return 'New';
};

/**
 * Get spend tier color for UI
 */
export const getSpendTierColor = (tier: string): string => {
  switch (tier) {
    case 'VIP': return 'bg-purple-100 text-purple-800';
    case 'Platinum': return 'bg-blue-100 text-blue-800';
    case 'Gold': return 'bg-yellow-100 text-yellow-800';
    case 'Silver': return 'bg-gray-100 text-gray-800';
    case 'Bronze': return 'bg-orange-100 text-orange-800';
    default: return 'bg-gray-100 text-gray-600';
  }
};

export default {
  getCustomersWithCalculatedSpend,
  refreshCustomerSpend,
  refreshAllCustomersSpend,
  calculateSpendSummary,
  formatSpendAmount,
  getSpendTier,
  getSpendTierColor,
};
