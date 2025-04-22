import { ConversionOptions as ConversionOptionsType } from "@shared/schema";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConversionOptionsProps {
  options: ConversionOptionsType;
  onChange: (options: ConversionOptionsType) => void;
}

export function ConversionOptions({ options, onChange }: ConversionOptionsProps) {
  const [isContentFilterOpen, setIsContentFilterOpen] = useState(false);
  const [wordCount, setWordCount] = useState(options.minWordCount);
  const [textHtmlRatio, setTextHtmlRatio] = useState(options.minTextToHtmlRatio * 100);
  
  const handleOptionChange = (optionKey: keyof ConversionOptionsType) => {
    onChange({
      ...options,
      [optionKey]: !options[optionKey]
    });
  };

  const handleNumberValueChange = (optionKey: keyof ConversionOptionsType, value: number) => {
    onChange({
      ...options,
      [optionKey]: value
    });
  };

  // Update slider values when options change
  useEffect(() => {
    setWordCount(options.minWordCount);
    setTextHtmlRatio(options.minTextToHtmlRatio * 100);
  }, [options.minWordCount, options.minTextToHtmlRatio]);

  // Update text-to-HTML ratio when slider changes
  const handleTextHtmlRatioChange = (value: number[]) => {
    const ratio = value[0] / 100;
    setTextHtmlRatio(value[0]);
    onChange({
      ...options,
      minTextToHtmlRatio: ratio
    });
  };

  return (
    <div className="mb-6 space-y-6">
      <div>
        <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">Basic Options</h3>
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
      
      <Separator />
      
      {/* Content Filtering Options */}
      <Collapsible 
        open={isContentFilterOpen} 
        onOpenChange={setIsContentFilterOpen}
        className="border rounded-md p-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-md font-medium text-gray-900 dark:text-gray-100">Content Filtering</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Filter out low-value content from your export</p>
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">
              <ChevronsUpDown className="h-4 w-4" />
              <span className="sr-only">Toggle</span>
            </Button>
          </CollapsibleTrigger>
        </div>
        
        <div className="flex items-center space-x-2 mt-2">
          <Checkbox 
            id="filter-low-value" 
            checked={options.filterLowValueContent}
            onCheckedChange={() => handleOptionChange('filterLowValueContent')}
          />
          <Label 
            htmlFor="filter-low-value" 
            className="text-sm text-gray-700 dark:text-gray-300"
          >
            Enable content filtering
          </Label>
        </div>
        
        <CollapsibleContent className="space-y-4 mt-4">
          {/* Word Count Control */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="min-word-count" className="text-sm">Minimum Word Count ({wordCount})</Label>
              <span className="text-xs text-gray-500">Skip posts with fewer words</span>
            </div>
            <div className="flex items-center gap-4">
              <Slider
                id="min-word-count"
                value={[wordCount]}
                min={100}
                max={2000}
                step={50}
                onValueChange={(value) => {
                  setWordCount(value[0]);
                  handleNumberValueChange('minWordCount', value[0]);
                }}
                disabled={!options.filterLowValueContent}
              />
              <div className="w-16">
                <Input 
                  type="number"
                  value={wordCount}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value)) {
                      setWordCount(value);
                      handleNumberValueChange('minWordCount', value);
                    }
                  }}
                  disabled={!options.filterLowValueContent}
                  className="w-full"
                  min={100}
                  max={2000}
                  step={50}
                />
              </div>
            </div>
          </div>
          
          {/* Text to HTML Ratio Control */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="text-html-ratio" className="text-sm">
                Minimum Text to HTML Ratio ({textHtmlRatio.toFixed(0)}%)
              </Label>
              <span className="text-xs text-gray-500">Higher is better quality</span>
            </div>
            <Slider
              id="text-html-ratio"
              value={[textHtmlRatio]}
              min={10}
              max={90}
              step={5}
              onValueChange={handleTextHtmlRatioChange}
              disabled={!options.filterLowValueContent}
            />
          </div>
          
          {/* Content-Based Filtering Options */}
          <div className="pt-2 space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="exclude-embed-only" 
                checked={options.excludeEmbedOnlyPosts}
                onCheckedChange={() => handleOptionChange('excludeEmbedOnlyPosts')}
                disabled={!options.filterLowValueContent}
              />
              <Label 
                htmlFor="exclude-embed-only" 
                className="text-sm text-gray-700 dark:text-gray-300"
              >
                Exclude embed-only posts (iframe, embed heavy)
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="exclude-drafts" 
                checked={options.excludeDraftPosts}
                onCheckedChange={() => handleOptionChange('excludeDraftPosts')}
                disabled={!options.filterLowValueContent}
              />
              <Label 
                htmlFor="exclude-drafts" 
                className="text-sm text-gray-700 dark:text-gray-300"
              >
                Exclude draft posts
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="exclude-no-images" 
                checked={options.excludeNoImages}
                onCheckedChange={() => handleOptionChange('excludeNoImages')}
                disabled={!options.filterLowValueContent}
              />
              <Label 
                htmlFor="exclude-no-images" 
                className="text-sm text-gray-700 dark:text-gray-300"
              >
                Exclude posts without images
              </Label>
            </div>
          </div>
          
          {/* System Page Filtering Options */}
          <div className="pt-4 space-y-2">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 pb-1">System-Generated Pages</h4>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="exclude-tag-pages" 
                checked={options.excludeTagPages}
                onCheckedChange={() => handleOptionChange('excludeTagPages')}
                disabled={!options.filterLowValueContent}
              />
              <Label 
                htmlFor="exclude-tag-pages" 
                className="text-sm text-gray-700 dark:text-gray-300"
              >
                Exclude tag & category pages
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="exclude-archive-pages" 
                checked={options.excludeArchivePages}
                onCheckedChange={() => handleOptionChange('excludeArchivePages')}
                disabled={!options.filterLowValueContent}
              />
              <Label 
                htmlFor="exclude-archive-pages" 
                className="text-sm text-gray-700 dark:text-gray-300"
              >
                Exclude archive pages
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="exclude-author-pages" 
                checked={options.excludeAuthorPages}
                onCheckedChange={() => handleOptionChange('excludeAuthorPages')}
                disabled={!options.filterLowValueContent}
              />
              <Label 
                htmlFor="exclude-author-pages" 
                className="text-sm text-gray-700 dark:text-gray-300"
              >
                Exclude author pages
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="exclude-paginated-pages" 
                checked={options.excludePaginatedPages}
                onCheckedChange={() => handleOptionChange('excludePaginatedPages')}
                disabled={!options.filterLowValueContent}
              />
              <Label 
                htmlFor="exclude-paginated-pages" 
                className="text-sm text-gray-700 dark:text-gray-300"
              >
                Exclude paginated duplicates
              </Label>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
