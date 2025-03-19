import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldX, ArrowLeft } from 'lucide-react';

const UnauthorizedPage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
                <div className="flex justify-center mb-4">
                    <div className="p-3 rounded-full bg-red-100">
                        <ShieldX size={48} className="text-red-500" />
                    </div>
                </div>
                
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Accès non autorisé</h1>
                <p className="text-gray-600 mb-6">
                    Vous n'avez pas les permissions nécessaires pour accéder à cette page.
                    Veuillez contacter un administrateur si vous pensez que c'est une erreur.
                </p>
                
                <button
                    onClick={() => navigate('/scan')}
                    className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    <ArrowLeft size={18} className="mr-2" />
                    Retour à la page principale
                </button>
            </div>
        </div>
    );
};

export default UnauthorizedPage;