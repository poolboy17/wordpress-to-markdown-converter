import { Progress } from "@/components/ui/progress";

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
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-md font-medium text-gray-900 dark:text-gray-100">
          Converting XML to Markdown
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {percentage}%
        </span>
      </div>
      
      <Progress value={percentage} className="h-2.5" />
      
      <div className="mt-2 flex justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{processed} posts processed</span>
        <span>{total} total posts</span>
      </div>
    </div>
  );
}
