import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLanguage } from "@/i18n/LanguageContext";

export function ConfirmDialog({
    open,
    onOpenChange,
    onConfirm,
    title,
    description,
    danger = false,
    confirmText,
    testId = "confirm-dialog",
}) {
    const { t } = useLanguage();
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent
                data-testid={testId}
                className="bg-[#14141A] border border-[#3A311D] text-zinc-100"
            >
                <AlertDialogHeader>
                    <AlertDialogTitle className="font-serif-display text-xl text-[#E5C158]">
                        {title}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-zinc-400">
                        {description}
                        {danger && (
                            <span className="block mt-2 text-red-400 text-sm">
                                {t("confirm.irreversible")}
                            </span>
                        )}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel
                        data-testid={`${testId}-cancel`}
                        className="bg-transparent border-[#3A311D] text-zinc-300 hover:bg-[#1C1C24] hover:text-white"
                    >
                        {t("common.cancel")}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        data-testid={`${testId}-confirm`}
                        onClick={onConfirm}
                        className={
                            danger
                                ? "bg-red-600 text-white hover:bg-red-500"
                                : "gold-btn"
                        }
                    >
                        {confirmText || (danger ? t("common.delete") : t("common.confirm"))}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
