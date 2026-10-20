import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { AdminLayout } from '../../layouts/AdminLayout';
import { SiteLoading } from '../public/SiteStates';
import { AuthMessage, ForgotPasswordPage, LoginPage, ResetPasswordPage } from './AuthPages';
import { AboutPage } from './AboutPage';
import { ContactPage } from './ContactPage';
import { DashboardPage } from './DashboardPage';
import { FaqPage } from './FaqPage';
import { GalleryPage, PhotoEditPage } from './GalleryPage';
import { HeroPage } from './HeroPage';
import { LotsPage } from './LotsPage';
import { PackageEditPage } from './PackageEditPage';
import { PackagesPage } from './PackagesPage';
import { SettingsPage } from './SettingsPage';
import { StepsPage } from './StepsPage';

/** Bloqueia o painel para quem não estiver logado como administradora. */
function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { status, activate } = useAuth();
  const location = useLocation();
  useEffect(() => activate(), [activate]);
  if (status === 'loading' || status === 'idle') return <SiteLoading />;
  if (status === 'unconfigured')
    return (
      <AuthMessage
        icon="settings"
        title="Login ainda não configurado"
        text="Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no frontend para habilitar o acesso ao painel."
      />
    );
  if (status === 'forbidden') return <AuthMessage icon="lock" title="Acesso restrito" text="Esta conta não tem permissão para acessar o painel." signOut />;
  if (status !== 'signedIn') return <Navigate to="/admin/entrar" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

export default function AdminApp() {
  const { activate } = useAuth();
  useEffect(() => activate(), [activate]);
  return (
    <Routes>
      <Route path="entrar" element={<LoginPage />} />
      <Route path="recuperar-senha" element={<ForgotPasswordPage />} />
      <Route path="redefinir-senha" element={<ResetPasswordPage />} />
      <Route
        element={
          <RequireAdmin>
            <AdminLayout />
          </RequireAdmin>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="inicio" element={<HeroPage />} />
        <Route path="sobre" element={<AboutPage />} />
        <Route path="galeria" element={<GalleryPage />} />
        <Route path="galeria/:id" element={<PhotoEditPage />} />
        <Route path="como-funciona" element={<StepsPage />} />
        <Route path="duvidas" element={<FaqPage />} />
        <Route path="contato" element={<ContactPage />} />
        <Route path="pacotes" element={<PackagesPage />} />
        <Route path="pacotes/novo" element={<PackageEditPage />} />
        <Route path="pacotes/:id" element={<PackageEditPage />} />
        <Route path="lotes" element={<LotsPage />} />
        <Route path="configuracoes" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  );
}
