import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import api, { apiErrorKey } from "@/api";
import { useLanguage } from "@/i18n/LanguageContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Field } from "@/components/Field";

export default function Settings() {
    const { t } = useLanguage();
    const [form, setForm] = useState(null);
    const [loading, setLoading] = useState(true);
    const pendingSaveRef = useRef(null);
    const [confirmOpen, setConfirmOpen] = useState(false);

    useEffect(() => {
        api.get("/settings")
            .then(({ data }) => setForm(data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

    const handleSubmit = (e) => {
        e.preventDefault();
        pendingSaveRef.current = {
            salon_name: form.salon_name,
            phone: form.phone || "",
            email: form.email || "",
            address: form.address || "",
            opening_time: form.opening_time,
            closing_time: form.closing_time,
        };
        setConfirmOpen(true);
    };

    const doSave = async () => {
        setConfirmOpen(false);
        try {
            const { data } = await api.put("/settings", pendingSaveRef.current);
            setForm(data);
            toast.success(t("settings.saved"));
        } catch (err) {
            toast.error(t(`errors.${apiErrorKey(err)}`));
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-24" data-testid="settings-loading">
                <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-slide max-w-2xl" data-testid="settings-page">
            <div>
                <h1 className="font-serif-display text-3xl sm:text-4xl text-white font-semibold">
                    {t("settings.title")}
                </h1>
                <p className="text-sm text-zinc-400 mt-1">{t("settings.subtitle")}</p>
            </div>

            <section className="luxury-card p-6 space-y-4">
                <h2 className="font-serif-display text-lg text-[#E5C158] font-semibold">
                    {t("settings.languageSection")}
                </h2>
                <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-300">{t("settings.language")}</span>
                    <LanguageSelector />
                </div>
            </section>

            {form && (
                <section className="luxury-card p-6">
                    <h2 className="font-serif-display text-lg text-[#E5C158] font-semibold mb-4">
                        {t("settings.salonInfo")}
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Field label={t("settings.salonName")} htmlFor="setting-name">
                            <input id="setting-name" data-testid="settings-name-input" value={form.salon_name} onChange={set("salon_name")} className="luxury-input w-full px-3 py-2 rounded-lg border text-sm outline-none" />
                        </Field>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label={t("common.phone")} htmlFor="setting-phone">
                                <input id="setting-phone" data-testid="settings-phone-input" value={form.phone || ""} onChange={set("phone")} className="luxury-input w-full px-3 py-2 rounded-lg border text-sm outline-none" />
                            </Field>
                            <Field label={t("common.email")} htmlFor="setting-email">
                                <input id="setting-email" data-testid="settings-email-input" type="email" value={form.email || ""} onChange={set("email")} className="luxury-input w-full px-3 py-2 rounded-lg border text-sm outline-none" />
                            </Field>
                        </div>
                        <Field label={t("settings.address")} htmlFor="setting-address">
                            <input id="setting-address" data-testid="settings-address-input" value={form.address || ""} onChange={set("address")} className="luxury-input w-full px-3 py-2 rounded-lg border text-sm outline-none" />
                        </Field>
                        <div>
                            <p className="text-sm font-medium text-zinc-300 mb-2">{t("settings.openingHours")}</p>
                            <div className="grid grid-cols-2 gap-4">
                                <Field label={t("settings.opening")} htmlFor="setting-open">
                                    <input id="setting-open" data-testid="settings-opening-input" type="time" value={form.opening_time} onChange={set("opening_time")} className="luxury-input w-full px-3 py-2 rounded-lg border text-sm outline-none [color-scheme:dark]" />
                                </Field>
                                <Field label={t("settings.closing")} htmlFor="setting-close">
                                    <input id="setting-close" data-testid="settings-closing-input" type="time" value={form.closing_time} onChange={set("closing_time")} className="luxury-input w-full px-3 py-2 rounded-lg border text-sm outline-none [color-scheme:dark]" />
                                </Field>
                            </div>
                        </div>
                        <div className="flex justify-end pt-2">
                            <button type="submit" data-testid="settings-save-btn" className="gold-btn px-5 py-2 rounded-lg text-sm">
                                {t("common.save")}
                            </button>
                        </div>
                    </form>
                </section>
            )}

            <p className="text-xs text-zinc-600">{t("settings.comingSoon")}</p>

            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                onConfirm={doSave}
                title={t("confirm.saveTitle")}
                description={t("confirm.saveMessage")}
                testId="settings-save-confirm"
            />
        </div>
    );
}
