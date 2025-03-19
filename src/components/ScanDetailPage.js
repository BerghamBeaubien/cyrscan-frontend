import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { XCircle, Loader, ArrowLeft } from 'lucide-react';

const ScanDetailPage = () => {
    const { jobNumber } = useParams();
    const navigate = useNavigate();
    const [jobData, setJobData] = useState(null);
    const [scannedTags, setScannedTags] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const API_BASE_URL = 'https://192.168.88.55:5128';

    useEffect(() => {
        const fetchJobDetails = async () => {
            try {
                setLoading(true);

                // Fetch job details
                const jobResponse = await fetch(`${API_BASE_URL}/api/jobs/${jobNumber}`);
                if (!jobResponse.ok) {
                    throw new Error(`Job not found: ${jobNumber}`);
                }
                const jobData = await jobResponse.json();
                setJobData(jobData);

                // Fetch scanned tags for this job
                const tagsResponse = await fetch(`${API_BASE_URL}/api/jobs/${jobNumber}/tags`);
                if (!tagsResponse.ok) {
                    throw new Error('Failed to fetch scanned tags');
                }
                const tagsData = await tagsResponse.json();
                setScannedTags(tagsData);

            } catch (err) {
                setError(err.message || 'An error occurred while fetching job details');
            } finally {
                setLoading(false);
            }
        };

        fetchJobDetails();
    }, [jobNumber]);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Loader size={40} className="animate-spin text-blue-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 max-w-4xl mx-auto">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
                    <span className="block sm:inline">{error}</span>
                    <button
                        className="absolute top-0 right-0 mr-2 mt-2"
                        onClick={() => setError('')}
                    >
                        <XCircle size={20} />
                    </button>
                </div>
                <button
                    onClick={() => navigate('/scan')}
                    className="flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    <ArrowLeft size={18} className="mr-2" />
                    Retour à la page de scan
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-6 flex items-center">
                <button
                    onClick={() => navigate('/scan')}
                    className="mr-4 p-2 bg-gray-100 rounded-full hover:bg-gray-200"
                >
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-2xl font-bold">Détails du Job: {jobNumber}</h1>
            </div>

            {/* Job Details Card */}
            {jobData && (
                <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">Informations du Job</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-500">Numéro de Job</p>
                            <p className="font-medium">{jobData.jobNumber}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Nom</p>
                            <p className="font-medium">{jobData.name}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Date de création</p>
                            <p className="font-medium">{new Date(jobData.createdDate).toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Numéro de séquence</p>
                            <p className="font-medium">{jobData.sequenceNumber}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Scanned Tags Table */}
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <div className="p-6 border-b">
                    <h2 className="text-xl font-semibold">Tags scannés</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    ID de pièce
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Date de scan
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Quantité
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Code QR
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {scannedTags.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                                        Aucun tag scanné pour ce job
                                    </td>
                                </tr>
                            ) : (
                                scannedTags.map((tag) => (
                                    <tr key={tag.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {tag.partID}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {tag.scanDate ? new Date(tag.scanDate).toLocaleString() : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {tag.totalQuantityJob}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                                            {tag.qrCode}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ScanDetailPage;