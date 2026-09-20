"use client";

import * as React from "react";
import { Camera, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useT } from "@/lib/i18n";
import { MAX_UPLOAD_BYTES, fileToAvatar, setAvatar, useAvatar } from "@/lib/avatar";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

interface AvatarPickerProps {
  /** Used for the initials shown until a photo is picked. */
  name: string;
  className?: string;
  /** Hides the hint line where space is tight. */
  compact?: boolean;
}

export function AvatarPicker({ name, className, compact = false }: AvatarPickerProps) {
  const t = useT();
  const avatar = useAvatar();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error(t.settings.photoTooLarge);
      return;
    }
    setBusy(true);
    try {
      setAvatar(await fileToAvatar(file));
      toast.success(t.settings.photoUpdated);
    } catch {
      toast.error(t.settings.photoInvalid);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-4", className)}>
      {/* The avatar itself is the primary target — clicking the picture to
          change it is what people try first. */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label={t.settings.changePhoto}
        className="group relative rounded-full focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <Avatar className="size-16 border">
          {avatar ? <AvatarImage src={avatar} alt="" /> : null}
          <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
            {initials(name)}
          </AvatarFallback>
        </Avatar>
        <span
          aria-hidden
          className={cn(
            "absolute inset-0 flex items-center justify-center rounded-full bg-foreground/55 text-background",
            "opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100",
            busy && "opacity-100"
          )}
        >
          <Camera className="size-5" />
        </span>
      </button>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            <Camera className="size-4" />
            {t.settings.changePhoto}
          </Button>
          {avatar ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setAvatar(null);
                toast.success(t.settings.photoRemoved);
              }}
            >
              <Trash2 className="size-4" />
              {t.settings.removePhoto}
            </Button>
          ) : null}
        </div>
        {compact ? null : (
          <p className="text-xs text-muted-foreground">{t.settings.photoHint}</p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void pick(e.target.files?.[0]);
          // Reset so picking the same file twice still fires a change.
          e.target.value = "";
        }}
      />
    </div>
  );
}
