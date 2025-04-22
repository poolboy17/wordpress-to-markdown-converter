import { useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { ConversionOptions } from "@/components/ConversionOptions";
import { ConversionProgress } from "@/components/ConversionProgress";
import { MarkdownPreview } from "@/components/MarkdownPreview";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ConversionOptions as ConversionOptionsType, FileInfo, MarkdownPost } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FileText, RefreshCcw, Download, XCircle } from "lucide-react";
import { fetchWithErrorHandling } from "@/lib/errorHandler";
import { ErrorMessage } from "@/components/ErrorMessage";

export default function Home() {
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [conversionId, setConversionId] = useState<number | null>(null);
  const [options, setOptions] = useState<ConversionOptionsType>({
    preserveImages: true,
    processShortcodes: true,
    includeMetadata: true,
    splitFiles: true,
    // Content filtering options with defaults
    filterLowValueContent: false,
    minWordCount: 700,
    minTextToHtmlRatio: 0.5,
    excludeEmbedOnlyPosts: true,
    excludeDraftPosts: true,
    excludeNoImages: false,
    // System page filtering
    excludeTagPages: true,
    excludeArchivePages: true,
    excludeAuthorPages: true,
    excludePaginatedPages: true
  });
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const { toast } = useToast();

  // State for error handling
  const [progressError, setProgressError] = useState<Error | null>(null);
  const [postsError, setPostsError] = useState<Error | null>(null);
  
  // Query for progress updates when a conversion is in progress
  const { data: progress, isLoading: isLoadingProgress } = useQuery({
    queryKey: ['/api/conversions', conversionId, 'progress'],
    queryFn: async () => {
      if (!conversionId) return null;
      try {
        setProgressError(null);
        const response = await fetch(`/api/conversions/${conversionId}/progress`);
        
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          let errorMessage = `Failed to fetch progress: ${response.status}`;
          
          try {
            // Try to parse as JSON to get error message
            const errorJson = JSON.parse(errorText);
            if (errorJson.message) {
              errorMessage = errorJson.message;
            }
          } catch (e) {
            // If parsing fails, use status text
            errorMessage = response.statusText || errorMessage;
          }
          
          throw new Error(errorMessage);
        }
        
        const data = await response.json();
        // Handle the new API response format
        if (data.status === 'success' && data.data) {
          return {
            status: data.data.conversionStatus,
            processed: data.data.processed,
            total: data.data.total,
            percentage: data.data.percentage
          };
        }
        
        return data; // Fallback for older API format
      } catch (error) {
        console.error('Error fetching progress:', error);
        setProgressError(error instanceof Error ? error : new Error('Failed to fetch progress'));
        throw error;
      }
    },
    enabled: !!conversionId,
    refetchInterval: (data: any) => {
      // Also check for updated API format
      const status = data?.status || data?.data?.conversionStatus;
      return status === 'processing' ? 1000 : false;
    },
    retry: 3, // Retry 3 times before giving up
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000) // Exponential backoff
  });

  // Query for posts when conversion is complete
  const { data: posts, isLoading: isLoadingPosts } = useQuery({
    queryKey: ['/api/conversions', conversionId, 'posts'],
    queryFn: async () => {
      if (!conversionId) return null;
      try {
        setPostsError(null);
        const response = await fetch(`/api/conversions/${conversionId}/posts`);
        
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          let errorMessage = `Failed to fetch posts: ${response.status}`;
          
          try {
            const errorJson = JSON.parse(errorText);
            if (errorJson.message) {
              errorMessage = errorJson.message;
            }
          } catch (e) {
            errorMessage = response.statusText || errorMessage;
          }
          
          throw new Error(errorMessage);
        }
        
        const data = await response.json();
        // Handle the new API response format
        if (data.status === 'success' && Array.isArray(data.data)) {
          return data.data;
        }
        
        // Check if it's the old API format (direct array)
        if (Array.isArray(data)) {
          return data;
        }
        
        // If we get here, something unexpected happened
        console.warn('Unexpected posts response format:', data);
        return [];
      } catch (error) {
        console.error('Error fetching posts:', error);
        setPostsError(error instanceof Error ? error : new Error('Failed to fetch posts'));
        throw error;
      }
    },
    enabled: !!conversionId && progress?.status === 'completed',
    retry: 2
  });

  // Query for selected post details
  const { data: selectedPost } = useQuery({
    queryKey: ['/api/posts', selectedPostId],
    queryFn: async () => {
      if (!selectedPostId) return null;
      
      try {
        const response = await fetch(`/api/posts/${selectedPostId}`);
        
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          let errorMessage = `Failed to fetch post: ${response.status}`;
          
          try {
            const errorJson = JSON.parse(errorText);
            if (errorJson.message) {
              errorMessage = errorJson.message;
            }
          } catch (e) {
            errorMessage = response.statusText || errorMessage;
          }
          
          throw new Error(errorMessage);
        }
        
        const data = await response.json();
        // Handle the new API response format
        if (data.status === 'success' && data.data) {
          return data.data;
        }
        
        return data; // Fallback for older API format
      } catch (error) {
        console.error('Error fetching post details:', error);
        toast({
          title: "Error loading post",
          description: error instanceof Error ? error.message : 'Failed to load post details',
          variant: "destructive"
        });
        throw error;
      }
    },
    enabled: !!selectedPostId
  });

  // Mutation for starting a conversion
  const startConversion = useMutation({
    mutationFn: async () => {
      if (!fileInfo) return;

      const formData = new FormData();
      formData.append('file', fileInfo as any);
      formData.append('options', JSON.stringify(options));

      try {
        const response = await apiRequest('POST', '/api/upload', formData);
        
        if (!response.ok) {
          // Try to parse error response
          const errorData = await response.json().catch(() => null);
          if (errorData && errorData.message) {
            throw new Error(errorData.message);
          }
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        return data;
      } catch (err: any) {
        // Enhanced error handling
        console.error('File upload error:', err);
        
        // Detect specific error types
        if (!navigator.onLine) {
          throw new Error('You appear to be offline. Please check your internet connection.');
        }
        
        if (err.message?.includes('413') || err.message?.includes('too large')) {
          throw new Error('File is too large. Maximum size is 100MB.');
        }
        
        // Rethrow the error with a more user-friendly message if needed
        throw new Error(err.message || 'Failed to upload file. Please try again.');
      }
    },
    onSuccess: (data) => {
      if (data && data.conversionId) {
        setConversionId(data.conversionId);
        toast({
          title: "Conversion started",
          description: "Your file is being processed. This may take a few minutes for large files.",
          variant: "default"
        });
      } else {
        toast({
          title: "Unexpected response",
          description: "Received an unexpected response from the server.",
          variant: "destructive"
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error starting conversion",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Function to download the markdown files
  const downloadMarkdown = () => {
    if (!conversionId) return;
    
    // Create a download link
    const downloadLink = document.createElement('a');
    downloadLink.href = `/api/conversions/${conversionId}/download`;
    downloadLink.download = `wordpress-export-markdown.zip`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  // Function to reset the conversion
  const resetConversion = () => {
    setFileInfo(null);
    setConversionId(null);
    setSelectedPostId(null);
  };

  // Function to handle post selection
  const handleSelectPost = (post: MarkdownPost) => {
    setSelectedPostId(post.id);
  };

  const isConverting = progress?.status === 'processing';
  const isCompleted = progress?.status === 'completed';
  const showResults = isCompleted && posts && posts.length > 0;
  
  return (
    <div className="bg-gray-100 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <FileText className="h-8 w-8 text-primary" />
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">WordPress XML to Markdown Converter</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Conversion Tool */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Upload WordPress XML Export</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Upload your WordPress XML export file to convert it to Markdown. Large files (30MB+) are supported.
            </p>
          </div>

          {/* File Upload Zone */}
          {!fileInfo && (
            <FileUpload 
              onFileSelected={setFileInfo} 
            />
          )}

          {/* File Info */}
          {fileInfo && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <FileText className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">{fileInfo.name}</h3>
                  <div className="mt-1 text-xs text-blue-700 dark:text-blue-400 flex items-center">
                    <span>{fileInfo.sizeFormatted}</span>
                    {fileInfo.posts && (
                      <>
                        <span className="mx-2">•</span>
                        <span>{fileInfo.posts} posts</span>
                      </>
                    )}
                  </div>
                </div>
                <button 
                  className="flex-shrink-0 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  onClick={resetConversion}
                  disabled={isConverting}
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          {/* Conversion Options */}
          {fileInfo && !isConverting && !isCompleted && (
            <ConversionOptions 
              options={options}
              onChange={setOptions}
            />
          )}

          {/* Processing Progress */}
          {isConverting && progress && (
            <ConversionProgress 
              processed={progress.processed} 
              total={progress.total} 
              percentage={progress.percentage}
              status={progress.status}
            />
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:justify-end space-y-3 sm:space-y-0 sm:space-x-3">
            {fileInfo && !isConverting && !isCompleted && (
              <Button 
                onClick={() => startConversion.mutate()}
                disabled={startConversion.isPending}
                className="inline-flex justify-center items-center"
              >
                <RefreshCcw className="h-5 w-5 mr-2" />
                Convert to Markdown
              </Button>
            )}
            
            {isConverting && (
              <Button 
                variant="outline"
                onClick={resetConversion}
                className="inline-flex justify-center items-center"
              >
                Cancel
              </Button>
            )}
            
            {isCompleted && (
              <Button 
                onClick={downloadMarkdown}
                className="inline-flex justify-center items-center bg-green-600 hover:bg-green-700"
              >
                <Download className="h-5 w-5 mr-2" />
                Download Markdown
              </Button>
            )}
          </div>
        </div>

        {/* Results Preview */}
        {showResults && (
          <MarkdownPreview 
            posts={posts} 
            selectedPost={selectedPost}
            onSelectPost={handleSelectPost}
          />
        )}
      </main>
    </div>
  );
}
