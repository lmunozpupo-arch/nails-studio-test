import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import api, { apiErrorKey } from "@/api";
import { useLanguage } from "@/i18n/LanguageContext";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { Field } from "@/components/Field";
import { formatCurrency, formatDate } from "@/utils/format";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

const EMPTY_FORM = {
    client_id: "",
    appointment_id: "",
    amount: "",
    method: "cash",
    date: new Date().toISOString().slice(0, 10),
    status: "paid",
    notes: "",
};

const METHODS = ["cash", "pix", "debit_card", "credit_card"];
const localMode = process.env.REACT_APP_LOCAL_AUTH === "true" || !process.env.REACT_APP_BACKEND_URL;

export default function Payments() {
    const { t, language } = useLanguage();
    const [items, setItems] = useState([]);
    const [clients, setClients] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [formErrors, setFormErrors] = useState({});
    const [pendingDelete, setPendingDelete] = useState(null);
    const pendingSaveRef = useRef(null);
    const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);

    const load = useCallback(async () => {
        try {
            if (localMode) {
                setItems(JSON.parse(localStorage.getItem("salonapp_local_payments") || "[]"));
                return;
            }
            const { data } = await api.get("/payments");
            setItems(data);
        } catch (err) {
            toast.error(t(`errors.${apiErrorKey(err)}`));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        if (localMode) {
            setClients(JSON.parse(localStorage.getItem("salonapp_local_client_records") || "[]"));
            setAppointments(JSON.parse(localStorage.getItem("salonapp_local_appointments") || "[]"));
            return;
        }
        api.get("/clients", { params: { active: "true" } }).then(({ data }) => setClients(data)).catch(() => {});
        api.get("/appointments").then(({ data }) => setAppointments(data)).catch(() => {});
    }, []);

    const openCreate = () => {
        setEditing(null);
        setForm(EMPTY_FORM);
        setFormErrors({});
        setFormOpen(true);
    };

    const openEdit = (item) => {
        setEditing(item);
        setForm({
            client_id: item.client_id,
            appointment_id: item.appointment_id || "",
            amount: String(item.amount),
            method: item.method,
            date: item.date,
            status: item.status,
            notes: item.notes || "",
        });
        setFormErrors({});
        setFormOpen(true);
    };

    const validate = () => {
        const errs = {};
        if (!form.client_id) errs.client_id = t("validation.selectRequired");
        if (!form.amount || Number(form.amount) <= 0) errs.amount = t("validation.amountPositive");
        if (!form.date) errs.date = t("validation.invalidDate");
        setFormErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validate()) return;
        pendingSaveRef.current = {
            client_id: form.client_id,
            appointment_id: form.appointment_id || null,
            amount: Number(form.amount),
            method: form.method,
            date: form.date,
            status: form.status,
            notes: form.notes,
        };
        if (localMode) doSave();
        else setConfirmSaveOpen(true);
    };

    const doSave = async () => {
        setConfirmSaveOpen(false);
        try {
            if (localMode) {
                const payments = JSON.parse(localStorage.getItem("salonapp_local_payments") || "[]");
                const client = clients.find((entry) => entry.id === pendingSaveRef.current.client_id);
                const value = { ...pendingSaveRef.current, client_name: client ? `${client.first_name} ${client.last_name}` : "", id: editing?.id || `local_payment_${Date.now()}` };
                const next = editing ? payments.map((item) => item.id === editing.id ? value : item) : [...payments, value];
                localStorage.setItem("salonapp_local_payments", JSON.stringify(next));
                toast.success(t(editing ? "payments.updated" : "payments.created"));
                setFormOpen(false);
                load();
                return;
            }
            if (editing) {
                await api.put(`/payments/${editing.id}`, pendingSaveRef.current);
                toast.success(t("payments.updated"));
            } else {
                await api.post("/payments", pendingSaveRef.current);
                toast.success(t("payments.created"));
            }
            setFormOpen(false);
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
                const payments = JSON.parse(localStorage.getItem("salonapp_local_payments") || "[]");
                localStorage.setItem("salonapp_local_payments", JSON.stringify(payments.filter((entry) => entry.id !== item.id)));
                toast.success(t("payments.deleted"));
                load();
                return;
            }
            await api.delete(`/payments/${item.id}`);
            toast.success(t("payments.deleted"));
            load();
        } catch (err) {
            toast.error(t(`errors.${apiErrorKey(err)}`));
        }
    };

    const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

    const handleAppointmentSelect = (e) => {
        const apptId = e.target.value;
        setForm((f) => {
            const next = { ...f, appointment_id: apptId };
            if (apptId) {
                const appt = appointments.find((a) => a.id === apptId);
                if (appt) {
                    next.client_id = appt.client_id;
                    next.amount = String(appt.price);
                }
            }
            return next;
        });
    };

    const selectCls = "luxury-input w-full px-3 py-2 rounded-lg border text-sm outline-none bg-[#0E0E12]";

    return (
        <div className="space-y-6 animate-fade-slide" data-testid="payments-page">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                    <h1 className="font-serif-display text-3xl sm:text-4xl text-white font-semibold">
                        {t("payments.title")}
                    </h1>
                    <p className="text-sm text-zinc-400 mt-1">{t("payments.subtitle")}</p>
                </div>
                <button data-testid="add-payment-btn" onClick={openCreate} className="gold-btn px-5 py-2.5 rounded-lg text-sm flex items-center gap-2 self-start sm:self-auto">
                    <Plus className="w-4 h-4" />
                    {t("payments.add")}
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-16" data-testid="payments-loading">
                    <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                </div>
            ) : items.length === 0 ? (
                <div data-testid="payments-empty" className="luxury-card p-12 text-center text-zinc-500 text-sm">
                    {t("payments.empty")}
                </div>
            ) : (
                <>
                    <div className="hidden md:block luxury-card overflow-hidden">
                        <table className="w-full text-sm" data-testid="payments-table">
                            <thead>
                                <tr className="border-b border-[#3A311D] text-left text-xs uppercase tracking-widest text-zinc-500">
                                    <th className="px-5 py-3.5">{t("common.date")}</th>
                                    <th className="px-5 py-3.5">{t("common.client")}</th>
                                    <th className="px-5 py-3.5">{t("common.amount")}</th>
                                    <th className="px-5 py-3.5">{t("common.method")}</th>
                                    <th className="px-5 py-3.5">{t("common.status")}</th>
                                    <th className="px-5 py-3.5 text-right">{t("common.actions")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((p) => (
                                    <tr key={p.id} data-testid={`payment-row-${p.id}`} className="border-b border-[#3A311D]/40 last:border-0 hover:bg-[#1C1C24]/60 transition-colors">
                                        <td className="px-5 py-3.5 text-zinc-300">{formatDate(p.date, language)}</td>
                                        <td className="px-5 py-3.5 text-zinc-100 font-medium">{p.client_name}</td>
                                        <td className="px-5 py-3.5 text-[#E5C158] font-medium">{formatCurrency(p.amount, language)}</td>
                                        <td className="px-5 py-3.5 text-zinc-300">{t(`methods.${p.method}`)}</td>
                                        <td className="px-5 py-3.5"><StatusBadge status={p.status} /></td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex justify-end gap-1">
                                                <button data-testid={`payment-edit-${p.id}`} onClick={() => openEdit(p)} className="p-2 rounded-lg text-zinc-400 hover:text-[#E5C158] hover:bg-[#D4AF37]/10 transition-colors" aria-label={t("common.edit")}>
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button data-testid={`payment-delete-${p.id}`} onClick={() => setPendingDelete(p)} className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors" aria-label={t("common.delete")}>
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="md:hidden space-y-3">
                        {items.map((p) => (
                            <div key={p.id} data-testid={`payment-card-${p.id}`} className="luxury-card p-4">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="text-white font-medium">{p.client_name}</p>
                                        <p className="text-sm text-zinc-400 mt-0.5">
                                            {formatDate(p.date, language)} · {t(`methods.${p.method}`)}
                                        </p>
                                        <p className="text-[#E5C158] font-semibold mt-1">{formatCurrency(p.amount, language)}</p>
                                    </div>
                                    <StatusBadge status={p.status} />
                                </div>
                                <div className="flex gap-2 mt-3 pt-3 border-t border-[#3A311D]/40">
                                    <button data-testid={`payment-edit-mobile-${p.id}`} onClick={() => openEdit(p)} className="flex-1 py-2 rounded-lg text-xs text-zinc-300 border border-[#3A311D] hover:text-[#E5C158] transition-colors">{t("common.edit")}</button>
                                    <button data-testid={`payment-delete-mobile-${p.id}`} onClick={() => setPendingDelete(p)} className="flex-1 py-2 rounded-lg text-xs text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors">{t("common.delete")}</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            <Dialog open={formOpen} onOpenChange={setFormOpen}>
                <DialogContent className="bg-[#14141A] border-[#3A311D] text-zinc-100 max-w-lg max-h-[90vh] overflow-y-auto" data-testid="payment-form-dialog">
                    <DialogHeader>
                        <DialogTitle className="font-serif-display text-xl text-[#E5C158]">
                            {editing ? t("payments.edit") : t("payments.add")}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                        <Field label={t("payments.appointmentOptional")} htmlFor="pay-appointment">
                            <select id="pay-appointment" data-testid="payment-appointment-select" value={form.appointment_id} onChange={handleAppointmentSelect} className={selectCls}>
                                <option value="">{t("payments.noAppointment")}</option>
                                {appointments.map((a) => (
                                    <option key={a.id} value={a.id}>
                                        {formatDate(a.date, language)} {a.start_time} · {a.client_name} · {a.service_name}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field label={t("common.client")} error={formErrors.client_id} htmlFor="pay-client">
                            <select id="pay-client" data-testid="payment-client-select" value={form.client_id} onChange={set("client_id")} className={selectCls}>
                                <option value="">{t("common.selectPlaceholder")}</option>
                                {clients.map((c) => (
                                    <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                                ))}
                            </select>
                        </Field>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label={`${t("common.amount")} (R$)`} error={formErrors.amount} htmlFor="pay-amount">
                                <input id="pay-amount" data-testid="payment-amount-input" type="number" min="0" step="0.01" value={form.amount} onChange={set("amount")} className="luxury-input w-full px-3 py-2 rounded-lg border text-sm outline-none" />
                            </Field>
                            <Field label={t("common.date")} error={formErrors.date} htmlFor="pay-date">
                                <input id="pay-date" data-testid="payment-date-input" type="date" value={form.date} onChange={set("date")} className="luxury-input w-full px-3 py-2 rounded-lg border text-sm outline-none [color-scheme:dark]" />
                            </Field>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label={t("common.method")} htmlFor="pay-method">
                                <select id="pay-method" data-testid="payment-method-select" value={form.method} onChange={set("method")} className={selectCls}>
                                    {METHODS.map((m) => (
                                        <option key={m} value={m}>{t(`methods.${m}`)}</option>
                                    ))}
                                </select>
                            </Field>
                            <Field label={t("common.status")} htmlFor="pay-status">
                                <select id="pay-status" data-testid="payment-status-select" value={form.status} onChange={set("status")} className={selectCls}>
                                    <option value="paid">{t("status.paid")}</option>
                                    <option value="pending">{t("status.pending")}</option>
                                </select>
                            </Field>
                        </div>
                        <Field label={t("common.notes")} htmlFor="pay-notes">
                            <textarea id="pay-notes" data-testid="payment-notes-input" rows={2} value={form.notes} onChange={set("notes")} className="luxury-input w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none" />
                        </Field>
                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" data-testid="payment-form-cancel" onClick={() => setFormOpen(false)} className="px-4 py-2 rounded-lg text-sm border border-[#3A311D] text-zinc-300 hover:bg-[#1C1C24] transition-colors">
                                {t("common.cancel")}
                            </button>
                            <button type="submit" data-testid="payment-form-submit" className="gold-btn px-5 py-2 rounded-lg text-sm">
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
                testId="payment-save-confirm"
            />
            <ConfirmDialog
                open={!!pendingDelete}
                onOpenChange={() => setPendingDelete(null)}
                onConfirm={doDelete}
                title={t("confirm.deleteTitle")}
                description={t("confirm.deleteMessage")}
                danger
                testId="payment-delete-confirm"
            />
        </div>
    );
}
