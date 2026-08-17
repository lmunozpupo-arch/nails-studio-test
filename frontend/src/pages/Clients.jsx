import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Search, Eye } from "lucide-react";
import { toast } from "sonner";
import api, { apiErrorKey } from "@/api";
import { useLanguage } from "@/i18n/LanguageContext";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { Field } from "@/components/Field";
import { formatDate } from "@/utils/format";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

const EMPTY_FORM = {
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    birth_date: "",
    notes: "",
    active: true,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const localMode = process.env.REACT_APP_LOCAL_AUTH === "true" || !process.env.REACT_APP_BACKEND_URL;

export default function Clients() {
    const { t, language } = useLanguage();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [formOpen, setFormOpen] = useState(false);
    const [viewItem, setViewItem] = useState(null);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [formErrors, setFormErrors] = useState({});
    const [pendingDelete, setPendingDelete] = useState(null);
    const pendingSaveRef = useRef(null);
    const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);

    const load = useCallback(async (q = "") => {
        try {
            if (localMode) {
                const localClients = JSON.parse(localStorage.getItem("salonapp_local_client_records") || "[]");
                const normalizedQuery = q.trim().toLowerCase();
                setItems(normalizedQuery ? localClients.filter((item) => `${item.first_name} ${item.last_name} ${item.email}`.toLowerCase().includes(normalizedQuery)) : localClients);
                return;
            }
            const { data } = await api.get("/clients", { params: { search: q } });
            setItems(data);
        } catch (err) {
            toast.error(t(`errors.${apiErrorKey(err)}`));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        const timer = setTimeout(() => load(search), 300);
        return () => clearTimeout(timer);
    }, [search, load]);

    const openCreate = () => {
        setEditing(null);
        setForm(EMPTY_FORM);
        setFormErrors({});
        setFormOpen(true);
    };

    const openEdit = (item) => {
        setEditing(item);
        setForm({
            first_name: item.first_name,
            last_name: item.last_name,
            phone: item.phone || "",
            email: item.email || "",
            birth_date: item.birth_date || "",
            notes: item.notes || "",
            active: item.active,
        });
        setFormErrors({});
        setFormOpen(true);
    };

    const validate = () => {
        const errs = {};
        if (!form.first_name.trim()) errs.first_name = t("validation.required");
        if (!form.last_name.trim()) errs.last_name = t("validation.required");
        if (form.email && !EMAIL_RE.test(form.email)) errs.email = t("validation.invalidEmail");
        setFormErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validate()) return;
        pendingSaveRef.current = { ...form };
        setConfirmSaveOpen(true);
    };

    const doSave = async () => {
        setConfirmSaveOpen(false);
        try {
            if (localMode) {
                const localClients = JSON.parse(localStorage.getItem("salonapp_local_client_records") || "[]");
                if (editing) {
                    const updated = localClients.map((item) => item.id === editing.id ? { ...item, ...pendingSaveRef.current, updated_at: new Date().toISOString() } : item);
                    localStorage.setItem("salonapp_local_client_records", JSON.stringify(updated));
                    toast.success(t("clients.updated"));
                } else {
                    const now = new Date().toISOString();
                    localClients.push({ ...pendingSaveRef.current, id: `local_client_record_${Date.now()}`, created_at: now, updated_at: now });
                    localStorage.setItem("salonapp_local_client_records", JSON.stringify(localClients));
                    toast.success(t("clients.created"));
                }
                setFormOpen(false);
                load(search);
                return;
            }
            if (editing) {
                await api.put(`/clients/${editing.id}`, pendingSaveRef.current);
                toast.success(t("clients.updated"));
            } else {
                await api.post("/clients", pendingSaveRef.current);
                toast.success(t("clients.created"));
            }
            setFormOpen(false);
            load(search);
        } catch (err) {
            toast.error(t(`errors.${apiErrorKey(err)}`));
        }
    };

    const doDelete = async () => {
        const item = pendingDelete;
        setPendingDelete(null);
        try {
            if (localMode) {
                const localClients = JSON.parse(localStorage.getItem("salonapp_local_client_records") || "[]");
                localStorage.setItem("salonapp_local_client_records", JSON.stringify(localClients.filter((entry) => entry.id !== item.id)));
                toast.success(t("clients.deleted"));
                load(search);
                return;
            }
            await api.delete(`/clients/${item.id}`);
            toast.success(t("clients.deleted"));
            load(search);
        } catch (err) {
            toast.error(t(`errors.${apiErrorKey(err)}`));
        }
    };

    const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

    return (
        <div className="space-y-6 animate-fade-slide" data-testid="clients-page">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                    <h1 className="font-serif-display text-3xl sm:text-4xl text-white font-semibold">
                        {t("clients.title")}
                    </h1>
                    <p className="text-sm text-zinc-400 mt-1">{t("clients.subtitle")}</p>
                </div>
                <button
                    data-testid="add-client-btn"
                    onClick={openCreate}
                    className="gold-btn px-5 py-2.5 rounded-lg text-sm flex items-center gap-2 self-start sm:self-auto"
                >
                    <Plus className="w-4 h-4" />
                    {t("clients.add")}
                </button>
            </div>

            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                    data-testid="clients-search-input"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("common.searchPlaceholder")}
                    className="luxury-input w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm outline-none"
                />
            </div>

            {loading ? (
                <div className="flex justify-center py-16" data-testid="clients-loading">
                    <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                </div>
            ) : items.length === 0 ? (
                <div data-testid="clients-empty" className="luxury-card p-12 text-center text-zinc-500 text-sm">
                    {search ? t("common.no") : t("clients.empty")}
                </div>
            ) : (
                <>
                    <div className="hidden md:block luxury-card overflow-hidden">
                        <table className="w-full text-sm" data-testid="clients-table">
                            <thead>
                                <tr className="border-b border-[#3A311D] text-left text-xs uppercase tracking-widest text-zinc-500">
                                    <th className="px-5 py-3.5">{t("common.name")}</th>
                                    <th className="px-5 py-3.5">{t("common.phone")}</th>
                                    <th className="px-5 py-3.5">{t("common.email")}</th>
                                    <th className="px-5 py-3.5">{t("common.status")}</th>
                                    <th className="px-5 py-3.5 text-right">{t("common.actions")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((c) => (
                                    <tr key={c.id} data-testid={`client-row-${c.id}`} className="border-b border-[#3A311D]/40 last:border-0 hover:bg-[#1C1C24]/60 transition-colors">
                                        <td className="px-5 py-3.5 text-zinc-100 font-medium">
                                            {c.first_name} {c.last_name}
                                        </td>
                                        <td className="px-5 py-3.5 text-zinc-300">{c.phone || "—"}</td>
                                        <td className="px-5 py-3.5 text-zinc-300">{c.email || "—"}</td>
                                        <td className="px-5 py-3.5">
                                            <StatusBadge status={c.active ? "active" : "inactive"} />
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex justify-end gap-1">
                                                <button data-testid={`client-view-${c.id}`} onClick={() => setViewItem(c)} className="p-2 rounded-lg text-zinc-400 hover:text-[#E5C158] hover:bg-[#D4AF37]/10 transition-colors" aria-label={t("common.view")}>
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button data-testid={`client-edit-${c.id}`} onClick={() => openEdit(c)} className="p-2 rounded-lg text-zinc-400 hover:text-[#E5C158] hover:bg-[#D4AF37]/10 transition-colors" aria-label={t("common.edit")}>
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button data-testid={`client-delete-${c.id}`} onClick={() => setPendingDelete(c)} className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors" aria-label={t("common.delete")}>
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
                        {items.map((c) => (
                            <div key={c.id} data-testid={`client-card-${c.id}`} className="luxury-card p-4">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="text-white font-medium">{c.first_name} {c.last_name}</p>
                                        <p className="text-sm text-zinc-400 mt-0.5">{c.phone || "—"}</p>
                                        <p className="text-sm text-zinc-500">{c.email || ""}</p>
                                    </div>
                                    <StatusBadge status={c.active ? "active" : "inactive"} />
                                </div>
                                <div className="flex gap-2 mt-3 pt-3 border-t border-[#3A311D]/40">
                                    <button data-testid={`client-view-mobile-${c.id}`} onClick={() => setViewItem(c)} className="flex-1 py-2 rounded-lg text-xs text-zinc-300 border border-[#3A311D] hover:text-[#E5C158] transition-colors">{t("common.view")}</button>
                                    <button data-testid={`client-edit-mobile-${c.id}`} onClick={() => openEdit(c)} className="flex-1 py-2 rounded-lg text-xs text-zinc-300 border border-[#3A311D] hover:text-[#E5C158] transition-colors">{t("common.edit")}</button>
                                    <button data-testid={`client-delete-mobile-${c.id}`} onClick={() => setPendingDelete(c)} className="flex-1 py-2 rounded-lg text-xs text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors">{t("common.delete")}</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Form dialog */}
            <Dialog open={formOpen} onOpenChange={setFormOpen}>
                <DialogContent className="bg-[#14141A] border-[#3A311D] text-zinc-100 max-w-lg max-h-[90vh] overflow-y-auto" data-testid="client-form-dialog">
                    <DialogHeader>
                        <DialogTitle className="font-serif-display text-xl text-[#E5C158]">
                            {editing ? t("clients.edit") : t("clients.add")}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label={t("common.firstName")} error={formErrors.first_name} htmlFor="client-first-name">
                                <input id="client-first-name" data-testid="client-first-name-input" value={form.first_name} onChange={set("first_name")} className="luxury-input w-full px-3 py-2 rounded-lg border text-sm outline-none" />
                            </Field>
                            <Field label={t("common.lastName")} error={formErrors.last_name} htmlFor="client-last-name">
                                <input id="client-last-name" data-testid="client-last-name-input" value={form.last_name} onChange={set("last_name")} className="luxury-input w-full px-3 py-2 rounded-lg border text-sm outline-none" />
                            </Field>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label={t("common.phone")} htmlFor="client-phone">
                                <input id="client-phone" data-testid="client-phone-input" value={form.phone} onChange={set("phone")} className="luxury-input w-full px-3 py-2 rounded-lg border text-sm outline-none" />
                            </Field>
                            <Field label={t("common.birthDate")} htmlFor="client-birth-date">
                                <input id="client-birth-date" data-testid="client-birth-date-input" type="date" value={form.birth_date} onChange={set("birth_date")} className="luxury-input w-full px-3 py-2 rounded-lg border text-sm outline-none [color-scheme:dark]" />
                            </Field>
                        </div>
                        <Field label={t("common.email")} error={formErrors.email} htmlFor="client-email">
                            <input id="client-email" data-testid="client-email-input" type="email" value={form.email} onChange={set("email")} className="luxury-input w-full px-3 py-2 rounded-lg border text-sm outline-none" />
                        </Field>
                        <Field label={t("common.notes")} htmlFor="client-notes">
                            <textarea id="client-notes" data-testid="client-notes-input" rows={3} value={form.notes} onChange={set("notes")} className="luxury-input w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none" />
                        </Field>
                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" data-testid="client-form-cancel" onClick={() => setFormOpen(false)} className="px-4 py-2 rounded-lg text-sm border border-[#3A311D] text-zinc-300 hover:bg-[#1C1C24] transition-colors">
                                {t("common.cancel")}
                            </button>
                            <button type="submit" data-testid="client-form-submit" className="gold-btn px-5 py-2 rounded-lg text-sm">
                                {t("common.save")}
                            </button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* View dialog */}
            <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
                <DialogContent className="bg-[#14141A] border-[#3A311D] text-zinc-100 max-w-md" data-testid="client-view-dialog">
                    <DialogHeader>
                        <DialogTitle className="font-serif-display text-xl text-[#E5C158]">
                            {viewItem?.first_name} {viewItem?.last_name}
                        </DialogTitle>
                    </DialogHeader>
                    {viewItem && (
                        <div className="space-y-3 text-sm pt-2">
                            <div className="flex justify-between"><span className="text-zinc-500">{t("common.phone")}</span><span className="text-zinc-200">{viewItem.phone || "—"}</span></div>
                            <div className="flex justify-between"><span className="text-zinc-500">{t("common.email")}</span><span className="text-zinc-200">{viewItem.email || "—"}</span></div>
                            <div className="flex justify-between"><span className="text-zinc-500">{t("common.birthDate")}</span><span className="text-zinc-200">{viewItem.birth_date ? formatDate(viewItem.birth_date, language) : "—"}</span></div>
                            <div className="flex justify-between items-center"><span className="text-zinc-500">{t("common.status")}</span><StatusBadge status={viewItem.active ? "active" : "inactive"} /></div>
                            {viewItem.notes && <div className="pt-2 border-t border-[#3A311D]/40"><span className="text-zinc-500 block mb-1">{t("common.notes")}</span><span className="text-zinc-300">{viewItem.notes}</span></div>}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={confirmSaveOpen}
                onOpenChange={setConfirmSaveOpen}
                onConfirm={doSave}
                title={editing ? t("confirm.saveTitle") : t("confirm.createTitle")}
                description={editing ? t("confirm.saveMessage") : t("confirm.createMessage")}
                testId="client-save-confirm"
            />
            <ConfirmDialog
                open={!!pendingDelete}
                onOpenChange={() => setPendingDelete(null)}
                onConfirm={doDelete}
                title={t("confirm.deleteTitle")}
                description={t("confirm.deleteMessage")}
                danger
                testId="client-delete-confirm"
            />
        </div>
    );
}
