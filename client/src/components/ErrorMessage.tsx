import React from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, AlertTriangle, Info, RefreshCw, XCircle } from "lucide-react";

type ErrorSeverity = 'error' | 'warning' | 'info';

interface ErrorMessageProps {
  title: string;
  message: string;
  severity?: ErrorSeverity;
  details?: string;
  suggestions?: string[];
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function ErrorMessage({
  title,
  message,
  severity = 'error',
  details,
  suggestions,
  onRetry,
  onDismiss,
  className = '',
}: ErrorMessageProps) {
  // Determine styling based on severity
  const getSeverityStyles = () => {
    switch (severity) {
      case 'error':
        return 'bg-red-50 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800';
      case 'warning':
        return 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800';
      case 'info':
        return 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800';
      default:
        return 'bg-red-50 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800';
    }
  };

  const getIcon = () => {
    switch (severity) {
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500 dark:text-amber-400" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500 dark:text-blue-400" />;
      default:
        return <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400" />;
    }
  };

  return (
    <Alert className={`${getSeverityStyles()} border p-4 rounded-md ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">{getIcon()}</div>
        <div className="ml-3 flex-1">
          <AlertTitle className="text-sm font-medium">{title}</AlertTitle>
          
          <AlertDescription className="mt-2 text-sm">
            <p>{message}</p>
            
            {details && (
              <details className="mt-2 text-xs">
                <summary className="cursor-pointer font-medium">Technical details</summary>
                <pre className="mt-1 overflow-auto p-2 bg-black/10 dark:bg-white/10 rounded">
                  {details}
                </pre>
              </details>
            )}
            
            {suggestions && suggestions.length > 0 && (
              <div className="mt-2">
                <h4 className="text-xs font-medium mb-1">Suggestions:</h4>
                <ul className="text-xs list-disc pl-5">
                  {suggestions.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {(onRetry || onDismiss) && (
              <div className="mt-3 flex space-x-2">
                {onRetry && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="inline-flex items-center"
                    onClick={onRetry}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Retry
                  </Button>
                )}
                {onDismiss && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="inline-flex items-center"
                    onClick={onDismiss}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Dismiss
                  </Button>
                )}
              </div>
            )}
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}