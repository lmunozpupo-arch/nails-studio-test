import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import "@/App.css";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { LanguageProvider, useLanguage } from "@/i18n/LanguageContext";
import { Layout } from "@/components/Layout";
import Login from "@/pages/Login";
import AuthCallback from "@/pages/AuthCallback";
import Dashboard from "@/pages/Dashboard";
import Clients from "@/pages/Clients";
import Services from "@/pages/Services";
import Professionals from "@/pages/Professionals";
import Agenda from "@/pages/Agenda";
import Payments from "@/pages/Payments";
import Settings from "@/pages/Settings";
import ClientPortal from "@/pages/ClientPortal";

function FullScreenLoader() {
    const { t } = useLanguage();
    return (
        <div className="min-h-screen bg-[#0A0A0C] flex flex-col items-center justify-center gap-4">
            <div className="w-10 h-10 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
            <p className="text-zinc-500 text-sm" data-testid="app-loading">{t("common.loading")}</p>
        </div>
    );
}

function ProtectedRoute() {
    const { user, loading } = useAuth();
    const location = useLocation();
    if (location.state?.user) return <Outlet />;
    if (loading) return <FullScreenLoader />;
    if (!user) return <Navigate to="/login" replace />;
    return <Outlet />;
}

function LoginRoute() {
    const { user, loading } = useAuth();
    if (loading) return <FullScreenLoader />;
    if (user) return <Navigate to="/" replace />;
    return <Login />;
}

function AdminRoute() {
    const { user } = useAuth();
    if (user?.role === "client") return <Navigate to="/client-portal" replace />;
    return <Outlet />;
}

function AppRouter() {
    const location = useLocation();
    // Detect OAuth callback synchronously during render (hash, not query)
    if (location.hash?.includes("session_id=")) {
        return <AuthCallback />;
    }
    return (
        <Routes>
            <Route path="/login" element={<LoginRoute />} />
            <Route element={<ProtectedRoute />}>
                <Route path="/client-portal" element={<ClientPortal />} />
                <Route element={<AdminRoute />}>
                    <Route element={<Layout />}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/clients" element={<Clients />} />
                    <Route path="/services" element={<Services />} />
                    <Route path="/professionals" element={<Professionals />} />
                    <Route path="/agenda" element={<Agenda />} />
                    <Route path="/payments" element={<Payments />} />
                    <Route path="/settings" element={<Settings />} />
                    </Route>
                </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

function App() {
    return (
        <div className="App">
            <LanguageProvider>
                <AuthProvider>
                    <BrowserRouter>
                        <AppRouter />
                    </BrowserRouter>
                    <Toaster
                        position="top-right"
                        toastOptions={{
                            style: {
                                background: "#14141A",
                                border: "1px solid #3A311D",
                                color: "#F4F4F6",
                            },
                        }}
                    />
                </AuthProvider>
            </LanguageProvider>
        </div>
    );
}

export default App;
