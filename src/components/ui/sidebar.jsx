/* eslint-disable react-refresh/only-export-components -- primitive file intentionally exports both components and the useSidebar hook, same as shadcn/ui's own sidebar.tsx */
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import { PanelLeftIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// Lean JSX port of the shadcn/ui sidebar pattern (https://ui.shadcn.com/docs/components/base/sidebar)
// scoped to what this app needs: left side, "sidebar" variant, "icon" collapsible on desktop,
// slide-over drawer on mobile. No Radix dependency.

const SIDEBAR_STORAGE_KEY = 'sidebar_state';
const SIDEBAR_WIDTH = '13rem';
const SIDEBAR_WIDTH_ICON = '4rem';
const SIDEBAR_WIDTH_MOBILE = '16rem';
const SIDEBAR_KEYBOARD_SHORTCUT = 'b';
const MOBILE_BREAKPOINT = 768;

const SidebarContext = createContext(null);

export function useSidebar() {
    const context = useContext(SidebarContext);
    if (!context) {
        throw new Error('useSidebar must be used within a <SidebarProvider>.');
    }
    return context;
}

// Local-only context: whether the sidebar should *look* expanded right now
// (persisted "open" state OR a transient desktop hover). Only Sidebar's own
// children need this; the trigger/keyboard shortcut care about real `open`.
const SidebarVisualContext = createContext(true);
const useSidebarVisual = () => useContext(SidebarVisualContext);

export function SidebarProvider({
    defaultOpen = true,
    open: openProp,
    onOpenChange: setOpenProp,
    className,
    style,
    children,
    ...props
}) {
    const [isMobile, setIsMobile] = useState(false);
    const [openMobile, setOpenMobile] = useState(false);

    useEffect(() => {
        const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
        const onChange = () => setIsMobile(mql.matches);
        onChange();
        mql.addEventListener('change', onChange);
        return () => mql.removeEventListener('change', onChange);
    }, []);

    const [openState, setOpenState] = useState(() => {
        if (typeof window === 'undefined') return defaultOpen;
        const stored = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
        return stored !== null ? stored === 'true' : defaultOpen;
    });
    const open = openProp ?? openState;

    const setOpen = useCallback(
        (value) => {
            const next = typeof value === 'function' ? value(open) : value;
            if (setOpenProp) {
                setOpenProp(next);
            } else {
                setOpenState(next);
            }
            window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
        },
        [setOpenProp, open]
    );

    const toggleSidebar = useCallback(() => {
        return isMobile ? setOpenMobile((v) => !v) : setOpen((v) => !v);
    }, [isMobile, setOpen]);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                toggleSidebar();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [toggleSidebar]);

    const state = open ? 'expanded' : 'collapsed';

    const value = useMemo(
        () => ({ state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar }),
        [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar]
    );

    return (
        <SidebarContext.Provider value={value}>
            <div
                data-slot="sidebar-wrapper"
                style={{ '--sidebar-width': SIDEBAR_WIDTH, '--sidebar-width-icon': SIDEBAR_WIDTH_ICON, ...style }}
                className={cn('flex min-h-svh w-full', className)}
                {...props}
            >
                {children}
            </div>
        </SidebarContext.Provider>
    );
}

export function Sidebar({ collapsible = 'icon', className, children, ...props }) {
    const { isMobile, state, openMobile, setOpenMobile } = useSidebar();
    const [hovered, setHovered] = useState(false);

    if (collapsible === 'none') {
        return (
            <div
                data-slot="sidebar"
                className={cn('flex h-full w-[13rem] flex-col bg-white text-gray-900 dark:bg-[#1E1E1E] dark:text-white', className)}
                {...props}
            >
                {children}
            </div>
        );
    }

    if (isMobile) {
        return (
            <SidebarVisualContext.Provider value={true}>
                {openMobile && (
                    <div
                        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
                        onClick={() => setOpenMobile(false)}
                    />
                )}
                <aside
                    data-slot="sidebar"
                    data-state={openMobile ? 'open' : 'closed'}
                    className={cn(
                        'fixed inset-y-0 left-0 z-50 flex h-full w-[16rem] flex-col bg-white text-gray-900 shadow-xl transition-transform duration-300 ease-in-out dark:bg-[#1E1E1E] dark:text-white md:hidden',
                        openMobile ? 'translate-x-0' : '-translate-x-full',
                        className
                    )}
                    {...props}
                >
                    {children}
                </aside>
            </SidebarVisualContext.Provider>
        );
    }

    const expanded = state === 'expanded';
    const visuallyExpanded = collapsible === 'icon' ? expanded || hovered : expanded;

    return (
        <SidebarVisualContext.Provider value={visuallyExpanded}>
            {/* Spacer so the fixed sidebar doesn't overlap main content */}
            <div
                data-slot="sidebar-gap"
                className={cn(
                    'hidden flex-shrink-0 transition-[width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none md:block',
                    collapsible === 'icon' ? 'w-16' : expanded ? 'w-[13rem]' : 'w-0'
                )}
            />
            <aside
                data-slot="sidebar"
                data-state={state}
                onMouseEnter={() => collapsible === 'icon' && setHovered(true)}
                onMouseLeave={() => collapsible === 'icon' && setHovered(false)}
                className={cn(
                    'fixed inset-y-0 left-0 z-30 hidden h-full flex-col border-r border-gray-200 bg-white text-gray-900 md:flex dark:border-white/5 dark:bg-[#1E1E1E] dark:text-white',
                    'will-change-[width] transition-[width,box-shadow,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none',
                    visuallyExpanded ? 'w-[13rem] shadow-2xl' : 'w-16 shadow-none',
                    collapsible === 'offcanvas' && !expanded && '-translate-x-full',
                    className
                )}
                {...props}
            >
                {children}
            </aside>
        </SidebarVisualContext.Provider>
    );
}

export function SidebarTrigger({ className, onClick, ...props }) {
    const { toggleSidebar } = useSidebar();
    return (
        <button
            data-slot="sidebar-trigger"
            className={cn('inline-flex items-center justify-center rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-white/5', className)}
            onClick={(event) => {
                onClick?.(event);
                toggleSidebar();
            }}
            {...props}
        >
            <PanelLeftIcon size={20} />
            <span className="sr-only">Toggle Sidebar</span>
        </button>
    );
}

export function SidebarInset({ className, ...props }) {
    return <div data-slot="sidebar-inset" className={cn('flex flex-1 flex-col overflow-hidden', className)} {...props} />;
}

export function SidebarHeader({ className, ...props }) {
    return <div data-slot="sidebar-header" className={cn('flex-shrink-0 border-b border-inherit', className)} {...props} />;
}

export function SidebarFooter({ className, ...props }) {
    return <div data-slot="sidebar-footer" className={cn('flex-shrink-0 border-t border-inherit', className)} {...props} />;
}

export function SidebarContent({ className, ...props }) {
    return (
        <div
            data-slot="sidebar-content"
            className={cn('flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar', className)}
            {...props}
        />
    );
}

export function SidebarGroup({ className, ...props }) {
    return <div data-slot="sidebar-group" className={cn('mb-4', className)} {...props} />;
}

export function SidebarGroupLabel({ className, children, ...props }) {
    const expanded = useSidebarVisual();
    return (
        // Balandligi ikkala holatda ham bir xil (h-6) — shuning uchun quyidagi
        // ikonkalar yig'ilish/ochilishda vertikal siljimaydi. Ilgari bu yer
        // `max-h-0` ga qisqarardi va butun ro'yxat yuqoriga sakrab ketardi.
        // Yig'ilganda matn o'rniga ingichka ajratuvchi chiziq ko'rinadi.
        <div
            data-slot="sidebar-group-label"
            className={cn('relative flex h-6 items-center px-2.5 mb-1.5', className)}
            {...props}
        >
            <span
                className={cn(
                    'text-[9px] font-bold uppercase tracking-widest whitespace-nowrap text-gray-400 transition-opacity duration-200 dark:text-gray-600',
                    expanded ? 'opacity-100 delay-100' : 'opacity-0'
                )}
            >
                {children}
            </span>
            <span
                aria-hidden="true"
                className={cn(
                    'pointer-events-none absolute inset-x-2.5 top-1/2 h-px bg-gray-200 transition-opacity duration-200 dark:bg-white/10',
                    expanded ? 'opacity-0' : 'opacity-100 delay-100'
                )}
            />
        </div>
    );
}

export function SidebarMenu({ className, ...props }) {
    return <div data-slot="sidebar-menu" className={cn('space-y-0.5', className)} {...props} />;
}

export function SidebarMenuItem({ className, ...props }) {
    return <div data-slot="sidebar-menu-item" className={className} {...props} />;
}

export function SidebarMenuButton({ asChild = false, isActive = false, tooltip, className, children, ...props }) {
    const expanded = useSidebarVisual();
    // Qat'iy `h-9`: yig'ilgan holatda qator balandligini ikonka (18px), ochilganda
    // esa matn qatori (~20px) belgilardi — natijada har bir element bir-ikki
    // piksel sakrardi. Endi ikkalasida ham bir xil.
    const buttonClassName = cn(
        'flex h-9 items-center gap-3 px-2.5 rounded-xl font-semibold text-[13px] transition-colors duration-200',
        isActive
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20 dark:bg-blue-600'
            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white',
        className
    );
    const title = !expanded ? tooltip : undefined;

    if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children, {
            className: cn(buttonClassName, children.props.className),
            title,
            ...props,
        });
    }

    return (
        <button data-slot="sidebar-menu-button" className={buttonClassName} title={title} {...props}>
            {children}
        </button>
    );
}

export function SidebarMenuLabel({ className, children, ...props }) {
    const expanded = useSidebarVisual();
    return (
        // Matn kengligi bilan birga so'nadi — `opacity` panel kengayishidan
        // biroz kechikib boshlanadi, shunda harflar tor joyga tiqilib turmaydi.
        <span
            className={cn(
                'overflow-hidden whitespace-nowrap leading-none transition-[max-width,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none',
                expanded ? 'max-w-[160px] opacity-100 delay-75' : 'max-w-0 opacity-0',
                className
            )}
            {...props}
        >
            {children}
        </span>
    );
}
