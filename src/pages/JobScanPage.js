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
    const [modificationModePal, setModificationModePal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [pallets, setPallets] = useState([]);
    const [activePallet, setActivePallet] = useState(null);
    const [editingPallet, setEditingPallet] = useState(null); // Palette en cours d'édition
    const [editingPalletName, setEditingPalletName] = useState(''); // Nouveau nom de la palette
    const [showPalletModal, setShowPalletModal] = useState(false);
    const [newPalletName, setNewPalletName] = useState('');
    const [validationMessage, setValidationMessage] = useState('');
    const inputRef = useRef(null);
    const API_BASE_URL = 'http://192.168.88.55:5128';
    const { jobNumber } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    let barcodeBuffer = '';
    let barcodeTimeout = null;

    useEffect(() => {
        // Immediate execution to set active pallet as soon as possible
        const initializeComponent = async () => {
            try {
                // Fetch pallets first
                const palletResponse = await fetch(`${API_BASE_URL}/api/Dashboard/pallets/${jobNumber}`);
                if (!palletResponse.ok) {
                    throw new Error('Erreur lors du chargement des palettes');
                }
                const palletData = await palletResponse.json();
                setPallets(palletData);

                // If there's at least one pallet, set the first one as active
                if (palletData.length > 0) {
                    console.log("Initial load: Setting first pallet as active:", palletData[0]);
                    setActivePallet(palletData[0]);
                }

                // Now fetch job progress
                await fetchJobProgress();

                // If there's an initial scan from redirect, add it to scannedData
                if (location.state?.initialScan) {
                    setScannedData([location.state.initialScan]);
                    // Clear the state after using it
                    navigate(location.pathname, { replace: true, state: {} });
                }
            } catch (err) {
                setError(err.message);
            }
        };

        initializeComponent();

        // Setup global event listener for barcode scanner
        document.addEventListener('keydown', handleGlobalKeydown);

        return () => {
            document.removeEventListener('keydown', handleGlobalKeydown);
        };
    }, [jobNumber]);

    const verifyActivePallet = () => {
        // If no active pallet but we have pallets, select the first one
        if (!activePallet && pallets.length > 0) {
            console.log("Verifying active pallet: Auto-selecting first pallet");
            setActivePallet(pallets[0]);
            return true;
        }

        // If no pallets at all, we can't proceed
        if (!activePallet && pallets.length === 0) {
            console.log("Verifying active pallet: No pallets available");
            setError('Veuillez créer une palette avant de scanner des pièces');
            return false;
        }

        // We have an active pallet
        return true;
    };

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

    const fetchPallets = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/Dashboard/pallets/${jobNumber}`);
            if (!response.ok) {
                throw new Error('Erreur lors du chargement des palettes');
            }
            const data = await response.json();
            setPallets(data);

            // More robust check for active pallet
            // If there's at least one pallet and none is active, set the first one as active
            if (data.length > 0) {
                if (!activePallet) {
                    console.log("Setting first pallet as active:", data[0]);
                    setActivePallet(data[0]);
                } else {
                    // If we have an active pallet, make sure it still exists in the updated data
                    const stillExists = data.some(p => p.id === activePallet.id);
                    if (!stillExists) {
                        console.log("Active pallet no longer exists, setting first pallet as active");
                        setActivePallet(data[0]);
                    } else {
                        // Update the active pallet with fresh data to ensure it's current
                        const updatedActivePallet = data.find(p => p.id === activePallet.id);
                        if (updatedActivePallet && JSON.stringify(updatedActivePallet) !== JSON.stringify(activePallet)) {
                            console.log("Updating active pallet with fresh data");
                            setActivePallet(updatedActivePallet);
                        }
                    }
                }
            }
        } catch (err) {
            setError(err.message);
        }
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

    const createPallet = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/Dashboard/pallets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    JobNumber: parseInt(jobNumber),
                    palletName: "" // Send an empty string to let the backend generate the name
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erreur lors de la création de la palette');
            }

            const newPallet = await response.json();
            await fetchPallets(); // Refresh the whole list
            setActivePallet(newPallet); // Set the new pallet as active
        } catch (err) {
            setError(err.message);
        }
    };

    const updatePalletName = async (palletId, newName) => {
        if (!newName.trim()) return setError('Le nom de la palette ne peut pas être vide');

        if (!window.confirm(`Confirmer le changement de nom : \n\nAvant : ${activePallet.name}\nAprès : ${newName}`)) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/Dashboard/pallets/${palletId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: newName.trim() })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erreur lors de la modification de la palette');
            }

            await fetchPallets(); // Refresh the list to get updated names
        } catch (err) {
            setError(err.message);
        }
    };

    const deletePallet = async (palletId) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette palette ?')) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/Dashboard/pallets/${palletId}`, { method: 'DELETE' });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erreur lors de la suppression de la palette');
            }

            setPallets(prev => prev.filter(p => p.id !== palletId));
            setActivePallet(null);
        } catch (err) {
            setError(err.message);
        }
    };


    const processBarcode = async (scannedText) => {
        if (isProcessing) return;
        setIsProcessing(true);
        setError('');

        try {
            // Clean up the scanned text if it has asterisks
            if (scannedText.startsWith("*") && scannedText.endsWith("*")) {
                scannedText = scannedText.substring(1, scannedText.length - 2);
            }

            // Normalize the text and check if it matches the expected format
            const normalizedText = scannedText.replace(/[/-]/g, '-');
            const match = normalizedText.match(/^(\d{5,6})-(.+)-(\d+)$/);

            if (!match) {
                setError('Format de code-barres invalide!');
                setIsProcessing(false);
                return;
            }

            const [_, scannedJobNumber, partId, quantity] = match;

            // If scanned job number is different from current job, redirect to that job's scan page
            if (scannedJobNumber !== jobNumber) {
                setIsLoading(true);
                setValidationMessage(`Redirection vers la commande ${scannedJobNumber}...`);
                setTimeout(() => {
                    navigate(`/scan/${scannedJobNumber}`);
                    setIsProcessing(false);
                }, 1000);
                return;
            }

            // Check if pallets are loaded and active pallet is selected
            // Adding additional console logs for debugging
            console.log("Pallets array:", pallets);
            console.log("Active pallet:", activePallet);

            // Make sure activePallet is properly checked - use a more robust check
            if (!activePallet || activePallet === null) {
                console.log("No active palette detected");
                // Check if we have pallets but none are active
                if (pallets && pallets.length > 0) {
                    // Automatically select the first pallet
                    console.log("Auto-selecting the first pallet");
                    setActivePallet(pallets[0]);

                    // We'll continue with the scan using this pallet
                    const selectedPallet = pallets[0];

                    // Show loading screen
                    setIsLoading(true);
                    setValidationMessage('Vérification en cours...');

                    // Continue with the scan using the automatically selected pallet
                    const response = await fetch(`${API_BASE_URL}/api/Dashboard/scan`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            jobNumber: parseInt(scannedJobNumber),
                            partId,
                            quantity: parseInt(quantity),
                            palletId: selectedPallet.id
                        })
                    });

                    const responseData = await response.json();

                    if (!response.ok) {
                        // Handle the validation error from backend
                        throw new Error(responseData.message || 'Erreur lors de l\'enregistrement');
                    }

                    // Create a new scan record for the UI
                    const newScan = {
                        jobNumber: scannedJobNumber,
                        partId,
                        quantity,
                        timestamp: new Date().toLocaleString(),
                        status: 'success',
                        uniqueId: `${scannedJobNumber}-${partId}-${Date.now()}`
                    };

                    // Update the UI with the new scan
                    setScannedData(prev => [...prev, newScan]);
                    setShowScannedData(true);
                    setValidationMessage(responseData.message || 'Scan enregistré avec succès. Palette auto-sélectionnée: ' + selectedPallet.name);

                    // Refresh data
                    await fetchJobProgress();
                    await fetchPallets();
                } else {
                    // No pallets available at all
                    setError('Veuillez sélectionner ou créer une palette avant de scanner des pièces');
                    setIsProcessing(false);
                    return;
                }
            } else {
                // Normal flow - active pallet detected
                // Show loading screen
                setIsLoading(true);
                setValidationMessage('Vérification en cours...');

                // Send the scan data to the server
                const response = await fetch(`${API_BASE_URL}/api/Dashboard/scan`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        jobNumber: parseInt(scannedJobNumber),
                        partId,
                        quantity: parseInt(quantity),
                        palletId: activePallet.id
                    })
                });

                // Get response data regardless of success/failure
                const responseData = await response.json();

                if (!response.ok) {
                    // Handle the validation error from backend
                    throw new Error(responseData.message || 'Erreur lors de l\'enregistrement');
                }

                // Create a new scan record for the UI
                const newScan = {
                    jobNumber: scannedJobNumber,
                    partId,
                    quantity,
                    timestamp: new Date().toLocaleString(),
                    status: 'success',
                    uniqueId: `${scannedJobNumber}-${partId}-${Date.now()}`
                };

                // Update the UI with the new scan
                setScannedData(prev => [...prev, newScan]);
                setShowScannedData(true);
                setValidationMessage(responseData.message || 'Scan enregistré avec succès');

                // Refresh job progress data
                await fetchJobProgress();
                // Also refresh pallet data to update scanned items count
                await fetchPallets();
            }

        } catch (err) {
            console.error("Scan error:", err);
            setError(err.message || 'Une erreur s\'est produite');
        } finally {
            // Hide loading screen after a short delay so users can see the message
            setTimeout(() => {
                setIsLoading(false);
                // Clear validation message after a few seconds
                setTimeout(() => {
                    setValidationMessage('');
                }, 3000);
                setIsProcessing(false);
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
                body: JSON.stringify({
                    jobNumber,
                    partId,
                    palletId: activePallet.id
                })
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

            {/* Pallet Selection Area */}
            <div className="mb-6 bg-gray-50 p-4 rounded-lg shadow">
                <div className="flex justify-between items-center mb-3">
                    <h2 className="text-lg font-semibold">Palettes</h2>
                    <div className="flex gap-2">
                        <button onClick={createPallet} className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-md text-sm">
                            Nouvelle Palette
                        </button>
                        <button onClick={() => setModificationModePal(!modificationModePal)} className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-md text-sm">
                            {modificationModePal ? 'Annuler Modification' : 'Modifier Palettes'}
                        </button>
                    </div>
                </div>

                {pallets.length === 0 ? (
                    <div className="text-center py-3 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="text-yellow-700">Aucune palette disponible. Cliquez sur "Nouvelle Palette" pour commencer à scanner.</p>
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2">
                        {pallets.map((pallet) => (
                            <div key={pallet.id} className={`flex items-center gap-2 p-2 rounded-md ${activePallet?.id === pallet.id ? 'bg-blue-100 border-2 border-blue-500' : 'bg-gray-200 hover:bg-gray-300'}`}>
                                <button onClick={() => setActivePallet(pallet)} className="px-3 py-2 rounded-md text-sm">
                                    {pallet.name}
                                </button>
                                {modificationModePal && (
                                    <>
                                        <button onClick={() => deletePallet(pallet.id)} className="text-red-500 hover:text-red-700 text-sm">🗑️</button>
                                        <button onClick={() => setEditingPallet(pallet)} className="text-yellow-500 hover:text-yellow-700 text-sm">✏️</button>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {activePallet && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded flex justify-between items-center">
                        <div>
                            <span className="text-blue-800 font-medium">Palette active: </span>
                            <span className="text-blue-700 font-bold uppercase">{activePallet.name}</span>
                        </div>
                        <div className="text-sm text-blue-600">
                            {activePallet.scannedItems || 0} pièces scannées
                        </div>
                    </div>
                )}
            </div>

            {/* Edit Pallet Modal */}
            {editingPallet && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
                        <h3 className="text-xl font-bold mb-4">Modifier la palette</h3>
                        <div className="mb-4">
                            <input
                                type="text"
                                value={editingPalletName}
                                onChange={(e) => setEditingPalletName(e.target.value)}
                                placeholder="Nouveau nom de la palette"
                                className="w-full p-2 border rounded"
                                autoFocus
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setEditingPallet(null)} className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100">
                                Annuler
                            </button>
                            <button onClick={() => updatePalletName(editingPallet.id, editingPalletName)} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                                Sauvegarder
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Pallet Modal */}
            {showPalletModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
                        <h3 className="text-xl font-bold mb-4">Créer une nouvelle palette</h3>
                        <div className="mb-4">
                            <label htmlFor="palletName" className="block text-sm font-medium text-gray-700 mb-1">
                                Nom de la palette
                            </label>
                            <input
                                id="palletName"
                                type="text"
                                value={newPalletName}
                                onChange={(e) => setNewPalletName(e.target.value)}
                                placeholder="Entrez le nom de la palette"
                                className="w-full p-2 border rounded"
                                autoFocus
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowPalletModal(false);
                                    setNewPalletName('');
                                }}
                                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={createPallet}
                                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                                Créer
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                className={`mt-4 px-4 py-2 rounded text-white ${modificationMode ? 'bg-red-500' : 'bg-yellow-500'}`}>
                {modificationMode ? '❌ Désactiver' : '✏️ Activer'} le mode modification
            </button>
        </div>
    );
};

export default JobScanPage;