export function Field({ label, error, children, htmlFor, optional }) {
    return (
        <div className="space-y-1.5">
            <label htmlFor={htmlFor} className="text-sm font-medium text-zinc-300">
                {label}
                {optional && (
                    <span className="ml-1 text-xs text-zinc-500">({optional})</span>
                )}
            </label>
            {children}
            {error && (
                <p data-testid={`${htmlFor}-error`} className="text-xs text-red-400">
                    {error}
                </p>
            )}
        </div>
    );
}
