import React, { useState } from 'react';
import { ArrowLeft, RefreshCw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

const SpecialFunctions = () => {
    const [recomputeJobNumber, setRecomputeJobNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const navigate = { navigate: () => console.log('Navigate to home') };
    const API_BASE_URL = 'https://192.168.88.55:5128';

    const handleRecomputeTotalQuantity = async () => {
        if (!recomputeJobNumber.trim()) {
            setResult({
                type: 'error',
                message: 'Veuillez entrer un num&eacute;ro de commande'
            });
            return;
        }

        setLoading(true);
        setResult(null);

        try {
            const response = await fetch(`${API_BASE_URL}/api/Dashboard/recompute-total/${recomputeJobNumber}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            let data = null;

            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                data = await response.json();
            } else {
                const text = await response.text();
                data = { message: text };
            }

            if (response.ok) {
                setResult({
                    type: data.changed ? 'success' : 'info',
                    message: data.message,
                    details: data
                });
            } else {
                setResult({
                    type: 'error',
                    message: data.message || 'Erreur lors du recalcul'
                });
            }
        } catch (error) {
            setResult({
                type: 'error',
                message: 'Erreur de connexion au serveur'
            });
        } finally {
            setLoading(false);
        }
    };

    const getResultIcon = (type) => {
        switch (type) {
            case 'success':
                return <CheckCircle className="h-5 w-5 text-green-500" />;
            case 'info':
                return <AlertTriangle className="h-5 w-5 text-blue-500" />;
            case 'error':
                return <XCircle className="h-5 w-5 text-red-500" />;
            default:
                return null;
        }
    };

    const getResultStyles = (type) => {
        switch (type) {
            case 'success':
                return 'bg-green-100 border-green-500 text-green-700';
            case 'info':
                return 'bg-blue-100 border-blue-500 text-blue-700';
            case 'error':
                return 'bg-red-100 border-red-500 text-red-700';
            default:
                return '';
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="mb-6 flex items-center">
                <button
                    onClick={() => navigate.navigate()}
                    className="mr-4 p-2 rounded-full hover:bg-gray-200 transition-colors"
                    title="Retour au tableau de bord"
                >
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-2xl font-bold">Fonctions Sp&eacute;ciales</h1>
            </div>

            <div className="space-y-8">
                {/* Fonction 1: Recalculer TotalQuantityJob */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <div className="flex items-center mb-4">
                        <RefreshCw className="mr-3 text-blue-500" size={24} />
                        <h2 className="text-xl font-semibold">Recalculer la Quantit&eacute; Totale</h2>
                    </div>

                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <AlertTriangle className="h-5 w-5 text-blue-400" />
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-blue-800">Instructions d&apos;utilisation :</h3>
                                <div className="mt-2 text-sm text-blue-700">
                                    <ul className="list-disc list-inside space-y-1">
                                        <li>Cette fonction recalcule la quantit&eacute; totale pr&eacute;vue pour une commande sp&eacute;cifique</li>
                                        <li>Entrez le num&eacute;ro de commande dans le champ ci-dessous</li>
                                        <li>Le syst&egrave;me v&eacute;rifiera automatiquement si la valeur a chang&eacute;</li>
                                        <li>Si la valeur est identique, aucune mise &agrave; jour ne sera effectu&eacute;e</li>
                                        <li>Utilisez cette fonction si vous suspectez des incoh&eacute;rences dans les quantit&eacute;s</li>
                                    </ul>
                                </div>
                                <div className="mt-4 text-sm text-red-500">
                                    <ul className="list-disc list-inside space-y-1">
                                        <li>Cette fonction est actuellement en panne. Elle sera en marche d'ici le 18 Juin</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="jobNumber" className="block text-sm font-medium text-gray-700 mb-2">
                                Num&eacute;ro de Commande
                            </label>
                            <div className="flex space-x-3">
                                <input
                                    type="text"
                                    id="jobNumber"
                                    value={recomputeJobNumber}
                                    onChange={(e) => setRecomputeJobNumber(e.target.value)}
                                    placeholder="Ex: 40778"
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    disabled={loading}
                                />
                                <button
                                    onClick={handleRecomputeTotalQuantity}
                                    disabled
                                    className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                >
                                    {loading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Calcul en cours...
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw className="mr-2" size={16} />
                                            Recalculer
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {result && (
                            <div className={`border-l-4 p-4 ${getResultStyles(result.type)}`}>
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        {getResultIcon(result.type)}
                                    </div>
                                    <div className="ml-3">
                                        <p className="font-medium">{result.message}</p>
                                        {result.details && (
                                            <div className="mt-2 text-sm">
                                                {result.details.changed && (
                                                    <>
                                                        <p>Ancienne valeur: {result.details.previousValue}</p>
                                                        <p>Nouvelle valeur: {result.details.newTotalQuantityJob}</p>
                                                    </>
                                                )}
                                                {!result.details.changed && (
                                                    <p>Valeur actuelle: {result.details.currentValue}</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Placeholder pour futures fonctions */}
                <div className="bg-gray-50 rounded-lg shadow-lg p-6 border-2 border-dashed border-gray-300">
                    <div className="text-center">
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-200">
                            <span className="text-gray-400 text-xl">+</span>
                        </div>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">Futures Fonctions</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            D&apos;autres fonctions sp&eacute;ciales seront ajout&eacute;es ici prochainement.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SpecialFunctions;