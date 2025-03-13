
import React from 'react';
import { Link } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';

const AuthButtons = () => {
  return (
    <div className="flex items-center space-x-4">
      <Button asChild variant="ghost" className="gap-1 text-metanna-black hover:text-metanna-blue">
        <Link to="/login">
          <LogIn className="h-4 w-4 mr-1" />
          Log In
        </Link>
      </Button>
      <Button asChild className="bg-metanna-blue hover:bg-metanna-blue/90 text-white rounded-full">
        <Link to="/signup">Sign Up</Link>
      </Button>
    </div>
  );
};

export default AuthButtons;
