import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Check, X, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import {
    addDays, addMonths, addWeeks, endOfMonth, endOfWeek, format,
    isSameDay, isSameMonth, parseISO, startOfMonth, startOfWeek,
} from "date-fns";
import { ptBR, es, enUS } from "date-fns/locale";
import api, { apiErrorKey } from "@/api";
import { useLanguage } from "@/i18n/LanguageContext";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { Field } from "@/components/Field";
import { formatCurrency } from "@/utils/format";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

const DF_LOCALES = { "pt-BR": ptBR, es, en: enUS };
const todayStr = () => format(new Date(), "yyyy-MM-dd");

const EMPTY_FORM = {
    client_id: "",
    service_id: "",
    professional_id: "",
    date: todayStr(),
    start_time: "",
    price: "",
    notes: "",
};

const STATUS_DOT = {
    pending: "bg-yellow-400",
    confirmed: "bg-green-400",
    completed: "bg-blue-400",
    cancelled: "bg-red-400",
};
const localMode = process.env.REACT_APP_LOCAL_AUTH === "true" || !process.env.REACT_APP_BACKEND_URL;

export default function Agenda() {
    const { t, language } = useLanguage();
    const dfLocale = DF_LOCALES[language] || ptBR;

    const [view, setView] = useState("day");
    const [cursor, setCursor] = useState(todayStr());
    const [filterPro, setFilterPro] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [appointments, setAppointments] = useState([]);
    const [clients, setClients] = useState([]);
    const [services, setServices] = useState([]);
    const [professionals, setProfessionals] = useState([]);
    const [loading, setLoading] = useState(true);

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [formErrors, setFormErrors] = useState({});
    const [pendingDelete, setPendingDelete] = useState(null);
    const [pendingStatus, setPendingStatus] = useState(null); // {appt, status}
    const pendingSaveRef = useRef(null);
    const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);

    const { dateFrom, dateTo } = useMemo(() => {
        const d = parseISO(cursor);
        if (view === "day") return { dateFrom: cursor, dateTo: cursor };
        if (view === "week") {
            return {
                dateFrom: format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd"),
                dateTo: format(endOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd"),
            };
        }
        return {
            dateFrom: format(startOfMonth(d), "yyyy-MM-dd"),
            dateTo: format(endOfMonth(d), "yyyy-MM-dd"),
        };
    }, [cursor, view]);

    const load = useCallback(async () => {
        try {
            if (localMode) {
                let localAppointments = JSON.parse(localStorage.getItem("salonapp_local_appointments") || "[]");
                localAppointments = localAppointments.filter((item) => item.date >= dateFrom && item.date <= dateTo);
                if (filterPro) localAppointments = localAppointments.filter((item) => item.professional_id === filterPro);
                if (filterStatus) localAppointments = localAppointments.filter((item) => item.status === filterStatus);
                setAppointments(localAppointments);
                return;
            }
            const params = { date_from: dateFrom, date_to: dateTo };
            if (filterPro) params.professional_id = filterPro;
            if (filterStatus) params.status = filterStatus;
            const { data } = await api.get("/appointments", { params });
            setAppointments(data);
        } catch (err) {
            toast.error(t(`errors.${apiErrorKey(err)}`));
        } finally {
            setLoading(false);
        }
    }, [dateFrom, dateTo, filterPro, filterStatus, t]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        if (localMode) {
            setClients(JSON.parse(localStorage.getItem("salonapp_local_client_records") || "[]").filter((item) => item.active !== false));
            setServices(JSON.parse(localStorage.getItem("salonapp_local_services") || "[]").filter((item) => item.active !== false));
            setProfessionals(JSON.parse(localStorage.getItem("salonapp_local_professionals") || "[]").filter((item) => item.active !== false));
            return;
        }
        Promise.all([
            api.get("/clients", { params: { active: "true" } }),
            api.get("/services", { params: { active: "true" } }),
            api.get("/professionals", { params: { active: "true" } }),
        ]).then(([c, s, p]) => {
            setClients(c.data);
            setServices(s.data);
            setProfessionals(p.data);
        }).catch(() => {});
    }, []);

    const navigate = (dir) => {
        const d = parseISO(cursor);
        const fn = view === "day" ? addDays : view === "week" ? addWeeks : addMonths;
        setCursor(format(fn(d, dir), "yyyy-MM-dd"));
    };

    const headerLabel = useMemo(() => {
        const d = parseISO(cursor);
        if (view === "day") return format(d, "PPP", { locale: dfLocale });
        if (view === "week") {
            const s = startOfWeek(d, { weekStartsOn: 1 });
            const e = endOfWeek(d, { weekStartsOn: 1 });
            return `${format(s, "dd MMM", { locale: dfLocale })} – ${format(e, "dd MMM yyyy", { locale: dfLocale })}`;
        }
        return format(d, "MMMM yyyy", { locale: dfLocale });
    }, [cursor, view, dfLocale]);

    const openCreate = (date) => {
        setEditing(null);
        setForm({ ...EMPTY_FORM, date: date || cursor });
        setFormErrors({});
        setFormOpen(true);
    };

    const openEdit = (a) => {
        setEditing(a);
        setForm({
            client_id: a.client_id,
            service_id: a.service_id,
            professional_id: a.professional_id,
            date: a.date,
            start_time: a.start_time,
            price: String(a.price),
            notes: a.notes || "",
        });
        setFormErrors({});
        setFormOpen(true);
    };

    const validate = () => {
        const errs = {};
        if (!form.client_id) errs.client_id = t("validation.selectRequired");
        if (!form.service_id) errs.service_id = t("validation.selectRequired");
        if (!form.professional_id) errs.professional_id = t("validation.selectRequired");
        if (!form.date) errs.date = t("validation.invalidDate");
        if (!form.start_time) errs.start_time = t("validation.invalidTime");
        if (form.price && Number(form.price) <= 0) errs.price = t("validation.pricePositive");
        setFormErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validate()) return;
        pendingSaveRef.current = {
            client_id: form.client_id,
            service_id: form.service_id,
            professional_id: form.professional_id,
            date: form.date,
            start_time: form.start_time,
            price: form.price ? Number(form.price) : null,
            notes: form.notes,
        };
        if (localMode) doSave();
        else setConfirmSaveOpen(true);
    };

    const doSave = async () => {
        setConfirmSaveOpen(false);
        try {
            if (localMode) {
                const existing = JSON.parse(localStorage.getItem("salonapp_local_appointments") || "[]");
                const client = clients.find((item) => item.id === pendingSaveRef.current.client_id);
                const service = services.find((item) => item.id === pendingSaveRef.current.service_id);
                const professional = professionals.find((item) => item.id === pendingSaveRef.current.professional_id);
                const value = {
                    ...pendingSaveRef.current,
                    price: pendingSaveRef.current.price ?? service?.price ?? null,
                    id: editing?.id || `local_appointment_${Date.now()}`,
                    client_name: client ? `${client.first_name} ${client.last_name}` : "",
                    service_name: service?.name || "",
                    professional_name: professional ? `${professional.first_name} ${professional.last_name}` : "",
                    end_time: estimatedEnd,
                    status: editing?.status || "pending",
                };
                const next = editing ? existing.map((item) => item.id === editing.id ? value : item) : [...existing, value];
                localStorage.setItem("salonapp_local_appointments", JSON.stringify(next));
                toast.success(t(editing ? "agenda.updated" : "agenda.created"));
                setFormOpen(false);
                load();
                return;
            }
            if (editing) {
                await api.put(`/appointments/${editing.id}`, pendingSaveRef.current);
                toast.success(t("agenda.updated"));
            } else {
                await api.post("/appointments", pendingSaveRef.current);
                toast.success(t("agenda.created"));
            }
            setFormOpen(false);
            load();
        } catch (err) {
            toast.error(t(`errors.${apiErrorKey(err)}`));
        }
    };

    const doStatusChange = async () => {
        const { appt, status } = pendingStatus;
        setPendingStatus(null);
        try {
            if (localMode) {
                const appointments = JSON.parse(localStorage.getItem("salonapp_local_appointments") || "[]");
                localStorage.setItem("salonapp_local_appointments", JSON.stringify(appointments.map((item) => item.id === appt.id ? { ...item, status } : item)));
                toast.success(t(`agenda.${status === "confirmed" ? "confirmed" : status === "cancelled" ? "cancelled" : "completed"}`));
                load();
                return;
            }
            await api.patch(`/appointments/${appt.id}/status`, { status });
            toast.success(t(`agenda.${status === "confirmed" ? "confirmed" : status === "cancelled" ? "cancelled" : "completed"}`));
            load();
        } catch (err) {
            toast.error(t(`errors.${apiErrorKey(err)}`));
        }
    };

    const doDelete = async () => {
        const item = pendingDelete;
        setPendingDelete(null);
        try {
            if (localMode) {
                const appointments = JSON.parse(localStorage.getItem("salonapp_local_appointments") || "[]");
                localStorage.setItem("salonapp_local_appointments", JSON.stringify(appointments.filter((entry) => entry.id !== item.id)));
                toast.success(t("agenda.deleted"));
                load();
                return;
            }
            await api.delete(`/appointments/${item.id}`);
            toast.success(t("agenda.deleted"));
            load();
        } catch (err) {
            toast.error(t(`errors.${apiErrorKey(err)}`));
        }
    };

    const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

    const selectedService = services.find((s) => s.id === form.service_id);
    const estimatedEnd = useMemo(() => {
        if (!form.start_time || !selectedService) return "";
        const [h, m] = form.start_time.split(":").map(Number);
        const end = h * 60 + m + selectedService.duration_minutes;
        return `${String(Math.floor(end / 60) % 24).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`;
    }, [form.start_time, selectedService]);

    const statusMessage = pendingStatus
        ? pendingStatus.status === "confirmed"
            ? t("confirm.confirmAppointment")
            : pendingStatus.status === "cancelled"
                ? t("confirm.cancelAppointment")
                : t("confirm.completeAppointment")
        : "";

    const AppointmentCard = ({ a, compact = false }) => (
        <div
            data-testid={`appointment-card-${a.id}`}
            className={`luxury-card p-3.5 space-y-2 ${a.status === "cancelled" ? "opacity-55" : ""}`}
        >
            <div className="flex items-center justify-between gap-2">
                <span className="text-[#E5C158] font-semibold text-sm">
                    {a.start_time} – {a.end_time}
                </span>
                <StatusBadge status={a.status} />
            </div>
            <p className="text-white text-sm font-medium">{a.client_name}</p>
            <p className="text-xs text-zinc-400">{a.service_name} · {a.professional_name}</p>
            <p className="text-xs text-[#E5C158]/80">{formatCurrency(a.price, language)}</p>
            {!compact && (
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[#3A311D]/40">
                    {a.status === "pending" && (
                        <button data-testid={`appointment-confirm-${a.id}`} onClick={() => setPendingStatus({ appt: a, status: "confirmed" })} className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] text-green-400 border border-green-500/30 hover:bg-green-500/10 transition-colors">
                            <Check className="w-3 h-3" />{t("agenda.confirmAction")}
                        </button>
                    )}
                    {(a.status === "pending" || a.status === "confirmed") && (
                        <>
                            <button data-testid={`appointment-complete-${a.id}`} onClick={() => setPendingStatus({ appt: a, status: "completed" })} className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] text-blue-400 border border-blue-500/30 hover:bg-blue-500/10 transition-colors">
                                <CheckCheck className="w-3 h-3" />{t("agenda.completeAction")}
                            </button>
                            <button data-testid={`appointment-cancel-${a.id}`} onClick={() => setPendingStatus({ appt: a, status: "cancelled" })} className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors">
                                <X className="w-3 h-3" />{t("agenda.cancelAction")}
                            </button>
                            <button data-testid={`appointment-edit-${a.id}`} onClick={() => openEdit(a)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] text-zinc-300 border border-[#3A311D] hover:text-[#E5C158] transition-colors">
                                <Pencil className="w-3 h-3" />{t("common.edit")}
                            </button>
                        </>
                    )}
                    <button data-testid={`appointment-delete-${a.id}`} onClick={() => setPendingDelete(a)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors">
                        <Trash2 className="w-3 h-3" />{t("common.delete")}
                    </button>
                </div>
            )}
        </div>
    );

    const weekDays = useMemo(() => {
        const start = startOfWeek(parseISO(cursor), { weekStartsOn: 1 });
        return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }, [cursor]);

    const monthDays = useMemo(() => {
        const start = startOfWeek(startOfMonth(parseISO(cursor)), { weekStartsOn: 1 });
        const end = endOfWeek(endOfMonth(parseISO(cursor)), { weekStartsOn: 1 });
        const days = [];
        for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
        return days;
    }, [cursor]);

    const selectCls = "luxury-input w-full px-3 py-2 rounded-lg border text-sm outline-none bg-[#0E0E12]";

    return (
        <div className="space-y-6 animate-fade-slide" data-testid="agenda-page">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                    <h1 className="font-serif-display text-3xl sm:text-4xl text-white font-semibold">{t("agenda.title")}</h1>
                    <p className="text-sm text-zinc-400 mt-1">{t("agenda.subtitle")}</p>
                </div>
                <button data-testid="add-appointment-btn" onClick={() => openCreate()} className="gold-btn px-5 py-2.5 rounded-lg text-sm flex items-center gap-2 self-start sm:self-auto">
                    <Plus className="w-4 h-4" />
                    {t("agenda.add")}
                </button>
            </div>

            {/* Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                <div className="flex rounded-lg border border-[#3A311D] overflow-hidden self-start" data-testid="agenda-view-toggle">
                    {["day", "week", "month"].map((v) => (
                        <button
                            key={v}
                            data-testid={`agenda-view-${v}`}
                            onClick={() => setView(v)}
                            className={`px-4 py-2 text-sm transition-colors ${view === v ? "bg-[#D4AF37] text-black font-semibold" : "text-zinc-400 hover:text-[#E5C158] bg-[#0E0E12]"}`}
                        >
                            {t(`agenda.${v}`)}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <button data-testid="agenda-prev" onClick={() => navigate(-1)} className="p-2 rounded-lg border border-[#3A311D] text-zinc-300 hover:text-[#E5C158] hover:border-[#D4AF37]/40 transition-colors">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button data-testid="agenda-today" onClick={() => setCursor(todayStr())} className="px-3 py-2 rounded-lg border border-[#3A311D] text-sm text-zinc-300 hover:text-[#E5C158] transition-colors">
                        {t("common.today")}
                    </button>
                    <button data-testid="agenda-next" onClick={() => navigate(1)} className="p-2 rounded-lg border border-[#3A311D] text-zinc-300 hover:text-[#E5C158] hover:border-[#D4AF37]/40 transition-colors">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                    <span data-testid="agenda-current-period" className="text-sm text-[#E5C158] font-medium capitalize min-w-[150px]">{headerLabel}</span>
                </div>
                <div className="flex gap-2 lg:ml-auto flex-col sm:flex-row w-full lg:w-auto">
                    <select data-testid="agenda-filter-professional" value={filterPro} onChange={(e) => setFilterPro(e.target.value)} className={selectCls + " lg:w-56"}>
                        <option value="">{t("agenda.filterProfessional")}</option>
                        {professionals.map((p) => (
                            <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                        ))}
                    </select>
                    <select data-testid="agenda-filter-status" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={selectCls + " lg:w-44"}>
                        <option value="">{t("agenda.filterStatus")}</option>
                        {["pending", "confirmed", "cancelled", "completed"].map((s) => (
                            <option key={s} value={s}>{t(`status.${s}`)}</option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-16" data-testid="agenda-loading">
                    <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                </div>
            ) : view === "day" ? (
                appointments.length === 0 ? (
                    <div data-testid="agenda-empty" className="luxury-card p-12 text-center text-zinc-500 text-sm">
                        {t("agenda.empty")}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4" data-testid="agenda-day-list">
                        {appointments.map((a) => <AppointmentCard key={a.id} a={a} />)}
                    </div>
                )
            ) : view === "week" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3" data-testid="agenda-week-view">
                    {weekDays.map((d) => {
                        const dayStr = format(d, "yyyy-MM-dd");
                        const dayAppts = appointments.filter((a) => a.date === dayStr);
                        const isToday = dayStr === todayStr();
                        return (
                            <div key={dayStr} className={`luxury-card p-3 min-h-[140px] ${isToday ? "border-[#D4AF37]/60 shadow-[0_0_18px_rgba(212,175,55,0.12)]" : ""}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className={`text-xs uppercase tracking-wider ${isToday ? "text-[#E5C158] font-semibold" : "text-zinc-500"}`}>
                                        {format(d, "EEE dd", { locale: dfLocale })}
                                    </span>
                                    <button data-testid={`agenda-add-${dayStr}`} onClick={() => openCreate(dayStr)} className="text-zinc-500 hover:text-[#E5C158] transition-colors" aria-label={t("agenda.add")}>
                                        <Plus className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {dayAppts.map((a) => (
                                        <button
                                            key={a.id}
                                            data-testid={`week-appointment-${a.id}`}
                                            onClick={() => openEdit(a)}
                                            className="w-full text-left px-2 py-1.5 rounded-md bg-[#0E0E12] border border-[#3A311D]/60 hover:border-[#D4AF37]/40 transition-colors"
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[a.status]}`} />
                                                <span className="text-[11px] text-[#E5C158] font-medium">{a.start_time}</span>
                                            </div>
                                            <p className="text-[11px] text-zinc-300 truncate mt-0.5">{a.client_name}</p>
                                            <p className="text-[10px] text-zinc-500 truncate">{a.service_name}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div data-testid="agenda-month-view" className="luxury-card overflow-hidden">
                    <div className="grid grid-cols-7 border-b border-[#3A311D]">
                        {weekDays.map((d) => (
                            <div key={d.toISOString()} className="px-2 py-2.5 text-center text-[11px] uppercase tracking-wider text-zinc-500">
                                {format(d, "EEE", { locale: dfLocale })}
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7">
                        {monthDays.map((d) => {
                            const dayStr = format(d, "yyyy-MM-dd");
                            const count = appointments.filter((a) => a.date === dayStr && a.status !== "cancelled").length;
                            const inMonth = isSameMonth(d, parseISO(cursor));
                            const isToday = isSameDay(d, new Date());
                            return (
                                <button
                                    key={dayStr}
                                    data-testid={`month-day-${dayStr}`}
                                    onClick={() => { setCursor(dayStr); setView("day"); }}
                                    className={`min-h-[72px] sm:min-h-[88px] p-2 border-b border-r border-[#3A311D]/30 text-left transition-colors hover:bg-[#1C1C24] ${!inMonth ? "opacity-35" : ""}`}
                                >
                                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${isToday ? "bg-[#D4AF37] text-black font-bold" : "text-zinc-400"}`}>
                                        {format(d, "d")}
                                    </span>
                                    {count > 0 && (
                                        <div className="mt-1">
                                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-[#D4AF37]/15 text-[#E5C158] border border-[#D4AF37]/25">
                                                {count}
                                            </span>
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Form dialog */}
            <Dialog open={formOpen} onOpenChange={setFormOpen}>
                <DialogContent className="bg-[#14141A] border-[#3A311D] text-zinc-100 max-w-lg max-h-[90vh] overflow-y-auto" data-testid="appointment-form-dialog">
                    <DialogHeader>
                        <DialogTitle className="font-serif-display text-xl text-[#E5C158]">
                            {editing ? t("agenda.edit") : t("agenda.add")}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                        <Field label={t("common.client")} error={formErrors.client_id} htmlFor="appt-client">
                            <select id="appt-client" data-testid="appointment-client-select" value={form.client_id} onChange={set("client_id")} className={selectCls}>
                                <option value="">{t("common.selectPlaceholder")}</option>
                                {clients.map((c) => (
                                    <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                                ))}
                            </select>
                        </Field>
                        <Field label={t("common.service")} error={formErrors.service_id} htmlFor="appt-service">
                            <select id="appt-service" data-testid="appointment-service-select" value={form.service_id} onChange={set("service_id")} className={selectCls}>
                                <option value="">{t("common.selectPlaceholder")}</option>
                                {services.map((s) => (
                                    <option key={s.id} value={s.id}>{s.name} · {formatCurrency(s.price, language)} · {s.duration_minutes}{t("common.min")}</option>
                                ))}
                            </select>
                        </Field>
                        <Field label={t("common.professional")} error={formErrors.professional_id} htmlFor="appt-professional">
                            <select id="appt-professional" data-testid="appointment-professional-select" value={form.professional_id} onChange={set("professional_id")} className={selectCls}>
                                <option value="">{t("common.selectPlaceholder")}</option>
                                {professionals.map((p) => (
                                    <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                                ))}
                            </select>
                        </Field>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label={t("common.date")} error={formErrors.date} htmlFor="appt-date">
                                <input id="appt-date" data-testid="appointment-date-input" type="date" value={form.date} onChange={set("date")} className="luxury-input w-full px-3 py-2 rounded-lg border text-sm outline-none [color-scheme:dark]" />
                            </Field>
                            <Field label={t("common.startTime")} error={formErrors.start_time} htmlFor="appt-time">
                                <input id="appt-time" data-testid="appointment-time-input" type="time" value={form.start_time} onChange={set("start_time")} className="luxury-input w-full px-3 py-2 rounded-lg border text-sm outline-none [color-scheme:dark]" />
                            </Field>
                        </div>
                        {estimatedEnd && (
                            <p className="text-xs text-zinc-500" data-testid="appointment-estimated-end">
                                {t("agenda.endTime")}: <span className="text-[#E5C158]">{estimatedEnd}</span>
                                {selectedService && ` (${selectedService.duration_minutes}${t("common.min")})`}
                            </p>
                        )}
                        <Field label={`${t("common.price")} (R$)`} error={formErrors.price} htmlFor="appt-price" optional={t("common.optional")}>
                            <input id="appt-price" data-testid="appointment-price-input" type="number" min="0" step="0.01" value={form.price} onChange={set("price")} placeholder={selectedService ? String(selectedService.price) : ""} className="luxury-input w-full px-3 py-2 rounded-lg border text-sm outline-none" />
                        </Field>
                        <Field label={t("common.notes")} htmlFor="appt-notes">
                            <textarea id="appt-notes" data-testid="appointment-notes-input" rows={2} value={form.notes} onChange={set("notes")} className="luxury-input w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none" />
                        </Field>
                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" data-testid="appointment-form-cancel" onClick={() => setFormOpen(false)} className="px-4 py-2 rounded-lg text-sm border border-[#3A311D] text-zinc-300 hover:bg-[#1C1C24] transition-colors">
                                {t("common.cancel")}
                            </button>
                            <button type="submit" data-testid="appointment-form-submit" className="gold-btn px-5 py-2 rounded-lg text-sm">
                                {t("common.save")}
                            </button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={confirmSaveOpen}
                onOpenChange={setConfirmSaveOpen}
                onConfirm={doSave}
                title={editing ? t("confirm.saveTitle") : t("confirm.createTitle")}
                description={editing ? t("confirm.saveMessage") : t("confirm.createMessage")}
                testId="appointment-save-confirm"
            />
            <ConfirmDialog
                open={!!pendingStatus}
                onOpenChange={() => setPendingStatus(null)}
                onConfirm={doStatusChange}
                title={t("confirm.statusTitle")}
                description={statusMessage}
                danger={pendingStatus?.status === "cancelled"}
                confirmText={pendingStatus?.status === "cancelled" ? t("agenda.cancelAction") : undefined}
                testId="appointment-status-confirm"
            />
            <ConfirmDialog
                open={!!pendingDelete}
                onOpenChange={() => setPendingDelete(null)}
                onConfirm={doDelete}
                title={t("confirm.deleteTitle")}
                description={t("confirm.deleteMessage")}
                danger
                testId="appointment-delete-confirm"
            />
        </div>
    );
}
