import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from './AuthContext';

const ProtectedRoute = ({ children, requireAdmin = false, requireMod = false }) => {
    const { currentUser, isAdmin, isMod } = useContext(AuthContext);

    if (!currentUser) {
        return <Navigate to="/login" replace />;
    }

    // If route requires admin and user is not admin
    if (requireAdmin && !isAdmin) {
        return <Navigate to="/unauthorized" replace />;
    }

    // If route requires moderator and user is not mod or admin
    if (requireMod && !(isAdmin || isMod)) {
        return <Navigate to="/unauthorized" replace />;
    }

    // Otherwise, allow access
    return children;
};

export default ProtectedRoute;
