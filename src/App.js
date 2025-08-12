import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthProvider } from './components/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import JobDetails from './pages/JobDetails';
import BasicScanPage from './pages/BasicScanPage';
import JobScanPage from './pages/JobScanPage';
import ScanDetailPage from './components/ScanDetailPage';
import AdminPage from './components/AdminPage';
import LoginPage from './components/LoginPage';
import UnauthorizedPage from './components/UnauthorizedPage';
import DeletedScansPage from './components/DeletedScansPage';
import SpecialFunctions from './components/SpecialFunctions';

function App() {
    return (
        <AuthProvider>
            <Router>
                <div className="min-h-screen flex flex-col">
                    <Header />
                    <div className="flex-grow">
                        <Routes>
                            <Route path="/login" element={<LoginPage />} />
                            <Route path="/unauthorized" element={<UnauthorizedPage />} />
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/jobs/:jobNumber" element={<JobDetails />} />
                            <Route
                                path="/scan"
                                element={
                                    <ProtectedRoute>
                                        <BasicScanPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/special-functions"
                                element={
                                    <ProtectedRoute requireAdmin={true}>
                                        <SpecialFunctions />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/scan/:jobNumber"
                                element={
                                    <ProtectedRoute>
                                        <JobScanPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/scan-details/:jobNumber"
                                element={
                                    <ProtectedRoute>
                                        <ScanDetailPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/admin"
                                element={
                                    <ProtectedRoute requireAdmin={true}>
                                        <AdminPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/deleted-scans"
                                element={
                                    <ProtectedRoute requireMod={true}>
                                        <DeletedScansPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </div>
                </div>
            </Router>
        </AuthProvider>
    );
}

export default App;
