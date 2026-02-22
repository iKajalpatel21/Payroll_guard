import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Redirects to /login if not authenticated
// Redirects to /onboarding if user needs onboarding (unless on the onboarding route itself)
const PrivateRoute = ({ children, roles, allowOnboarding = false }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  
  if (user.needsOnboarding && !allowOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }
  
  return children;
};

export default PrivateRoute;
