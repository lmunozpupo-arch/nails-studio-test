import { useState } from "react";
import { CalendarDays, Clock3, LogOut, Scissors, Sparkles, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLanguage } from "@/i18n/LanguageContext";

const serviceCatalog = [
    { key: "manicure", duration: "60 min", price: "R$ 45" },
    { key: "nailArt", duration: "90 min", price: "R$ 80" },
    { key: "extension", duration: "120 min", price: "R$ 150" },
];
const appointmentTimes = ["09:00", "11:00", "14:00", "16:00"];

export default function ClientPortal() {
    const { user, logout } = useAuth();
    const { t } = useLanguage();
    const [bookingOpen, setBookingOpen] = useState(false);
    const [requestSent, setRequestSent] = useState(false);
    const [bookingError, setBookingError] = useState("");
    const [booking, setBooking] = useState({ service: "manicure", date: "", time: "" });
    const existingRequests = JSON.parse(localStorage.getItem("salonapp_client_requests") || "[]");
    const availableTimes = appointmentTimes.filter((time) => !existingRequests.some((request) => request.date === booking.date && request.time === time && ["pending", "confirmed"].includes(request.status)));

    const updateBooking = (field) => (event) => setBooking((current) => ({ ...current, [field]: event.target.value }));
    const submitBooking = (event) => {
        event.preventDefault();
        const requests = JSON.parse(localStorage.getItem("salonapp_client_requests") || "[]");
        const occupied = requests.some((request) => request.date === booking.date && request.time === booking.time && ["pending", "confirmed"].includes(request.status));
        if (occupied) {
            setBookingError(t("clientPortal.timeUnavailable"));
            return;
        }
        requests.push({ ...booking, client_id: user?.user_id, client_name: user?.name, status: "pending", created_at: new Date().toISOString() });
        localStorage.setItem("salonapp_client_requests", JSON.stringify(requests));
        setBookingError("");
        setRequestSent(true);
    };

    return (
        <div className="min-h-screen bg-[#0A0A0C] text-zinc-100">
            <header className="border-b border-[#3A311D]/70 bg-[#0E0E12]/90 px-5 py-4 sm:px-10">
                <div className="mx-auto flex max-w-6xl items-center justify-between">
                    <div>
                        <p className="font-serif-display text-xl gold-text font-semibold">Nais&apos;l Designer</p>
                        <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">{t("clientPortal.area")}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <LanguageSelector />
                        <button type="button" onClick={logout} className="flex items-center gap-2 rounded-lg border border-[#3A311D] px-3 py-2 text-xs text-zinc-300 hover:border-red-500/40 hover:text-red-300">
                            <LogOut className="h-4 w-4" /> {t("clientPortal.signOut")}
                        </button>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-6xl space-y-8 px-5 py-8 sm:px-10">
                <section>
                    <p className="text-sm text-[#D4AF37]">{t("clientPortal.greeting", { name: user?.name?.split(" ")[0] })}</p>
                    <h1 className="mt-1 font-serif-display text-3xl text-white sm:text-4xl">{t("clientPortal.title")}</h1>
                    <p className="mt-2 max-w-xl text-sm text-zinc-400">{t("clientPortal.subtitle")}</p>
                </section>

                <section className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
                    <div className="luxury-card overflow-hidden p-6 sm:p-8">
                        <div className="flex items-center gap-3 text-[#D4AF37]"><CalendarDays className="h-5 w-5" /><span className="text-xs uppercase tracking-[0.2em]">{t("clientPortal.nextAppointment")}</span></div>
                        <h2 className="mt-6 font-serif-display text-2xl text-white">{t("clientPortal.appointmentTitle")}</h2>
                        <div className="mt-5 flex flex-wrap gap-4 text-sm text-zinc-300"><span className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[#D4AF37]" />{t("clientPortal.appointmentDate")}</span><span className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-[#D4AF37]" />{t("clientPortal.appointmentTime")}</span></div>
                        <button type="button" onClick={() => setBookingOpen(true)} className="gold-btn mt-7 rounded-lg px-5 py-2.5 text-sm">{t("clientPortal.details")}</button>
                    </div>
                    <div className="rounded-xl border border-[#3A311D] bg-[#14141A] p-6 sm:p-8"><Sparkles className="h-6 w-6 text-[#D4AF37]" /><h2 className="mt-5 font-serif-display text-2xl text-white">{t("clientPortal.renewTitle")}</h2><p className="mt-2 text-sm leading-6 text-zinc-400">{t("clientPortal.renewText")}</p><button type="button" onClick={() => { setRequestSent(false); setBookingOpen(true); }} className="mt-6 flex items-center gap-2 rounded-lg border border-[#D4AF37]/50 px-5 py-2.5 text-sm text-[#E5C158] hover:bg-[#D4AF37]/10"><Scissors className="h-4 w-4" />{t("clientPortal.bookService")}</button></div>
                </section>

                <section><div className="mb-4 flex items-center justify-between"><h2 className="font-serif-display text-2xl text-white">{t("clientPortal.favorites")}</h2><span className="text-xs text-zinc-500">{t("clientPortal.forYou")}</span></div><div className="grid gap-4 md:grid-cols-3">{serviceCatalog.map((service) => <article key={service.key} className="rounded-xl border border-[#3A311D] bg-[#14141A] p-5"><div className="flex items-center justify-between"><Scissors className="h-5 w-5 text-[#D4AF37]" /><span className="text-sm font-semibold text-[#E5C158]">{service.price}</span></div><h3 className="mt-5 text-sm font-medium text-white">{t(`clientPortal.services.${service.key}`)}</h3><p className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500"><Clock3 className="h-3.5 w-3.5" />{service.duration}</p></article>)}</div></section>
            </main>

            {bookingOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-sm">
                <div className="w-full max-w-md rounded-xl border border-[#3A311D] bg-[#14141A] p-6 shadow-2xl sm:p-8">
                    <div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.2em] text-[#D4AF37]">{t("clientPortal.requestLabel")}</p><h2 className="mt-2 font-serif-display text-2xl text-white">{t("clientPortal.requestAppointment")}</h2></div><button type="button" onClick={() => setBookingOpen(false)} aria-label={t("clientPortal.close")} className="text-zinc-400 hover:text-white"><X className="h-5 w-5" /></button></div>
                    {requestSent ? <div className="py-8 text-center"><CalendarDays className="mx-auto h-10 w-10 text-[#D4AF37]" /><p className="mt-4 text-sm leading-6 text-zinc-300">{t("clientPortal.requestSent")}</p><button type="button" onClick={() => setBookingOpen(false)} className="gold-btn mt-6 rounded-lg px-5 py-2.5 text-sm">{t("clientPortal.close")}</button></div> : <form onSubmit={submitBooking} className="mt-6 space-y-4">
                        <label className="block text-sm text-zinc-300">{t("clientPortal.chooseService")}<select value={booking.service} onChange={updateBooking("service")} className="luxury-input mt-2 w-full rounded-lg border px-3 py-2.5 text-sm"><option value="manicure">{t("clientPortal.services.manicure")}</option><option value="nailArt">{t("clientPortal.services.nailArt")}</option><option value="extension">{t("clientPortal.services.extension")}</option></select></label>
                        <label className="block text-sm text-zinc-300">{t("clientPortal.selectDate")}<input required type="date" min={new Date().toISOString().split("T")[0]} value={booking.date} onChange={(event) => { setBookingError(""); setBooking((current) => ({ ...current, date: event.target.value, time: "" })); }} className="luxury-input mt-2 w-full rounded-lg border px-3 py-2.5 text-sm [color-scheme:dark]" /></label>
                        <label className="block text-sm text-zinc-300">{t("clientPortal.selectTime")}<select required value={booking.time} onChange={(event) => { setBookingError(""); updateBooking("time")(event); }} className="luxury-input mt-2 w-full rounded-lg border px-3 py-2.5 text-sm"><option value="">{availableTimes.length ? t("clientPortal.selectTimePlaceholder") : t("clientPortal.noAvailableTimes")}</option>{availableTimes.map((time) => <option key={time}>{time}</option>)}</select></label>
                        {bookingError && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{bookingError}</p>}
                        <button type="submit" className="gold-btn w-full rounded-lg py-2.5 text-sm">{t("clientPortal.sendRequest")}</button>
                    </form>}
                </div>
            </div>}
        </div>
    );
}