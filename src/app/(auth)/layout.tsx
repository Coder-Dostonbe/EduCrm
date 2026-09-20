"use client";

import * as React from "react";
import { GraduationCap, BarChart3, CalendarDays, Users } from "lucide-react";
import { motion } from "framer-motion";
import { useT } from "@/lib/i18n";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = useT();

  return (
    <div className="grid min-h-svh lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[oklch(0.205_0.045_270)] p-10 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(60% 50% at 20% 10%, oklch(0.488 0.217 273.5 / 0.55) 0%, transparent 70%), radial-gradient(50% 40% at 90% 90%, oklch(0.588 0.158 241.9 / 0.35) 0%, transparent 70%)",
          }}
        />
        <div className="relative flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-white/10 backdrop-blur">
            <GraduationCap className="size-5" />
          </div>
          <div className="leading-tight">
            <p className="text-[15px] font-semibold tracking-tight">EduFlow</p>
            <p className="text-[11px] text-white/60">Education CRM</p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative max-w-md"
        >
          <h2 className="text-3xl leading-snug font-semibold tracking-tight">
            {t.auth.loginSubtitle}
          </h2>
          <div className="mt-8 space-y-4">
            {[
              { icon: Users, text: t.marketing.bullet1 },
              { icon: CalendarDays, text: t.marketing.bullet2 },
              { icon: BarChart3, text: t.marketing.bullet3 },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.12 }}
                className="flex items-center gap-3 text-sm text-white/80"
              >
                <div className="flex size-8 items-center justify-center rounded-md bg-white/10">
                  <item.icon className="size-4" />
                </div>
                {item.text}
              </motion.div>
            ))}
          </div>
        </motion.div>

        <p className="relative text-xs text-white/50">
          © {new Date().getFullYear()} EduFlow. {t.marketing.tagline}
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="w-full max-w-sm"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
