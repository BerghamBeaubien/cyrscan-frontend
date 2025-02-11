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

            const jobsData = await jobsResponse.json();
            const statsData = await statsResponse.json();

            console.log("Jobs reçus :", jobsData);
            console.log("Stats reçues :", statsData);

            setJobs(jobsData);
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
                throw new Error(`HTTP error! Status: ${response.status}`);
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
            console.error("Détails du job reçus :", detailsData[0].partID);
        } catch (error) {
            console.error('Error fetching job details:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
        const interval = setInterval(fetchAllData, 120000);
        return () => clearInterval(interval);
    }, []);

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            const jobNumber = parseInt(searchTerm);
            if (!isNaN(jobNumber)) {
                fetchJobDetails(jobNumber);
            }
        }
    };


    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-xl">Loading dashboard...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-xl text-red-600">Error: {error}</div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto flex flex-col items-center">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 w-full">
                <div className="bg-white p-6 rounded-lg shadow-lg text-center">
                    <h3 className="text-gray-500 text-sm font-medium">Total Jobs</h3>
                    <p className="text-3xl font-bold mt-2">{stats?.TotalJobs || 0}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-lg text-center">
                    <h3 className="text-gray-500 text-sm font-medium">Scanned Items</h3>
                    <p className="text-3xl font-bold mt-2">{stats?.TotalScannedItems || 0}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-lg text-center">
                    <h3 className="text-gray-500 text-sm font-medium">Unique Parts</h3>
                    <p className="text-3xl font-bold mt-2">{stats?.TotalUniqueParts || 0}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-lg text-center">
                    <h3 className="text-gray-500 text-sm font-medium">Latest Job</h3>
                    <p className="text-3xl font-bold mt-2">{stats?.LatestJob || '-'}</p>
                </div>
            </div>

            {/* Search Bar */}
            <div className="mb-8 w-full max-w-2xl relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Search by job number..."
                    className="w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onKeyDown={handleKeyDown}
                />
            </div>

            {/* Chart */}
            <div className="bg-white p-6 rounded-lg shadow-lg mb-8 w-full">
                <h2 className="text-xl font-semibold mb-6 text-center">Recent Jobs Progress</h2>
                <div className="flex justify-center">
                    <BarChart width={800} height={300} data={jobs.slice(0, 10)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="jobNumber" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="totalQuantity" fill="#8884d8" name="Total Quantity" />
                        <Bar dataKey="totalScanned" fill="#82ca9d" name="Scanned" />
                    </BarChart>
                </div>
            </div>

            {/* Jobs Table */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden w-full">
                {selectedJobDetails ? (
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th width="200" className="px-6 py-4 text-center text-sm font-medium text-gray-700 uppercase">Part ID</th>
                                <th width="80" className="px-6 py-4 text-center text-sm font-medium text-gray-700 uppercase">Quantity</th>
                                <th width="80" className="px-6 py-4 text-center text-sm font-medium text-gray-700 uppercase">Scanned</th>
                                <th width="180" className="px-6 py-4 text-center text-sm font-medium text-gray-700 uppercase">Scan Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {selectedJobDetails.map((detail, index) => (
                                <tr key={index}>
                                    <td className="px-6 py-4 text-center text-sm">{detail.partID}</td>
                                    <td className="px-6 py-4 text-center text-sm">{detail.quantity}</td>
                                    <td className="px-6 py-4 text-center text-sm">{detail.scannedQuantity}</td>
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
                                <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 uppercase">Job Number</th>
                                <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 uppercase">Total Parts</th>
                                <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 uppercase">Progress</th>
                                <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 uppercase">Last Scan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {jobs.map((job) => (
                                <tr key={job.jobNumber}>
                                    <td className="px-6 py-4 text-sm">{job.jobNumber}</td>
                                    <td className="px-6 py-4 text-sm">{job.totalParts}</td>
                                    <td className="px-6 py-4">
                                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                                            <div
                                                className="bg-blue-600 h-2.5 rounded-full"
                                                style={{ width: `${(job.totalScanned / job.totalQuantity * 100)}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-sm text-gray-500">
                                            {job.totalScanned} / {job.totalQuantity}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        {new Date(job.lastScanDate).toLocaleString()}
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