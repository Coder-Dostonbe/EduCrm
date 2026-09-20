"use client";

/**
 * Google Sign-In, wearing this app's button.
 *
 * Google only hands out an ID token through its own rendered button (an
 * iframe it controls), which cannot be restyled. To keep the login page's
 * design we draw our own button and lay Google's real one on top of it,
 * invisible but clickable — the click, and therefore the credential, is
 * genuinely Google's. The visual button is hidden from assistive technology so
 * the accessible control is the real one underneath the mouse, and the wrapper
 * mirrors its focus so keyboard users still see a focus ring.
 */

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const GSI_SRC = "https://accounts.google.com/gsi/client";

// ── Minimal typings for the slice of GSI we use ──────────────────────

interface CredentialResponse {
  credential?: string;
}

interface GoogleAccountsId {
  initialize(config: {
    client_id: string;
    callback: (response: CredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    ux_mode?: "popup" | "redirect";
  }): void;
  renderButton(
    parent: HTMLElement,
    options: {
      type?: "standard" | "icon";
      theme?: "outline" | "filled_blue" | "filled_black";
      size?: "small" | "medium" | "large";
      text?: "signin_with" | "signup_with" | "continue_with" | "signin";
      shape?: "rectangular" | "pill" | "circle" | "square";
      logo_alignment?: "left" | "center";
      width?: number;
      locale?: string;
    }
  ): void;
  disableAutoSelect(): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

// ── Script loading ───────────────────────────────────────────────────

let gsiLoader: Promise<GoogleAccountsId> | null = null;

/** Loads the GSI client once per page, however many buttons ask for it. */
function loadGsi(): Promise<GoogleAccountsId> {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  if (gsiLoader) return gsiLoader;

  gsiLoader = new Promise<GoogleAccountsId>((resolve, reject) => {
    const settle = () => {
      const id = window.google?.accounts?.id;
      if (id) resolve(id);
      else reject(new Error("The Google script loaded but exposed no sign-in API."));
    };

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", settle, { once: true });
      existing.addEventListener("error", () => reject(new Error("blocked")), { once: true });
      // Already finished loading before we attached the listener.
      if (window.google?.accounts?.id) settle();
      return;
    }

    const script = document.createElement("script");
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", settle, { once: true });
    script.addEventListener("error", () => {
      // A blocked or offline script must not poison later attempts.
      gsiLoader = null;
      reject(new Error("Could not load Google Sign-In (blocked or offline)."));
    });
    document.head.appendChild(script);
  });

  return gsiLoader;
}

/** Names Google's button once it appears.
 *
 * Its own rendered control carries no accessible name, and the label we draw
 * is hidden from assistive technology — so without this the only reachable
 * control on the page would announce as an unlabelled button. The element is
 * in our DOM (only the widget's interior is cross-origin), so it can be
 * labelled directly; it just shows up a tick after renderButton returns.
 */
function labelWhenRendered(slot: HTMLElement, label: string) {
  const apply = () => {
    const button = slot.querySelector<HTMLElement>('[role="button"]');
    if (!button) return false;
    button.setAttribute("aria-label", label);
    return true;
  };

  if (apply()) return;

  const observer = new MutationObserver(() => {
    if (apply()) observer.disconnect();
  });
  observer.observe(slot, { childList: true, subtree: true });
  // Don't watch forever if the widget never arrives.
  setTimeout(() => observer.disconnect(), 10_000);
}

// ── Component ────────────────────────────────────────────────────────

export interface GoogleSignInButtonProps {
  clientId: string;
  /** Called with the Google ID token once the user has chosen an account. */
  onCredential: (idToken: string) => void;
  /** Reported when the Google script or widget cannot be brought up at all. */
  onUnavailable?: (reason: string) => void;
  /** Shown on our own button face. */
  label: string;
  /** Covers the button with a spinner while the credential is exchanged. */
  busy?: boolean;
  locale?: string;
}

export function GoogleSignInButton({
  clientId,
  onCredential,
  onUnavailable,
  label,
  busy = false,
  locale,
}: GoogleSignInButtonProps) {
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const slotRef = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(0);
  const [api, setApi] = React.useState<GoogleAccountsId | null>(null);
  const [failed, setFailed] = React.useState(false);

  // Google's button needs an explicit pixel width, so track our own.
  //
  // Measured in a layout effect rather than left to the observer's first
  // callback: that callback is asynchronous, and while the login card is still
  // animating in it can report a zero width and then never fire again, leaving
  // the button unrendered. Measuring after layout is deterministic; the
  // observer then only has to catch genuine resizes.
  React.useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    // Google caps the rendered button at 400px.
    const measure = () =>
      setWidth(Math.min(400, Math.round(wrapper.getBoundingClientRect().width)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  // Hold the newest props in refs so the effects below don't list them as
  // dependencies: re-running those would tear down Google's iframe, possibly
  // mid-click. Updated in an effect, never during render.
  const credentialRef = React.useRef(onCredential);
  const unavailableRef = React.useRef(onUnavailable);
  const labelRef = React.useRef(label);

  React.useEffect(() => {
    credentialRef.current = onCredential;
    unavailableRef.current = onUnavailable;
    labelRef.current = label;
  }, [onCredential, onUnavailable, label]);

  // Step one: pull in the SDK and configure it. Deliberately independent of
  // the measured width, so a slow or late measurement cannot stop the script
  // from loading.
  React.useEffect(() => {
    if (!clientId) return;
    let cancelled = false;

    loadGsi()
      .then((googleId) => {
        if (cancelled) return;
        googleId.initialize({
          client_id: clientId,
          ux_mode: "popup",
          auto_select: false,
          cancel_on_tap_outside: true,
          callback: (response) => {
            if (response.credential) credentialRef.current(response.credential);
            else unavailableRef.current?.("Google returned no credential.");
          },
        });
        setApi(() => googleId);
      })
      .catch((error: Error) => {
        if (cancelled) return;
        setFailed(true);
        unavailableRef.current?.(error.message);
      });

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  // Step two: draw the button, once we know both the SDK and our own width.
  React.useEffect(() => {
    const slot = slotRef.current;
    if (!api || !width || !slot) return;

    // Strict Mode runs effects twice in development, and a width change
    // re-runs this one; without clearing we would stack iframes.
    slot.innerHTML = "";
    api.renderButton(slot, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "rectangular",
      logo_alignment: "left",
      width,
      locale,
    });
    labelWhenRendered(slot, labelRef.current);
  }, [api, width, locale]);

  return (
    <div ref={wrapperRef} className="group relative w-full">
      {/* Our button face. Decorative: the real control sits on top. */}
      <div
        aria-hidden
        className={cn(
          "flex h-9 w-full items-center justify-center gap-2 rounded-md border bg-background",
          "px-4 text-sm font-medium shadow-xs transition-colors",
          "group-hover:bg-accent group-hover:text-accent-foreground",
          "group-focus-within:ring-[3px] group-focus-within:ring-ring/50",
          (busy || failed) && "opacity-60"
        )}
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <GoogleIcon />}
        {label}
      </div>

      {/* Google's real button: invisible, but the thing actually clicked.
          Hidden entirely while busy or broken so it cannot be clicked twice. */}
      <div
        ref={slotRef}
        className={cn(
          "absolute inset-0 overflow-hidden opacity-0",
          (busy || failed) && "pointer-events-none"
        )}
      />
    </div>
  );
}

export function GoogleIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52Z"
      />
    </svg>
  );
}
