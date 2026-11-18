"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiDetail, apiFetch } from "@/lib/client/api";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/**
 * Maintenance reminders (Pass #20) — the Health Vault section that
 * turns the vehicle's own mileage + the driver's "last done" marks
 * into quiet, honest reminders (GET/POST /api/vehicles/[id]/
 * maintenance). HONESTY, on the label: MECHA does not read the car;
 * every state here is computed from numbers the driver entered, and
 * the section says so. Dismissible to a one-line summary.
 */

interface MaintenanceItemView {
  key: string;
  label: string;
  intervalMiles: number;
  intervalMonths: number;
  status: "due" | "soon" | "ok" | "unknown";
  milesLeft: number | null;
  daysLeft: number | null;
  lastMileage: number | null;
  lastDate: string | null;
}

export default function MaintenanceSection({ vehicleId }: { vehicleId: string }) {
  const { t } = useLocale();
  const m = t.wp6.vault.maintenance;
  const [items, setItems] = useState<MaintenanceItemView[]>([]);
  const [mileage, setMileage] = useState<number | null>(null);
  const [hidden, setHidden] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [drafts, setDrafts] = useState<Record<string, { mileage: string; date: string }>>({});

  const load = useCallback(async () => {
    const res = await apiFetch<{ mileage: number | null; items: MaintenanceItemView[] }>(
      `/api/vehicles/${vehicleId}/maintenance`,
    );
    if (res.status === 200) {
      setItems(res.data.items);
      setMileage(res.data.mileage);
    }
    setLoaded(true);
  }, [vehicleId]);

  useEffect(() => {
    setItems([]);
    setLoaded(false);
    void load();
  }, [load]);

  async function markDone(item: MaintenanceItemView) {
    const draft = drafts[item.key];
    const today = new Date().toISOString().slice(0, 10);
    const res = await apiFetch(`/api/vehicles/${vehicleId}/maintenance`, {
      method: "POST",
      body: JSON.stringify({
        item: item.key,
        lastMileage: draft?.mileage ? Number(draft.mileage) : (mileage ?? undefined),
        lastDate: draft?.date || today,
      }),
    });
    if (res.status === 201) {
      setError("");
      await load();
    } else {
      setError(apiDetail(res.data, t.wp6.common.somethingWrong));
    }
  }

  function onDraftSubmit(e: FormEvent, item: MaintenanceItemView) {
    e.preventDefault();
    void markDone(item);
  }

  if (!loaded) return null;

  if (hidden) {
    return (
      <div className="mt-6 flex items-center justify-between gap-4 border-t border-line pt-5">
        <h3 className="text-sm font-semibold uppercase tracking-eyebrow text-ink-2">{m.title}</h3>
        <button
          type="button"
          onClick={() => setHidden(false)}
          className="flex h-12 items-center rounded-full border border-line px-4 text-sm font-semibold text-ink-1"
        >
          {m.show}
        </button>
      </div>
    );
  }

  const statusText = (item: MaintenanceItemView): string => {
    if (item.status === "due") return m.due;
    if (item.status === "soon") return m.soon;
    if (item.status === "ok") return m.ok;
    return m.unknown;
  };
  const statusClass = (item: MaintenanceItemView): string =>
    item.status === "due"
      ? "text-verdict-rip"
      : item.status === "soon"
        ? "text-verdict-warn"
        : item.status === "ok"
          ? "text-verdict-fair"
          : "text-ink-3";

  const detail = (item: MaintenanceItemView): string => {
    if (item.status === "unknown") return m.noRecord;
    if (item.milesLeft !== null) {
      if (item.milesLeft <= 0)
        return m.pastBy.replace("{miles}", Math.abs(item.milesLeft).toLocaleString());
      return m.milesLeft.replace("{miles}", item.milesLeft.toLocaleString());
    }
    if (item.daysLeft !== null) {
      if (item.daysLeft <= 0) return m.pastByDate;
      return m.daysLeft.replace("{days}", String(item.daysLeft));
    }
    return "";
  };

  return (
    <section className="mt-6 border-t border-line pt-5" aria-label={m.title}>
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-sm font-semibold uppercase tracking-eyebrow text-ink-2">{m.title}</h3>
        <button
          type="button"
          onClick={() => setHidden(true)}
          className="flex h-12 items-center rounded-full border border-line px-4 text-sm font-semibold text-ink-1"
        >
          {m.hide}
        </button>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-ink-3">{m.note}</p>

      <ul className="mt-3 flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.key} className="rounded-xl bg-inset px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-base font-medium text-ink-1">{item.label}</span>
              <span className={`text-sm font-semibold ${statusClass(item)}`}>
                {statusText(item)}
              </span>
            </div>
            <p className="mt-1 text-sm text-ink-2">{detail(item)}</p>
            {(item.lastMileage !== null || item.lastDate) && (
              <p className="mt-1 text-sm text-ink-3">
                {m.lastDone}:{" "}
                {[
                  item.lastMileage !== null ? `${item.lastMileage.toLocaleString()} mi` : null,
                  item.lastDate,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
            <form
              onSubmit={(e) => onDraftSubmit(e, item)}
              className="mt-3 flex flex-wrap items-center gap-2"
            >
              <input
                inputMode="numeric"
                placeholder={m.atMileage}
                aria-label={`${item.label} — ${m.atMileage}`}
                value={drafts[item.key]?.mileage ?? ""}
                onChange={(e) =>
                  setDrafts((d) => ({
                    ...d,
                    [item.key]: {
                      mileage: e.target.value.replace(/[^0-9]/g, ""),
                      date: d[item.key]?.date ?? "",
                    },
                  }))
                }
                className="h-12 w-36 rounded-xl border border-line bg-surface px-3 text-sm text-ink-1 placeholder:text-ink-3"
              />
              <input
                type="date"
                aria-label={`${item.label} — ${m.onDate}`}
                value={drafts[item.key]?.date ?? ""}
                onChange={(e) =>
                  setDrafts((d) => ({
                    ...d,
                    [item.key]: { mileage: d[item.key]?.mileage ?? "", date: e.target.value },
                  }))
                }
                className="h-12 rounded-xl border border-line bg-surface px-3 text-sm text-ink-1"
              />
              <button
                type="submit"
                className="flex h-12 items-center rounded-full border border-line px-4 text-sm font-semibold text-ink-1"
              >
                {m.markDone}
              </button>
            </form>
          </li>
        ))}
      </ul>
      {error && (
        <p className="mt-3 text-sm text-verdict-rip" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
