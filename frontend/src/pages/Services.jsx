import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import api, { apiErrorKey } from "@/api";
import { useLanguage } from "@/i18n/LanguageContext";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { Field } from "@/components/Field";
import { formatCurrency, formatDuration } from "@/utils/format";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

const EMPTY_FORM = { name: "", description: "", price: "", duration_minutes: "", active: true };
const localMode = process.env.REACT_APP_LOCAL_AUTH === "true" || (!process.env.REACT_APP_BACKEND_URL && process.env.REACT_APP_LOCAL_AUTH !== "false");

export default function Services() {
    const { t, language } = useLanguage();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [formErrors, setFormErrors] = useState({});
    const [pendingDelete, setPendingDelete] = useState(null);
    const pendingSaveRef = useRef(null);
    const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);

    const load = useCallback(async (q = "") => {
        try {
            if (localMode) {
                const services = JSON.parse(localStorage.getItem("salonapp_local_services") || "[]");
                const query = q.trim().toLowerCase();
                setItems(query ? services.filter((item) => `${item.name} ${item.description}`.toLowerCase().includes(query)) : services);
                return;
            }
            const { data } = await api.get("/services", { params: { search: q } });
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
            name: item.name,
            description: item.description || "",
            price: String(item.price),
            duration_minutes: String(item.duration_minutes),
            active: item.active,
        });
        setFormErrors({});
        setFormOpen(true);
    };

    const validate = () => {
        const errs = {};
        if (!form.name.trim()) errs.name = t("validation.required");
        if (!form.price || Number(form.price) <= 0) errs.price = t("validation.pricePositive");
        if (!form.duration_minutes || Number(form.duration_minutes) <= 0)
            errs.duration_minutes = t("validation.durationPositive");
        setFormErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validate()) return;
        pendingSaveRef.current = {
            name: form.name.trim(),
            description: form.description,
            price: Number(form.price),
            duration_minutes: Number(form.duration_minutes),
            active: form.active,
        };
        if (localMode) doSave();
        else setConfirmSaveOpen(true);
    };

    const doSave = async () => {
        setConfirmSaveOpen(false);
        try {
            if (localMode) {
                const services = JSON.parse(localStorage.getItem("salonapp_local_services") || "[]");
                const next = editing
                    ? services.map((item) => item.id === editing.id ? { ...item, ...pendingSaveRef.current } : item)
                    : [...services, { ...pendingSaveRef.current, id: `local_service_${Date.now()}` }];
                localStorage.setItem("salonapp_local_services", JSON.stringify(next));
                toast.success(t(editing ? "services.updated" : "services.created"));
                setFormOpen(false);
                load(search);
                return;
            }
            if (editing) {
                await api.put(`/services/${editing.id}`, pendingSaveRef.current);
                toast.success(t("services.updated"));
            } else {
                await api.post("/services", pendingSaveRef.current);
                toast.success(t("services.created"));
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
                const services = JSON.parse(localStorage.getItem("salonapp_local_services") || "[]");
                localStorage.setItem("salonapp_local_services", JSON.stringify(services.filter((entry) => entry.id !== item.id)));
                toast.success(t("services.deleted"));
                load(search);
                return;
            }
            await api.delete(`/services/${item.id}`);
            toast.success(t("services.deleted"));
            load(search);
        } catch (err) {
            toast.error(t(`errors.${apiErrorKey(err)}`));
        }
    };

    const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

    return (
        <div className="space-y-6 animate-fade-slide" data-testid="services-page">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                    <h1 className="font-serif-display text-3xl sm:text-4xl text-white font-semibold">
                        {t("services.title")}
                    </h1>
                    <p className="text-sm text-zinc-400 mt-1">{t("services.subtitle")}</p>
                </div>
                <button data-testid="add-service-btn" onClick={openCreate} className="gold-btn px-5 py-2.5 rounded-lg text-sm flex items-center gap-2 self-start sm:self-auto">
                    <Plus className="w-4 h-4" />
                    {t("services.add")}
                </button>
            </div>

            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input data-testid="services-search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("common.searchPlaceholder")} className="luxury-input w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm outline-none" />
            </div>

            {loading ? (
                <div className="flex justify-center py-16" data-testid="services-loading">
                    <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                </div>
            ) : items.length === 0 ? (
                <div data-testid="services-empty" className="luxury-card p-12 text-center text-zinc-500 text-sm">
                    {search ? t("common.no") : t("services.empty")}
                </div>
            ) : (
                <>
                    <div className="hidden md:block luxury-card overflow-hidden">
                        <table className="w-full text-sm" data-testid="services-table">
                            <thead>
                                <tr className="border-b border-[#3A311D] text-left text-xs uppercase tracking-widest text-zinc-500">
                                    <th className="px-5 py-3.5">{t("common.name")}</th>
                                    <th className="px-5 py-3.5">{t("common.price")}</th>
                                    <th className="px-5 py-3.5">{t("common.duration")}</th>
                                    <th className="px-5 py-3.5">{t("common.status")}</th>
                                    <th className="px-5 py-3.5 text-right">{t("common.actions")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((s) => (
                                    <tr key={s.id} data-testid={`service-row-${s.id}`} className="border-b border-[#3A311D]/40 last:border-0 hover:bg-[#1C1C24]/60 transition-colors">
                                        <td className="px-5 py-3.5">
                                            <p className="text-zinc-100 font-medium">{s.name}</p>
                                            {s.description && <p className="text-xs text-zinc-500 mt-0.5">{s.description}</p>}
                                        </td>
                                        <td className="px-5 py-3.5 text-[#E5C158] font-medium">{formatCurrency(s.price, language)}</td>
                                        <td className="px-5 py-3.5 text-zinc-300">{formatDuration(s.duration_minutes, t)}</td>
                                        <td className="px-5 py-3.5"><StatusBadge status={s.active ? "active" : "inactive"} /></td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex justify-end gap-1">
                                                <button data-testid={`service-edit-${s.id}`} onClick={() => openEdit(s)} className="p-2 rounded-lg text-zinc-400 hover:text-[#E5C158] hover:bg-[#D4AF37]/10 transition-colors" aria-label={t("common.edit")}>
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button data-testid={`service-delete-${s.id}`} onClick={() => setPendingDelete(s)} className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors" aria-label={t("common.delete")}>
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
                        {items.map((s) => (
                            <div key={s.id} data-testid={`service-card-${s.id}`} className="luxury-card p-4">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="text-white font-medium">{s.name}</p>
                                        <p className="text-sm text-[#E5C158] mt-0.5">{formatCurrency(s.price, language)} · {formatDuration(s.duration_minutes, t)}</p>
                                    </div>
                                    <StatusBadge status={s.active ? "active" : "inactive"} />
                                </div>
                                <div className="flex gap-2 mt-3 pt-3 border-t border-[#3A311D]/40">
                                    <button data-testid={`service-edit-mobile-${s.id}`} onClick={() => openEdit(s)} className="flex-1 py-2 rounded-lg text-xs text-zinc-300 border border-[#3A311D] hover:text-[#E5C158] transition-colors">{t("common.edit")}</button>
                                    <button data-testid={`service-delete-mobile-${s.id}`} onClick={() => setPendingDelete(s)} className="flex-1 py-2 rounded-lg text-xs text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors">{t("common.delete")}</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            <Dialog open={formOpen} onOpenChange={setFormOpen}>
                <DialogContent className="bg-[#14141A] border-[#3A311D] text-zinc-100 max-w-lg" data-testid="service-form-dialog">
                    <DialogHeader>
                        <DialogTitle className="font-serif-display text-xl text-[#E5C158]">
                            {editing ? t("services.edit") : t("services.add")}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                        <Field label={t("common.name")} error={formErrors.name} htmlFor="service-name">
                            <input id="service-name" data-testid="service-name-input" value={form.name} onChange={set("name")} className="luxury-input w-full px-3 py-2 rounded-lg border text-sm outline-none" />
                        </Field>
                        <Field label={t("common.description")} htmlFor="service-description">
                            <textarea id="service-description" data-testid="service-description-input" rows={2} value={form.description} onChange={set("description")} className="luxury-input w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none" />
                        </Field>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label={`${t("common.price")} (R$)`} error={formErrors.price} htmlFor="service-price">
                                <input id="service-price" data-testid="service-price-input" type="number" min="0" step="0.01" value={form.price} onChange={set("price")} className="luxury-input w-full px-3 py-2 rounded-lg border text-sm outline-none" />
                            </Field>
                            <Field label={t("services.durationMinutes")} error={formErrors.duration_minutes} htmlFor="service-duration">
                                <input id="service-duration" data-testid="service-duration-input" type="number" min="1" step="5" value={form.duration_minutes} onChange={set("duration_minutes")} className="luxury-input w-full px-3 py-2 rounded-lg border text-sm outline-none" />
                            </Field>
                        </div>
                        <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                            <input type="checkbox" data-testid="service-active-input" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} className="accent-[#D4AF37] w-4 h-4" />
                            {t("common.active")}
                        </label>
                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" data-testid="service-form-cancel" onClick={() => setFormOpen(false)} className="px-4 py-2 rounded-lg text-sm border border-[#3A311D] text-zinc-300 hover:bg-[#1C1C24] transition-colors">
                                {t("common.cancel")}
                            </button>
                            <button type="button" onClick={handleSubmit} data-testid="service-form-submit" className="gold-btn px-5 py-2 rounded-lg text-sm">
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
                testId="service-save-confirm"
            />
            <ConfirmDialog
                open={!!pendingDelete}
                onOpenChange={() => setPendingDelete(null)}
                onConfirm={doDelete}
                title={t("confirm.deleteTitle")}
                description={t("confirm.deleteMessage")}
                danger
                testId="service-delete-confirm"
            />
        </div>
    );
}
