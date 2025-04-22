import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface ConversionProgressProps {
  processed: number;
  total: number;
  percentage: number;
  status: string;
}

export function ConversionProgress({ 
  processed, 
  total, 
  percentage, 
  status 
}: ConversionProgressProps) {
  const [progressColor, setProgressColor] = useState("bg-blue-500");
  const [progressAnimation, setProgressAnimation] = useState("");
  const [currentPercentage, setCurrentPercentage] = useState(0);
  
  // Animate percentage counter
  useEffect(() => {
    if (percentage > currentPercentage) {
      const interval = setInterval(() => {
        setCurrentPercentage(prev => {
          const nextValue = prev + 1;
          return nextValue <= percentage ? nextValue : percentage;
        });
      }, 20);
      
      return () => clearInterval(interval);
    }
  }, [percentage, currentPercentage]);
  
  // Set colors based on progress
  useEffect(() => {
    if (percentage < 30) {
      setProgressColor("bg-blue-500");
    } else if (percentage < 70) {
      setProgressColor("bg-purple-500");
    } else {
      setProgressColor("bg-green-500");
    }
    
    if (percentage === 100) {
      setProgressAnimation("animate-pulse");
    }
  }, [percentage]);
  
  const isComplete = status === 'completed';
  
  return (
    <div className="mb-6 p-5 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-800">
      <div className="flex items-center mb-3">
        {isComplete ? (
          <div className="size-9 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 mr-3">
            <CheckCircle className="h-5 w-5" />
          </div>
        ) : (
          <div className="size-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mr-3">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}
        <div>
          <h3 className="text-md font-medium text-gray-900 dark:text-gray-100">
            {isComplete ? "Conversion Complete" : "Converting XML to Markdown"}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isComplete 
              ? `Successfully converted ${processed} posts to Markdown` 
              : "Your file is being processed. This may take a few minutes..."}
          </p>
        </div>
        <div className="ml-auto">
          <span className={cn(
            "text-lg font-semibold",
            isComplete ? "text-green-600 dark:text-green-400" : "text-blue-600 dark:text-blue-400"
          )}>
            {currentPercentage}%
          </span>
        </div>
      </div>
      
      <Progress 
        value={percentage} 
        className={cn("h-3 mb-3", progressAnimation)}
        indicatorClassName={progressColor}
      />
      
      <div className="flex items-center justify-between">
        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
          <FileText className="h-3.5 w-3.5 mr-1.5" />
          <span>{processed} of {total} posts processed</span>
        </div>
        
        <div className="text-xs font-medium">
          {isComplete ? (
            <span className="text-green-600 dark:text-green-400">All posts processed</span>
          ) : (
            <span>Processing...</span>
          )}
        </div>
      </div>
    </div>
  );
}
