import Dashboard from '../pages/Dashboard';
import ScanPage from '../pages/ScanPage';
import JobDetails from '../pages/JobDetails';

const routes = [
    {
        path: '/',
        element: Dashboard
    },
    {
        path: '/scan',
        element: ScanPage
    },
    {
        path: '/jobs/:jobNumber',
        element: JobDetails
    }
];

export default routes;