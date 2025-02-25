import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
    return (
        <nav className="bg-gray-800 p-4">
            <div className="container mx-auto flex gap-4">
                <Link to="/" className="text-white hover:text-gray-300">
                    Dashboard
                </Link>
                <Link to="/scan" className="text-white hover:text-gray-300">
                    Scanner
                </Link>
                <Link to="/jobs" className="text-white hover:text-gray-300">
                    Jobs
                </Link>
            </div>
        </nav>
    );
};

export default Navbar;