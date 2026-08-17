const NUMBER_LOCALES = { "pt-BR": "pt-BR", es: "es-ES", en: "en-US" };

export const localeFor = (lang) => NUMBER_LOCALES[lang] || "pt-BR";

export const formatCurrency = (value, lang) => {
    const num = new Intl.NumberFormat(localeFor(lang), {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Number(value) || 0);
    return `R$ ${num}`;
};

export const formatDate = (dateStr, lang) => {
    if (!dateStr) return "—";
    const d = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat(localeFor(lang), {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(d);
};

export const formatDuration = (minutes, t) => {
    const m = Number(minutes) || 0;
    if (m < 60) return `${m} ${t("common.min")}`;
    const h = Math.floor(m / 60);
    const rest = m % 60;
    return rest ? `${h}h ${rest}${t("common.min")}` : `${h}h`;
};
