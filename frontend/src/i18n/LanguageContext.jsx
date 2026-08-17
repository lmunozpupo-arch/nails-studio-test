import { createContext, useCallback, useContext, useMemo, useState } from "react";
import api from "@/api";
import { translations, DEFAULT_LANG, SUPPORTED_LANGS } from "./locales";

const LanguageContext = createContext(null);

const getNested = (obj, path) =>
    path.split(".").reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);

export function LanguageProvider({ children }) {
    const [language, setLanguage] = useState(() => {
        const stored = localStorage.getItem("salonapp_lang");
        return SUPPORTED_LANGS.includes(stored) ? stored : DEFAULT_LANG;
    });

    const changeLanguage = useCallback((lang) => {
        if (!SUPPORTED_LANGS.includes(lang)) return;
        setLanguage(lang);
        localStorage.setItem("salonapp_lang", lang);
        if (localStorage.getItem("salonapp_token")) {
            api.put("/auth/preferences", { language: lang }).catch(() => {});
        }
    }, []);

    const t = useCallback(
        (key, vars) => {
            let value = getNested(translations[language], key);
            if (value === undefined) value = getNested(translations[DEFAULT_LANG], key);
            if (value === undefined) return key;
            if (vars) {
                Object.entries(vars).forEach(([k, v]) => {
                    value = value.replace(`{${k}}`, v);
                });
            }
            return value;
        },
        [language]
    );

    const value = useMemo(
        () => ({ language, changeLanguage, t }),
        [language, changeLanguage, t]
    );

    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => useContext(LanguageContext);
