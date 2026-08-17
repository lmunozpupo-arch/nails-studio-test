import { useEffect, useState } from "react";
import {
    Users,
    Calendar,
    Clock,
    CheckCircle2,
    UserCheck,
    Sparkles,
    CreditCard,
    Wallet,
} from "lucide-react";
import api from "@/api";
import { useLanguage } from "@/i18n/LanguageContext";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCurrency } from "@/utils/format";

function StatCard({ icon: Icon, label, value, testId, accent = false }) {
    return (
        <div
            data-testid={testId}
            className={`luxury-card p-5 transition-all duration-200 hover:bg-[#1C1C24] hover:border-[#D4AF37]/40 ${
                accent ? "shadow-[0_0_24px_rgba(212,175,55,0.08)]" : ""
            }`}
        >
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs uppercase tracking-widest text-zinc-500">{label}</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/25">
                    <Icon className="w-5 h-5 text-[#D4AF37]" />
                </div>
            </div>
        </div>
    );
}

export default function Dashboard() {
    const { t, language } = useLanguage();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [localRequests, setLocalRequests] = useState([]);

    useEffect(() => {
        api.get("/dashboard/stats")
            .then(({ data }) => setStats(data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (process.env.REACT_APP_LOCAL_AUTH === "true" || !process.env.REACT_APP_BACKEND_URL) {
            setLocalRequests(JSON.parse(localStorage.getItem("salonapp_client_requests") || "[]").filter((request) => request.status === "pending"));
        }
    }, []);

    const updateRequest = (request, status) => {
        const requests = JSON.parse(localStorage.getItem("salonapp_client_requests") || "[]").map((item) => item.created_at === request.created_at ? { ...item, status } : item);
        localStorage.setItem("salonapp_client_requests", JSON.stringify(requests));
        setLocalRequests(requests.filter((item) => item.status === "pending"));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24" data-testid="dashboard-loading">
                <div className="w-10 h-10 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const s = stats || {};

    return (
        <div className="space-y-8 animate-fade-slide" data-testid="dashboard-page">
            <div>
                {localRequests.length > 0 && <section data-testid="pending-client-requests" className="space-y-4">
                    <div><h2 className="font-serif-display text-xl text-[#E5C158] font-semibold">{t("dashboard.clientRequests")}</h2><p className="mt-1 text-sm text-zinc-400">{t("dashboard.clientRequestsSubtitle")}</p></div>
                    <div className="grid gap-3 md:grid-cols-2">{localRequests.map((request) => <article key={request.created_at} className="luxury-card p-5"><div className="flex items-start justify-between gap-3"><div><p className="font-medium text-white">{request.client_name || request.client_id}</p><p className="mt-1 text-sm text-zinc-300">{t(`clientPortal.services.${request.service}`)}</p><p className="mt-2 text-xs text-zinc-500">{request.date} · {request.time}</p></div><span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-[11px] text-amber-300">{t("dashboard.pendingRequest")}</span></div><div className="mt-4 flex gap-2"><button type="button" onClick={() => updateRequest(request, "confirmed")} className="gold-btn rounded-lg px-3 py-2 text-xs">{t("dashboard.confirmRequest")}</button><button type="button" onClick={() => updateRequest(request, "rejected")} className="rounded-lg border border-red-500/30 px-3 py-2 text-xs text-red-300 hover:bg-red-500/10">{t("dashboard.rejectRequest")}</button></div></article>)}</div>
                </section>}
            </div>

            <div>
                <h1 className="font-serif-display text-3xl sm:text-4xl text-white font-semibold">
                    {t("dashboard.title")}
                </h1>
                <p className="text-sm text-zinc-400 mt-1">{t("dashboard.subtitle")}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Users} label={t("dashboard.totalClients")} value={s.total_clients ?? 0} testId="stat-total-clients" />
                <StatCard icon={Calendar} label={t("dashboard.todayAppointments")} value={s.today_appointments_count ?? 0} testId="stat-today-appointments" accent />
                <StatCard icon={Clock} label={t("dashboard.pendingAppointments")} value={s.pending_count ?? 0} testId="stat-pending" />
                <StatCard icon={CheckCircle2} label={t("dashboard.confirmedToday")} value={s.confirmed_today ?? 0} testId="stat-confirmed" />
                <StatCard icon={UserCheck} label={t("dashboard.professionals")} value={s.active_professionals ?? 0} testId="stat-professionals" />
                <StatCard icon={Sparkles} label={t("dashboard.services")} value={s.total_services ?? 0} testId="stat-services" />
                <StatCard icon={CreditCard} label={t("dashboard.paymentsToday")} value={s.payments_today ?? 0} testId="stat-payments-today" />
                <StatCard icon={CheckCircle2} label={t("dashboard.completedServices")} value={s.completed_count ?? 0} testId="stat-completed" />
            </div>

            <div>
                <h2 className="font-serif-display text-xl text-[#E5C158] font-semibold mb-4">
                    {t("dashboard.finance")}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <StatCard icon={Wallet} label={t("dashboard.revenueToday")} value={formatCurrency(s.revenue_today, language)} testId="stat-revenue-today" accent />
                    <StatCard icon={Wallet} label={t("dashboard.revenueWeek")} value={formatCurrency(s.revenue_week, language)} testId="stat-revenue-week" />
                    <StatCard icon={Wallet} label={t("dashboard.revenueMonth")} value={formatCurrency(s.revenue_month, language)} testId="stat-revenue-month" />
                </div>
            </div>

            <div>
                <h2 className="font-serif-display text-xl text-[#E5C158] font-semibold mb-4">
                    {t("dashboard.todayList")}
                </h2>
                {!s.today_appointments || s.today_appointments.length === 0 ? (
                    <div
                        data-testid="dashboard-no-appointments"
                        className="luxury-card p-10 text-center text-zinc-500 text-sm"
                    >
                        {t("dashboard.noAppointmentsToday")}
                    </div>
                ) : (
                    <>
                        {/* Desktop table */}
                        <div className="hidden md:block luxury-card overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[#3A311D] text-left text-xs uppercase tracking-widest text-zinc-500">
                                        <th className="px-5 py-3.5">{t("dashboard.hour")}</th>
                                        <th className="px-5 py-3.5">{t("common.client")}</th>
                                        <th className="px-5 py-3.5">{t("common.service")}</th>
                                        <th className="px-5 py-3.5">{t("common.professional")}</th>
                                        <th className="px-5 py-3.5">{t("common.status")}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {s.today_appointments.map((a) => (
                                        <tr
                                            key={a.id}
                                            data-testid={`dashboard-appointment-${a.id}`}
                                            className="border-b border-[#3A311D]/40 last:border-0 hover:bg-[#1C1C24]/60 transition-colors"
                                        >
                                            <td className="px-5 py-3.5 text-[#E5C158] font-medium">
                                                {a.start_time} – {a.end_time}
                                            </td>
                                            <td className="px-5 py-3.5 text-zinc-200">{a.client_name}</td>
                                            <td className="px-5 py-3.5 text-zinc-300">{a.service_name}</td>
                                            <td className="px-5 py-3.5 text-zinc-300">{a.professional_name}</td>
                                            <td className="px-5 py-3.5">
                                                <StatusBadge status={a.status} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {/* Mobile cards */}
                        <div className="md:hidden space-y-3">
                            {s.today_appointments.map((a) => (
                                <div
                                    key={a.id}
                                    data-testid={`dashboard-appointment-card-${a.id}`}
                                    className="luxury-card p-4 space-y-2"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-[#E5C158] font-semibold">
                                            {a.start_time} – {a.end_time}
                                        </span>
                                        <StatusBadge status={a.status} />
                                    </div>
                                    <p className="text-white font-medium">{a.client_name}</p>
                                    <p className="text-sm text-zinc-400">
                                        {a.service_name} · {a.professional_name}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
