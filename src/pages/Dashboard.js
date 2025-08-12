import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, BarChart3, RefreshCw, Package } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { API_BASE_URL } from '../config';

const Dashboard = () => {
    const [jobs, setJobs] = useState([]);
    const [stats, setStats] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    //const API_BASE_URL = 'https://192.168.88.55:5128';

    const fetchAllData = async () => {
        try {
            if (!loading) setRefreshing(true);
            setError(null);

            const [jobsResponse, statsResponse] = await Promise.all([
                fetch(`${API_BASE_URL}/api/dashboard/jobs`),
                fetch(`${API_BASE_URL}/api/dashboard/stats`)
            ]);

            if (!jobsResponse.ok || !statsResponse.ok) {
                throw new Error(`HTTP error! Jobs: ${jobsResponse.status}, Stats: ${statsResponse.status}`);
            }

            const jobsData = await jobsResponse.json();
            const statsData = await statsResponse.json();

            setJobs(jobsData);
            setStats(statsData);
        } catch (error) {
            console.error('Erreur de récupération des données:', error);
            setError(error.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleJobSearch = async () => {
        // Permet de rechercher un jobNumber même s'il est alphanumérique
        if (searchTerm.trim()) {
            navigate(`/jobs/${searchTerm.trim()}`);
        }
    };

    useEffect(() => {
        fetchAllData();
        const interval = setInterval(fetchAllData, 120000); // Rafraîchir toutes les 2 minutes
        return () => clearInterval(interval);
    }, []);

    const formatDataForChart = (jobs) => {
        return jobs.slice(0, 10).map(job => ({
            name: job.jobNumber.substring(0, 8), // On tronque si le job number est trop long
            "Pièces Scannées": job.totalScanned || 0,
            "Pièces Total": job.totalExpected || 0
        }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <Loader size={60} className="text-blue-500 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Chargement des données...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-md max-w-lg w-full">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 text-red-500">
                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">Erreur de chargement</h3>
                            <div className="mt-2 text-sm text-red-700">
                                <p>{error}</p>
                            </div>
                            <div className="mt-4">
                                <button
                                    type="button"
                                    onClick={fetchAllData}
                                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                >
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Réessayer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header with refresh button */}
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold">Tableau de Bord CyrScan</h1>
                <button
                    onClick={fetchAllData}
                    className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    disabled={refreshing}
                >
                    <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Actualisation...' : 'Actualiser'}
                </button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 place-items-center mb-8">
                {[
                    { label: 'Total des Commandes', value: stats?.TotalJobs || 0, icon: <BarChart3 className="text-purple-500" size={24} /> },
                    { label: 'Étiquettes Scannées', value: stats?.TotalScannedItems || 0, icon: <QrCodeIcon className="text-green-500" size={24} /> },
                    { label: "Palettes dans l'Entrepôt", value: stats?.TotalPallets || 0, icon: <Package className="text-blue-500" size={24} /> }
                ].map((item, index) => (
                    <div key={index} className="bg-white p-6 rounded-lg shadow-lg text-center w-full max-w-xs">
                        <div className="flex justify-center mb-3">
                            {item.icon}
                        </div>
                        <h3 className="text-gray-500 text-sm font-medium">{item.label}</h3>
                        <p className="text-3xl font-bold mt-2">{item.value}</p>
                    </div>
                ))}
            </div>

            {/* Search Bar */}
            <div className="mb-8 max-w-2xl mx-auto relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Chercher une Commande..."
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

            {/* Chart */}
            <div className="bg-white p-6 rounded-lg shadow-lg mb-8 w-full">
                <h2 className="text-xl font-semibold mb-6 text-center">Commandes Récentes</h2>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={formatDataForChart(jobs)}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="Pièces Total" fill="#8884d8" />
                            <Bar dataKey="Pièces Scannées" fill="#82ca9d" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Jobs Table */}
            <div className="bg-white rounded-lg shadow-lg overflow-x-auto w-full">
                <table className="min-w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 uppercase">Numéro de Commande</th>
                            <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 uppercase">Pièces Scannées</th>
                            <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 uppercase">Pièces Uniques</th>
                            <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 uppercase">Pièces Total</th>
                            <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 uppercase">Palettes</th>
                            <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 uppercase">Dernier Scan</th>
                            <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {jobs.map((job) => (
                            <tr
                                key={job.jobNumber}
                                className="hover:bg-gray-50"
                            >
                                <td className="px-6 py-4 text-sm font-medium text-blue-500">
                                    {job.jobNumber}
                                </td>
                                <td className="px-6 py-4 text-sm">{job.totalScanned || 0}</td>
                                <td className="px-6 py-4 text-sm">{job.totalParts || 0}</td>
                                <td className="px-6 py-4 text-sm">{job.totalExpected || 0}</td>
                                <td className="px-6 py-4 text-sm">{job.totalPallets || 0}</td>
                                <td className="px-6 py-4 text-sm">
                                    {job.lastScanDate ? new Date(job.lastScanDate).toLocaleString() : '-'}
                                </td>
                                <td className="px-6 py-4 text-sm">
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => navigate(`/jobs/${job.jobNumber}`)}
                                            className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                                        >
                                            Détails
                                        </button>
                                        <button
                                            onClick={() => navigate(`/scan/${job.jobNumber}`)}
                                            className="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                                        >
                                            Scanner
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// Custom QR Code icon
const QrCodeIcon = ({ size = 24, className = "" }) => (
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
        <rect x="3" y="3" width="7" height="7"></rect>
        <rect x="14" y="3" width="7" height="7"></rect>
        <rect x="3" y="14" width="7" height="7"></rect>
        <rect x="14" y="14" width="7" height="7"></rect>
    </svg>
);

// Loader component
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

export default Dashboard;