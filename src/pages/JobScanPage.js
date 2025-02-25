import React, { useState, useEffect, useRef } from 'react';
import { XCircle, Trash2, ChevronDown, ChevronUp, Loader } from 'lucide-react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

const JobScanPage = () => {
    const [scannedData, setScannedData] = useState([]);
    const [jobProgress, setJobProgress] = useState([]);
    const [error, setError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showScannedData, setShowScannedData] = useState(true);
    const [showJobProgress, setShowJobProgress] = useState(false);
    const [modificationMode, setModificationMode] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [validationMessage, setValidationMessage] = useState('');
    const inputRef = useRef(null);
    const API_BASE_URL = 'http://192.168.88.55:5128';
    const { jobNumber } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    let barcodeBuffer = '';
    let barcodeTimeout = null;

    useEffect(() => {
        fetchJobProgress();
        // If there's an initial scan from redirect, add it to scannedData
        if (location.state?.initialScan) {
            setScannedData([location.state.initialScan]);
            // Clear the state after using it
            navigate(location.pathname, { replace: true, state: {} });
        }

        // Setup global event listener for barcode scanner
        document.addEventListener('keydown', handleGlobalKeydown);

        return () => {
            document.removeEventListener('keydown', handleGlobalKeydown);
        };
    }, [jobNumber]);

    // Handle global keydown events for barcode scanner
    const handleGlobalKeydown = (event) => {
        // Ignore if user is typing in an input field that isn't our barcode input
        if (
            document.activeElement.tagName === 'INPUT' ||
            document.activeElement.tagName === 'TEXTAREA'
        ) {
            // Only allow processing if this is actually the barcode input field
            if (document.activeElement === inputRef.current && event.key === 'Enter') {
                event.preventDefault();
                if (barcodeBuffer.trim()) {
                    processBarcode(barcodeBuffer.trim());
                    barcodeBuffer = '';
                    if (inputRef.current) {
                        inputRef.current.value = '';
                    }
                }
            }
            return;
        }

        // If Enter key is pressed, process the barcode
        if (event.key === 'Enter') {
            event.preventDefault();
            if (barcodeBuffer.trim()) {
                processBarcode(barcodeBuffer.trim());
                barcodeBuffer = '';
                if (inputRef.current) {
                    inputRef.current.value = '';
                }
            }
            return;
        }

        // Append character to buffer
        if (event.key.length === 1 || event.key === '-') {
            barcodeBuffer += event.key;
            if (inputRef.current) {
                inputRef.current.value = barcodeBuffer;
            }
        }

        // Reset timeout
        clearTimeout(barcodeTimeout);
        barcodeTimeout = setTimeout(() => {
            // If no more keys pressed in 50ms, assume barcode scan is complete
            if (barcodeBuffer.trim() && barcodeBuffer.includes('-')) {
                processBarcode(barcodeBuffer.trim());
                barcodeBuffer = '';
                if (inputRef.current) {
                    inputRef.current.value = '';
                }
            }
        }, 50);
    };

    const fetchJobProgress = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/Dashboard/jobs/${jobNumber}`);
            if (!response.ok) {
                throw new Error('Erreur lors du chargement des données');
            }
            const data = await response.json();
            setJobProgress(data);
        } catch (err) {
            // Don't show the error if it's the initial load
            if (err.message !== 'Erreur lors du chargement des données') {
                setError(err.message);
            }
        }
    };

    const handleManualInput = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            const scannedText = event.target.value.trim();
            processBarcode(scannedText);
            event.target.value = '';
        }
    };

    const processBarcode = async (scannedText) => {
        if (isProcessing) return;
        setIsProcessing(true);
        if (scannedText.startsWith("*") && scannedText.endsWith("*")) {
            scannedText = scannedText.substring(1, scannedText.length - 2);
        }

        const normalizedText = scannedText.replace(/[/-]/g, '-');
        const match = normalizedText.match(/^(\d{5,6})-(.+)-(\d+)$/);

        if (!match) {
            setError('Format de code-barres invalide!');
            return;
        }

        const [_, scannedJobNumber, partId, quantity] = match;

        // If scanned job number is different, redirect to that job's scan page with the scan data
        if (scannedJobNumber !== jobNumber) {
            // Attempt to save to database first
            try {
                const response = await fetch(`${API_BASE_URL}/api/Dashboard/scan`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        jobNumber: parseInt(scannedJobNumber),
                        partId,
                        quantity: parseInt(quantity)
                    })
                });

                const responseData = await response.json();

                // Prepare scan data with appropriate status
                const scanData = {
                    jobNumber: scannedJobNumber,
                    partId,
                    quantity,
                    timestamp: new Date().toLocaleString(),
                    status: response.ok ? 'success' : 'error',
                    uniqueId: `${scannedJobNumber}-${partId}-${Date.now()}`
                };

                // Store any error message
                if (!response.ok) {
                    scanData.errorMessage = responseData.message || 'Erreur lors de l\'enregistrement';
                }

                // Navigate with the scan data
                navigate(`/scan/${scannedJobNumber}`, { state: { initialScan: scanData } });
            } catch (err) {
                // Handle error case
                const scanData = {
                    jobNumber: scannedJobNumber,
                    partId,
                    quantity,
                    timestamp: new Date().toLocaleString(),
                    status: 'error',
                    errorMessage: err.message,
                    uniqueId: `${scannedJobNumber}-${partId}-${Date.now()}`
                };
                navigate(`/scan/${scannedJobNumber}`, { state: { initialScan: scanData } });
            }
            setIsProcessing(false);
            return;            
        }

        // Show loading screen
        setIsLoading(true);
        setValidationMessage('Vérification en cours...');
        setError('');

        try {
            const response = await fetch(`${API_BASE_URL}/api/Dashboard/scan`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    jobNumber: parseInt(scannedJobNumber),
                    partId,
                    quantity: parseInt(quantity)
                })
            });

            const responseData = await response.json();

            if (!response.ok) {
                // Handle the validation error from backend
                throw new Error(responseData.message || 'Erreur lors de l\'enregistrement');
            }

            const newScan = {
                jobNumber: scannedJobNumber,
                partId,
                quantity,
                timestamp: new Date().toLocaleString(),
                status: 'success',
                uniqueId: `${scannedJobNumber}-${partId}-${Date.now()}`
            };

            setScannedData(prev => [...prev, newScan]);
            setShowScannedData(true); // Show scanned data table when new scan is added
            setValidationMessage(responseData.message || 'Scan enregistré avec succès');
            setError('');
            await fetchJobProgress();

        } catch (err) {
            setError(err.message);
            setScannedData(prev => [...prev, {
                jobNumber: scannedJobNumber,
                partId,
                quantity,
                timestamp: new Date().toLocaleString(),
                status: 'error',
                uniqueId: `${scannedJobNumber}-${partId}-${Date.now()}`
            }]);
            setShowScannedData(true); // Show scanned data table even on error
        } finally {
            // Hide loading screen after a short delay so users can see the message
            setTimeout(() => {
                setIsLoading(false);
                // Clear validation message after a few seconds
                setTimeout(() => {
                    setValidationMessage('');
                }, 3000);
            }, 500);
        }
    };

    const handleDeleteScan = async (uniqueId, jobNumber, partId, status) => {
        // If status is 'error', just remove from local state without API call
        if (status === 'error') {
            setScannedData(prev => prev.filter(scan => scan.uniqueId !== uniqueId));
            return;
        }

        // Otherwise, make the API call for successful scans
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

            setScannedData(prev => prev.filter(scan => scan.uniqueId !== uniqueId));
            await fetchJobProgress(); // Refresh job progress after deletion
        } catch (err) {
            setError(err.message);
        }
    };

    // Loading overlay component
    const LoadingOverlay = () => (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-lg flex flex-col items-center max-w-md w-full">
                <Loader size={60} className="text-blue-500 animate-spin mb-4" />
                <h2 className="text-2xl font-bold mb-2">Traitement en cours</h2>
                <p className="text-gray-700 text-center">{validationMessage}</p>
                <p className="text-gray-500 text-sm mt-4">Veuillez patienter...</p>
            </div>
        </div>
    );

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Loading Overlay */}
            {isLoading && <LoadingOverlay />}

            <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold">
                        {jobNumber
                            ? `Scanner - Commande ${jobNumber}`
                            : 'Scanner de Code-barres'
                        }
                    </h1>
                    {jobNumber && (
                        <button
                            onClick={() => navigate(`/jobs/${jobNumber}`)}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                        >
                            Voir les détails de la commande
                        </button>
                    )}
                </div>

                <div className="mb-4">
                    <div className="relative">
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder={jobNumber
                                ? `Scannez les pièces pour la commande ${jobNumber}...`
                                : "Scannez ou entrez le code ici..."
                            }
                            className="w-full p-2 border rounded"
                            onKeyDown={handleManualInput}
                            autoFocus
                        />
                    </div>
                </div>

                {/* Validation message */}
                {validationMessage && !isLoading && (
                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
                        <span className="block sm:inline">{validationMessage}</span>
                        <button
                            className="absolute top-0 right-0 mr-2 mt-2"
                            onClick={() => setValidationMessage('')}
                        >
                            <XCircle size={20} />
                        </button>
                    </div>
                )}

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

            {/* Rest of your component remains the same */}
            {/* Scanned Data Table */}
            <div className="mb-4">
                <button
                    onClick={() => setShowScannedData(!showScannedData)}
                    className="flex items-center gap-2 text-lg font-semibold mb-2"
                >
                    {showScannedData ? <ChevronUp /> : <ChevronDown />}
                    Scans Récents
                </button>

                {showScannedData && (
                    <div className="bg-white rounded-lg shadow-lg overflow-x-auto max-h-64">
                        <table className="min-w-full">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Part ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantité</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Horodatage</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                                    {modificationMode && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {scannedData.map((scan) => (
                                    <tr key={scan.uniqueId}>
                                        <td className="px-6 py-4 whitespace-nowrap">{scan.partId}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{scan.quantity}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{scan.timestamp}</td>
                                        <td className={`px-6 py-4 whitespace-nowrap ${scan.status === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                                            {scan.status === 'success' ? 'Succès' : 'Erreur'}
                                        </td>
                                        {modificationMode && (
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <button
                                                    onClick={() => handleDeleteScan(scan.uniqueId, scan.jobNumber, scan.partId, scan.status)}
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
                )}
            </div>

            {/* Job Progress Table */}
            {jobNumber && (
                <div className="mb-4">
                    <button
                        onClick={() => setShowJobProgress(!showJobProgress)}
                        className="flex items-center gap-2 text-lg font-semibold mb-2"
                    >
                        {showJobProgress ? <ChevronUp /> : <ChevronDown />}
                        Progrès de la Commande
                    </button>

                    {showJobProgress && (
                        <div className="bg-white rounded-lg shadow-lg overflow-x-auto max-h-64">
                            <table className="min-w-full">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Part ID</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantité</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scanné</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date de Scan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {jobProgress.map((detail, index) => (
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
                    )}
                </div>
            )}

            <button
                onClick={() => setModificationMode(!modificationMode)}
                className="mt-4 px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
                {modificationMode ? 'Désactiver' : 'Activer'} le mode modification
            </button>
        </div>
    );
};

export default JobScanPage;