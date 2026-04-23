import { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';

export interface SpeedDialItem {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
}

interface SpeedDialProps {
    items: SpeedDialItem[];
}

export function SpeedDial({ items }: SpeedDialProps) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        function onOutsideClick(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', onOutsideClick);
        return () => document.removeEventListener('mousedown', onOutsideClick);
    }, [open]);

    return (
        <div ref={containerRef} className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3 md:hidden">
            {/* Invisible backdrop to close on outside tap */}
            {open && (
                <button
                    type="button"
                    aria-hidden="true"
                    tabIndex={-1}
                    className="fixed inset-0 -z-10 cursor-default"
                    onClick={() => setOpen(false)}
                />
            )}

            {/* Action items — item[0] is at top (furthest from FAB) */}
            {items.map((item, i) => (
                <div
                    key={i}
                    style={{
                        opacity: open ? 1 : 0,
                        transform: open ? 'translateY(0) scale(1)' : 'translateY(28px) scale(0.6)',
                        transition: 'opacity 240ms ease, transform 360ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                        transitionDelay: open
                            ? `${(items.length - 1 - i) * 40}ms`
                            : `${i * 20}ms`,
                        pointerEvents: open ? 'auto' : 'none',
                    }}
                >
                    <button
                        type="button"
                        className="flex items-center gap-3 rounded-full bg-primary px-4 py-2 text-primary-foreground shadow-md transition-transform duration-150 active:scale-90"
                        onClick={() => {
                            item.onClick();
                            setOpen(false);
                        }}
                        aria-label={item.label}
                    >
                        <span className="flex h-6 w-6 items-center justify-center">
                            {item.icon}
                        </span>
                        <span className="whitespace-nowrap text-sm font-medium">{item.label}</span>
                    </button>
                </div>
            ))}

            {/* Main FAB toggle */}
            <button
                type="button"
                className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
                onClick={() => setOpen((v) => !v)}
                aria-label={open ? 'Close quick actions' : 'Open quick actions'}
                aria-expanded={open ? 'true' : 'false'}
            >
                <span
                    style={{
                        display: 'inline-flex',
                        transition: 'transform 340ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                        transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
                    }}
                >
                    <Plus size={24} />
                </span>
            </button>
        </div>
    );
}
