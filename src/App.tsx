
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import VideoDetail from "./pages/VideoDetail";
import Upload from "./pages/Upload";
import SearchResults from "./pages/SearchResults";
import WatchLater from "./pages/WatchLater";
import LikedVideos from "./pages/LikedVideos";
import YourVideos from "./pages/YourVideos";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/video/:id" element={<VideoDetail />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/trending" element={<Index filter="trending" />} />
          <Route path="/explore" element={<Index filter="explore" />} />
          <Route path="/creator/:id" element={<Index filter="creator" />} />
          <Route 
            path="/watch-later" 
            element={
              <ProtectedRoute>
                <WatchLater />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/liked" 
            element={
              <ProtectedRoute>
                <LikedVideos />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/your-videos" 
            element={
              <ProtectedRoute>
                <YourVideos />
              </ProtectedRoute>
            } 
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
