import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, Package, RotateCw, Loader } from 'lucide-react';

const EnhancedDimensionsModal = ({
    dimensionsModal,
    setDimensionsModal,
    createPackaging,
    isProcessing = false
}) => {
    const [palletImage, setPalletImage] = useState(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [cameraError, setCameraError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [validationError, setValidationError] = useState('');
    const [facingMode, setFacingMode] = useState("environment");
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);

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
                            // Optional: Log capabilities
                            imageCapture.getPhotoCapabilities().then((capabilities) => {
                                console.log("Camera capabilities:", capabilities);
                            }).catch((err) => {
                                console.warn("Could not get capabilities:", err);
                            });

                            // Store it in a ref if needed later
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

                // Check for specific error types
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
            // Remove existing photo if taking a new one
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

        // Try using ImageCapture API
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
                // fallback to canvas below
            }
        }

        // Fallback using canvas
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
        }, 'image/jpeg', 1.0); // Maximum quality

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

        //À supprimer si je veux que ça supporte les Lettres aussi
        const isValidNumber = (value) => /^\d+(\.\d+)?$/.test(value); // accepte entiers et décimaux
        if (![palLong, palLarg, palHaut].every(isValidNumber)) {
            setValidationError("Les champs Longueur, Largeur et Hauteur doivent être des nombres.");
            return;
        }

        setValidationError(''); // Clear any previous error

        await createPackaging(palletImage?.blob || null);

        // Clean up after successful creation
        if (palletImage) {
            URL.revokeObjectURL(palletImage.url);
            setPalletImage(null);
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    if (!dimensionsModal.isOpen) return null;

    // Full-screen camera view
    if (isCapturing) {
        return (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-90">
                <div className="relative mx-auto h-full w-full max-w-lg">
                    {/* Header with close button */}
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

                    {/* Camera toggle button */}
                    <button
                        onClick={toggleCamera}
                        className="absolute right-4 top-16 z-10 rounded-full bg-black bg-opacity-50 p-2 text-white"
                        aria-label="Changer de caméra"
                    >
                        <RotateCw size={24} />
                    </button>

                    {/* Loading state */}
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black">
                            <Loader size={50} className="animate-spin text-white" />
                            <span className="ml-3 text-white">Initialisation de la caméra...</span>
                        </div>
                    )}

                    {/* Error state */}
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

                    {/* Camera preview */}
                    {!cameraError && (
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="h-full w-full object-cover"
                        />
                    )}  
                    {/* Capture button */}
                    <button
                        onClick={capturePhoto}
                        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 transform rounded-full bg-white p-4"
                    >
                        <Camera size={32} className="text-black" />
                    </button>
                </div>

                {/* Hidden canvas for photo capture */}
                <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>
        );
    }

    // Regular form view
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-bold mb-4 flex items-center">
                    <Package className="mr-2" size={20} />
                    Formulaire Feuille d'Emballage
                </h3>

                {/* Dimensions inputs */}
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
                            checked={dimensionsModal.palFinal}
                            onChange={(e) => setDimensionsModal(prev => ({
                                ...prev,
                                palFinal: e.target.checked
                            }))}
                            className="mr-2"
                        />
                        <span className="text-sm text-gray-700">Palette Finale?</span>
                    </label>
                </div>

                {/* Photo capture section */}
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

                    {/* Captured photo preview */}
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

                {/* Hidden canvas for photo capture */}
                <canvas ref={canvasRef} style={{ display: 'none' }} />

                {validationError && (
                    <div className="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
                        {validationError}
                    </div>
                )}


                {/* Action buttons */}
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