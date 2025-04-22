/**
 * Client-side error handling utilities for the WordPress to Markdown converter
 */

import { useToast } from '@/hooks/use-toast';

// Error response from the API
export interface ApiErrorResponse {
  status: string;
  message: string;
  timestamp?: string;
  data?: any;
  stack?: string;
}

// Common error types with specific messages
export const ErrorTypes = {
  NETWORK: {
    OFFLINE: 'You appear to be offline. Please check your internet connection.',
    TIMEOUT: 'Request timed out. The server took too long to respond.',
    SERVER_UNREACHABLE: 'Unable to reach the server. Please try again later.'
  },
  FILE: {
    TOO_LARGE: 'The file is too large. Maximum size is 100MB.',
    INVALID_FORMAT: 'Invalid file format. Only WordPress XML export files are supported (.xml or .xml.gz).',
    NOT_FOUND: 'No file was uploaded. Please select a file.',
    CORRUPTED: 'The file appears to be corrupted or invalid.'
  },
  CONVERSION: {
    NO_POSTS: 'No posts found in the WordPress export file.',
    PROCESSING_ERROR: 'Error processing the WordPress export file.',
    TIMEOUT: 'The conversion process timed out. Try with a smaller file.'
  },
  SERVER: {
    GENERIC: 'Something went wrong on the server. Please try again later.',
    MAINTENANCE: 'The server is currently under maintenance. Please try again later.'
  }
};

/**
 * Format and extract error message from different types of errors
 */
export function getErrorMessage(error: any): string {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  if (error && typeof error === 'object') {
    // API error response
    if (error.message) {
      return error.message;
    }
    
    // Response error
    if (error.statusText) {
      return error.statusText;
    }
    
    // Handle errors with nested details
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    
    // For fetch API Response objects
    if (error.status && error.status !== 200) {
      return `Server error: ${error.status}`;
    }
  }
  
  return 'An unknown error occurred';
}

/**
 * Handle API response errors and extract error messages
 */
export async function handleApiResponse(response: Response): Promise<any> {
  if (!response.ok) {
    let errorData: ApiErrorResponse = {
      status: 'error',
      message: response.statusText || 'Server error'
    };
    
    try {
      // Attempt to parse error response as JSON
      const data = await response.json();
      errorData = { ...errorData, ...data };
    } catch (e) {
      // If we can't parse JSON, use status text
      errorData.message = response.statusText || `Error ${response.status}`;
    }
    
    // Create an Error with the response data attached
    const error = new Error(errorData.message);
    (error as any).response = response;
    (error as any).data = errorData;
    throw error;
  }
  
  return response.json();
}

/**
 * Hook for showing error toast messages
 */
export function useErrorToast() {
  const { toast } = useToast();
  
  const showError = (title: string, message: string, duration = 5000) => {
    toast({
      title,
      description: message,
      variant: 'destructive',
      duration
    });
  };
  
  const showApiError = (error: any) => {
    const message = getErrorMessage(error);
    toast({
      title: 'Error',
      description: message,
      variant: 'destructive'
    });
  };
  
  return { showError, showApiError };
}

/**
 * Helper to add error handling to fetch requests
 */
export async function fetchWithErrorHandling(
  url: string, 
  options?: RequestInit
): Promise<any> {
  try {
    const response = await fetch(url, options);
    return await handleApiResponse(response);
  } catch (error) {
    // Handle network errors
    if (!navigator.onLine) {
      throw new Error(ErrorTypes.NETWORK.OFFLINE);
    }
    
    // Re-throw the error so it can be handled by the caller
    throw error;
  }
}