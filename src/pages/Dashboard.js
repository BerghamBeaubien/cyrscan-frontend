import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const Dashboard = () => {
    const [jobs, setJobs] = useState([]);
    const [stats, setStats] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const API_BASE_URL = 'http://192.168.88.55:5128';

    const fetchAllData = async () => {
        try {
            setLoading(true);
            setError(null);

            const [jobsResponse, statsResponse] = await Promise.all([
                fetch(`${API_BASE_URL}/api/dashboard/jobs`),
                fetch(`${API_BASE_URL}/api/dashboard/stats`)
            ]);

            if (!jobsResponse.ok || !statsResponse.ok) {
                throw new Error(`HTTP error! Jobs: ${jobsResponse.status}, Stats: ${statsResponse.status}`);
            }

            const jobs = await jobsResponse.json();
            const statsData = await statsResponse.json();

            setJobs(jobs);
            setStats(statsData);
        } catch (error) {
            console.error('Erreur de récupération des données:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleJobSearch = async () => {
        const jobNumber = parseInt(searchTerm);
        if (!isNaN(jobNumber)) {
            navigate(`/jobs/${jobNumber}`);
        }
    };

    useEffect(() => {
        fetchAllData();
        const interval = setInterval(fetchAllData, 120000);
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
    if (error) return <div className="text-red-600 text-center">Error: {error}</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 place-items-center mb-8">
                {[
                    { label: 'Total des Commandes', value: stats?.TotalJobs || 0 },
                    { label: 'Étiquettes Scannées', value: stats?.TotalScannedItems || 0 },
                    { label: 'Dernière Commande', value: stats?.LatestJob || '-' }
                ].map((item, index) => (
                    <div key={index} className="bg-white p-6 rounded-lg shadow-lg text-center w-56">
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
            </div>

            {/* Chart */}
            <div className="bg-white p-6 rounded-lg shadow-lg mb-8 w-full">
                <h2 className="text-xl font-semibold mb-6 text-center">Progrès des Commandes Récentes</h2>
                <div className="flex justify-center">
                    <BarChart width={800} height={300} data={jobs.slice(0, 10)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="JobNumber" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="TotalQuantityJob" fill="#8884d8" name="Total" />
                        <Bar dataKey="TotalScanned" fill="#82ca9d" name="Scanné" />
                    </BarChart>
                </div>
            </div>

            {/* Jobs Table */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden w-full">
                <table className="min-w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 uppercase">Numero de Commande</th>
                            <th className="px-0 py-4 text-left text-sm font-medium text-gray-700 uppercase">Nombre de Pièces Uniques Scannées</th>
                            <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 uppercase">Progrès</th>
                            <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 uppercase">Dernier Scan</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {jobs.map((job) => (
                            <tr
                                key={job.JobNumber}
                                className="cursor-pointer hover:bg-gray-50"
                                onClick={() => navigate(`/jobs/${job.JobNumber}`)}
                            >
                                <td className="px-6 py-4 text-sm text-blue-500 hover:underline">
                                    {job.JobNumber}
                                </td>
                                <td className="px-6 py-4 text-sm">{job.TotalParts}</td>
                                <td className="px-6 py-4">
                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                        <div
                                            className="bg-blue-600 h-2.5 rounded-full"
                                            style={{ width: `${(job.TotalScanned / job.TotalQuantityJob * 100)}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-sm text-gray-500">
                                        {job.TotalScanned} / {job.TotalQuantityJob}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm">
                                    {new Date(job.LastScanDate).toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Dashboard;