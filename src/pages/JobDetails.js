import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const JobDetails = () => {
    const [jobDetails, setJobDetails] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const { jobNumber } = useParams();
    const navigate = useNavigate();
    const API_BASE_URL = 'http://192.168.88.55:5128';

    useEffect(() => {
        const fetchJobDetails = async () => {
            try {
                setLoading(true);
                const response = await fetch(`${API_BASE_URL}/api/dashboard/jobs/${jobNumber}`);

                if (!response.ok) {
                    throw new Error("Numéro de commande introuvable!");
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
        const searchNumber = parseInt(searchTerm);
        if (!isNaN(searchNumber)) {
            navigate(`/jobs/${searchNumber}`);
        }
    };

    // Préparer les données pour le graphique
    const chartData = [{
        name: `Commande ${jobNumber}`,
        Total: jobDetails.reduce((sum, item) => sum + item.quantity, 0),
        Scanned: jobDetails.reduce((sum, item) => sum + item.scannedQuantity, 0)
    }];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-xl">Chargement...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="mb-6 flex justify-between items-center">
                <h1 className="text-2xl font-bold">Détails de la Commande {jobNumber}</h1>
                <div className="flex gap-4">
                    <button
                        onClick={() => navigate(`/scan/${jobNumber}`)}
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                    >
                        Scanner des pièces
                    </button>
                    <button
                        onClick={() => navigate('/')}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                    >
                        Retour au tableau de bord
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="mb-6 flex justify-between items-center">
                <h1 className="text-2xl font-bold">Détails de la Commande {jobNumber}</h1>
                <div className="flex gap-4">
                    <button
                        onClick={() => navigate(`/scan/${jobNumber}`)}
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                    >
                        Scanner des pièces
                    </button>
                    <button
                        onClick={() => navigate('/')}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                    >
                        Retour au tableau de bord
                    </button>
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
            </div>

            {/* Graphique */}
            <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
                <h2 className="text-xl font-semibold mb-6 text-center">Progression de la Commande</h2>
                <div className="flex justify-center">
                    <BarChart width={600} height={300} data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="Total" fill="#8884d8" name="Quantité Totale" />
                        <Bar dataKey="Scanned" fill="#82ca9d" name="Quantité Scannée" />
                    </BarChart>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <table className="min-w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Part ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantité</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scanné</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date de Scan</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {jobDetails.map((detail, index) => (
                            <tr key={index}>
                                <td className="px-6 py-4 whitespace-nowrap">{detail.partID}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{detail.quantity}</td>
                                <td className={`px-6 py-4 whitespace-nowrap ${detail.scannedQuantity < detail.quantity
                                        ? 'text-yellow-500'
                                        : detail.scannedQuantity > detail.quantity
                                            ? 'text-red-500'
                                            : 'text-green-500'
                                    }`}>
                                    {detail.scannedQuantity}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {new Date(detail.scanDate).toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default JobDetails;