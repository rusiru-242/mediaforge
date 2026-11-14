"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { api } from "@/services/apiClient";
import {
  DownloadCloud,
  Video,
  Music,
  Image as ImageIcon,
  Layers,
  Sparkles,
  Menu,
  X,
  Plus,
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [backendUp, setBackendUp] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;
    api
      .getHealth()
      .then((res) => {
        if (isMounted) setBackendUp(res.status === "UP");
      })
      .catch(() => {
        if (isMounted) setBackendUp(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const navLinks = [
    { name: "Overview", href: "/", icon: Sparkles },
    { name: "Downloader", href: "/downloader", icon: DownloadCloud },
    { name: "Video Editor", href: "/converter/video", icon: Video },
    { name: "Audio Editor", href: "/converter/audio", icon: Music },
    { name: "Image Editor", href: "/converter/image", icon: ImageIcon },
    { name: "Batch Converter", href: "/converter/batch", icon: Layers },
  ];

  const isActive = (href: string) => {
    if (href === "/" && pathname === "/") return true;
    if (href !== "/" && pathname.startsWith(href)) return true;
    return false;
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-20 bg-surface-container-lowest/90 backdrop-blur-xl border-b border-outline-variant/30 shadow-[0_1px_8px_rgba(0,0,0,0.04)] dark:bg-slate-900/90 dark:border-slate-800 transition-colors">
      <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group focus:outline-none">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-primary-container flex items-center justify-center text-white shadow-md shadow-primary/25 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="font-bold text-xl tracking-tight text-on-surface dark:text-white flex items-center gap-2">
              MediaForge
              <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant text-[11px] font-semibold uppercase tracking-wider dark:bg-primary-container dark:text-white">
                Pro
              </span>
            </span>
          </Link>

          {/* Stitch Pill Rail Navigation */}
          <nav className="hidden xl:flex items-center p-1 bg-surface-container-low rounded-full dark:bg-slate-800/80">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`px-4 py-2 rounded-full text-xs font-semibold tracking-tight transition-all ${
                    active
                      ? "bg-surface-container-lowest text-on-surface shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:bg-slate-900 dark:text-white"
                      : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/60 dark:text-slate-400 dark:hover:text-slate-100"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Telemetry Indicator */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-low border border-outline-variant/30 text-on-surface-variant text-xs font-mono dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
            <span
              className={`w-2 h-2 rounded-full ${
                backendUp === true
                  ? "bg-emerald-500 animate-pulse"
                  : backendUp === false
                  ? "bg-rose-500"
                  : "bg-amber-400 animate-ping"
              }`}
            />
            <span>{backendUp === true ? "Engine Online · Port 8081" : backendUp === false ? "Backend Offline" : "Connecting..."}</span>
          </div>

          <ThemeToggle />

          {/* New Import CTA */}
          <Link href="/converter/video">
            <button
              type="button"
              className="flex items-center gap-1.5 px-4 h-10 rounded-full bg-primary-container text-on-primary text-xs font-semibold hover:bg-primary transition-all shadow-[0_2px_8px_rgba(103,80,245,0.25)] hover:scale-[1.02] active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Import</span>
            </button>
          </Link>

          {/* Mobile Menu Hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden flex items-center justify-center w-10 h-10 rounded-full bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors dark:bg-slate-800 dark:text-slate-300"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-surface-container-lowest/95 backdrop-blur-xl border-b border-outline-variant/30 px-4 pt-3 pb-6 shadow-xl dark:bg-slate-900/95 dark:border-slate-800 animate-in slide-in-from-top-4 duration-200">
          <nav className="flex flex-col gap-1.5">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.href);
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                    active
                      ? "bg-primary-container text-on-primary shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
