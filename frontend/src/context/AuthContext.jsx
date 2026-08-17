import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "@/api";

const AuthContext = createContext(null);
const localAuthEnabled = process.env.REACT_APP_LOCAL_AUTH === "true" || (!process.env.REACT_APP_BACKEND_URL && process.env.REACT_APP_LOCAL_AUTH !== "false");
const localUser = {
    user_id: "local_admin",
    email: process.env.REACT_APP_LOCAL_EMAIL || "lmunozpupo@gmail.com",
    name: "Administradora",
    picture: "",
    role: "admin",
    language: "pt-BR",
};
const localClient = {
    user_id: "local_client",
    email: process.env.REACT_APP_LOCAL_CLIENT_EMAIL || "cliente@naisl.com",
    name: "Beatriz Oliveira",
    picture: "",
    role: "client",
    language: "pt-BR",
};

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = useCallback(async () => {
        if (localAuthEnabled) {
            const savedUser = localStorage.getItem("salonapp_local_user");
            setUser(savedUser ? JSON.parse(savedUser) : null);
            setLoading(false);
            return;
        }
        try {
            const { data } = await api.get("/auth/me");
            setUser(data);
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // CRITICAL: If returning from OAuth callback, skip the /me check.
        // AuthCallback will exchange the session_id and establish the session first.
        if (window.location.hash?.includes("session_id=")) {
            setLoading(false);
            return;
        }
        checkAuth();
    }, [checkAuth]);

    const login = useCallback(async (email, password, role = "admin") => {
        if (localAuthEnabled) {
            const expectedEmail = process.env.REACT_APP_LOCAL_EMAIL || "lmunozpupo@gmail.com";
            const expectedPassword = process.env.REACT_APP_LOCAL_PASSWORD || "NaislAdmin2024!";
            const clients = JSON.parse(localStorage.getItem("salonapp_local_clients") || "[]");
            const client = clients.find((item) => item.email.toLowerCase() === email.toLowerCase() && item.password === password);
            const defaultClient = role === "client" && email.toLowerCase() === localClient.email.toLowerCase() && password === (process.env.REACT_APP_LOCAL_CLIENT_PASSWORD || "Cliente2024!") ? localClient : null;
            const isAdmin = role === "admin" && email.toLowerCase() === expectedEmail.toLowerCase() && password === expectedPassword;
            if (!isAdmin && !(role === "client" && (client || defaultClient))) {
                throw { response: { data: { detail: "invalid_credentials" } } };
            }
            const authenticatedUser = isAdmin ? localUser : { ...(client || defaultClient), password: undefined };
            localStorage.setItem("salonapp_local_user", JSON.stringify(authenticatedUser));
            setUser(authenticatedUser);
            return authenticatedUser;
        }
        const { data } = await api.post("/auth/login", { email, password });
        localStorage.setItem("salonapp_token", data.token);
        setUser(data.user);
        return data.user;
    }, []);

    const registerClient = useCallback(async (name, email, password) => {
        if (!localAuthEnabled) {
            const { data } = await api.post("/auth/register-client", { name, email, password });
            localStorage.setItem("salonapp_token", data.token);
            setUser(data.user);
            return data.user;
        }
        const clients = JSON.parse(localStorage.getItem("salonapp_local_clients") || "[]");
        const normalizedEmail = email.toLowerCase();
        const adminEmail = (process.env.REACT_APP_LOCAL_EMAIL || "lmunozpupo@gmail.com").toLowerCase();
        if (normalizedEmail === adminEmail || clients.some((item) => item.email.toLowerCase() === normalizedEmail)) {
            throw { response: { data: { detail: "email_already_registered" } } };
        }
        const client = { user_id: `local_client_${Date.now()}`, email: normalizedEmail, name, picture: "", role: "client", language: "pt-BR", password };
        clients.push(client);
        localStorage.setItem("salonapp_local_clients", JSON.stringify(clients));
        const authenticatedUser = { ...client, password: undefined };
        localStorage.setItem("salonapp_local_user", JSON.stringify(authenticatedUser));
        setUser(authenticatedUser);
        return authenticatedUser;
    }, []);

    const loginWithSession = useCallback(async (sessionId) => {
        if (localAuthEnabled) {
            throw new Error("Google authentication is disabled in local mode");
        }
        const { data } = await api.post("/auth/session", { session_id: sessionId });
        setUser(data.user);
        return data.user;
    }, []);

    const logout = useCallback(async () => {
        if (localAuthEnabled) {
            localStorage.removeItem("salonapp_local_user");
            localStorage.removeItem("salonapp_local_session");
            setUser(null);
            window.location.href = "/login";
            return;
        }
        try {
            await api.post("/auth/logout");
        } catch {
            /* ignore */
        }
        localStorage.removeItem("salonapp_token");
        setUser(null);
        window.location.href = "/login";
    }, []);

    const value = useMemo(
        () => ({ user, loading, login, registerClient, loginWithSession, logout, setUser }),
        [user, loading, login, registerClient, loginWithSession, logout]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
