import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import JobDetails from './pages/JobDetails';
import BasicScanPage from './pages/BasicScanPage';
import JobScanPage from './pages/JobScanPage';

const App = () => {
    return (
        <BrowserRouter>
            <div>
                <nav className="bg-gray-800 p-4">
                    <div className="container mx-auto flex gap-4">
                        <Link to="/" className="text-white hover:text-gray-300">
                            Dashboard
                        </Link>
                        <Link to="/scan" className="text-white hover:text-gray-300">
                            Scanner
                        </Link>
                    </div>
                </nav>
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/jobs/:jobNumber" element={<JobDetails />} />
                    <Route path="/scan" element={<BasicScanPage />} />
                    <Route path="/scan/:jobNumber" element={<JobScanPage />} />
                </Routes>
            </div>
        </BrowserRouter>
    );
};

export default App;