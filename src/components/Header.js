import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from './AuthContext';
import { LogOut } from 'lucide-react';

const Header = () => {
    const { currentUser, isAdmin, isMod, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <header className="bg-gray-800 shadow-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center space-x-4">
                        <Link to="/" className="font-bold text-xl text-white">
                            Tableau de bord
                        </Link>
                        <Link to="/scan" className="font-bold text-xl text-white">
                            Scanner
                        </Link>
                        {(isAdmin || isMod) && (
                            <Link to="/deleted-scans" className="font-bold text-xl text-white">
                                Historique des Suppressions
                            </Link>
                        )}
                        {isAdmin && (
                            <Link to="/special-functions" className="font-bold text-xl text-white">
                                Fonctions Sp&eacute;ciales
                            </Link>
                        )}
                        {isAdmin && (
                            <Link to="/admin" className="font-bold text-xl text-white">
                                G&eacute;stion des utilisateurs
                            </Link>
                        )}
                    </div>
                    <div className="flex items-center">
                        {currentUser ? (
                            <>
                                <span className="text-sm text-gray-300 mr-2">
                                    {currentUser.username}
                                    {isAdmin && (
                                        <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-800">
                                            Admin
                                        </span>
                                    )}
                                    {isMod && (
                                        <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">
                                            Mod&eacute;rateur
                                        </span>
                                    )}
                                </span>
                                <button
                                    className="bg-gray-700 rounded-full p-2 hover:bg-gray-600 transition-colors"
                                    onClick={handleLogout}
                                    title="Déconnexion"
                                >
                                    <LogOut size={20} className="text-gray-300" />
                                </button>
                            </>
                        ) : (
                            <Link
                                to="/login"
                                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                            >
                                Connexion
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;