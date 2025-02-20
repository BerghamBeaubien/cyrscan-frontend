import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Search } from 'lucide-react';

const Dashboard = () => {
    const [jobs, setJobs] = useState([]);
    const [stats, setStats] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedJobDetails, setSelectedJobDetails] = useState(null);
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

            console.log("Jobs dans l'état:", jobs);
            console.log("Stats reçues :", statsData);

            setJobs(jobs);
            setStats(statsData);
        } catch (error) {
            console.error('Erreur de récupération des données:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };


    const fetchJobDetails = async (jobNumber) => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/api/dashboard/jobs/${jobNumber}`);

            if (!response.ok) {
                setError("Numéro de commande introuvable !");
                return;
            }
            const detailsData = await response.json();
            setSelectedJobDetails(detailsData);
            setJobs([{
                jobNumber: parseInt(jobNumber),
                totalParts: detailsData.length,
                partID: detailsData[0].partId,
                totalQuantity: detailsData.reduce((sum, item) => sum + item.quantity, 0),
                totalScanned: detailsData.reduce((sum, item) => sum + item.scannedQuantity, 0),
                lastScanDate: detailsData[0]?.scanDate
            }]);
            const handleSearch = () => {
                const jobNumber = parseInt(searchTerm);
                if (!isNaN(jobNumber)) {
                    window.location.href = `http://192.168.88.55:3000/?jobNumber=${jobNumber}`;
                }
            };
            console.log("Détails du job reçus :", detailsData[0].partID);
        } catch (error) {
            //console.error('Error fetching job details:', error);
            //setError(error.message);
            setError("Numéro de commande introuvable !");
            return;
        } finally {
            setLoading(false);
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
                    //{ label: 'Unique Parts', value: stats?.TotalUniqueParts || 0 },
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
                        if (e.key === 'Enter') {
                            const jobNumber = parseInt(searchTerm);
                            if (!isNaN(jobNumber)) fetchJobDetails(jobNumber);
                        }
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
                {selectedJobDetails ? (
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th width="200" className="px-6 py-4 text-center-custom text-sm font-medium text-gray-700 uppercase">Nom de la Pièce</th>
                                <th width="80" className="px-6 py-4 text-center-custom text-sm font-medium text-gray-700 uppercase">Quantité</th>
                                <th width="80" className="px-6 py-4 text-center-custom text-sm font-medium text-gray-700 uppercase">Scanné</th>
                                <th width="180" className="px-6 py-4 text-center-custom text-sm font-medium text-gray-700 uppercase">Date de Scan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {selectedJobDetails.map((detail, index) => (
                                <tr key={index}>
                                    <td className="px-6 py-4 text-center-custom text-sm">{detail.partID}</td>
                                    <td className="px-6 py-4 text-center-custom text-sm">{detail.quantity}</td>
                                    <td
                                        className={`px-6 py-4 text-left text-sm font-bold ${detail.scannedQuantity < detail.quantity
                                                ? 'text-yellow-500'
                                                : detail.scannedQuantity > detail.quantity
                                                    ? 'text-red-500'
                                                    : 'text-green-500'
                                            }`}
                                    >
                                        {detail.scannedQuantity}
                                    </td>
                                    <td className="px-6 py-4 text-center text-sm">
                                        {new Date(detail.scanDate).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                ) : (
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
                                <tr key={job.jobNumber}>
                                    <td className="px-6 py-4 text-sm text-blue-500 cursor-pointer hover:underline"
                                        onClick={() => window.location.href = `http://192.168.88.55:3000/?jobNumber=${job.JobNumber}`}>
                                        {job.JobNumber}
                                    </td>
                                    <td className="px-6 py-4 text-sm">{job.TotalParts}</td>
                                    {/*<td className="px-6 py-4 text-sm">{job.TotalParts} / {job.RealTotalParts}</td>*/}
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
                )}
            </div>
        </div>
    );
};

export default Dashboard;