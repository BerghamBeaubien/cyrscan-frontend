import React, { useState } from 'react';
import { XCircle, Trash2 } from 'lucide-react';

const ScanPage = () => {
    const [scannedData, setScannedData] = useState([]);
    const [error, setError] = useState('');
    const [modificationMode, setModificationMode] = useState(false);
    const API_BASE_URL = 'http://192.168.88.55:5128';

    const handleManualInput = async (event) => {
        if (event.key === 'Enter') {
            const scannedText = event.target.value.trim();
            await processBarcode(scannedText);
            event.target.value = ''; // Clear input after processing
        }
    };

    const processBarcode = async (scannedText) => {
        if (scannedText.startsWith("*") && scannedText.endsWith("*")) {
            scannedText = scannedText.substring(1, scannedText.length - 2);
        }

        const normalizedText = scannedText.replace(/[/-]/g, '-');
        const match = normalizedText.match(/^(\d{5,6})-(.+)-(\d+)$/);

        if (!match) {
            setError('Format de code-barres invalide!');
            return;
        }

        const [_, jobNumber, partId, quantity] = match;

        try {
            const response = await fetch(`${API_BASE_URL}/api/Dashboard/scan`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    jobNumber: parseInt(jobNumber),
                    partId,
                    quantity: parseInt(quantity)
                })
            });

            if (!response.ok) {
                throw new Error('Erreur lors de l\'enregistrement');
            }

            const result = await response.json();
            setScannedData(prev => [...prev, {
                jobNumber,
                partId,
                quantity,
                timestamp: new Date().toLocaleString(),
                status: 'success'
            }]);
            setError('');
        } catch (err) {
            setError(err.message);
            setScannedData(prev => [...prev, {
                jobNumber,
                partId,
                quantity,
                timestamp: new Date().toLocaleString(),
                status: 'error'
            }]);
        }
    };

    const handleDeleteScan = async (jobNumber, partId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/Dashboard/delete`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ jobNumber, partId })
            });

            if (!response.ok) {
                throw new Error('Erreur lors de la suppression');
            }

            // Remove from UI
            setScannedData(prev => prev.filter(scan => !(scan.jobNumber === jobNumber && scan.partId === partId)));
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold mb-4">Scanner de Code-barres</h1>

                <div className="mb-4 space-y-4">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Scannez ou entrez le code ici..."
                            className="w-full p-2 border rounded"
                            onKeyPress={handleManualInput}
                            autoFocus
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2 mb-4">
                    <input
                        type="checkbox"
                        id="modificationMode"
                        checked={modificationMode}
                        onChange={() => setModificationMode(!modificationMode)}
                        className="cursor-pointer"
                    />
                    <label htmlFor="modificationMode" className="cursor-pointer text-gray-700">
                        Mode de modification
                    </label>
                </div>

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
                        <span className="block sm:inline">{error}</span>
                        <button
                            className="absolute top-0 right-0 mr-2 mt-2"
                            onClick={() => setError('')}
                        >
                            <XCircle size={20} />
                        </button>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <table className="min-w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Part ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantité</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Horodatage</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            {modificationMode && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {scannedData.map((scan, index) => (
                            <tr key={index}>
                                <td className="px-6 py-4 whitespace-nowrap">{scan.jobNumber}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{scan.partId}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{scan.quantity}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{scan.timestamp}</td>
                                <td className={`px-6 py-4 whitespace-nowrap ${scan.status === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                                    {scan.status === 'success' ? 'Succès' : 'Erreur'}
                                </td>
                                {modificationMode && (
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button
                                            onClick={() => handleDeleteScan(scan.jobNumber, scan.partId)}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ScanPage;