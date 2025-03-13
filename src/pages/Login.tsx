
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import MetannaLogo from '@/components/MetannaLogo';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real app, this would be an auth API call
      console.log('Logging in with:', { email, password });
      
      // For demo purposes - navigate to home page
      navigate('/');
    } catch (err) {
      setError('Invalid email or password');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white animate-fade-in">
      <div className="flex w-full max-w-5xl overflow-hidden rounded-3xl shadow-lg">
        {/* Left side - Blue background with logo */}
        <div className="hidden md:flex md:w-2/5 bg-metanna-blue flex-col items-center justify-center p-12 text-white">
          <MetannaLogo variant="auth" />
          <div className="mt-10 text-center">
            <h2 className="text-2xl font-semibold mb-2">Welcome Back</h2>
            <p className="text-white/80">Log in to continue to METANNA</p>
          </div>
        </div>
        
        {/* Right side - Login form */}
        <div className="w-full md:w-3/5 bg-white p-8 sm:p-12">
          <div className="md:hidden flex justify-center mb-6">
            <MetannaLogo variant="auth" />
          </div>
          
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-semibold mb-1 text-gray-900">Log in</h2>
            <p className="text-gray-500 mb-6 text-sm">Enter your email or username and password</p>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-500 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email or username</Label>
                <Input
                  id="email"
                  type="text"
                  placeholder="Enter your email or username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 rounded-lg"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link 
                    to="/forgot-password" 
                    className="text-sm text-metanna-blue hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 rounded-lg"
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-12 bg-metanna-blue hover:bg-metanna-blue/90 text-white rounded-lg"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <div className="loader w-5 h-5 border-white/20 border-t-white"></div>
                  </span>
                ) : (
                  "Log in"
                )}
              </Button>
              
              <p className="text-center text-gray-500 text-sm mt-6">
                Don't have an account?{' '}
                <Link to="/signup" className="text-metanna-blue hover:underline">
                  Sign up
                </Link>
              </p>
              
              <div className="text-center text-xs text-gray-400 mt-4">
                <p>By logging in, you agree to our</p>
                <p className="mt-1">
                  <Link to="/terms" className="hover:underline">Terms & Conditions</Link>
                  {' '}&amp;{' '}
                  <Link to="/privacy" className="hover:underline">Privacy Policy</Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
