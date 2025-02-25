import React, { useState, useEffect, useRef } from 'react';
import { XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BasicScanPage = () => {
    const [error, setError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const inputRef = useRef(null);
    const API_BASE_URL = 'http://192.168.88.55:5128';
    const navigate = useNavigate();

    let barcodeBuffer = '';
    let barcodeTimeout = null;

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

        if (scannedText.startsWith("*") && scannedText.endsWith("*")) {
            scannedText = scannedText.substring(1, scannedText.length - 2);
        }

        const normalizedText = scannedText.replace(/[/-]/g, '-');
        const match = normalizedText.match(/^(\d{5,6})-(.+)-(\d+)$/);

        if (!match) {
            setError('Format de code-barres invalide!');
            setIsProcessing(false);
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

            const responseData = await response.json();

            // Create scan data with appropriate status
            const scanData = {
                jobNumber,
                partId,
                quantity,
                timestamp: new Date().toLocaleString(),
                status: response.ok ? 'success' : 'error',
                uniqueId: `${jobNumber}-${partId}-${Date.now()}`
            };

            if (!response.ok) {
                scanData.errorMessage = responseData.message || 'Erreur lors de l\'enregistrement';
                setError(responseData.message || 'Erreur lors de l\'enregistrement');
            }

            // Navigate with the scan data
            navigate(`/scan/${jobNumber}`, { state: { initialScan: scanData } });
        } catch (err) {
            // Create scan data with error status
            const scanData = {
                jobNumber,
                partId,
                quantity,
                timestamp: new Date().toLocaleString(),
                status: 'error',
                errorMessage: err.message,
                uniqueId: `${jobNumber}-${partId}-${Date.now()}`
            };
            setError(err.message);
            navigate(`/scan/${jobNumber}`, { state: { initialScan: scanData } });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold mb-4">Scanner de Code-barres</h1>
                <div className="mb-4">
                    <div className="relative">
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Scannez ou entrez le code ici..."
                            className="w-full p-2 border rounded"
                            onKeyDown={handleManualInput}
                            autoFocus
                        />
                    </div>
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
        </div>
    );
};

export default BasicScanPage;