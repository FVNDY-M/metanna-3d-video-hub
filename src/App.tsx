
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Index from '@/pages/Index';
import VideoDetail from '@/pages/VideoDetail';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import NotFound from '@/pages/NotFound';
import SearchResults from '@/pages/SearchResults';
import Profile from '@/pages/Profile';
import EditProfile from '@/pages/EditProfile';
import Upload from '@/pages/Upload';
import WatchLater from '@/pages/WatchLater';
import LikedVideos from '@/pages/LikedVideos';
import YourVideos from '@/pages/YourVideos';

// CSS
import './App.css';
import { Toaster } from '@/components/ui/sonner';

function App() {
  return (
    <>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Index />} />
        <Route path="/explore" element={<Index filter="explore" />} />
        <Route path="/trending" element={<Index filter="trending" />} />
        <Route path="/video/:id" element={<VideoDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/profile/:username" element={<Profile />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/edit-profile" element={<EditProfile />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/watch-later" element={<WatchLater />} />
          <Route path="/liked" element={<LikedVideos />} />
          <Route path="/your-videos" element={<YourVideos />} />
        </Route>

        {/* Not Found */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </>
  );
}

export default App;
