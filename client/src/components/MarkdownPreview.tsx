import { useState } from "react";
import { MarkdownPost } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clipboard, Eye } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github.css";

interface MarkdownPreviewProps {
  posts: MarkdownPost[];
  selectedPost: MarkdownPost | null;
  onSelectPost: (post: MarkdownPost) => void;
}

export function MarkdownPreview({ posts, selectedPost, onSelectPost }: MarkdownPreviewProps) {
  const [viewMode, setViewMode] = useState<'preview' | 'markdown'>('preview');
  const { toast } = useToast();

  if (!posts || posts.length === 0) {
    return null;
  }

  // If no post is selected, default to the first one
  const currentPost = selectedPost || posts[0];

  const handleCopyMarkdown = () => {
    if (!currentPost) return;
    
    navigator.clipboard.writeText(currentPost.content)
      .then(() => {
        toast({
          title: "Copied to clipboard",
          description: "Markdown content has been copied to your clipboard.",
        });
      })
      .catch((err) => {
        toast({
          title: "Failed to copy",
          description: "Could not copy content to clipboard.",
          variant: "destructive"
        });
      });
  };

  // Format the post date
  const formattedDate = currentPost?.date 
    ? format(new Date(currentPost.date), 'MMMM d, yyyy')
    : '';

  // Create a list of posts to display, limiting to 5 with a count for the rest
  const displayedPosts = posts.slice(0, 5);
  const remainingCount = posts.length - 5;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Conversion Results</h2>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setViewMode(viewMode === 'preview' ? 'markdown' : 'preview')}
            className="h-8"
          >
            <Eye className="h-4 w-4 mr-1" />
            {viewMode === 'preview' ? 'View Raw' : 'View Preview'}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleCopyMarkdown}
            className="h-8"
          >
            <Clipboard className="h-4 w-4 mr-1" />
            Copy
          </Button>
        </div>
      </div>

      {/* Post Navigation */}
      <ScrollArea className="whitespace-nowrap mb-4">
        <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-md flex items-center space-x-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">Posts:</span>
          
          {displayedPosts.map((post) => (
            <Button 
              key={post.id}
              variant={post.id === currentPost?.id ? "default" : "outline"}
              size="sm"
              onClick={() => onSelectPost(post)}
              className="h-7 px-2 py-1 text-xs"
            >
              {post.title.length > 20 ? post.title.substring(0, 20) + '...' : post.title}
            </Button>
          ))}
          
          {remainingCount > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              className="h-7 px-2 py-1 text-xs"
              onClick={() => {}}
              disabled
            >
              + {remainingCount} more
            </Button>
          )}
        </div>
      </ScrollArea>

      {/* Markdown Content */}
      <Tabs defaultValue={viewMode} value={viewMode} onValueChange={(v) => setViewMode(v as 'preview' | 'markdown')}>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-md">
          <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-t-md">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {currentPost?.title}
              </h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formattedDate}
              </span>
            </div>
          </div>
          
          <TabsContent value="preview" className="p-0">
            <ScrollArea className="p-4 overflow-auto max-h-96">
              <div className="prose prose-sm dark:prose-invert max-w-none text-gray-800 dark:text-gray-200">
                <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                  {currentPost?.content || ''}
                </ReactMarkdown>
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="markdown" className="p-0">
            <ScrollArea className="overflow-auto max-h-96">
              <pre className="bg-gray-100 dark:bg-gray-900 p-4 text-sm text-gray-800 dark:text-gray-200 overflow-x-auto">
                {currentPost?.content || ''}
              </pre>
            </ScrollArea>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
