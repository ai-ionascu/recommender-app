import { Navigate } from 'react-router-dom';

// Simple authentication check
const isAuthenticated = () => {
  // check a token or context
  return localStorage.getItem('token') !== null;
};

function ProtectedRoute({ children }) {
  const isAuthenticated = true; // for now, until auth is implemented
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;