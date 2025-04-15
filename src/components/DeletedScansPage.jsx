import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader, Filter, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { AuthContext } from './AuthContext';

// Constante pour l'URL de l'API
const API_BASE_URL = 'https://192.168.88.55:5128';

const DeletedScansPage = () => {
    const [deletedScans, setDeletedScans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [totalPages, setTotalPages] = useState(1);
    const [jobNumberFilter, setJobNumberFilter] = useState('');
    const [appliedFilter, setAppliedFilter] = useState('');
    const [totalCount, setTotalCount] = useState(0);
    const navigate = useNavigate();
    const { currentUser } = useContext(AuthContext);

    // V�rifier si l'utilisateur est connect�
    useEffect(() => {
        if (!currentUser) {
            navigate('/login');
        }
    }, [currentUser, navigate]);

    // R�cup�rer les scans supprim�s
    useEffect(() => {
        const fetchDeletedScans = async () => {
            setLoading(true);
            try {
                let url = `${API_BASE_URL}/api/Dashboard/deleted-scans?page=${page}&pageSize=${pageSize}`;

                if (appliedFilter) {
                    url += `&jobNumber=${encodeURIComponent(appliedFilter)}`;
                }

                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error('Erreur lors du chargement des données');
                }

                const data = await response.json();
                setDeletedScans(data.data);
                setTotalPages(data.totalPages);
                setTotalCount(data.totalCount);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchDeletedScans();
    }, [page, pageSize, appliedFilter]);

    // Appliquer le filtre de num�ro de commande
    const applyFilter = () => {
        setPage(1); // R�initialiser � la premi�re page
        setAppliedFilter(jobNumberFilter);
    };

    // R�initialiser le filtre
    const clearFilter = () => {
        setJobNumberFilter('');
        setAppliedFilter('');
        setPage(1);
    };

    // Formater la date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleString('fr-FR');
    };

    // Paginer � la page pr�c�dente
    const goToPreviousPage = () => {
        if (page > 1) {
            setPage(page - 1);
        }
    };

    // Paginer � la page suivante
    const goToNextPage = () => {
        if (page < totalPages) {
            setPage(page + 1);
        }
    };

    return (
        <div className="mx-auto max-w-6xl p-6">
            <div className="mb-6 flex items-center justify-between">
                <h1 className="flex items-center text-2xl font-bold">
                    <button
                        onClick={() => navigate('/')}
                        className="mr-2 p-1 rounded-full hover:bg-gray-200 transition-colors"
                        title="Retour au tableau de bord"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    Historique des Scans Supprim&eacute;s
                </h1>
            </div>

            {/* Filtre par num�ro de commande */}
            <div className="mb-4 rounded-lg bg-gray-50 p-4 shadow">
                <div className="flex items-center space-x-2">
                    <div className="flex-grow">
                        <label htmlFor="jobNumberFilter" className="mb-1 block text-sm font-medium text-gray-700">
                            Filtrer par numéro de commande
                        </label>
                        <input
                            id="jobNumberFilter"
                            type="text"
                            placeholder="Entrez un numéro de commande"
                            value={jobNumberFilter}
                            onChange={(e) => setJobNumberFilter(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            onKeyDown={(e) => e.key === 'Enter' && applyFilter()}
                        />
                    </div>
                    <div className="flex space-x-2 self-end">
                        <button
                            onClick={applyFilter}
                            className="flex items-center rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                        >
                            <Filter className="mr-2" size={18} />
                            Filtrer
                        </button>
                        <button
                            onClick={clearFilter}
                            className="rounded bg-gray-300 px-4 py-2 text-gray-800 hover:bg-gray-400"
                        >
                            Réinitialiser
                        </button>
                    </div>
                </div>

                {appliedFilter && (
                    <div className="mt-2 text-sm text-blue-700">
                        Filtré par commande: <strong>{appliedFilter}</strong>
                    </div>
                )}
            </div>

            {/* R�sum� des r�sultats */}
            <div className="mb-4 rounded-lg bg-white p-3 text-gray-700 shadow">
                <p>
                    Affichage de {deletedScans.length} scans supprimés sur {totalCount} au total
                    {appliedFilter ? ` pour la commande ${appliedFilter}` : ''}
                </p>
            </div>

            {error && (
                <div className="relative mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
                    <strong>Erreur:</strong> {error}
                </div>
            )}

            {loading ? (
                <div className="flex h-40 items-center justify-center">
                    <Loader className="animate-spin text-blue-500" size={40} />
                    <span className="ml-2 text-gray-600">Chargement des données...</span>
                </div>
            ) : (
                <>
                    {/* Tableau des scans supprim�s */}
                    <div className="overflow-hidden rounded-lg bg-white shadow">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                            Commande
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                            Pièce
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                            Code QR
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                            Palette
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                            Date de scan
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                            Date de suppression
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                            Supprimé par
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {deletedScans.length > 0 ? (
                                        deletedScans.map((scan, index) => (
                                            <tr key={index} className="hover:bg-gray-50">
                                                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                                                    {scan.JobNumber}
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                                                    {scan.PartID}
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                                                    {scan.QRCode}
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                                                    {scan.PalletName || `Palette #${scan.PalletId}`}
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                                                    {formatDate(scan.ScanDate)}
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                                                    {formatDate(scan.DeletedDate)}
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                                                    {scan.DeletedByUsername}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500">
                                                Aucun scan supprimé trouvé
                                                {appliedFilter && ` pour la commande ${appliedFilter}`}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Pagination */}
                    <div className="mt-4 flex items-center justify-between rounded-lg bg-white px-4 py-3 shadow">
                        <div>
                            <p className="text-sm text-gray-700">
                                Page <span className="font-medium">{page}</span> sur <span className="font-medium">{totalPages}</span>
                            </p>
                        </div>
                        <div className="flex space-x-2">
                            <button
                                onClick={goToPreviousPage}
                                disabled={page === 1}
                                className={`px-3 py-1 border rounded ${page === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <button
                                onClick={goToNextPage}
                                disabled={page === totalPages}
                                className={`px-3 py-1 border rounded ${page === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default DeletedScansPage;