"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Plug, XCircle } from "lucide-react";
import {
  OPENCLAW_DEFAULT_URL,
  isOpenClawReady,
  loadOpenClawConfig,
  saveOpenClawConfig,
  testOpenClawConnection,
  type OpenClawConfig,
} from "@/lib/openclaw";

/**
 * Per-browser OpenClaw gateway settings. Lives on the profile page.
 * The gateway URL + token stay in this browser's localStorage — they are
 * personal credentials for a gateway running on the user's own machine.
 */
export function OpenClawSettings() {
  const [cfg, setCfg] = useState<OpenClawConfig | null>(null);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "saved" }
    | { kind: "testing" }
    | { kind: "test-ok" }
    | { kind: "test-fail"; error: string }
  >({ kind: "idle" });

  // Read localStorage after mount so SSR markup stays deterministic.
  useEffect(() => {
    setCfg(loadOpenClawConfig());
  }, []);

  if (!cfg) return null;

  const patch = (p: Partial<OpenClawConfig>) => {
    setCfg({ ...cfg, ...p });
    setDirty(true);
    setStatus({ kind: "idle" });
  };

  const save = () => {
    saveOpenClawConfig(cfg);
    setDirty(false);
    setStatus({ kind: "saved" });
  };

  const test = async () => {
    setStatus({ kind: "testing" });
    const res = await testOpenClawConnection(cfg);
    setStatus(
      res.ok
        ? { kind: "test-ok" }
        : { kind: "test-fail", error: res.error ?? "Gateway unreachable." },
    );
  };

  return (
    <section className="mt-4 rounded-md border border-line bg-surface p-5">
      <h2 className="mb-1 inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-fg-subtle">
        <Plug className="h-3 w-3" /> OpenClaw · WhatsApp sending
      </h2>
      <p className="text-[12px] leading-relaxed text-fg-subtle">
        With a local{" "}
        <a
          href="https://docs.openclaw.ai"
          target="_blank"
          rel="noreferrer noopener"
          className="text-brand-300 underline-offset-2 hover:underline"
        >
          OpenClaw
        </a>{" "}
        gateway linked to your WhatsApp, completion notifications are sent
        directly from your own number instead of opening a WhatsApp compose
        tab. Settings are stored only in this browser.
      </p>

      <label className="mt-3 flex items-center gap-2 text-[12px] text-fg">
        <input
          type="checkbox"
          checked={cfg.enabled}
          onChange={(e) => patch({ enabled: e.target.checked })}
          className="accent-brand-500"
        />
        Send completion notifications through OpenClaw
      </label>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-fg-subtle">
            Gateway URL
          </span>
          <input
            value={cfg.url}
            onChange={(e) => patch({ url: e.target.value })}
            placeholder={OPENCLAW_DEFAULT_URL}
            className="w-full rounded border border-line bg-subtle px-2.5 py-1.5 font-mono text-[12px] text-fg placeholder:text-fg-faint focus:border-brand-500/40 focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-fg-subtle">
            Gateway token
          </span>
          <input
            type="password"
            value={cfg.token}
            onChange={(e) => patch({ token: e.target.value })}
            placeholder="paste your gateway token"
            autoComplete="off"
            className="w-full rounded border border-line bg-subtle px-2.5 py-1.5 font-mono text-[12px] text-fg placeholder:text-fg-faint focus:border-brand-500/40 focus:outline-none"
          />
        </label>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={save}
          disabled={!dirty}
          className="rounded bg-brand-500 px-3 py-1 text-[12px] font-medium text-white hover:bg-brand-400 disabled:opacity-40"
        >
          Save
        </button>
        <button
          onClick={test}
          disabled={!isOpenClawReady({ ...cfg, enabled: true }) || status.kind === "testing"}
          className="rounded border border-line px-3 py-1 text-[12px] text-fg hover:bg-hover disabled:opacity-40"
        >
          {status.kind === "testing" ? "Testing…" : "Test connection"}
        </button>
        {status.kind === "saved" && (
          <span className="text-[11px] text-fg-subtle">Saved.</span>
        )}
        {status.kind === "test-ok" && (
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" /> Gateway reachable
          </span>
        )}
        {status.kind === "test-fail" && (
          <span className="inline-flex items-center gap-1 text-[11px] text-rose-400">
            <XCircle className="h-3.5 w-3.5" /> {status.error}
          </span>
        )}
      </div>
    </section>
  );
}
