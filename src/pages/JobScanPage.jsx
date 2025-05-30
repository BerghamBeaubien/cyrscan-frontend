﻿import React, { useState, useEffect, useRef, useContext } from 'react';
import { XCircle, Trash2, ChevronDown, ChevronUp, Loader, QrCode, Package, Clipboard, ArrowLeft } from 'lucide-react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import MobileQRScanner from './MobileQRScanner';
import EnhancedDimensionsModal from './EnhancedDimensionsModal';
import { AuthContext } from '../components/AuthContext';

const JobScanPage = () => {
    const [scannedData, setScannedData] = useState([]);
    const { currentUser } = useContext(AuthContext);
    const [jobDetails, setJobDetails] = useState({
        jobNumber: ''
    });
    const [error, setError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showScannedData, setShowScannedData] = useState(true);
    const [showPalletTable, setShowPalletTable] = useState(true);
    const [modificationModePal, setModificationModePal] = useState(false);
    const [deleteMode, setDeleteMode] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showQrScanner, setShowQrScanner] = useState(false);
    const [pallets, setPallets] = useState([]);
    const [activePallet, setActivePallet] = useState(null);
    const [editingPallet, setEditingPallet] = useState(null);
    const [editingPalletName, setEditingPalletName] = useState('');
    const [validationMessage, setValidationMessage] = useState('');
    const [palletContents, setPalletContents] = useState({});
    const [scanMode, setScanMode] = useState('scan'); // 'scan', 'manual'
    const [isScanReady, setIsScanReady] = useState(true);
    const inputRef = useRef(null);
    const API_BASE_URL = 'https://192.168.88.55:5128';
    const { jobNumber } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [dimensionsModal, setDimensionsModal] = useState({
        isOpen: false,
        palletId: null,
        palLong: '',
        palLarg: '',
        palHaut: '',
        Notes: '',
        palFinal: false
    });

    let barcodeBuffer = '';
    let barcodeTimeout = null;

    useEffect(() => {
        const initializeComponent = async () => {
            try {
                // Fetch pallets first
                await fetchPallets();

                // Set job details
                setJobDetails({
                    jobNumber
                });

                // If there's an initial scan from redirect, handle it
                if (location.state?.initialScan) {
                    // Show notification to scan the code again
                    setValidationMessage(`Veuillez scanner à nouveau l'étiquette pour l'ajouter à cette commande`);
                    // Clear the state after using it
                    navigate(location.pathname, { replace: true, state: {} });
                }
            } catch (err) {
                setError(err.message);
            }
        };

        initializeComponent();

        // Setup global event listener for barcode scanner only if in scan mode
        if (scanMode === 'scan') {
            document.addEventListener('keydown', handleGlobalKeydown);
        }

        return () => {
            document.removeEventListener('keydown', handleGlobalKeydown);
        };
    }, [jobNumber, scanMode]);

    // This effect will run whenever pallets change to fetch the contents for each pallet
    useEffect(() => {
        const fetchContentsForAllPallets = async () => {
            const contentsMap = {};
            for (const pallet of pallets) {
                try {
                    const response = await fetch(`${API_BASE_URL}/api/Dashboard/palletContents/${pallet.id}`);
                    if (!response.ok) {
                        throw new Error(`Erreur lors du chargement du contenu de la palette ${pallet.name}`);
                    }
                    const contents = await response.json();

                    // Parse contents with full QR code and pallet ID
                    const parsedContents = contents.map(item => ({
                        ...item,
                        fullQrCode: item.qrCode, // Store the full QR code
                        qrCode: item.qrCode?.split('-').pop(), // Short QR code for display
                        palletId: pallet.id, // Add the pallet ID to each item
                        scanDate: item.scanDate ? new Date(item.scanDate).toLocaleString() : 'N/A'
                    }));

                    contentsMap[pallet.id] = parsedContents;
                } catch (err) {
                    console.error(`Failed to fetch contents for pallet ${pallet.id}:`, err);
                    contentsMap[pallet.id] = [];
                }
            }
            setPalletContents(contentsMap);
        };

        if (pallets.length > 0) {
            fetchContentsForAllPallets();
        }
    }, [pallets]);

    useEffect(() => {
        // Setup global event listener for barcode scanner only if in scan mode
        if (scanMode === 'scan') {
            document.addEventListener('keydown', handleGlobalKeydown);
            //console.log("Added keydown listener, active pallet:", activePallet ? activePallet.name : "null");
        }

        return () => {
            document.removeEventListener('keydown', handleGlobalKeydown);
        };
    }, [jobNumber, scanMode, activePallet]); 

    // Format QR code to add a leading zero to single-digit sequence numbers
    const formatQRCode = (qrCode) => {
        if (!qrCode) return qrCode;

        qrCode = qrCode.replace(/é/g, '-');
        const parts = qrCode.split('-');
        if (parts.length > 1) {
            const lastPart = parts[parts.length - 1];
            if (lastPart.length === 1 && /^[1-9]$/.test(lastPart)) {
                parts[parts.length - 1] = `0${lastPart}`;
            }
        }
        return parts.join('-');
    };

    // Handle global keydown events for barcode scanner
    const handleGlobalKeydown = (event) => {
        // Only process if in scan mode
        if (scanMode !== 'scan' || !isScanReady) return;

        // Only process barcode inputs if we're not currently in an input field (except our barcode input)
        const isInInput = document.activeElement.tagName === 'INPUT' ||
            document.activeElement.tagName === 'TEXTAREA';
        const isInOurInput = document.activeElement === inputRef.current;

        // If the user is typing in another input, ignore barcode events
        if (isInInput && !isInOurInput) return;

        // If Enter key is pressed, process the barcode
        if (event.key === 'Enter') {
            event.preventDefault();
            if (barcodeBuffer.trim()) {
                const formattedCode = formatQRCode(barcodeBuffer.trim());
                //console.log("Detected Enter key - Active pallet:", activePallet ? activePallet.name : "null", "Buffer:", barcodeBuffer);
                //console.log("Formatted code:", formattedCode);
                processBarcode(formattedCode);
                barcodeBuffer = '';
                if (inputRef.current) {
                    inputRef.current.value = '';
                }
            }
            return;
        }

        // Append character to buffer
        if (event.key.length === 1 || event.key === '-' || event.key === '_') {
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
                const formattedCode = formatQRCode(barcodeBuffer.trim());
                //console.log("Timeout triggered - Active pallet:", activePallet ? activePallet.name : "null", "Buffer:", barcodeBuffer);
                processBarcode(formattedCode);
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

            //console.log("Fetched pallets:", data.length, "Active pallet:", activePallet ? activePallet.name : "null");

            // If there's at least one pallet and none is active, set the first one as active
            if (data.length > 0 && !activePallet) {
                //console.log("Setting active pallet to first pallet:", data[0].name);
                setActivePallet(data[0]);
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const handleManualInput = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            const scannedText = event.target.value.trim();
            const formattedCode = formatQRCode(scannedText);
            processBarcode(formattedCode);
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
                    jobNumber: jobNumber
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erreur lors de la création de la palette');
            }

            const newPallet = await response.json();
            await fetchPallets(); // Refresh the whole list
            setActivePallet(newPallet); // Set the new pallet as active
            setValidationMessage(`Nouvelle palette ${newPallet.name} créée avec succès`);
        } catch (err) {
            setError(err.message);
        }
    };

    const updatePalletName = async (palletId, newName) => {
        if (!newName.trim()) return setError('Le nom de la palette ne peut pas être vide');

        if (!window.confirm(`Confirmer le changement de nom : \n\nAvant : ${editingPallet.name}\nAprès : ${newName}`)) {
            setEditingPallet(null);
            setEditingPalletName('');
            return;
        }

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
            setValidationMessage(`Palette renommée en ${newName} avec succès`);
            setEditingPallet(null);
            setEditingPalletName('');
        } catch (err) {
            setError(err.message);
        }
    };

    const deletePallet = async (palletId) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette palette ?')) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/Dashboard/pallets/${palletId}`, { method: 'DELETE' });

            if (!response.ok) {
                //const errorData = await response.json();
                throw new Error("Impossible de supprimer une palette qui n'est pas vide\nVeuillez" + 
                "vider la palette, ou bien");
            }

            const palletToDelete = pallets.find(p => p.id === palletId);
            setPallets(prev => prev.filter(p => p.id !== palletId));

            // Si la palette active est supprimée, en sélectionner une autre
            if (activePallet && activePallet.id === palletId) {
                const remainingPallets = pallets.filter(p => p.id !== palletId);
                setActivePallet(remainingPallets.length > 0 ? remainingPallets[0] : null);
            }

            setValidationMessage(`Palette ${palletToDelete?.name || ''} supprimée avec succès`);
        } catch (err) {
            setError(err.message);
        }
    };

    const processBarcode = async (scannedText) => {
        if (isProcessing) return;

        //console.log("Processing barcode:", scannedText, "Active pallet:", activePallet ? activePallet.name : "null");
        setIsProcessing(true);
        setError('');
        setIsScanReady(false);

        // Vérifier si l'utilisateur est connecté
        if (!currentUser) {
            setError('Vous devez être connecté pour scanner des pièces');
            setIsProcessing(false);
            setIsScanReady(true);
            return;
        }

        // Vérifier si les palettes existent
        if (pallets.length === 0) {
            setError('Veuillez créer une palette avant de scanner des pièces');
            setIsProcessing(false);
            setIsScanReady(true);
            return;
        }

        // S'assurer qu'il y a une palette active
        let currentActivePallet = activePallet;
        if (!currentActivePallet) {
            currentActivePallet = pallets[0];
            setActivePallet(currentActivePallet);
            //console.log("Setting default active pallet:", currentActivePallet.name);
        }

        try {
            // Nettoyer le texte scanné s'il a des astérisques
            if (scannedText.startsWith("*") && scannedText.endsWith("*")) {
                scannedText = scannedText.substring(1, scannedText.length - 1);
            }

            // Normaliser le texte et vérifier s'il correspond au format attendu
            const normalizedText = scannedText.replace(/[/-]/g, '-');
            const match = normalizedText.match(/^(\d+[A-Za-z0-9]*)-(.+)-(\d+)$/);

            if (!match) {
                setError('Format de code-barres invalide! Format attendu: [JobNumber]-[PartID]-[Sequence]');
                setIsProcessing(false);
                setIsScanReady(true);
                return;
            }

            const [_, scannedJobNumber, partId, sequence] = match;
            const qrCode = normalizedText; // Le QR code est le texte entier scanné

            // Si le numéro de commande scanné est différent du numéro de commande actuel, rediriger
            if (scannedJobNumber !== jobNumber) {
                setIsLoading(true);
                setValidationMessage(`Redirection vers la commande ${scannedJobNumber}...`);
                setTimeout(() => {
                    navigate(`/scan/${scannedJobNumber}`);
                    setIsProcessing(false);
                    setIsScanReady(true);
                }, 1000);
                return;
            }

            // Afficher l'écran de chargement
            setIsLoading(true);
            setValidationMessage('Vérification en cours...');

            // Envoyer les données de scan au serveur avec l'ID de l'utilisateur
            const response = await fetch(`${API_BASE_URL}/api/Dashboard/scan`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentUser.token}` // Si vous utilisez JWT
                },
                body: JSON.stringify({
                    jobNumber: scannedJobNumber,
                    partId: partId,
                    qrCode: qrCode,
                    palletId: currentActivePallet.id
                })
            });

            // Obtenir les données de réponse indépendamment du succès/échec
            const responseData = await response.json();

            if (!response.ok) {
                // Gérer l'erreur de validation du backend
                throw new Error(responseData.message || 'Erreur lors de l\'enregistrement');
            }

            // Créer un nouvel enregistrement de scan pour l'UI
            const newScan = {
                jobNumber: scannedJobNumber,
                partId: partId,
                qrCode: qrCode
            };

            // Mettre à jour l'UI avec le nouveau scan
            setScannedData(prev => [newScan, ...prev]);
            setShowScannedData(true);
            setValidationMessage(responseData.message || 'Scan enregistré avec succès');

            // Rafraîchir les données
            await fetchPallets();
        } catch (err) {
            console.error("Scan error:", err);
            setError(err.message || 'Une erreur s\'est produite');
        } finally {
            // Masquer l'écran de chargement après un court délai
            setTimeout(() => {
                setIsLoading(false);
                // Effacer le message de validation après quelques secondes
                setTimeout(() => {
                    setValidationMessage('');
                }, 3000);
                setIsProcessing(false);
                setIsScanReady(true);
            }, 500);
        }
    };

    const handleDeleteScan = async (qrCode, palletId) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce scan ?')) return;

        // Vérifier si l'utilisateur est connecté
        if (!currentUser) {
            setError('Vous devez être connecté pour supprimer des scans');
            return;
        }

        console.log('Deleting scan:', qrCode, palletId);

        try {
            const response = await fetch(`${API_BASE_URL}/api/Dashboard/delete`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentUser.token}` // Si vous utilisez JWT
                },
                body: JSON.stringify({
                    qrCode,
                    palletId: palletId
                })
            });

            if (!response.ok) {
                throw new Error('Erreur lors de la suppression');
            }

            // Supprimer le scan de l'état local
            setScannedData(prev => prev.filter(scan => scan.qrCode !== qrCode));
            await fetchPallets(); // Rafraîchir les données des palettes
            setValidationMessage('Scan supprimé avec succès');
        } catch (err) {
            setError(err.message);
        }
    };

    // Composant d'overlay de chargement
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

    // Statistiques de la commande basées uniquement sur les palettes
    const jobStats = () => {
        const totalScannedItems = pallets.reduce((total, pallet) => total + (pallet.scannedItems || 0), 0);

        return (
            <div className="bg-white p-4 rounded-lg shadow mb-4">
                <h3 className="text-lg font-semibold mb-2">Commande {jobNumber}</h3>
                <div className="flex justify-between text-sm">
                    <span>Total pièces scannées: {totalScannedItems}</span>
                    <span>Nombre de palettes: {pallets.length}</span>
                </div>
            </div>
        );
    };

    const createPackaging = async (imageBlob = null) => {
        const { palletId, palLong, palLarg, palHaut, Notes, palFinal } = dimensionsModal;

        if (!palLong || !palLarg || !palHaut) {
            setError('Veuillez saisir les dimensions de la palette');
            return;
        }

        const formattedNotes = Notes || '-';
        setIsProcessing(true);
        setError('');

        try {
            setIsLoading(true);
            setValidationMessage('Création de votre feuille d\'emballage en cours ...');
            setDimensionsModal({
                isOpen: false,
                palletId: null,
                palLong: '',
                palLarg: '',
                palHaut: '',
                Notes: '',
                palFinal: false
            });

            let response;

            if (imageBlob) {
                // If we have an image, send it via FormData
                const formData = new FormData();
                formData.append('palletImage', imageBlob, `pallet_${palletId}_${Date.now()}.jpg`);
                formData.append('palLong', palLong);
                formData.append('palLarg', palLarg);
                formData.append('palHaut', palHaut);
                formData.append('Notes', formattedNotes);
                formData.append('palFinal', palFinal.toString());

                response = await fetch(`${API_BASE_URL}/api/Dashboard/packaging/${palletId}`, {
                    method: 'POST',
                    body: formData
                });
                console.log("Sending image WITH FormData for pallet:", palletId);
                console.log("FormData contents:", formData);
            } else {
                // No image, use the original GET request
                response = await fetch(`${API_BASE_URL}/api/Dashboard/packaging/${palletId}?palLong=${palLong}&palLarg=${palLarg}&palHaut=${palHaut}&Notes=${formattedNotes}&palFinal=${palFinal}`, {
                    method: 'GET'
                });
            }

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Erreur lors de la création du fichier d\'emballage');
            }

            setValidationMessage(`Fichier d'emballage créé: ${result.filePath}`);
        } catch (err) {
            setError(err.message);
        }

        setIsProcessing(false);
        setIsLoading(false);
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Loading Overlay */}
            {isLoading && <LoadingOverlay />}

            <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold flex items-center">
                        <button
                            onClick={() => navigate('/')}
                            className="mr-2 p-1 rounded-full hover:bg-gray-200 transition-colors"
                            title="Retour au tableau de bord"
                        >
                            <ArrowLeft size={24} />
                        </button>
                        {jobNumber
                            ? `Scanner - Commande ${jobNumber}`
                            : 'Scanner de Code-barres'
                        }
                    </h1>
                    {jobNumber && (
                        <button
                            onClick={() => navigate(`/jobs/${jobNumber}`)}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded flex items-center"
                        >
                            <Clipboard className="mr-2" size={18} />
                            Voir les détails de la commande
                        </button>
                    )}
                </div>

                {/* Job Stats */}
                {jobStats()}

                {/* New Scan Interface with Tabs */}
                <div className="mb-4">
                    <div className="border border-gray-300 rounded-lg overflow-hidden">
                        {/* Tabs */}
                        <div className="flex border-b border-gray-300">
                            <button
                                className={`flex-1 py-2 px-4 ${scanMode === 'scan' ? 'bg-blue-100 border-b-2 border-blue-500 text-blue-800' : 'bg-gray-50 hover:bg-gray-100'}`}
                                onClick={() => setScanMode('scan')}
                            >
                                <div className="flex items-center justify-center">
                                    <QrCode size={18} className="mr-2" />
                                    <span>Mode Scan</span>
                                </div>
                            </button>
                            <button
                                className={`flex-1 py-2 px-4 ${scanMode === 'manual' ? 'bg-blue-100 border-b-2 border-blue-500 text-blue-800' : 'bg-gray-50 hover:bg-gray-100'}`}
                                onClick={() => setScanMode('manual')}
                            >
                                <div className="flex items-center justify-center">
                                    <Clipboard size={18} className="mr-2" />
                                    <span>Saisie Manuelle</span>
                                </div>
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="p-4">
                            {scanMode === 'scan' ? (
                                <div className="text-center relative">
                                    {/* QR Scanner Button - Now on the left */}
                                    <div className="relative">
                                        <button
                                            className="p-2 rounded-full bg-gray-200 hover:bg-gray-300"
                                            onClick={() => setShowQrScanner(prev => !prev)}
                                        >
                                            <QrCode size={20} className="text-gray-600" />
                                        </button>

                                        {/* QR Scanner Component */}
                                        {showQrScanner && (
                                            <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center">
                                                <MobileQRScanner
                                                    onScan={(scannedText) => {
                                                        const formattedCode = formatQRCode(scannedText);
                                                        processBarcode(formattedCode);
                                                        setShowQrScanner(false);
                                                    }}
                                                    onClose={() => setShowQrScanner(false)}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="mb-3 flex items-center justify-center">
                                        <QrCode size={40} className="text-blue-500 mr-3" />
                                        {isScanReady ? (
                                            <div className="text-green-500 font-bold text-xl">Prêt à scanner</div>
                                        ) : (
                                            <div className="text-yellow-500 font-bold text-xl">Scan en cours...</div>
                                        )}
                                    </div>
                                    <p className="text-gray-600 text-sm">Pointez le scanner vers le code-barres ou utilisez le clavier</p>
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        className="opacity-0 h-0 w-0 absolute"
                                        autoFocus={false}
                                        readOnly={!isScanReady}
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label htmlFor="manualInput" className="block text-sm font-medium text-gray-700 mb-1">
                                        Entrez le code manuellement:
                                    </label>
                                    <input
                                        id="manualInput"
                                        type="text"
                                        placeholder="Format: JOBNUM-PARTID-SEQ"
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        onKeyDown={handleManualInput}
                                        autoFocus
                                    />
                                    <p className="mt-2 text-sm text-gray-500">Appuyez sur Entrée pour soumettre</p>
                                </div>
                            )}
                        </div>
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
                    <h2 className="text-lg font-semibold flex items-center">
                        <Package className="mr-2" size={20} />
                        Palettes
                    </h2>
                    <div className="flex gap-2">
                        <button onClick={createPallet} className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-md text-sm">
                            Nouvelle Palette
                        </button>
                        <button onClick={() => setModificationModePal(!modificationModePal)} className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-md text-sm">
                            {modificationModePal ? 'Quitter Mode Édition' : 'Modifier Palettes'}
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
                                        <button
                                            onClick={() => deletePallet(pallet.id)}
                                            className="text-red-500 hover:text-red-700 text-sm p-1 hover:bg-gray-200 rounded"
                                            title="Supprimer cette palette"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditingPallet(pallet);
                                                setEditingPalletName(pallet.name);
                                            }}
                                            className="text-yellow-500 hover:text-yellow-700 text-sm p-1 hover:bg-gray-200 rounded"
                                            title="Modifier le nom de cette palette"
                                        >
                                            ✏️
                                        </button>
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
                                Enregistrer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {jobNumber && (
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <button
                            onClick={() => setShowPalletTable(!showPalletTable)}
                            className="flex items-center gap-2 text-lg font-semibold"
                        >
                            {showPalletTable ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            Contenu des Palettes
                        </button>
                        <button
                            onClick={() => setDeleteMode(!deleteMode)}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-md text-sm"
                        >
                            {deleteMode ? 'Quitter Mode Édition' : 'Voir Details'}
                        </button>
                    </div>

                    {showPalletTable && (
                        <div className="bg-white rounded-lg shadow-lg p-4">
                            <div className="overflow-x-auto">
                                <div className="flex space-x-4 min-w-max">
                                    {pallets.map(pallet => (
                                        <div key={pallet.id} className="min-w-64 flex-shrink-0">
                                            <div
                                                className={`p-3 rounded-t-lg font-semibold text-center cursor-pointer flex justify-between items-center ${activePallet?.id === pallet.id
                                                    ? 'bg-blue-500 text-white'
                                                    : 'bg-gray-200'
                                                    }`}
                                            >
                                                <span>{pallet.name} ({palletContents[pallet.id]?.length || 0})</span>
                                                <button
                                                    onClick={() => setDimensionsModal({
                                                        isOpen: true,
                                                        palletId: pallet.id,
                                                        palLong: '',
                                                        palLarg: '',
                                                        palHaut: '',
                                                        Notes: '',
                                                        palFinal: false
                                                    })}
                                                    className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded-md text-xs"
                                                >
                                                    Feuille Emballage
                                                </button>
                                            </div>
                                            <div className="border border-gray-300 rounded-b-lg p-2 max-h-64 overflow-y-auto">
                                                {palletContents[pallet.id] && palletContents[pallet.id].length > 0 ? (
                                                    <ul className="divide-y divide-gray-200">
                                                        {palletContents[pallet.id].map((item, index) => (
                                                            <li key={index} className="py-2 px-1 text-sm hover:bg-gray-50">
                                                                <div className="font-medium flex justify-between">
                                                                    <span>{item.partId}</span>
                                                                    <span className="text-sm text-gray-500">{item.qrCode}</span>
                                                                </div>
                                                                {(deleteMode && showPalletTable) && (
                                                                    <>
                                                                        <div className="text-xs text-gray-500 font-mono break-all">{item.fullQrCode}</div>
                                                                        <div className="text-xs text-gray-500 font-mono break-all">{item.scanDate}</div>
                                                                    </>
                                                                )}
                                                                {deleteMode && (
                                                                    <button
                                                                        onClick={() => handleDeleteScan(
                                                                            item.fullQrCode,
                                                                            item.palletId
                                                                        )}
                                                                        className="text-red-600 hover:text-red-900"
                                                                        title="Supprimer"
                                                                    >
                                                                        <Trash2 size={18} />
                                                                    </button>
                                                                )}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <div className="py-4 text-center text-gray-500 italic">
                                                        Aucun élément scanné dans cette palette
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {pallets.length === 0 && (
                                        <div className="w-full p-4 text-center text-gray-500">
                                            Aucune palette disponible
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}


            {/* Enhanced Pallet Dimensions Modal with Photo Capture */}
            {dimensionsModal.isOpen && (
                <EnhancedDimensionsModal
                    dimensionsModal={dimensionsModal}
                    setDimensionsModal={setDimensionsModal}
                    createPackaging={createPackaging}
                    isProcessing={isProcessing}
                />
            )}

            {/* Recent Scans Table */}
            <div>
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-lg font-semibold flex items-center">
                        <div className="cursor-pointer flex items-center" onClick={() => setShowScannedData(!showScannedData)}>
                            {showScannedData ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                            <span className="ml-1">Scans Récents (Session)</span>
                        </div>
                    </h2>
                </div>

                {showScannedData && (
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Nom de la Pièce
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Code QR
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Numéro de Séquence
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {scannedData.length > 0 ? (
                                        scannedData.map((scan) => (
                                            <tr key={scan.uniqueId} className={`hover:bg-gray-50 ${scan.status === 'error' ? 'bg-red-50' : ''}`}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {scan.partId}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {scan.qrCode}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {scan.qrCode.split('-').pop()}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                                                Aucun scan récent
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default JobScanPage;