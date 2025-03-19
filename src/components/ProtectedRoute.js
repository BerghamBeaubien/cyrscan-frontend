import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from './AuthContext';

// ProtectedRoute component to secure routes
const ProtectedRoute = ({ children, requireAdmin = false, requireMod = false }) => {
    const { currentUser, loading, isAdmin, isMod } = useContext(AuthContext);
    const location = useLocation();

    if (loading) {
        return <div>Loading...</div>;
    }

    if (!currentUser) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Admin a acc�s � tout
    if (isAdmin) {
        return children;
    }

    // Mod�rateur peut seulement acc�der aux routes sp�cifiques
    if (requireMod && isMod) {
        return children;
    }

    // Si l'utilisateur ne correspond pas aux conditions, on le bloque
    return <Navigate to="/unauthorized" replace />;
};

export default ProtectedRoute;