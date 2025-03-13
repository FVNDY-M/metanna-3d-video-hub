
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageLayout from '@/components/PageLayout';
import VideoCard, { VideoData } from '@/components/VideoCard';
import EmptyState from '@/components/EmptyState';
import { Search } from 'lucide-react';

// Reusing mock data from Index page
import { mockVideos } from '@/utils/mockData';

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const [results, setResults] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const searchVideos = async () => {
      setLoading(true);
      
      try {
        // Simulate API search call
        setTimeout(() => {
          if (!query) {
            setResults([]);
            setLoading(false);
            return;
          }
          
          // Filter mock videos based on query
          const filtered = mockVideos.filter(
            video => 
              video.title.toLowerCase().includes(query.toLowerCase()) ||
              video.creator.username.toLowerCase().includes(query.toLowerCase())
          );
          
          setResults(filtered);
          setLoading(false);
        }, 800);
      } catch (error) {
        console.error('Error searching videos:', error);
        setLoading(false);
      }
    };

    searchVideos();
  }, [query]);

  return (
    <PageLayout user={user}>
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Search Results</h1>
        <p className="text-gray-500 mb-8">
          {loading ? 'Searching...' : 
           results.length > 0 ? `Found ${results.length} result${results.length === 1 ? '' : 's'} for "${query}"` : 
           `No results found for "${query}"`}
        </p>
        
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="loader"></div>
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            {results.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        ) : (
          <EmptyState 
            title="No videos found" 
            description={`We couldn't find any videos matching "${query}". Try different keywords.`}
            actionLabel="Back to home"
            actionHref="/"
            icon={<Search className="h-12 w-12 text-metanna-blue" />}
          />
        )}
      </div>
    </PageLayout>
  );
};

export default SearchResults;
