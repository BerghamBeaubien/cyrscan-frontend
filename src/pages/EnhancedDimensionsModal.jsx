import React, { useState, useRef, useEffect, useContext } from 'react';
import { Camera, X, Package, RotateCw, Loader, Printer, Check } from 'lucide-react';
import { AuthContext } from '../components/AuthContext';
import { API_BASE_URL } from '../config';

const EnhancedDimensionsModal = ({
    dimensionsModal,
    setDimensionsModal,
    createPackaging,
    isProcessing = false,
    isComplete = false
}) => {
    const [palletImage, setPalletImage] = useState(null);
    const { isAdmin, isMod } = useContext(AuthContext);
    const [isCapturing, setIsCapturing] = useState(false);
    const [cameraError, setCameraError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [validationError, setValidationError] = useState('');
    const [facingMode, setFacingMode] = useState("environment");

    // Print-related state
    const [printAfterCreation, setPrintAfterCreation] = useState(false);
    const [availablePrinters, setAvailablePrinters] = useState([]);
    const [selectedPrinter, setSelectedPrinter] = useState('');
    const [isPrinting, setIsPrinting] = useState(false);
    const [printError, setPrintError] = useState('');
    const [printSuccess, setPrintSuccess] = useState(false);
    const [createdPdfPath, setCreatedPdfPath] = useState('');
    const [createdJobNumber, setCreatedJobNumber] = useState('');
    const [createdPaletteName, setCreatedPaletteName] = useState('');
    const [showPrintConfirmation, setShowPrintConfirmation] = useState(false);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);

    // Fetch available printers when print checkbox is checked
    const fetchPrinters = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/dashboard/printers`);
            if (response.ok) {
                const printers = await response.json();
                setAvailablePrinters(printers);
                if (printers.length > 0) {
                    setSelectedPrinter(printers[0].name || printers[0]);
                }
            } else {
                setPrintError('Erreur lors de la récupération des imprimantes');
            }
        } catch (error) {
            console.error('Error fetching printers:', error);
            setPrintError('Erreur de connexion lors de la récupération des imprimantes');
        }
    };

    useEffect(() => {
        if (
            availablePrinters.length > 0 &&
            (!selectedPrinter || !availablePrinters.some(p => (p.name || p) === selectedPrinter))
        ) {
            setSelectedPrinter(availablePrinters[0].name || availablePrinters[0]);
        }
    }, [availablePrinters, selectedPrinter]);

    // Effect to fetch printers when print checkbox is checked
    useEffect(() => {
        if (printAfterCreation) {
            fetchPrinters();
        } else {
            setAvailablePrinters([]);
            setSelectedPrinter('');
            setPrintError('');
        }
    }, [printAfterCreation]);

    //Effect to handle printing when print confirmation is shown
    useEffect(() => {
        if (showPrintConfirmation && createdPdfPath && selectedPrinter) {
            console.log('Print confirmation shown, starting print process...');
            handlePrint();
        }
    }, [showPrintConfirmation, createdPdfPath, selectedPrinter]);

    // Handle printing
    const handlePrint = async ({ pdfPath, printerName, jobNumber, paletteName }) => {
        if (!pdfPath || !printerName) {
            console.error('Missing PDF path or printer name');
            return;
        }
        setIsPrinting(true);
        setPrintError('');

        try {
            const response = await fetch(`${API_BASE_URL}/api/dashboard/print`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    pdfPath,
                    printerName,
                    jobNumber,
                    paletteName
                })
            });

            if (response.ok) {
                setPrintSuccess(true);
                setTimeout(() => {
                    handleModalClose();
                }, 2000);
            } else {
                const errorData = await response.json();
                setPrintError(errorData.message || 'Erreur lors de l\'impression');
            }
        } catch (error) {
            console.error('Print error:', error);
            setPrintError('Erreur de connexion lors de l\'impression');
        } finally {
            setIsPrinting(false);
        }
    };

    const handlePackagingAndPrint = async () => {
        try {
            console.log('Starting packaging and print process...');

            // Call createPackaging and get the result
            const result = await createPackaging(palletImage?.blob || null);

            if (result && result.filePath) {
                console.log('Packaging created successfully:', result);

                // Store details from the result
                setCreatedPdfPath(result.filePath);
                setCreatedJobNumber(result.jobNumber || '');
                setCreatedPaletteName(result.paletteName || '');
                console.log('Created PDF Path before PRINT:', result.filePath);
                console.log('Created Job Number before PRINT:', result.jobNumber);
                console.log('Created Palette Name before PRINT:', result.paletteName);

                // Check if print is enabled and a printer is selected
                if (printAfterCreation) {
                    console.log('Printing enabled. Showing print confirmation...');
                    await handlePrint({
                        pdfPath: result.filePath,
                        printerName: selectedPrinter,
                        jobNumber: result.jobNumber,
                        paletteName: result.paletteName
                    }); // Call the print function directly
                    // Show print confirmation - the useEffect will handle the actual printing
                    //setShowPrintConfirmation(true);
                } else {
                    console.log('Printing not required or no printer selected. Closing modal...');
                    handleModalClose(); // Close the modal if no printing is needed
                }
            } else {
                console.error('Failed to create packaging. Result:', result);
                setValidationError('Erreur lors de la création de l\'emballage');
            }

            // Clean up after the process
            if (palletImage) {
                URL.revokeObjectURL(palletImage.url);
                setPalletImage(null);
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        } catch (error) {
            console.error('Error in handlePackagingAndPrint:', error);
            setValidationError('Une erreur est survenue lors du traitement');
        }
    };

    // Handle camera initialization
    useEffect(() => {
        if (!isCapturing) return;

        // Check if mediaDevices API is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setCameraError("Votre appareil ne prend pas en charge l'accès à la caméra");
            setLoading(false);
            return;
        }

        setLoading(true);

        // Stop any existing stream
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }

        // Attempt to get camera access
        navigator.mediaDevices.getUserMedia({
            video: {
                facingMode,
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        })
            .then((stream) => {
                streamRef.current = stream;
                if (videoRef.current) {
                    const video = videoRef.current;
                    video.srcObject = stream;

                    if ('ImageCapture' in window) {
                        console.log("ImageCapture API is supported by this browser.");

                        const track = stream.getVideoTracks()[0];
                        try {
                            const imageCapture = new ImageCapture(track);
                            console.log("ImageCapture object created:", imageCapture);
                            imageCapture.getPhotoCapabilities().then((capabilities) => {
                                console.log("Camera capabilities:", capabilities);
                            }).catch((err) => {
                                console.warn("Could not get capabilities:", err);
                            });
                        } catch (err) {
                            console.warn("Failed to create ImageCapture instance:", err);
                        }
                    } else {
                        console.warn("ImageCapture API is NOT supported by this browser.");
                    }

                    video.onloadedmetadata = () => {
                        console.log("Resolution:", video.videoWidth, "x", video.videoHeight);
                    };
                }
                setLoading(false);
                setCameraError(null);
            })
            .catch(err => {
                console.error("Camera access error:", err);

                let errorMessage = "Erreur d'accès à la caméra";

                if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                    errorMessage = "Permissions de caméra refusées. Si vous utilisez une connexion non-sécurisée (HTTP), essayez d'utiliser HTTPS ou localhost.";
                } else if (err.name === 'NotFoundError') {
                    errorMessage = "Aucune caméra détectée sur cet appareil.";
                } else if (err.name === 'NotReadableError') {
                    errorMessage = "La caméra est peut-être utilisée par une autre application.";
                }

                setCameraError(errorMessage);
                setLoading(false);
                setIsCapturing(false);
            });

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [isCapturing, facingMode]);

    const toggleCamera = () => {
        setFacingMode(prev => prev === "environment" ? "user" : "environment");
    };

    const handleTakePhoto = () => {
        if (isCapturing) {
            capturePhoto();
        } else {
            if (palletImage) {
                URL.revokeObjectURL(palletImage.url);
                setPalletImage(null);
            }
            setIsCapturing(true);
        }
    };

    const capturePhoto = async () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (!video || !canvas || !streamRef.current) return;

        const track = streamRef.current.getVideoTracks()[0];

        if ('ImageCapture' in window) {
            try {
                const imageCapture = new ImageCapture(track);
                const blob = await imageCapture.takePhoto();

                const imageUrl = URL.createObjectURL(blob);
                setPalletImage({
                    blob,
                    url: imageUrl,
                    filename: `pallet_${dimensionsModal.palletId}_${Date.now()}.jpg`
                });

                setIsCapturing(false);
                return;
            } catch (err) {
                console.warn("ImageCapture failed, falling back to canvas capture:", err);
            }
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);

        canvas.toBlob((blob) => {
            if (blob) {
                const imageUrl = URL.createObjectURL(blob);
                setPalletImage({
                    blob,
                    url: imageUrl,
                    filename: `pallet_${dimensionsModal.palletId}_${Date.now()}.jpg`
                });
            }
        }, 'image/jpeg', 1.0);

        setIsCapturing(false);
    };

    const removePhoto = () => {
        if (palletImage) {
            URL.revokeObjectURL(palletImage.url);
            setPalletImage(null);
        }
    };

    const handleModalClose = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsCapturing(false);
        if (palletImage) {
            URL.revokeObjectURL(palletImage.url);
            setPalletImage(null);
        }

        // Reset print-related state
        setPrintAfterCreation(false);
        setAvailablePrinters([]);
        setSelectedPrinter('');
        setPrintError('');
        setPrintSuccess(false);
        setCreatedPdfPath('');
        setCreatedJobNumber('');
        setCreatedPaletteName('');
        setShowPrintConfirmation(false);
        setIsPrinting(false);

        setDimensionsModal({
            isOpen: false,
            palletId: null,
            palLong: '',
            palLarg: '',
            palHaut: '',
            Notes: '',
            palFinal: false
        });
    };

    const handleCreatePackaging = async () => {
        const { palLong, palLarg, palHaut } = dimensionsModal;

        if (!palLong || !palLarg || !palHaut) {
            setValidationError("Veuillez remplir Longueur, Largeur et Hauteur.");
            return;
        }

        const isValidNumber = (value) => /^\d+(\.\d+)?$/.test(value);
        if (![palLong, palLarg, palHaut].every(isValidNumber)) {
            setValidationError("Les champs Longueur, Largeur et Hauteur doivent être des nombres.");
            return;
        }

        if (printAfterCreation && !selectedPrinter) {
            setValidationError("Veuillez sélectionner une imprimante pour l'impression automatique.");
            return;
        }

        setValidationError('');

        // Call the new method to handle both packaging and printing
        await handlePackagingAndPrint();
    };

    if (!dimensionsModal.isOpen) return null;

    // Full-screen camera view
    if (isCapturing) {
        return (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-90">
                <div className="relative mx-auto h-full w-full max-w-lg">
                    <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b from-black to-transparent p-4">
                        <h2 className="font-bold text-white">Prendre une photo</h2>
                        <button
                            onClick={() => setIsCapturing(false)}
                            className="rounded-full bg-black bg-opacity-50 p-2 text-white"
                            aria-label="Fermer"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <button
                        onClick={toggleCamera}
                        className="absolute right-4 top-16 z-10 rounded-full bg-black bg-opacity-50 p-2 text-white"
                        aria-label="Changer de caméra"
                    >
                        <RotateCw size={24} />
                    </button>

                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black">
                            <Loader size={50} className="animate-spin text-white" />
                            <span className="ml-3 text-white">Initialisation de la caméra...</span>
                        </div>
                    )}

                    {cameraError && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black p-6">
                            <div className="mb-4 max-w-sm rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
                                <p className="font-bold">Erreur</p>
                                <p>{cameraError}</p>
                            </div>
                            <button
                                onClick={() => setIsCapturing(false)}
                                className="mt-4 rounded bg-blue-500 px-4 py-2 text-white"
                            >
                                Retour
                            </button>
                        </div>
                    )}

                    {!cameraError && (
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="h-full w-full object-cover"
                        />
                    )}

                    <button
                        onClick={capturePhoto}
                        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 transform rounded-full bg-white p-4"
                    >
                        <Camera size={32} className="text-black" />
                    </button>
                </div>

                <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>
        );
    }

    // Print confirmation view (shown after successful PDF creation when printing is enabled)
    if (showPrintConfirmation) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
                    <h3 className="text-xl font-bold mb-4 flex items-center">
                        <Printer className="mr-2" size={20} />
                        Impression en cours
                    </h3>

                    {printSuccess ? (
                        <div className="text-center py-8">
                            <Check size={48} className="mx-auto text-green-500 mb-4" />
                            <p className="text-green-600 font-medium">Document imprimé avec succès!</p>
                            <p className="text-sm text-gray-600 mt-2">Cette fenêtre va se fermer automatiquement...</p>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Loader size={48} className="mx-auto text-blue-500 mb-4 animate-spin" />
                            <p className="text-blue-600 font-medium">Impression en cours...</p>
                            <p className="text-sm text-gray-600 mt-2">
                                Imprimante: {selectedPrinter}
                            </p>
                            <p className="text-sm text-gray-600">
                                Document: {createdJobNumber} - {createdPaletteName}
                            </p>

                            {printError && (
                                <div className="mt-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
                                    {printError}
                                    <div className="mt-2">
                                        <button
                                            onClick={handleModalClose}
                                            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                                        >
                                            Fermer
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Regular form view - rest of your existing code remains the same...
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-bold mb-4 flex items-center">
                    <Package className="mr-2" size={20} />
                    Formulaire Feuille d'Emballage
                </h3>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Longueur (po)
                    </label>
                    <input
                        type="text"
                        value={dimensionsModal.palLong}
                        onChange={(e) => setDimensionsModal(prev => ({
                            ...prev,
                            palLong: e.target.value
                        }))}
                        placeholder="Longueur de la palette"
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Largeur (po)
                    </label>
                    <input
                        type="text"
                        value={dimensionsModal.palLarg}
                        onChange={(e) => setDimensionsModal(prev => ({
                            ...prev,
                            palLarg: e.target.value
                        }))}
                        placeholder="Largeur de la palette"
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Hauteur (po)
                    </label>
                    <input
                        type="text"
                        value={dimensionsModal.palHaut}
                        onChange={(e) => setDimensionsModal(prev => ({
                            ...prev,
                            palHaut: e.target.value
                        }))}
                        placeholder="Hauteur de la palette"
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes
                    </label>
                    <input
                        type="text"
                        value={dimensionsModal.Notes}
                        onChange={(e) => setDimensionsModal(prev => ({
                            ...prev,
                            Notes: e.target.value
                        }))}
                        placeholder="Notes spéciales"
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div className="mb-4">
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            disabled={!isComplete && !(isAdmin || isMod)}
                            checked={dimensionsModal.palFinal}
                            onChange={(e) => setDimensionsModal(prev => ({
                                ...prev,
                                palFinal: e.target.checked
                            }))}
                            className="mr-2"
                        />
                        <span className={isComplete || isAdmin || isMod ? "" : "text-gray-400"}>Palette Finale</span>
                    </label>
                    {(!isComplete && (
                        <p className="text-xs text-red-500 ml-6 mt-1">Toutes les pièces doivent être scannées pour marquer Palette Finale</p>
                    ))}
                    {(!isComplete && (isAdmin || isMod)) && (
                        <p className="text-xs text-yellow-500 ml-6 mt-1">Mode Privilégié: Vous pouvez marquer Palette Finale même si la Job n'est pas complète</p>
                    )}
                </div>

                {/* Print after creation checkbox */}
                <div className="mb-4 border-t pt-4">
                    <label className="flex items-center mb-3">
                        <input
                            type="checkbox"
                            checked={printAfterCreation}
                            onChange={(e) => setPrintAfterCreation(e.target.checked)}
                            className="mr-2"
                        />
                        <span className="flex items-center">
                            <Printer className="mr-1" size={16} />
                            Imprimer la Feuille
                        </span>
                    </label>

                    {/* Printer selection - only shown when checkbox is checked */}
                    {printAfterCreation && (
                        <div className="ml-6 space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    S&eacute;lectionner une imprimante
                                </label>

                                {availablePrinters.length > 0 ? (
                                    <select
                                        value={selectedPrinter ?? ""}
                                        onChange={(e) => setSelectedPrinter(e.target.value)}
                                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                                    >
                                        {availablePrinters.map((printer, index) => {
                                            const name = printer.name || printer;
                                            const label = printer.displayName || name;

                                            return (
                                                <option key={index} value={name}>
                                                    {label}
                                                </option>
                                            );
                                        })}
                                        <option value="">-- Choisir une imprimante --</option>
                                    </select>
                                ) : (
                                    <div className="flex items-center py-2">
                                        <Loader size={16} className="animate-spin text-blue-500 mr-2" />
                                        <span className="text-sm text-gray-600">Chargement des imprimantes...</span>
                                    </div>
                                )}
                            </div>
                            {printError && (
                                <div className="rounded border border-red-400 bg-red-100 px-3 py-2 text-sm text-red-700">
                                    {printError}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Photo de la palette (optionnel)
                    </label>

                    <button
                        type="button"
                        onClick={handleTakePhoto}
                        className="w-full mb-3 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded flex items-center justify-center"
                        disabled={isProcessing}
                    >
                        <Camera className="mr-2" size={18} />
                        {palletImage ? 'Remplacer la photo' : 'Prendre une photo'}
                    </button>

                    {palletImage && (
                        <div className="mb-3 relative">
                            <img
                                src={palletImage.url}
                                alt="Photo de la palette"
                                className="w-full max-h-96 object-contain rounded border"
                            />
                            <button
                                onClick={removePhoto}
                                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                                title="Supprimer la photo"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    )}
                </div>

                <canvas ref={canvasRef} style={{ display: 'none' }} />

                {validationError && (
                    <div className="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
                        {validationError}
                    </div>
                )}

                <div className="flex justify-end gap-3">
                    <button
                        onClick={handleModalClose}
                        className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
                        disabled={isProcessing}
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleCreatePackaging}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                        disabled={isProcessing}
                    >
                        {isProcessing ? 'Création...' : 'Créer Emballage'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EnhancedDimensionsModal;