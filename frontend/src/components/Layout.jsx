import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
    LayoutDashboard,
    Users,
    Sparkles,
    UserCheck,
    Calendar,
    CreditCard,
    Settings,
    LogOut,
    Menu,
    X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { LanguageSelector } from "@/components/LanguageSelector";

const NAV_ITEMS = [
    { to: "/", key: "dashboard", icon: LayoutDashboard, end: true },
    { to: "/clients", key: "clients", icon: Users },
    { to: "/services", key: "services", icon: Sparkles },
    { to: "/professionals", key: "professionals", icon: UserCheck },
    { to: "/agenda", key: "agenda", icon: Calendar },
    { to: "/payments", key: "payments", icon: CreditCard },
    { to: "/settings", key: "settings", icon: Settings },
];

function Logo({ size = "w-11 h-11" }) {
    return (
        <img
            src="/assets/logo.jpeg"
            alt="Nais'l Designer M&A Studio"
            className={`${size} rounded-full border border-[#D4AF37]/50 shadow-[0_0_15px_rgba(212,175,55,0.25)] object-cover`}
        />
    );
}

function SidebarContent({ onNavigate }) {
    const { t } = useLanguage();
    const { user, logout } = useAuth();
    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center gap-3 px-5 py-6 border-b border-[#3A311D]/60">
                <Logo />
                <div className="min-w-0">
                    <p className="font-serif-display text-lg leading-tight gold-text font-semibold truncate">
                        Nais'l Designer
                    </p>
                    <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">
                        M&A Studio
                    </p>
                </div>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" data-testid="sidebar-nav">
                {NAV_ITEMS.map(({ to, key, icon: Icon, end }) => (
                    <NavLink
                        key={key}
                        to={to}
                        end={end}
                        onClick={onNavigate}
                        data-testid={`nav-${key}`}
                        className={({ isActive }) =>
                            `sidebar-item ${isActive ? "sidebar-item-active" : ""}`
                        }
                    >
                        <Icon className="w-4.5 h-4.5 w-[18px] h-[18px]" />
                        <span>{t(`nav.${key}`)}</span>
                    </NavLink>
                ))}
            </nav>
            <div className="px-4 py-4 border-t border-[#3A311D]/60 space-y-3">
                <div className="flex items-center gap-3 min-w-0">
                    {user?.picture ? (
                        <img src={user.picture} alt="" className="w-8 h-8 rounded-full border border-[#D4AF37]/40" referrerPolicy="no-referrer" />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center text-[#E5C158] text-sm font-semibold">
                            {(user?.name || "A").charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div className="min-w-0 flex-1">
                        <p className="text-sm text-zinc-200 truncate">{user?.name}</p>
                        <p className="text-xs text-zinc-500">{t("user.admin")}</p>
                    </div>
                </div>
                <button
                    data-testid="logout-btn"
                    onClick={logout}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors duration-200"
                >
                    <LogOut className="w-4 h-4" />
                    {t("user.logout")}
                </button>
            </div>
        </div>
    );
}

export function Layout() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const { t } = useLanguage();

    return (
        <div className="min-h-screen bg-[#0A0A0C]">
            {/* Desktop sidebar */}
            <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 flex-col bg-[#0E0E12] border-r border-[#3A311D]/60 z-30">
                <SidebarContent />
            </aside>

            {/* Mobile header */}
            <header className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-[#0E0E12]/90 backdrop-blur-xl border-b border-[#3A311D]/60">
                <div className="flex items-center gap-3">
                    <button
                        data-testid="mobile-menu-btn"
                        onClick={() => setMobileOpen(true)}
                        className="p-2 rounded-lg text-zinc-300 hover:text-[#E5C158] hover:bg-[#D4AF37]/10 transition-colors"
                        aria-label="Menu"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2">
                        <Logo size="w-9 h-9" />
                        <span className="font-serif-display gold-text font-semibold">Nais'l M&A</span>
                    </div>
                </div>
                <LanguageSelector />
            </header>

            {/* Mobile drawer */}
            {mobileOpen && (
                <div className="md:hidden fixed inset-0 z-50">
                    <div
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        onClick={() => setMobileOpen(false)}
                    />
                    <div className="absolute inset-y-0 left-0 w-72 bg-[#0E0E12] border-r border-[#3A311D] animate-fade-slide">
                        <button
                            data-testid="mobile-menu-close"
                            onClick={() => setMobileOpen(false)}
                            className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white"
                            aria-label="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <SidebarContent onNavigate={() => setMobileOpen(false)} />
                    </div>
                </div>
            )}

            {/* Main */}
            <div className="md:pl-64">
                <div className="hidden md:flex sticky top-0 z-20 items-center justify-end gap-3 px-8 py-3 bg-[#0A0A0C]/85 backdrop-blur-xl border-b border-[#3A311D]/40">
                    <LanguageSelector />
                </div>
                <main className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
