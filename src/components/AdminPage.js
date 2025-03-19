import React, { useState, useEffect } from 'react';
import { Loader, User, UserPlus, Trash2, RefreshCcw, CheckCircle, XCircle, Edit } from 'lucide-react';

const AdminPage = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const API_BASE_URL = 'https://192.168.88.55:5128';
    const [showAddUser, setShowAddUser] = useState(false);
    const [showEditUser, setShowEditUser] = useState(false);
    const [newUser, setNewUser] = useState({
        username: '',
        email: '',
        password: '',
        role: 'User'
    });
    const [editingUser, setEditingUser] = useState({
        id: null,
        username: '',
        email: '',
        password: '',
        role: ''
    });

    // Fetch users on component mount
    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/users`);
            if (!response.ok) {
                throw new Error('Failed to fetch users');
            }
            const data = await response.json();
            setUsers(data);
        } catch (err) {
            setError(err.message || 'An error occurred while fetching users');
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: newUser.username,
                    email: newUser.email,
                    password: newUser.password,
                    role: newUser.role
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to add user');
            }

            setNewUser({
                username: '',
                email: '',
                password: '',
                role: 'User'
            });
            setShowAddUser(false);
            fetchUsers();
        } catch (err) {
            setError(err.message || 'An error occurred while adding the user');
        }
    };

    const handleEditClick = (user) => {
        setEditingUser({
            id: user.id,
            username: user.username,
            email: user.email,
            password: '', // Password is empty as we don't receive it from server
            role: user.role
        });
        setShowEditUser(true);
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        try {
            // Create a copy of the user object to modify
            const userToUpdate = { ...editingUser };

            // If password field is empty, we're not updating the password
            // If password field has content, we'll need to hash it in the backend

            const response = await fetch(`${API_BASE_URL}/api/users/${userToUpdate.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userToUpdate)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update user');
            }

            setShowEditUser(false);
            fetchUsers(); // Refresh user list
        } catch (err) {
            setError(err.message || 'An error occurred while updating the user');
        }
    };

    const deleteUser = async (userId) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur?')) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Failed to delete user');
            }

            setUsers(users.filter(user => user.id !== userId));
        } catch (err) {
            setError(err.message || 'An error occurred while deleting the user');
        }
    };

    if (loading && users.length === 0) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Loader size={40} className="animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Gestion des Utilisateurs</h1>
                <div className="flex gap-2">
                    <button
                        onClick={() => fetchUsers()}
                        className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"
                        title="Rafraîchir"
                    >
                        <RefreshCcw size={20} />
                    </button>
                    <button
                        onClick={() => setShowAddUser(true)}
                        className="flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        <UserPlus size={20} className="mr-2" />
                        Ajouter un utilisateur
                    </button>
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

            {/* Add User Form */}
            {showAddUser && (
                <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">Ajouter un nouvel utilisateur</h2>
                        <button
                            onClick={() => setShowAddUser(false)}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            <XCircle size={20} />
                        </button>
                    </div>
                    <form onSubmit={handleAddUser}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nom d'utilisateur
                                </label>
                                <input
                                    type="text"
                                    className="w-full p-2 border rounded"
                                    value={newUser.username}
                                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    className="w-full p-2 border rounded"
                                    value={newUser.email}
                                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Mot de passe
                                </label>
                                <input
                                    type="password"
                                    className="w-full p-2 border rounded"
                                    value={newUser.password}
                                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Rôle
                                </label>
                                <select
                                    className="w-full p-2 border rounded"
                                    value={newUser.role}
                                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                >
                                    <option value="User">Utilisateur</option>
                                    <option value="Moderator">Modérateur</option>
                                    <option value="Admin">Administrateur</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button
                                type="button"
                                className="px-4 py-2 text-gray-700 border rounded mr-2"
                                onClick={() => setShowAddUser(false)}
                            >
                                Annuler
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                                Ajouter
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Edit User Form */}
            {showEditUser && (
                <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">Modifier l'utilisateur</h2>
                        <button
                            onClick={() => setShowEditUser(false)}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            <XCircle size={20} />
                        </button>
                    </div>
                    <form onSubmit={handleUpdateUser}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nom d'utilisateur
                                </label>
                                <input
                                    type="text"
                                    className="w-full p-2 border rounded"
                                    value={editingUser.username}
                                    onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    className="w-full p-2 border rounded"
                                    value={editingUser.email}
                                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Mot de passe (laisser vide pour ne pas modifier)
                                </label>
                                <input
                                    type="password"
                                    className="w-full p-2 border rounded"
                                    value={editingUser.password}
                                    onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                                    placeholder="Laisser vide pour conserver le mot de passe actuel"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Rôle
                                </label>
                                <select
                                    className="w-full p-2 border rounded"
                                    value={editingUser.role}
                                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                                >
                                    <option value="User">Utilisateur</option>
                                    <option value="Admin">Administrateur</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button
                                type="button"
                                className="px-4 py-2 text-gray-700 border rounded mr-2"
                                onClick={() => setShowEditUser(false)}
                            >
                                Annuler
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                                Enregistrer
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Users Table */}
            <div className="overflow-x-auto bg-white rounded-lg shadow">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Utilisateur
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Rôle
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Dernière Connexion
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {users.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                                    Aucun utilisateur trouv&eacute;
                                </td>
                            </tr>
                        ) : (
                            users.map(user => (
                                <tr key={user.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-gray-100 rounded-full">
                                                <User size={20} className="text-gray-600" />
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {user.username}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {user.email}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'Admin'
                                                ? 'bg-purple-100 text-purple-800'
                                                : user.role === 'Moderator'
                                                    ? 'bg-blue-100 text-blue-800'
                                                    : 'bg-green-100 text-green-800'
                                            }`}>
                                            {user.role === 'Admin'
                                                ? 'Administrateur'
                                                : user.role === 'Moderator'
                                                    ? 'Modérateur'
                                                    : 'Utilisateur'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {user.lastLoginDate ? new Date(user.lastLoginDate).toLocaleString() : 'Jamais'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleEditClick(user)}
                                            className="p-1 text-blue-600 hover:text-blue-900"
                                            title="Modifier"
                                        >
                                            <Edit size={18} />
                                        </button>
                                        <button
                                            onClick={() => deleteUser(user.id)}
                                            className="ml-2 p-1 text-red-600 hover:text-red-900"
                                            title="Supprimer"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminPage;