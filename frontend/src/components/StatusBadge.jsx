import { useLanguage } from "@/i18n/LanguageContext";

const STYLES = {
    confirmed: "bg-green-500/10 text-green-400 border-green-500/20",
    pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    completed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
    paid: "bg-green-500/10 text-green-400 border-green-500/20",
    active: "bg-green-500/10 text-green-400 border-green-500/20",
    inactive: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

export function StatusBadge({ status, testId }) {
    const { t } = useLanguage();
    const style = STYLES[status] || STYLES.pending;
    const label = status === "active" || status === "inactive"
        ? t(`common.${status}`)
        : t(`status.${status}`);
    return (
        <span
            data-testid={testId}
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style}`}
        >
            {label}
        </span>
    );
}
