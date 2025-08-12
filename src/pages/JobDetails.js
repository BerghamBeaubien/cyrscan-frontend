import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, ArrowLeft, QrCode} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { API_BASE_URL } from '../config';

// Define Loader component properly
const Loader = ({ size = 24, className = "" }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <line x1="12" y1="2" x2="12" y2="6"></line>
        <line x1="12" y1="18" x2="12" y2="22"></line>
        <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
        <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
        <line x1="2" y1="12" x2="6" y2="12"></line>
        <line x1="18" y1="12" x2="22" y2="12"></line>
        <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
        <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
    </svg>
);

const JobDetails = () => {
    const [jobDetails, setJobDetails] = useState({
        databaseParts: [],
        excelParts: [],
        scanDetails: {}, // New scan details structure
        totalParts: 0,
        jobNumber: ''
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPart, setSelectedPart] = useState(null);
    const [hoveredSequence, setHoveredSequence] = useState(null);
    const { jobNumber } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchJobDetails = async () => {
            try {
                setLoading(true);
                // Use the new combined endpoint
                const response = await fetch(`${API_BASE_URL}/api/dashboard/jobs/${jobNumber}/complete`);

                if (!response.ok) {
                    throw new Error("Num&eacute;ro de commande introuvable!");
                }

                const data = await response.json();
                setJobDetails(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (jobNumber) {
            fetchJobDetails();
        }
    }, [jobNumber]);

    const handleJobSearch = () => {
        if (searchTerm.trim()) {
            navigate(`/jobs/${searchTerm}`);
        }
    };

    const handlePartClick = (partId) => {
        // Just toggle the display, no need to fetch data
        setSelectedPart(selectedPart === partId ? null : partId);
    };

    // Get part details directly from the already-loaded scan details
    const getPartDetails = (partId) => {
        return jobDetails.scanDetails?.[partId] || [];
    };

    const getPalletForSequence = (partId, sequence) => {
        const details = getPartDetails(partId);
        if (!details || details.length === 0) return "N/A";

        // Normalize the input sequence by removing leading zeros
        const normalizedSequence = sequence.toString().replace(/^0+/, '');

        const detail = details.find(d => {
            if (!d.qrCode) return false;

            // Split the QR code and extract the sequence number
            const qrParts = d.qrCode.split('-');
            const scannedSequence = qrParts.length >= 4 ? qrParts[qrParts.length - 1].replace(/^0+/, '') : "";

            // Compare normalized sequences
            return scannedSequence === normalizedSequence;
        });

        return detail ? detail.palletName : "N/A";
    };

    // Préparer les données pour le graphique avec les noms corrects
    const chartData = [
        {
            name: `Commande ${jobNumber}`,
            "Pi\u00E8ces totales": jobDetails.totalParts || 0,
            "Pi\u00E8ces scann\u00E9es": jobDetails.databaseParts?.reduce((sum, item) => sum + item.scannedCount, 0) || 0
        }
    ];

    // Calcul du taux de complétion
    const totalScanned = jobDetails.databaseParts?.reduce((sum, item) => sum + item.scannedCount, 0) || 0;
    const totalExpected = jobDetails.totalParts || 0;
    const completionRate = totalExpected > 0 ? Math.round((totalScanned / totalExpected) * 100) : 0;

    // Fonction pour obtenir toutes les séquences pour un partId donné
    const getAllSequencesForPart = (partId) => {
        return jobDetails.excelParts
            ?.filter(part => part.partID === partId)
            .map(part => part.seqNumber) || [];
    };

    // Fonction pour vérifier si une séquence a été scannée
    const isSequenceScanned = (partId, sequence) => {
        const details = getPartDetails(partId);
        if (!details || details.length === 0) return false;

        // Convert sequence to string and ensure it's properly padded with leading zeros
        const seqStr = sequence.toString().padStart(2, '0');

        return details.some(detail => {
            // Parse QRCode to extract sequence
            const qrParts = detail.qrCode?.split('-');
            // Get the last part of the QR code which is the sequence
            const scannedSequence = qrParts && qrParts.length > 0 ? qrParts[qrParts.length - 1] : "";
            return scannedSequence === seqStr;
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <Loader size={60} className="text-blue-500 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Chargement des donn&eacute;es...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-7xl mx-auto p-6">
                <div className="mb-6 flex items-center">
                    <button
                        onClick={() => navigate('/')}
                        className="mr-4 p-2 rounded-full hover:bg-gray-200"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-2xl font-bold">Détails de la Commande {jobNumber}</h1>
                </div>

                <div className="bg-red-100 border-l-4 border-red-500 p-4 mb-6">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-red-700">{error}</p>
                        </div>
                    </div>
                </div>

                <div className="flex space-x-4">
                    <button
                        onClick={() => navigate('/')}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded flex items-center"
                    >
                        <ArrowLeft className="mr-2" size={18} />
                        Retour au tableau de bord
                    </button>

                    <button
                        onClick={() => navigate(`/scan/${jobNumber}`)}
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded flex items-center"
                    >
                        <QrCode className="mr-2" size={18} />
                        Scanner des pi&egrave;ces
                    </button>
                </div>
            </div>
        );
    }

    // Grouper les parts par partID
    const partsByPartId = {};
    jobDetails.excelParts?.forEach(part => {
        if (!partsByPartId[part.partID]) {
            partsByPartId[part.partID] = [];
        }
        partsByPartId[part.partID].push(part.seqNumber);
    });

    // Obtenir les données pour l'affichage des parts
    const partsDisplay = Object.keys(partsByPartId).map(partId => {
        // Find in database parts for accurate counts that are now available immediately
        const dbPart = jobDetails.databaseParts?.find(p => p.partID === partId);
        const totalSequences = partsByPartId[partId].length;
        const scannedCount = dbPart?.scannedCount || 0;
        const progress = totalSequences > 0 ? (scannedCount / totalSequences) * 100 : 0;
        const lastScanDate = dbPart?.lastScanDate;

        return {
            partId,
            totalSequences,
            scannedCount,
            progress,
            lastScanDate
        };
    });

    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="mb-6 flex justify-between items-center">
                <div className="flex items-center">
                    <button
                        onClick={() => navigate('/')}
                        className="mr-4 p-2 rounded-full hover:bg-gray-200 transition-colors"
                        title="Retour au tableau de bord"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-2xl font-bold">D&eacute;tails de la Commande {jobNumber}</h1>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => navigate(`/scan/${jobNumber}`)}
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded flex items-center transition-colors"
                    >
                        <QrCode className="mr-2" size={18} />
                        Scanner des pi&egrave;ces
                    </button>
                </div>
            </div>

            {/* Cartes de statistiques */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-5 rounded-lg shadow-md">
                    <div className="flex items-center justify-between">
                        <h3 className="text-gray-500 text-sm font-medium">Taux de compl&eacute;tion</h3>
                        <span className={`px-2 py-1 rounded-full text-xs ${completionRate >= 100 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                            {completionRate}%
                        </span>
                    </div>
                    <div className="mt-4 w-full bg-gray-200 rounded-full h-2.5">
                        <div
                            className={`h-2.5 rounded-full ${completionRate >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                            style={{ width: `${Math.min(completionRate, 100)}%` }}
                        ></div>
                    </div>
                    <div className="mt-2 text-sm text-gray-600 flex justify-between">
                        <span>{totalScanned} scann&eacute;es</span>
                        <span>{totalExpected} total</span>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-lg shadow-md">
                    <h3 className="text-gray-500 text-sm font-medium">Pi&egrave;ce uniques</h3>
                    <p className="text-3xl font-bold mt-2">{Object.keys(partsByPartId).length}</p>
                    <p className="text-sm text-gray-500 mt-2">Types de pi&egrave;ce diff&eacute;rentes</p>
                </div>

                <div className="bg-white p-5 rounded-lg shadow-md">
                    <h3 className="text-gray-500 text-sm font-medium">Palettes</h3>
                    <p className="text-3xl font-bold mt-2">
                        {
                            // Compte unique des palettes avec le nom correct
                            new Set(
                                jobDetails.databaseParts
                                    ?.map(part => part.pallets?.split(', ') || [])
                                    .flat()
                                    .filter(Boolean)
                            ).size
                        }
                    </p>
                    <p className="text-sm text-gray-500 mt-2">Utilis&eacute;es pour cette commande</p>
                </div>
            </div>

            {/* Barre de recherche */}
            <div className="mb-8 max-w-2xl mx-auto relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Chercher une autre commande..."
                    className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleJobSearch();
                    }}
                />
                <button
                    onClick={handleJobSearch}
                    className="absolute right-2 top-2 bg-blue-500 text-white px-4 py-1 rounded"
                >
                    Chercher
                </button>
            </div>

            {/* Graphique */}
            <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
                <h2 className="text-xl font-semibold mb-6 text-center">Progression de la Commande</h2>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="Pi&egrave;ces totales" fill="#8884d8" />
                            <Bar dataKey="Pi&egrave;ces scann&eacute;es" fill="#82ca9d" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Table des pièces avec barre de progression */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
                <div className="overflow-x-auto"> {/* Add this div to make the table horizontally scrollable */}
                    <table className="min-w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Part ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progression</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scann&eacute;es / Total</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dernier Scan</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {partsDisplay.map((part, index) => {
                                const isComplete = part.scannedCount >= part.totalSequences;
                                const isOverscanned = part.scannedCount > part.totalSequences;

                                return (
                                    <React.Fragment key={index}>
                                        <tr className={selectedPart === part.partId ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                                            <td className="px-6 py-4 whitespace-nowrap font-medium">
                                                {part.partId}
                                            </td>
                                            <td className="px-6 py-4" style={{ width: '30%' }}>
                                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                                    <div
                                                        className={`h-2.5 rounded-full ${isComplete ? (isOverscanned ? 'bg-red-500' : 'bg-green-500') : 'bg-blue-500'}`}
                                                        style={{ width: `${Math.min(part.progress, 100)}%` }}
                                                    ></div>
                                                </div>
                                            </td>
                                            <td className={`px-6 py-4 whitespace-nowrap ${isOverscanned ? 'text-red-500 font-bold' :
                                                isComplete ? 'text-green-500 font-bold' : 'text-yellow-500'
                                                }`}>
                                                {part.scannedCount} / {part.totalSequences}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {part.lastScanDate ? new Date(part.lastScanDate).toLocaleString() : 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <button
                                                    onClick={() => handlePartClick(part.partId)}
                                                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors text-xs font-medium"
                                                >
                                                    {selectedPart === part.partId ? 'Masquer d\u00E9tails' : 'Voir d\u00E9tails'}
                                                </button>
                                            </td>
                                        </tr>

                                        {/* Affichage détaillé des séquences avec code couleur */}
                                        {selectedPart === part.partId && (
                                            <tr>
                                                <td colSpan="6" className="px-6 py-4 bg-gray-50">
                                                    <div>
                                                        <h3 className="font-medium text-gray-700 mb-3">S&eacute;quences pour {part.partId}</h3>

                                                        {/* Grille des séquences avec code couleur */}
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-2 mb-4">
                                                            {getAllSequencesForPart(part.partId).sort((a, b) => a - b).map((seq) => {
                                                                const scanned = isSequenceScanned(part.partId, seq);
                                                                const pallet = getPalletForSequence(part.partId, seq);

                                                                return (
                                                                    <div
                                                                        key={seq}
                                                                        className={`p-2 text-center rounded border ${scanned ? 'bg-green-100 border-green-300 text-green-800' : 'bg-white border-gray-300 text-gray-700'
                                                                            }`}
                                                                    >
                                                                        <div className="relative">
                                                                            <button
                                                                                className="w-full h-full focus:outline-none"
                                                                                onMouseEnter={() => setHoveredSequence(seq)}
                                                                                onMouseLeave={() => setHoveredSequence(null)}
                                                                            >
                                                                                Pi&egrave;ce {seq}
                                                                            </button>
                                                                            {hoveredSequence === seq && scanned && (
                                                                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded shadow-lg">
                                                                                    Palette: {pallet}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>

                                                        {/* Légende */}
                                                        <div className="flex gap-4 text-xs text-gray-600 mt-2">
                                                            <div className="flex items-center">
                                                                <div className="w-3 h-3 rounded bg-green-100 border border-green-300 mr-1"></div>
                                                                <span>Scann&eacute;e</span>
                                                            </div>
                                                            <div className="flex items-center">
                                                                <div className="w-3 h-3 rounded bg-white border border-gray-300 mr-1"></div>
                                                                <span>Non scann&eacute;e</span>
                                                            </div>
                                                        </div>

                                                        {/* Table des détails scannés */}
                                                        {getPartDetails(part.partId).length > 0 && (
                                                            <div className="mt-6 overflow-x-auto">
                                                                <h4 className="font-medium text-gray-700 mb-2">D&eacute;tails des scans</h4>
                                                                <table className="min-w-full divide-y divide-gray-200 border rounded-lg">
                                                                    <thead className="bg-gray-100">
                                                                        <tr>
                                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">QR Code</th>
                                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">S&eacute;quence</th>
                                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Palette</th>
                                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date de scan</th>
                                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Scann&eacute; par</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-gray-200 bg-white">
                                                                        {getPartDetails(part.partId).map((detail, idx) => {
                                                                            // Extract sequence number from QR code
                                                                            let sequence = "";
                                                                            if (detail.qrCode) {
                                                                                const parts = detail.qrCode.split('-');
                                                                                if (parts.length >= 4) {
                                                                                    sequence = parts[parts.length - 1].replace(/^0+/, ''); // Remove leading zeros
                                                                                }
                                                                            }

                                                                            return (
                                                                                <tr key={idx} className="bg-green-50">
                                                                                    <td className="px-4 py-2 whitespace-nowrap text-xs font-mono">
                                                                                        {detail.qrCode}
                                                                                    </td>
                                                                                    <td className="px-4 py-2 whitespace-nowrap text-xs font-semibold text-green-700">
                                                                                        {sequence}
                                                                                    </td>
                                                                                    <td className="px-4 py-2 whitespace-nowrap text-xs">
                                                                                        {detail.palletName}
                                                                                    </td>
                                                                                    <td className="px-4 py-2 whitespace-nowrap text-xs">
                                                                                        {new Date(detail.scanDate).toLocaleString()}
                                                                                    </td>
                                                                                    <td className="px-4 py-2 whitespace-nowrap text-xs">
                                                                                        {detail.scannedByUser || "Inconnu"}
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default JobDetails;