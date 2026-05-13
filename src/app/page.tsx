"use client";

import { useActionState, useState } from "react";
import { loginWithPassword } from "@/lib/actions";
import { Lock, FileText, ArrowRight } from "lucide-react";

export default function Home() {
  const [state, formAction, isPending] = useActionState(loginWithPassword, null);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-slate-50 dark:bg-zinc-950">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-violet-500/10 blur-[100px] pointer-events-none" />
      
      <div className="w-full max-w-md animate-fade-in-up z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 shadow-xl shadow-blue-500/20 mb-6">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 text-slate-900 dark:text-white">
            JD Resume Builder
          </h1>
          <p className="text-slate-500 dark:text-zinc-400">
            AI-powered resume tailoring for specific job descriptions.
          </p>
        </div>

        <div className="glass-card rounded-2xl p-8 border border-slate-200 dark:border-zinc-800 shadow-xl">
          <form action={formAction} className="space-y-6">
            <div>
              <label 
                htmlFor="password" 
                className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-2 flex items-center gap-2"
              >
                <Lock className="w-4 h-4 text-slate-400" />
                Access Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                required
                placeholder="Enter site password"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all dark:text-white"
              />
              {state?.error && (
                <p className="mt-2 text-sm text-red-500 flex items-center gap-1 animate-in">
                  <span>•</span> {state.error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group"
            >
              {isPending ? (
                "Authenticating..."
              ) : (
                <>
                  Enter Application
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>
        
        <p className="text-center mt-8 text-sm text-slate-400 dark:text-zinc-500">
          Private personal tool for optimized applications
        </p>
      </div>
    </main>
  );
}
