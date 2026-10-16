import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { showError } from '../../api/error-toast';

// A logged-in user without the required role: back to the home page with an explicit message
// (BR-7.15). The toast is set in an effect, not during render.
export const NoAccessRedirect: React.FC = () => {
  useEffect(() => {
    showError('error_no_access');
  }, []);

  return <Navigate to="/" replace />;
};
