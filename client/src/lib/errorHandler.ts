/**
 * Client-side error handling utilities for the WordPress to Markdown converter
 */
import { toast } from "@/hooks/use-toast";

export interface ApiErrorResponse {
  status: string;
  message: string;
  timestamp?: string;
  data?: any;
  stack?: string;
}

export const ErrorTypes = {
  NETWORK: 'network_error',
  API: 'api_error',
  VALIDATION: 'validation_error',
  AUTH: 'authentication_error',
  NOT_FOUND: 'not_found_error',
  SERVER: 'server_error',
  PERMISSION: 'permission_error',
  RATE_LIMIT: 'rate_limit_error',
  UNKNOWN: 'unknown_error'
};

/**
 * Format and extract error message from different types of errors
 */
export function getErrorMessage(error: any): string {
  // Handle various error types
  if (typeof error === 'string') {
    return error;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  if (error && typeof error === 'object') {
    // Common API error formats
    if (error.message) {
      return error.message;
    }
    
    if (error.error) {
      return typeof error.error === 'string' ? error.error : JSON.stringify(error.error);
    }
    
    if (error.statusText) {
      return error.statusText;
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
      message: `HTTP error! Status: ${response.status}`
    };
    
    try {
      // Try to parse error response
      const jsonError = await response.json();
      errorData = {
        ...errorData,
        ...jsonError
      };
    } catch (e) {
      // If can't parse as JSON, use text
      const textError = await response.text().catch(() => null);
      if (textError) {
        errorData.message = textError.substring(0, 200); // Limit length
      }
    }
    
    // Detect specific error status codes
    const error = new Error(errorData.message);
    (error as any).status = response.status;
    (error as any).errorData = errorData;
    
    // Attach error type based on status code
    switch (response.status) {
      case 400:
        (error as any).type = ErrorTypes.VALIDATION;
        break;
      case 401:
      case 403:
        (error as any).type = ErrorTypes.AUTH;
        break;
      case 404:
        (error as any).type = ErrorTypes.NOT_FOUND;
        break;
      case 429:
        (error as any).type = ErrorTypes.RATE_LIMIT;
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        (error as any).type = ErrorTypes.SERVER;
        break;
      default:
        (error as any).type = ErrorTypes.API;
    }
    
    throw error;
  }
  
  return response.json();
}

/**
 * Hook for showing error toast messages
 */
export function useErrorToast() {
  return {
    showError: (error: any, title = 'Error') => {
      toast({
        title: title,
        description: getErrorMessage(error),
        variant: "destructive"
      });
    }
  };
}

/**
 * Helper to add error handling to fetch requests
 */
export async function fetchWithErrorHandling(
  url: string,
  options?: RequestInit
): Promise<any> {
  try {
    if (!navigator.onLine) {
      throw new Error('You appear to be offline. Please check your internet connection.');
    }
    
    const response = await fetch(url, options);
    return await handleApiResponse(response);
  } catch (error) {
    // Enhance error with additional context
    if (error instanceof Error) {
      console.error(`API request failed for ${url}:`, error);
      
      // You can add additional processing here if needed
      if (error.message.includes('Failed to fetch')) {
        error.message = 'Network error. Please check your connection and try again.';
      }
    }
    
    throw error;
  }
}