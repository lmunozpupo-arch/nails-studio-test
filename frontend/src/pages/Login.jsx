import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { apiErrorKey } from "@/api";

export default function Login() {
    const { t } = useLanguage();
    const { login, registerClient } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [accountType, setAccountType] = useState("admin");
    const [authMode, setAuthMode] = useState("login");
    const [name, setName] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const localAuthEnabled = process.env.REACT_APP_LOCAL_AUTH === "true" || !process.env.REACT_APP_BACKEND_URL;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            if (authMode === "register") {
                if (password.length < 8 || password !== confirmPassword) {
                    setError(password.length < 8 ? t("login.passwordRequirements") : t("login.passwordMismatch"));
                    return;
                }
                await registerClient(name, email, password);
                navigate("/client-portal", { replace: true });
                return;
            }
            const authenticatedUser = await login(email, password, accountType);
            navigate(authenticatedUser.role === "client" ? "/client-portal" : "/", { replace: true });
        } catch (err) {
            setError(t(`errors.${apiErrorKey(err)}`));
        } finally {
            setLoading(false);
        }
    };

    const handleGoogle = () => {
        // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
        const redirectUrl = window.location.origin + "/";
        window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
    };

    return (
        <div className="min-h-screen bg-[#0A0A0C] flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.08),transparent_55%)]" />
            <div className="absolute top-4 right-4 z-10">
                <LanguageSelector />
            </div>
            <div className="relative z-10 w-full max-w-md animate-fade-slide">
                <div className="flex flex-col items-center mb-8">
                    <img
                        src="/assets/logo.jpeg"
                        alt="Nais'l Designer M&A Studio"
                        data-testid="login-logo"
                        className="w-28 h-28 rounded-full border-2 border-[#D4AF37]/60 shadow-[0_0_40px_rgba(212,175,55,0.3)] object-cover mb-5"
                    />
                    <h1 className="font-serif-display text-3xl sm:text-4xl gold-text font-semibold text-center">
                        Nais'l Designer
                    </h1>
                    <p className="text-xs uppercase tracking-[0.35em] text-zinc-500 mt-1">
                        M&A Studio
                    </p>
                    <p className="text-sm text-zinc-400 mt-4">{t("login.subtitle")}</p>
                </div>

                <form
                    onSubmit={handleSubmit}
                    data-testid="login-form"
                    className="luxury-card p-6 sm:p-8 space-y-5 shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
                >
                    <h2 className="font-serif-display text-xl text-white text-center">
                        {authMode === "register" ? t("login.createClientAccount") : t("login.welcome")}
                    </h2>
                    {authMode === "login" && localAuthEnabled && (
                        <div className="grid grid-cols-2 gap-2 rounded-lg bg-black/20 p-1" role="tablist" aria-label="Tipo de acceso">
                            <button type="button" role="tab" aria-selected={accountType === "admin"} onClick={() => setAccountType("admin")} className={`rounded-md py-2 text-xs transition-colors ${accountType === "admin" ? "bg-[#D4AF37] text-black font-semibold" : "text-zinc-400 hover:text-white"}`}>
                                {t("login.adminAccount")}
                            </button>
                            <button type="button" role="tab" aria-selected={accountType === "client"} onClick={() => setAccountType("client")} className={`rounded-md py-2 text-xs transition-colors ${accountType === "client" ? "bg-[#D4AF37] text-black font-semibold" : "text-zinc-400 hover:text-white"}`}>
                                {t("login.clientAccount")}
                            </button>
                        </div>
                    )}
                    {error && (
                        <div
                            data-testid="login-error"
                            className="px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center"
                        >
                            {error}
                        </div>
                    )}
                    {authMode === "register" && (
                        <div className="space-y-1.5">
                            <label htmlFor="register-name" className="text-sm font-medium text-zinc-300">{t("login.fullName")}</label>
                            <input id="register-name" data-testid="register-name-input" type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder={t("login.fullNamePlaceholder")} className="luxury-input w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition-colors" />
                        </div>
                    )}
                    <div className="space-y-1.5">
                        <label htmlFor="login-email" className="text-sm font-medium text-zinc-300">
                            {t("login.email")}
                        </label>
                        <input
                            id="login-email"
                            data-testid="login-email-input"
                            type="email"
                            required
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={t("login.emailPlaceholder")}
                            className="luxury-input w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition-colors"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label htmlFor="login-password" className="text-sm font-medium text-zinc-300">
                            {t("login.password")}
                        </label>
                        <input
                            id="login-password"
                            data-testid="login-password-input"
                            type="password"
                            required
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={t("login.passwordPlaceholder")}
                            className="luxury-input w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition-colors"
                        />
                    </div>
                    {authMode === "login" && <button
                        type="submit"
                        data-testid="login-submit-btn"
                        disabled={loading}
                        className="gold-btn w-full py-2.5 rounded-lg text-sm disabled:opacity-60"
                    >
                        {loading ? t("login.signingIn") : t("login.signIn")}
                    </button>}
                    {authMode === "register" && <>
                        <div className="space-y-1.5">
                            <label htmlFor="register-confirm-password" className="text-sm font-medium text-zinc-300">{t("login.confirmPassword")}</label>
                            <input id="register-confirm-password" data-testid="register-confirm-password-input" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={t("login.confirmPasswordPlaceholder")} className="luxury-input w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition-colors" />
                        </div>
                        <button type="submit" data-testid="register-submit-btn" disabled={loading} className="gold-btn w-full py-2.5 rounded-lg text-sm disabled:opacity-60">{t("login.register")}</button>
                    </>}
                    {!localAuthEnabled && <div className="flex items-center gap-3 text-xs text-zinc-500">
                        <div className="flex-1 h-px bg-[#3A311D]" />
                        {t("login.orContinueWith")}
                        <div className="flex-1 h-px bg-[#3A311D]" />
                    </div>}
                    {!localAuthEnabled && <button
                        type="button"
                        data-testid="login-google-btn"
                        onClick={handleGoogle}
                        className="w-full py-2.5 rounded-lg text-sm border border-[#3A311D] text-zinc-200 hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/5 transition-all duration-200 flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                            <path fill="#EA4335" d="M12 5.04c1.62 0 3.06.56 4.2 1.64l3.12-3.12C17.46 1.8 14.96.72 12 .72 7.44.72 3.52 3.44 1.68 7.44l3.66 2.84C6.24 7.2 8.88 5.04 12 5.04z" />
                            <path fill="#4285F4" d="M23.28 12.26c0-.82-.08-1.6-.2-2.36H12v4.52h6.32c-.28 1.44-1.1 2.66-2.32 3.48l3.56 2.76c2.08-1.92 3.72-4.76 3.72-8.4z" />
                            <path fill="#FBBC05" d="M5.34 14.28a7.1 7.1 0 0 1 0-4.56L1.68 6.88a11.28 11.28 0 0 0 0 10.24l3.66-2.84z" />
                            <path fill="#34A853" d="M12 23.28c3.04 0 5.6-1 7.46-2.72l-3.56-2.76c-1 .68-2.28 1.08-3.9 1.08-3.12 0-5.76-2.16-6.66-5.04l-3.66 2.84c1.84 4 5.76 6.6 11.32 6.6z" />
                        </svg>
                        {t("login.google")}
                    </button>}
                    {localAuthEnabled && authMode === "register" && (
                        <p className="text-xs text-zinc-500 text-center">{t("login.passwordRequirements")}</p>
                    )}
                    {localAuthEnabled && <button type="button" onClick={() => { setAuthMode(authMode === "login" ? "register" : "login"); setAccountType(authMode === "login" ? "client" : "admin"); setError(""); }} className="w-full text-center text-xs text-[#E5C158] hover:text-white">
                        {authMode === "login" ? t("login.createAccount") : t("login.backToLogin")}
                    </button>}
                </form>
            </div>
        </div>
    );
}
