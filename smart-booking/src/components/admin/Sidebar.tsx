"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/admin", label: "Resumen", icon: "M3 12l9-8 9 8M5 10v10h14V10" },
  { href: "/admin/bookings", label: "Reservas", icon: "M7 3v3m10-3v3M4 8h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" },
  { href: "/admin/availability", label: "Disponibilidad", icon: "M12 7v5l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" },
  { href: "/admin/payments", label: "Pagos", icon: "M3 7h18v10H3zM3 10h18M7 14h3" },
  { href: "/admin/integrations", label: "Integraciones", icon: "M9 7H6a3 3 0 000 6h3m6-6h3a3 3 0 010 6h-3m-7-3h8" },
  { href: "/admin/settings", label: "Configuración", icon: "M12 15a3 3 0 100-6 3 3 0 000 6zm7.4-3a7.4 7.4 0 00-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 00-2-1.2L14.5 3h-5l-.4 2.6a7 7 0 00-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 000 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 002 1.2l.4 2.6h5l.4-2.6a7 7 0 002-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z" },
];

export function Sidebar({ adminName, logout }: { adminName: string; logout: () => Promise<void> }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  return (
    <>
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between bg-ink px-4 lg:hidden">
        <span className="font-display text-sm font-bold tracking-[0.16em] text-white">IUS DARE</span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="admin-nav"
          className="rounded-md p-2 text-white hover:bg-white/10"
        >
          <span className="sr-only">{open ? "Cerrar menú" : "Abrir menú"}</span>
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" d={open ? "M6 6l12 12M18 6L6 18" : "M4 7h16M4 12h16M4 17h16"} />
          </svg>
        </button>
      </header>
      <aside
        id="admin-nav"
        className={cn(
          "fixed inset-y-0 left-0 z-30 w-64 flex-col bg-ink pt-14 text-white lg:flex lg:pt-0",
          open ? "flex" : "hidden",
        )}
      >
        <div className="hidden px-6 py-6 lg:block">
          <p className="font-display text-lg font-bold tracking-[0.16em]">IUS DARE</p>
          <p className="eyebrow mt-1 text-gold-light">Smart Booking</p>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4 lg:py-0" aria-label="Panel">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive(item.href) ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white",
              )}
            >
              <svg className={cn("h-5 w-5", isActive(item.href) ? "text-gold-light" : "")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/10 px-6 py-4">
          <p className="truncate text-sm text-white/80">{adminName}</p>
          <form action={logout}>
            <button type="submit" className="mt-1 text-xs font-medium text-gold-light hover:underline">
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
