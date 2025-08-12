import React, { useState, useContext } from 'react';
import { ChevronUp, ChevronDown, Trash2, Eye, FileText, Image, Lock, CheckCircle, AlertTriangle, X, ExternalLink, Unlock } from 'lucide-react';
import { AuthContext } from '../components/AuthContext';

const PalletContentsTable = ({
    jobNumber,
    pallets,
    palletContents,
    activePallet,
    setActivePallet,
    setDimensionsModal,
    handleDeleteScan,
    API_BASE_URL
}) => {
    const { isAdmin, isMod } = useContext(AuthContext);
    const [showPalletTable, setShowPalletTable] = useState(true);
    const [deleteMode, setDeleteMode] = useState(false);
    const [unlockingPallets, setUnlockingPallets] = useState(new Set());
    const [previewModal, setPreviewModal] = useState({
        isOpen: false,
        pdfPath: '',
        imagePath: '',
        palletName: ''
    });

    const isScanningDisabled = (pallet) => {
        return pallet.hasPackagingBeenGenerated === true;
    };

    const getPalletStatusInfo = (pallet) => {
        // Check for packaging generation status including 'True' with capital T
        const hasPackaging = pallet.hasPackagingBeenGenerated === true ||
            pallet.HasPackagingBeenGenerated === true ||
            pallet.hasPackagingBeenGenerated === 'true' ||
            pallet.HasPackagingBeenGenerated === 'true' ||
            pallet.hasPackagingBeenGenerated === 'True' ||
            pallet.HasPackagingBeenGenerated === 'True';
        console.log('Pallet status check:', pallet.name, 'hasPackaging:', pallet.hasPackagingBeenGenerated, hasPackaging);

        if (hasPackaging) {
            //console.log('Pallet Sheet has been generated:', pallet);
            return {
                status: 'completed',
                message: 'Feuille d\'emballage générée',
                icon: <CheckCircle size={16} className="text-green-600" />,
                bgColor: 'bg-green-50 border-green-200',
                textColor: 'text-green-800',
                headerBg: 'bg-green-600',
                headerText: 'text-white',
                inactiveHeaderBg: 'bg-green-200',
                inactiveHeaderText: 'text-green-800',
                buttonBg: 'bg-violet-600 hover:bg-violet-700', // Changed to violet for better contrast
                buttonText: 'text-white'
            };
        }
        return {
            status: 'active',
            message: 'En cours',
            icon: null,
            bgColor: 'bg-blue-50',
            textColor: 'text-blue-800',
            headerBg: 'bg-blue-600',
            headerText: 'text-white',
            inactiveHeaderBg: 'bg-blue-200',
            inactiveHeaderText: 'text-blue-800',
            buttonBg: 'bg-amber-600 hover:bg-amber-700', // Changed to amber for better contrast
            buttonText: 'text-white'
        };
    };

    const handlePackagingButtonClick = (pallet) => {
        // Check for packaging generation status including 'True' with capital T
        const hasPackaging = pallet.hasPackagingBeenGenerated === true ||
            pallet.HasPackagingBeenGenerated === true ||
            pallet.hasPackagingBeenGenerated === 'true' ||
            pallet.HasPackagingBeenGenerated === 'true' ||
            pallet.hasPackagingBeenGenerated === 'True' ||
            pallet.HasPackagingBeenGenerated === 'True';

        if (hasPackaging) {
            const pdfPath = pallet.packagingPdfPath || pallet.PackagingPdfPath || pallet.pdfPath || '';
            const imagePath = pallet.packagingImagePath || pallet.PackagingImagePath || pallet.imagePath || '';

            setPreviewModal({
                isOpen: true,
                pdfPath,
                imagePath,
                palletName: pallet.name
            });
        } else {
            setDimensionsModal({
                isOpen: true,
                palletId: pallet.id,
                palLong: '',
                palLarg: '',
                palHaut: '',
                Notes: '',
                palFinal: false
            });
        }
    };

    const handleUnlockPallet = async (pallet) => {
        if (unlockingPallets.has(pallet.id)) return; // Prevent double-clicks

        // Check if user has permission to unlock
        if (!(isAdmin || isMod)) {
            alert('Vous n\'avez pas les droits pour débloquer une palette. Veuillez contacter un modérateur ou un administrateur.');
            return;
        }

        const confirmUnlock = window.confirm(
            `Êtes-vous sûr de vouloir débloquer la palette ${pallet.name}? Cette action permettra de nouveaux scans et supprimera le statut "complété".`
        );

        if (!confirmUnlock) return;

        setUnlockingPallets(prev => new Set([...prev, pallet.id]));

        try {
            const response = await fetch(`${API_BASE_URL}/api/Dashboard/pallets/packaging/${pallet.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            // Show success message with emphasis on redoing the packaging sheet
            alert(`${result.message || 'Palette débloquée avec succès'}\n\n⚠️ IMPORTANT: Vous devez refaire la feuille d'emballage pour que celle-ci contienne les données les plus récentes après vos modifications.`);

            // Refresh the data or update the state
            // You might want to call a refresh function here
            // refreshPallets();

        } catch (error) {
            console.error('Error unlocking pallet:', error);
            alert('Erreur lors du débloquage de la palette. Veuillez réessayer.');
        } finally {
            setUnlockingPallets(prev => {
                const newSet = new Set(prev);
                newSet.delete(pallet.id);
                return newSet;
            });
        }
    };

    const handleOpenInNewTab = (filePath) => {
        if (!filePath) return;
        const fullUrl = getFullUrl(filePath); // Use your existing method
        window.open(fullUrl, '_blank');
    };

    const getFullUrl = (filePath) => {
        if (!filePath) return '';
        const encodedPath = encodeURIComponent(filePath);
        return `${API_BASE_URL}/api/Dashboard/serve?path=${encodedPath}`;
    };

    const PreviewModal = () => {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between p-6 border-b">
                        <h3 className="text-xl font-bold flex items-center">
                            <CheckCircle className="text-green-500 mr-2" size={24} />
                            Palette {previewModal.palletName}
                        </h3>
                        <button
                            onClick={() => setPreviewModal({ isOpen: false, pdfPath: '', imagePath: '', palletName: '' })}
                            className="text-gray-500 hover:text-gray-700 p-1"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <div className="p-4 bg-green-50 border-b border-green-200">
                        <p className="text-green-800 text-sm font-medium">
                            ✅ Feuille d'emballage déjà générée
                        </p>
                        <p className="text-green-600 text-xs mt-1">
                            Cette palette est complète et verrouillée pour de nouveaux scans.
                        </p>
                    </div>

                    <div className="flex-1 overflow-auto p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {previewModal.pdfPath && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-semibold flex items-center gap-2">
                                            <FileText className="text-blue-600" size={20} />
                                            PDF d'emballage
                                        </h4>
                                        <button
                                            onClick={() => handleOpenInNewTab(previewModal.pdfPath)}
                                            className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                                        >
                                            <ExternalLink size={12} />
                                            Ouvrir
                                        </button>
                                    </div>
                                    <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-50">
                                        <iframe
                                            src={getFullUrl(previewModal.pdfPath)}
                                            className="w-full h-96"
                                            title="PDF Preview"
                                        />
                                    </div>
                                </div>
                            )}

                            {previewModal.imagePath && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-semibold flex items-center gap-2">
                                            <Image className="text-purple-600" size={20} />
                                            Photo de la palette
                                        </h4>
                                        <button
                                            onClick={() => handleOpenInNewTab(previewModal.imagePath)}
                                            className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                                        >
                                            <ExternalLink size={12} />
                                            Ouvrir
                                        </button>
                                    </div>
                                    <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-50">
                                        <img
                                            src={getFullUrl(previewModal.imagePath)}
                                            alt="Preview de la palette"
                                            className="w-full h-96 object-cover cursor-pointer hover:scale-105 transition-transform"
                                            onClick={() => handleOpenInNewTab(previewModal.imagePath)}
                                        />
                                    </div>
                                </div>
                            )}

                            {!previewModal.pdfPath && !previewModal.imagePath && (
                                <div className="col-span-full text-center py-8 text-gray-500">
                                    <AlertTriangle size={48} className="mx-auto mb-2 text-gray-400" />
                                    <p>Aucun fichier disponible pour cette palette</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="border-t border-gray-200 p-4">
                        <button
                            onClick={() => setPreviewModal({ isOpen: false, pdfPath: '', imagePath: '', palletName: '' })}
                            className="w-full px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                        >
                            Fermer
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
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
                            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-sm"
                        >
                            {deleteMode ? 'Quitter Mode Édition' : 'Voir Détails'}
                        </button>
                    </div>

                    {showPalletTable && (
                        <div className="bg-white rounded-lg shadow-lg p-4">
                            <div className="overflow-x-auto">
                                <div className="flex space-x-4 min-w-max">
                                    {pallets.map(pallet => {
                                        const statusInfo = getPalletStatusInfo(pallet);
                                        // Use the same logic as in getPalletStatusInfo for consistency
                                        const isCompleted = pallet.hasPackagingBeenGenerated === true ||
                                            pallet.HasPackagingBeenGenerated === true ||
                                            pallet.hasPackagingBeenGenerated === 'true' ||
                                            pallet.HasPackagingBeenGenerated === 'true' ||
                                            pallet.hasPackagingBeenGenerated === 'True' ||
                                            pallet.HasPackagingBeenGenerated === 'True';

                                        const isUnlocking = unlockingPallets.has(pallet.id);

                                        return (
                                            <div key={pallet.id} className="min-w-64 flex-shrink-0">
                                                <div
                                                    className={`p-3 rounded-t-lg font-semibold text-center cursor-pointer flex justify-between items-center ${activePallet?.id === pallet.id
                                                        ? statusInfo.headerBg + ' ' + statusInfo.headerText
                                                        : statusInfo.inactiveHeaderBg + ' ' + statusInfo.inactiveHeaderText
                                                        }`}
                                                    onClick={() => setActivePallet(pallet)}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span>{pallet.name} ({palletContents[pallet.id]?.length || 0})</span>
                                                        {/* Show unlock button instead of lock icon when completed */}
                                                        {isCompleted && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleUnlockPallet(pallet);
                                                                }}
                                                                disabled={isUnlocking}
                                                                className={`p-1 rounded hover:bg-opacity-80 transition-colors ${isUnlocking ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white hover:bg-opacity-20'} ${!(isAdmin || isMod) ? 'opacity-60' : ''}`}
                                                                title={
                                                                    isUnlocking
                                                                        ? 'Débloquage en cours...'
                                                                        : (isAdmin || isMod)
                                                                            ? 'Débloquer la palette'
                                                                            : 'Seuls les modérateurs et administrateurs peuvent débloquer'
                                                                }
                                                            >
                                                                {isUnlocking ? (
                                                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                                                ) : (
                                                                    <Unlock size={14} />
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handlePackagingButtonClick(pallet);
                                                        }}
                                                        className={`px-2 py-1 rounded-md text-xs flex items-center gap-1 ${statusInfo.buttonBg} ${statusInfo.buttonText}`}
                                                    >
                                                        {isCompleted ? (
                                                            <>
                                                                <Eye size={12} />
                                                                Voir Fichiers
                                                            </>
                                                        ) : (
                                                            'Feuille Emballage'
                                                        )}
                                                    </button>
                                                </div>

                                                {isCompleted && (
                                                    <div className={`px-3 py-2 text-xs ${statusInfo.bgColor} ${statusInfo.textColor} flex items-center gap-2`}>
                                                        {statusInfo.icon}
                                                        <span className="font-medium">{statusInfo.message}</span>
                                                        <AlertTriangle size={12} className="text-amber-500" title="Scans verrouillés" />
                                                    </div>
                                                )}

                                                <div className={`border border-gray-300 ${isCompleted ? 'border-t-0' : 'rounded-b-lg'} p-2 max-h-64 overflow-y-auto ${isCompleted ? 'bg-gray-50' : ''}`}>
                                                    {palletContents[pallet.id] && palletContents[pallet.id].length > 0 ? (
                                                        <ul className="divide-y divide-gray-200">
                                                            {palletContents[pallet.id].map((item, index) => (
                                                                <li key={index} className={`py-2 px-1 text-sm ${isCompleted ? 'opacity-75' : 'hover:bg-gray-50'}`}>
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
                                                                    {deleteMode && !isCompleted && (
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
                                                                    {deleteMode && isCompleted && (
                                                                        <span className="text-gray-400 text-xs italic">
                                                                            Non modifiable (palette complète)
                                                                        </span>
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
                                        );
                                    })}
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

            {previewModal.isOpen && <PreviewModal />}
        </>
    );
};

export default PalletContentsTable;