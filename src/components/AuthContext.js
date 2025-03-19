import React, { createContext, useState, useEffect } from 'react';

// Create the authentication context
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const API_BASE_URL = 'https://192.168.88.55:5128';

    useEffect(() => {
        // Check if there's a user stored in localStorage on component mount
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                setCurrentUser(JSON.parse(storedUser));
            } catch (e) {
                localStorage.removeItem('user');
            }
        }
        setLoading(false);
    }, []);

    // Login function
    const login = async (username, password) => {
        try {
            // Call your API endpoint for login
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({username,password }),
            });

            console.log("response: ", response);

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to login');
            }

            const userData = await response.json();

            // Store user data in localStorage and state
            localStorage.setItem('user', JSON.stringify(userData));
            setCurrentUser(userData);

            return true;
        } catch (error) {
            console.error('Login error:', error);
            return false;
        }
    };

    // Logout function
    const logout = () => {
        localStorage.removeItem('user');
        setCurrentUser(null);
    };

    // Check if the user has a specific role
    const hasRole = (role) => {
        return currentUser && currentUser.role === role;
    };

    const value = {
        currentUser,
        isAdmin: currentUser?.role === 'Admin',
        isMod: currentUser?.role === 'Moderator',
        isAuthenticated: !!currentUser,
        login,
        logout,
        hasRole,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};