"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, FilePlus2, History, LogOut, Briefcase, Users, AlertTriangle } from "lucide-react";
import { logout } from "@/lib/actions";
import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/lib/config";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isLinkedInLoggedIn, setIsLinkedInLoggedIn] = useState<boolean>(true);

  useEffect(() => {
    const checkLinkedInStatus = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/linkedin-status`);
        if (res.ok) {
          const data = await res.json();
          setIsLinkedInLoggedIn(data.logged_in);
        }
      } catch (err) {
        console.error("Failed to check LinkedIn status:", err);
      }
    };

    checkLinkedInStatus();
    const interval = setInterval(checkLinkedInStatus, 15000); // Check status every 15s
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { name: "Generate", href: "/dashboard", icon: FilePlus2 },
    { name: "Base Resume", href: "/dashboard/base-resume", icon: FileText },
    { name: "History", href: "/dashboard/history", icon: History },
    { name: "Scraped Leads", href: "/dashboard/leads", icon: Users },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-zinc-950">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col border-r border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 z-10">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl text-white">
            <Briefcase className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg text-slate-900 dark:text-white">JD Builder</span>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 font-medium"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-blue-600 dark:text-blue-400" : ""}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* LinkedIn Status Warning */}
        {!isLinkedInLoggedIn && (
          <div className="mx-4 my-2 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl flex items-start gap-2.5 animate-pulse">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                LinkedIn Logged Out
              </p>
              <p className="text-[10px] text-amber-600 dark:text-amber-500 mt-1 leading-normal">
                Run <code className="bg-amber-100 dark:bg-amber-900/50 px-1 py-0.5 rounded font-mono text-[9px]">python scraper.py</code> in the backend folder to log back in.
              </p>
            </div>
          </div>
        )}

        <div className="p-4 border-t border-slate-200 dark:border-zinc-800">
          <form action={logout}>
            <button
              type="submit"
              className="flex items-center gap-3 w-full px-4 py-3 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 rounded-xl transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none" />
        <div className="p-8 max-w-6xl mx-auto min-h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
