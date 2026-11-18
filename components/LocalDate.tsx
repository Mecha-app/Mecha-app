"use client";

import { useEffect, useState } from "react";

/**
 * A date rendered in the VIEWER's timezone (Pass #20c). Server-rendered
 * pages format dates where they run — the server, in UTC — so the
 * public share card dated a diagnosis by UTC (a run at 11:44 PM ET on
 * Nov 17 showed as 11/18) while the owner's detail view, a client
 * page, showed the local date (11/17) for the same record. Both
 * surfaces must agree: this component renders the stored instant with
 * the exact call the detail view uses — toLocaleDateString() in the
 * viewer's own timezone — swapped in after mount. The first paint
 * formats in UTC, matching what the server rendered, so hydration
 * never disagrees; the local date replaces it immediately after.
 */
export function LocalDate({ iso }: { iso: string }) {
  const [label, setLabel] = useState(() =>
    new Date(iso).toLocaleDateString("en-US", { timeZone: "UTC" }),
  );
  useEffect(() => {
    setLabel(new Date(iso).toLocaleDateString());
  }, [iso]);
  return <>{label}</>;
}
