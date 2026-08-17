import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";

export default function AuthCallback() {
    const { loginWithSession } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();
    const hasProcessed = useRef(false);

    useEffect(() => {
        if (hasProcessed.current) return;
        hasProcessed.current = true;
        const hash = window.location.hash;
        const sessionId = new URLSearchParams(hash.replace(/^#/, "")).get("session_id");
        if (!sessionId) {
            navigate("/login", { replace: true });
            return;
        }
        loginWithSession(sessionId)
            .then((user) => {
                window.history.replaceState(null, "", window.location.pathname);
                navigate("/", { replace: true, state: { user } });
            })
            .catch(() => navigate("/login", { replace: true }));
    }, [loginWithSession, navigate]);

    return (
        <div className="min-h-screen bg-[#0A0A0C] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                <p className="text-zinc-400 text-sm" data-testid="auth-callback-loading">
                    {t("login.processing")}
                </p>
            </div>
        </div>
    );
}
