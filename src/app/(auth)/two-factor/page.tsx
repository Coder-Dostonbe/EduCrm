"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export default function TwoFactorPage() {
  const t = useT();
  const router = useRouter();
  const [code, setCode] = React.useState<string[]>(Array(6).fill(""));
  const [loading, setLoading] = React.useState(false);
  const inputsRef = React.useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...code];
    next[index] = digit;
    setCode(next);
    if (digit && index < 5) inputsRef.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6).split("");
    if (digits.length) {
      e.preventDefault();
      const next = Array(6).fill("");
      digits.forEach((d, i) => (next[i] = d));
      setCode(next);
      inputsRef.current[Math.min(digits.length, 5)]?.focus();
    }
  };

  const complete = code.every((c) => c !== "");

  const onVerify = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    router.push("/dashboard");
  };

  return (
    <div className="text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
        <ShieldCheck className="size-5 text-primary" />
      </div>
      <h1 className="mt-4 text-xl font-semibold tracking-tight">{t.auth.twoFactorTitle}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t.auth.twoFactorSubtitle}</p>

      <div className="mt-8 flex justify-center gap-2" onPaste={handlePaste}>
        {code.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              inputsRef.current[i] = el;
            }}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            aria-label={`${t.a11y.digit} ${i + 1}`}
            className={cn(
              "size-11 rounded-md border bg-background text-center text-lg font-semibold transition-all",
              "focus:border-ring focus:ring-[3px] focus:ring-ring/40 focus:outline-none",
              digit && "border-primary/50"
            )}
          />
        ))}
      </div>

      <Button className="mt-6 w-full" disabled={!complete || loading} onClick={onVerify}>
        {loading && <Loader2 className="size-4 animate-spin" />}
        {t.auth.verify}
      </Button>
    </div>
  );
}
