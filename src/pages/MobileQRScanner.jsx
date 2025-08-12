import React, { useState, useEffect } from 'react';
import { XCircle, Loader } from 'lucide-react';
import QrReader from 'react-qr-scanner';

const MobileQRScanner = ({ onScan, onClose }) => {
    const [cameraError, setCameraError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [facingMode, setFacingMode] = useState("environment"); // Default to back camera

    // Handle camera initialization
    useEffect(() => {
        // Check if mediaDevices API is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setCameraError("Votre appareil ne prend pas en charge l'acc�s � la cam�ra");
            setLoading(false);
            return;
        }

        // Attempt to get camera access
        navigator.mediaDevices.getUserMedia({ video: { facingMode } })
            .then(() => {
                setLoading(false);
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
            });
    }, [facingMode]);

    const toggleCamera = () => {
        setFacingMode(prev => prev === "environment" ? "user" : "environment");
        setLoading(true);
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-90">
            <div className="relative mx-auto h-full w-full max-w-lg">
                {/* Header with close button */}
                <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b from-black to-transparent p-4">
                    <h2 className="font-bold text-white">Scanner QR Code</h2>
                    <button
                        onClick={onClose}
                        className="rounded-full bg-black bg-opacity-50 p-2 text-white"
                        aria-label="Fermer"
                    >
                        <XCircle size={24} />
                    </button>
                </div>

                {/* Camera toggle button */}
                <button
                    onClick={toggleCamera}
                    className="-translate-x-1/2 absolute bottom-24 left-1/2 z-10 transform rounded-full bg-white px-4 py-2 text-sm font-medium"
                >
                    {facingMode === "environment" ? "Caméra avant" : "Caméra arrière"}
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
                            onClick={onClose}
                            className="mt-4 rounded bg-blue-500 px-4 py-2 text-white"
                        >
                            Retour
                        </button>
                    </div>
                )}

                {/* QR Reader */}
                {!cameraError && (
                    <QrReader
                        delay={500}
                        style={{ width: '100%', height: '100%' }}
                        onError={(err) => {
                            console.error("QR scanning error:", err);
                            setCameraError(`Erreur du scanner: ${err.message || 'Probl�me de lecture'}`);
                        }}
                        onScan={(data) => {
                            if (data) {
                                onScan(data.text);
                            }
                        }}
                        constraints={{
                            video: {
                                facingMode,
                                width: { ideal: 1280 },
                                height: { ideal: 720 }
                            }
                        }}
                        className="h-full"
                        key={facingMode} // Force re-render when camera changes
                    />
                )}

                {/* Scanning guide overlay */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="h-64 w-64 rounded-lg border-2 border-white opacity-70"></div>
                </div>

                {/* Instructions */}
                <div className="absolute bottom-8 left-0 right-0 bg-black bg-opacity-50 p-4 text-center text-white">
                    <p>Alignez le code QR dans le cadre</p>
                </div>
            </div>
        </div>
    );
};

export default MobileQRScanner;