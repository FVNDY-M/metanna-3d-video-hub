
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import MetannaLogo from '@/components/MetannaLogo';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Signup = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Function to check if username already exists
  const checkUsernameExists = async (username: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .single();
    
    return !!data;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !email || !password || !repeatPassword) {
      setError('Please fill in all fields');
      return;
    }
    
    if (password !== repeatPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (!acceptTerms) {
      setError('You must accept the Terms & Conditions and Privacy Policy');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Check if username already exists
      const usernameExists = await checkUsernameExists(username);
      if (usernameExists) {
        setError('Username already exists');
        toast.error('Registration failed', {
          description: 'This username is already taken. Please choose another one.'
        });
        setLoading(false);
        return;
      }

      // Register the user with Supabase
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username
          },
        }
      });

      if (signUpError) {
        if (signUpError.message.includes('User already registered')) {
          setError('An account with this email already exists');
          toast.error('Registration failed', {
            description: 'An account with this email already exists.'
          });
        } else {
          setError(signUpError.message);
          toast.error('Registration failed', {
            description: signUpError.message
          });
        }
        console.error('Signup error:', signUpError);
        return;
      }

      // Success message and redirect
      toast.success('Account created successfully!', {
        description: 'Welcome to METANNA!'
      });
      navigate('/');
    } catch (err) {
      console.error('Signup error:', err);
      setError('Failed to create account. Please try again.');
      toast.error('Registration failed', {
        description: 'An unexpected error occurred. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white animate-fade-in">
      <div className="flex w-full max-w-5xl overflow-hidden rounded-3xl shadow-lg">
        {/* Left side - Blue background with logo */}
        <div className="hidden md:flex md:w-2/5 bg-metanna-blue flex-col items-center justify-center p-12 text-white">
          <Link to="/"><img src="/metanna_blanco.png" alt="Metanna Logo" className="w-40" /></Link>
          <div className="mt-10 text-center">
            <h2 className="text-2xl font-semibold mb-2">Join METANNA</h2>
            <p className="text-white/80">Create an account to get started</p>
          </div>
        </div>
        
        {/* Right side - Signup form */}
        <div className="w-full md:w-3/5 bg-white p-8 sm:p-12">
          <div className="md:hidden flex justify-center mb-6">
          <Link to="/"> <img src="/metanna_azul.png" alt="Metanna Logo" className="w-40" /> </Link>
          </div>
          
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-semibold mb-1 text-gray-900">Sign Up</h2>
            <p className="text-gray-500 mb-6 text-sm">Create a free account to start exploring</p>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-500 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Choose a username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="h-11 rounded-lg"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 rounded-lg"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 rounded-lg"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="repeat-password">Repeat password</Label>
                <Input
                  id="repeat-password"
                  type="password"
                  placeholder="Confirm your password"
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                  required
                  className="h-11 rounded-lg"
                />
              </div>
              
              <div className="flex items-start space-x-2 mt-4">
                <Checkbox
                  id="terms"
                  checked={acceptTerms}
                  onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                  className="mt-1"
                />
                <Label htmlFor="terms" className="text-sm font-normal leading-tight">
                  I accept the{' '}
                  <Link to="/terms" className="text-metanna-blue hover:underline">
                    Terms & Conditions
                  </Link>
                  {' '}and{' '}
                  <Link to="/privacy" className="text-metanna-blue hover:underline">
                    Privacy Policy
                  </Link>
                </Label>
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-11 bg-metanna-blue hover:bg-metanna-blue/90 text-white rounded-lg mt-4"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <div className="loader w-5 h-5 border-white/20 border-t-white"></div>
                  </span>
                ) : (
                  "Sign Up"
                )}
              </Button>
              
              <p className="text-center text-gray-500 text-sm mt-6">
                Already have an account?{' '}
                <Link to="/login" className="text-metanna-blue hover:underline">
                  Log in
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
