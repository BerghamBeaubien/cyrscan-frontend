import React, { useState, useEffect, useRef } from 'react';
import { XCircle, Loader, QrCode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MobileQRScanner from './MobileQRScanner';

const BasicScanPage = () => {
    const [error, setError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showQrScanner, setShowQrScanner] = useState(false);
    const inputRef = useRef(null);
    const navigate = useNavigate();

    let barcodeBuffer = '';
    let barcodeTimeout = null;

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

    useEffect(() => {
        // Setup global event listener for barcode scanner
        document.addEventListener('keydown', handleGlobalKeydown);

        return () => {
            document.removeEventListener('keydown', handleGlobalKeydown);
        };
    }, []);

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
        setIsLoading(true);

        try {
            if (scannedText.startsWith("*") && scannedText.endsWith("*")) {
                scannedText = scannedText.substring(1, scannedText.length - 2);
            }

            // Normalize text by replacing '/' and 'é' with '-'
            const normalizedText = scannedText.replace(/[é/]/g, '-');

            // Attempt to match full format [JobNumber]-[PartID]-[Sequence]
            const match = normalizedText.match(/^([A-Za-z0-9]+)(?:-(.+)-(\d+))?$/);

            if (!match) {
                setError('Format de code-barres invalide! Format attendu: [JobNumber]-[PartID]-[Sequence] ou simplement [JobNumber]');
                setIsLoading(false);
                setIsProcessing(false);
                return;
            }

            const [_, jobNumber] = match;

            // Navigate directly to jobNumber
            navigate(`/scan/${jobNumber}`);
        } catch (err) {
            setError(err.message || 'Une erreur s\'est produite');
        } finally {
            setIsLoading(false);
            setIsProcessing(false);
        }
    };


    // Loading overlay component
    const LoadingOverlay = () => (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-lg flex flex-col items-center max-w-md w-full">
                <Loader size={60} className="text-blue-500 animate-spin mb-4" />
                <h2 className="text-2xl font-bold mb-2">Traitement en cours</h2>
                <p className="text-gray-700 text-center">Redirection vers la page de commande...</p>
                <p className="text-gray-500 text-sm mt-4">Veuillez patienter...</p>
            </div>
        </div>
    );

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Loading Overlay */}
            {isLoading && <LoadingOverlay />}

            <div className="mb-8">
                <h1 className="text-2xl font-bold mb-6 text-center">Scanner de Code-barres</h1>

                <div className="max-w-xl mx-auto mb-8 bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h2 className="text-lg font-semibold text-blue-700 mb-2">Instructions:</h2>
                    <ol className="list-decimal pl-5 space-y-2 text-blue-800">
                        <li>Scannez n'importe quel code QR pour commencer</li>
                        <li>Le format attendu est: <span className="font-mono bg-white px-2 py-0.5 rounded">NumeroJob-NumeroPièce-Sequence</span></li>
                        <li>Vous serez automatiquement redirigé vers la page de la commande correspondante</li>
                    </ol>
                </div>

                <div className="mb-4 max-w-xl mx-auto">
                    <div className="relative">
                        <div className="flex items-center">
                            <button
                                className="bg-blue-100 p-2 rounded-l-lg border border-r-0 border-blue-300"
                                onClick={() => setShowQrScanner(prev => !prev)}
                            >
                                <QrCode size={24} className="text-blue-500" />
                            </button>
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Scannez ou entrez le code ici..."
                                className="w-full p-3 border border-blue-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                onKeyDown={handleManualInput}
                                autoFocus
                            />
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="max-w-xl mx-auto bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
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

            {/* Camera Button */}
            <div className="absolute top-0 right-0 mr-2 mt-2">
                <button
                    className="p-2 rounded-full bg-gray-200 hover:bg-gray-300"
                    onClick={() => setShowQrScanner(prev => !prev)}
                >
                    <QrCode size={20} className="text-gray-600" />
                </button>

                {/* Import and use the new component */}
                {showQrScanner && (
                    <MobileQRScanner
                        onScan={(scannedText) => {
                            const formattedCode = formatQRCode(scannedText);
                            processBarcode(formattedCode);
                            setShowQrScanner(false);
                        }}
                        onClose={() => setShowQrScanner(false)}
                    />
                )}
            </div>
        </div>

    );
};

export default BasicScanPage;