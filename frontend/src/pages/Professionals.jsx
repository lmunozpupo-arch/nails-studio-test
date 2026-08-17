import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Search, Power } from "lucide-react";
import { toast } from "sonner";
import api, { apiErrorKey } from "@/api";
import { useLanguage } from "@/i18n/LanguageContext";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { Field } from "@/components/Field";
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
    specialty: "",
    notes: "",
    active: true,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const localMode = process.env.REACT_APP_LOCAL_AUTH === "true" || !process.env.REACT_APP_BACKEND_URL;

export default function Professionals() {
    const { t } = useLanguage();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [formErrors, setFormErrors] = useState({});
    const [pendingDelete, setPendingDelete] = useState(null);
    const [pendingToggle, setPendingToggle] = useState(null);
    const pendingSaveRef = useRef(null);
    const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);

    const load = useCallback(async (q = "") => {
        try {
            if (localMode) {
                const professionals = JSON.parse(localStorage.getItem("salonapp_local_professionals") || "[]");
                const query = q.trim().toLowerCase();
                setItems(query ? professionals.filter((item) => `${item.first_name} ${item.last_name} ${item.specialty}`.toLowerCase().includes(query)) : professionals);
                return;
            }
            const { data } = await api.get("/professionals", { params: { search: q } });
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
            specialty: item.specialty || "",
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
        if (localMode) doSave();
        else setConfirmSaveOpen(true);
    };

    const doSave = async () => {
        setConfirmSaveOpen(false);
        try {
            if (localMode) {
                const professionals = JSON.parse(localStorage.getItem("salonapp_local_professionals") || "[]");
                const next = editing
                    ? professionals.map((item) => item.id === editing.id ? { ...item, ...pendingSaveRef.current } : item)
                    : [...professionals, { ...pendingSaveRef.current, id: `local_professional_${Date.now()}` }];
                localStorage.setItem("salonapp_local_professionals", JSON.stringify(next));
                toast.success(t(editing ? "professionals.updated" : "professionals.created"));
                setFormOpen(false);
                load(search);
                return;
            }
            if (editing) {
                await api.put(`/professionals/${editing.id}`, pendingSaveRef.current);
                toast.success(t("professionals.updated"));
            } else {
                await api.post("/professionals", pendingSaveRef.current);
                toast.success(t("professionals.created"));
            }
            setFormOpen(false);
            load(search);
        } catch (err) {
            toast.error(t(`errors.${apiErrorKey(err)}`));
        }
    };

    const doToggle = async () => {
        const item = pendingToggle;
        setPendingToggle(null);
        try {
            if (localMode) {
                const professionals = JSON.parse(localStorage.getItem("salonapp_local_professionals") || "[]");
                localStorage.setItem("salonapp_local_professionals", JSON.stringify(professionals.map((entry) => entry.id === item.id ? { ...entry, active: !entry.active } : entry)));
                toast.success(t(item.active ? "professionals.deactivated" : "professionals.activated"));
                load(search);
                return;
            }
            await api.put(`/professionals/${item.id}`, {
                first_name: item.first_name,
                last_name: item.last_name,
                phone: item.phone || "",
                email: item.email || "",
                specialty: item.specialty || "",
                notes: item.notes || "",
                active: !item.active,
            });
            toast.success(item.active ? t("professionals.deactivated") : t("professionals.activated"));
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
                const professionals = JSON.parse(localStorage.getItem("salonapp_local_professionals") || "[]");
                localStorage.setItem("salonapp_local_professionals", JSON.stringify(professionals.filter((entry) => entry.id !== item.id)));
                toast.success(t("professionals.deleted"));
                load(search);
                return;
            }
            await api.delete(`/professionals/${item.id}`);
            toast.success(t("professionals.deleted"));
            load(search);
        } catch (err) {
            toast.error(t(`errors.${apiErrorKey(err)}`));
        }
    };

    const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

    return (
        <div className="space-y-6 animate-fade-slide" data-testid="professionals-page">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                    <h1 className="font-serif-display text-3xl sm:text-4xl text-white font-semibold">
                        {t("professionals.title")}
                    </h1>
                    <p className="text-sm text-zinc-400 mt-1">{t("professionals.subtitle")}</p>
                </div>
                <button data-testid="add-professional-btn" onClick={openCreate} className="gold-btn px-5 py-2.5 rounded-lg text-sm flex items-center gap-2 self-start sm:self-auto">
                    <Plus className="w-4 h-4" />
                    {t("professionals.add")}
                </button>
            </div>

            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input data-testid="professionals-search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("common.searchPlaceholder")} className="luxury-input w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm outline-none" />
            </div>

            {loading ? (
                <div className="flex justify-center py-16" data-testid="professionals-loading">
                    <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                </div>
            ) : items.length === 0 ? (
                <div data-testid="professionals-empty" className="luxury-card p-12 text-center text-zinc-500 text-sm">
                    {search ? t("common.no") : t("professionals.empty")}
                </div>
            ) : (
                <>
                    <div className="hidden md:block luxury-card overflow-hidden">
                        <table className="w-full text-sm" data-testid="professionals-table">
                            <thead>
                                <tr className="border-b border-[#3A311D] text-left text-xs uppercase tracking-widest text-zinc-500">
                                    <th className="px-5 py-3.5">{t("common.name")}</th>
                                    <th className="px-5 py-3.5">{t("common.specialty")}</th>
                                    <th className="px-5 py-3.5">{t("common.phone")}</th>
                                    <th className="px-5 py-3.5">{t("common.status")}</th>
                                    <th className="px-5 py-3.5 text-right">{t("common.actions")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((p) => (
                                    <tr key={p.id} data-testid={`professional-row-${p.id}`} className="border-b border-[#3A311D]/40 last:border-0 hover:bg-[#1C1C24]/60 transition-colors">
                                        <td className="px-5 py-3.5 text-zinc-100 font-medium">{p.first_name} {p.last_name}</td>
                                        <td className="px-5 py-3.5 text-zinc-300">{p.specialty || "—"}</td>
                                        <td className="px-5 py-3.5 text-zinc-300">{p.phone || "—"}</td>
                                        <td className="px-5 py-3.5"><StatusBadge status={p.active ? "active" : "inactive"} /></td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex justify-end gap-1">
                                                <button data-testid={`professional-toggle-${p.id}`} onClick={() => setPendingToggle(p)} className={`p-2 rounded-lg transition-colors ${p.active ? "text-zinc-400 hover:text-yellow-400 hover:bg-yellow-500/10" : "text-zinc-500 hover:text-green-400 hover:bg-green-500/10"}`} aria-label={p.active ? t("common.inactive") : t("common.active")}>
                                                    <Power className="w-4 h-4" />
                                                </button>
                                                <button data-testid={`professional-edit-${p.id}`} onClick={() => openEdit(p)} className="p-2 rounded-lg text-zinc-400 hover:text-[#E5C158] hover:bg-[#D4AF37]/10 transition-colors" aria-label={t("common.edit")}>
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button data-testid={`professional-delete-${p.id}`} onClick={() => setPendingDelete(p)} className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors" aria-label={t("common.delete")}>
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
                            <div key={p.id} data-testid={`professional-card-${p.id}`} className="luxury-card p-4">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="text-white font-medium">{p.first_name} {p.last_name}</p>
                                        <p className="text-sm text-zinc-400 mt-0.5">{p.specialty || "—"}</p>
                                        <p className="text-sm text-zinc-500">{p.phone || ""}</p>
                                    </div>
                                    <StatusBadge status={p.active ? "active" : "inactive"} />
                                </div>
                                <div className="flex gap-2 mt-3 pt-3 border-t border-[#3A311D]/40">
                                    <button data-testid={`professional-toggle-mobile-${p.id}`} onClick={() => setPendingToggle(p)} className="flex-1 py-2 rounded-lg text-xs text-zinc-300 border border-[#3A311D] hover:text-yellow-400 transition-colors">
                                        {p.active ? t("common.inactive") : t("common.active")}
                                    </button>
                                    <button data-testid={`professional-edit-mobile-${p.id}`} onClick={() => openEdit(p)} className="flex-1 py-2 rounded-lg text-xs text-zinc-300 border border-[#3A311D] hover:text-[#E5C158] transition-colors">{t("common.edit")}</button>
                                    <button data-testid={`professional-delete-mobile-${p.id}`} onClick={() => setPendingDelete(p)} className="flex-1 py-2 rounded-lg text-xs text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors">{t("common.delete")}</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            <Dialog open={formOpen} onOpenChange={setFormOpen}>
                <DialogContent className="bg-[#14141A] border-[#3A311D] text-zinc-100 max-w-lg max-h-[90vh] overflow-y-auto" data-testid="professional-form-dialog">
                    <DialogHeader>
                        <DialogTitle className="font-serif-display text-xl text-[#E5C158]">
                            {editing ? t("professionals.edit") : t("professionals.add")}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label={t("common.firstName")} error={formErrors.first_name} htmlFor="pro-first-name">
                                <input id="pro-first-name" data-testid="professional-first-name-input" value={form.first_name} onChange={set("first_name")} className="luxury-input w-full px-3 py-2 rounded-lg border text-sm outline-none" />
                            </Field>
                            <Field label={t("common.lastName")} error={formErrors.last_name} htmlFor="pro-last-name">
                                <input id="pro-last-name" data-testid="professional-last-name-input" value={form.last_name} onChange={set("last_name")} className="luxury-input w-full px-3 py-2 rounded-lg border text-sm outline-none" />
                            </Field>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label={t("common.phone")} htmlFor="pro-phone">
                                <input id="pro-phone" data-testid="professional-phone-input" value={form.phone} onChange={set("phone")} className="luxury-input w-full px-3 py-2 rounded-lg border text-sm outline-none" />
                            </Field>
                            <Field label={t("common.specialty")} htmlFor="pro-specialty">
                                <input id="pro-specialty" data-testid="professional-specialty-input" value={form.specialty} onChange={set("specialty")} className="luxury-input w-full px-3 py-2 rounded-lg border text-sm outline-none" />
                            </Field>
                        </div>
                        <Field label={t("common.email")} error={formErrors.email} htmlFor="pro-email">
                            <input id="pro-email" data-testid="professional-email-input" type="email" value={form.email} onChange={set("email")} className="luxury-input w-full px-3 py-2 rounded-lg border text-sm outline-none" />
                        </Field>
                        <Field label={t("common.notes")} htmlFor="pro-notes">
                            <textarea id="pro-notes" data-testid="professional-notes-input" rows={3} value={form.notes} onChange={set("notes")} className="luxury-input w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none" />
                        </Field>
                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" data-testid="professional-form-cancel" onClick={() => setFormOpen(false)} className="px-4 py-2 rounded-lg text-sm border border-[#3A311D] text-zinc-300 hover:bg-[#1C1C24] transition-colors">
                                {t("common.cancel")}
                            </button>
                            <button type="submit" data-testid="professional-form-submit" className="gold-btn px-5 py-2 rounded-lg text-sm">
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
                testId="professional-save-confirm"
            />
            <ConfirmDialog
                open={!!pendingToggle}
                onOpenChange={() => setPendingToggle(null)}
                onConfirm={doToggle}
                title={t("confirm.deactivateTitle")}
                description={t("confirm.deactivateMessage")}
                testId="professional-toggle-confirm"
            />
            <ConfirmDialog
                open={!!pendingDelete}
                onOpenChange={() => setPendingDelete(null)}
                onConfirm={doDelete}
                title={t("confirm.deleteTitle")}
                description={t("confirm.deleteMessage")}
                danger
                testId="professional-delete-confirm"
            />
        </div>
    );
}
