import { Languages } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/i18n/LanguageContext";

const LANGS = [
    { code: "pt-BR", short: "PT", label: "Português (BR)" },
    { code: "es", short: "ES", label: "Español" },
    { code: "en", short: "EN", label: "English" },
];

export function LanguageSelector({ compact = true }) {
    const { language, changeLanguage } = useLanguage();
    const current = LANGS.find((l) => l.code === language) || LANGS[0];
    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                data-testid="language-selector"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#3A311D] text-sm text-zinc-300 hover:text-[#E5C158] hover:border-[#D4AF37]/50 transition-colors duration-200 bg-[#0E0E12]"
            >
                <Languages className="w-4 h-4 text-[#D4AF37]" />
                <span className="font-medium">{current.short}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                className="bg-[#14141A] border-[#3A311D] text-zinc-200"
            >
                {LANGS.map((lang) => (
                    <DropdownMenuItem
                        key={lang.code}
                        data-testid={`language-option-${lang.code}`}
                        onClick={() => changeLanguage(lang.code)}
                        className={`cursor-pointer hover:bg-[#D4AF37]/10 hover:text-[#E5C158] focus:bg-[#D4AF37]/10 focus:text-[#E5C158] ${
                            lang.code === language ? "text-[#E5C158] font-semibold" : ""
                        }`}
                    >
                        {lang.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
