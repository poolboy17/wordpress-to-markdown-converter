import { ConversionOptions as ConversionOptionsType } from "@shared/schema";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface ConversionOptionsProps {
  options: ConversionOptionsType;
  onChange: (options: ConversionOptionsType) => void;
}

export function ConversionOptions({ options, onChange }: ConversionOptionsProps) {
  const handleOptionChange = (optionKey: keyof ConversionOptionsType) => {
    onChange({
      ...options,
      [optionKey]: !options[optionKey]
    });
  };

  return (
    <div className="mb-6">
      <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">Conversion Options</h3>
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="preserve-images" 
            checked={options.preserveImages}
            onCheckedChange={() => handleOptionChange('preserveImages')}
          />
          <Label 
            htmlFor="preserve-images" 
            className="text-sm text-gray-700 dark:text-gray-300"
          >
            Preserve image references
          </Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="process-shortcodes" 
            checked={options.processShortcodes}
            onCheckedChange={() => handleOptionChange('processShortcodes')}
          />
          <Label 
            htmlFor="process-shortcodes" 
            className="text-sm text-gray-700 dark:text-gray-300"
          >
            Process WordPress shortcodes
          </Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="include-metadata" 
            checked={options.includeMetadata}
            onCheckedChange={() => handleOptionChange('includeMetadata')}
          />
          <Label 
            htmlFor="include-metadata" 
            className="text-sm text-gray-700 dark:text-gray-300"
          >
            Include post metadata (dates, authors, tags)
          </Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="split-files" 
            checked={options.splitFiles}
            onCheckedChange={() => handleOptionChange('splitFiles')}
          />
          <Label 
            htmlFor="split-files" 
            className="text-sm text-gray-700 dark:text-gray-300"
          >
            Split into separate files per post
          </Label>
        </div>
      </div>
    </div>
  );
}
