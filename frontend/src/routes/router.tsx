import { lazy, Suspense } from 'react';
import { createBrowserRouter, Outlet } from 'react-router';
import { HomePage } from '../pages/public/HomePage';
import { NotFoundPage } from '../pages/public/NotFoundPage';
import { PrivacyPage } from '../pages/public/PrivacyPage';
import { SiteLoading } from '../pages/public/SiteStates';

// O painel é carregado sob demanda: visitantes do site não baixam esse código.
const AdminApp = lazy(() => import('../pages/admin/AdminApp'));

export const router = createBrowserRouter([
  {
    element: <Outlet />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/pacotes/:slug', element: <HomePage /> },
      { path: '/privacidade', element: <PrivacyPage /> },
      {
        path: '/admin/*',
        element: (
          <Suspense fallback={<SiteLoading />}>
            <AdminApp />
          </Suspense>
        ),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
