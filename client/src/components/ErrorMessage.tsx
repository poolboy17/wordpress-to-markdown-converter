import { AlertCircle, RefreshCw, Info, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
  className,
}: ErrorMessageProps) {
  const colorClasses = {
    error: 'border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800',
    warning: 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800',
    info: 'border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800',
  };

  const textClasses = {
    error: 'text-red-700 dark:text-red-300',
    warning: 'text-yellow-700 dark:text-yellow-300',
    info: 'text-blue-700 dark:text-blue-300',
  };

  const iconClasses = {
    error: 'text-red-500 dark:text-red-400',
    warning: 'text-yellow-500 dark:text-yellow-400',
    info: 'text-blue-500 dark:text-blue-400',
  };

  // Icon components based on severity
  const Icon = severity === 'error' 
    ? AlertCircle 
    : severity === 'warning' 
      ? AlertTriangle 
      : Info;

  return (
    <div className={cn(
      'p-4 rounded-lg border',
      colorClasses[severity],
      className
    )}>
      <div className="flex items-start">
        <div className="flex-shrink-0 mr-3">
          <Icon className={cn('h-5 w-5', iconClasses[severity])} />
        </div>
        
        <div className="flex-1">
          <h3 className={cn('text-sm font-medium mb-1', textClasses[severity])}>
            {title}
          </h3>
          
          <p className={cn('text-sm mb-2', 
            severity === 'error' ? 'text-red-600 dark:text-red-300' :
            severity === 'warning' ? 'text-yellow-600 dark:text-yellow-300' :
            'text-blue-600 dark:text-blue-300'
          )}>
            {message}
          </p>
          
          {details && (
            <details className="mt-2 mb-2">
              <summary className={cn('text-xs cursor-pointer', textClasses[severity])}>
                Show details
              </summary>
              <pre className={cn(
                'mt-2 p-2 rounded text-xs text-left overflow-auto max-h-32',
                severity === 'error' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' :
                severity === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200' :
                'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
              )}>
                {details}
              </pre>
            </details>
          )}
          
          {suggestions && suggestions.length > 0 && (
            <div className="mt-2 mb-2">
              <p className={cn('text-xs font-medium mb-1', textClasses[severity])}>
                Suggestions:
              </p>
              <ul className={cn(
                'text-xs list-disc pl-5',
                severity === 'error' ? 'text-red-600 dark:text-red-300' :
                severity === 'warning' ? 'text-yellow-600 dark:text-yellow-300' :
                'text-blue-600 dark:text-blue-300'
              )}>
                {suggestions.map((suggestion, i) => (
                  <li key={i}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}
          
          {(onRetry || onDismiss) && (
            <div className="mt-3 flex space-x-2">
              {onRetry && (
                <Button 
                  size="sm" 
                  onClick={onRetry} 
                  variant={severity === 'error' ? 'destructive' : 'outline'}
                  className="h-8 text-xs"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Try Again
                </Button>
              )}
              
              {onDismiss && (
                <Button 
                  size="sm" 
                  onClick={onDismiss} 
                  variant="outline"
                  className="h-8 text-xs"
                >
                  Dismiss
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}