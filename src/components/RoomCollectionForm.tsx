"use client";

import {
  DownloadIcon,
  Loader2Icon,
  PlusIcon,
  SendIcon,
  Trash2Icon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { downloadRoomAssignmentsSpreadsheet } from "@/lib/download-room-assignments-xlsx";
import {
  draftRowToInsert,
  type RoomDraftRow,
  type RoomPersonFields,
} from "@/lib/room-assignments";
import { getSupabaseAnonBrowserClient, hasSupabaseConfig } from "@/lib/supabase/browser-client";
import { cn } from "@/lib/utils";

const emptyPerson: RoomPersonFields = {
  firstname: "",
  lastname: "",
  netid: "",
  job_title: "",
};

const fieldClass =
  "h-12 w-full rounded-2xl border border-border bg-background px-3.5 text-base text-foreground shadow-inner outline-none touch-manipulation focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50";

const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground";

type LookupOption = { name: string };

export function RoomCollectionForm() {
  const [person, setPerson] = useState<RoomPersonFields>(emptyPerson);
  const [department, setDepartment] = useState("");
  const [building, setBuilding] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [draft, setDraft] = useState<RoomDraftRow[]>([]);
  const [departments, setDepartments] = useState<LookupOption[]>([]);
  const [buildings, setBuildings] = useState<LookupOption[]>([]);
  const [lookupsLoading, setLookupsLoading] = useState(true);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedCount, setSubmittedCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!hasSupabaseConfig()) {
        if (!cancelled) {
          setLookupError("App is missing Supabase configuration.");
          setLookupsLoading(false);
        }
        return;
      }
      try {
        const sb = getSupabaseAnonBrowserClient();
        const [deptRes, bldRes] = await Promise.all([
          sb
            .from("room_departments")
            .select("name")
            .eq("active", true)
            .order("sort_order", { ascending: true })
            .order("name", { ascending: true }),
          sb
            .from("room_buildings")
            .select("name")
            .eq("active", true)
            .order("sort_order", { ascending: true })
            .order("name", { ascending: true }),
        ]);
        if (cancelled) return;
        if (deptRes.error) throw deptRes.error;
        if (bldRes.error) throw bldRes.error;
        setDepartments((deptRes.data ?? []) as LookupOption[]);
        setBuildings((bldRes.data ?? []) as LookupOption[]);
      } catch (e: unknown) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Could not load department / building lists.";
        setLookupError(
          /relation|does not exist|42P01|PGRST/i.test(msg)
            ? "Room tables are missing. Run the Supabase SQL migration (0004_room_assignments) first."
            : msg
        );
      } finally {
        if (!cancelled) setLookupsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const personComplete = useMemo(() => {
    return (
      person.firstname.trim() &&
      person.lastname.trim() &&
      person.netid.trim() &&
      person.job_title.trim()
    );
  }, [person]);

  const setPersonField = (key: keyof RoomPersonFields, value: string) => {
    setPerson((p) => ({ ...p, [key]: value }));
    setSubmittedCount(null);
  };

  const handleAddRoom = () => {
    setFormError(null);
    setSubmittedCount(null);
    if (!personComplete) {
      setFormError("Fill first name, last name, NetID, and job title first.");
      return;
    }
    if (!department.trim()) {
      setFormError("Select a department.");
      return;
    }
    if (!building.trim()) {
      setFormError("Select a building.");
      return;
    }
    if (!roomNumber.trim()) {
      setFormError("Enter a room number.");
      return;
    }

    const next: RoomDraftRow = {
      localId:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `r-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      firstname: person.firstname.trim(),
      lastname: person.lastname.trim(),
      netid: person.netid.trim(),
      job_title: person.job_title.trim(),
      department: department.trim(),
      building: building.trim(),
      room_number: roomNumber.trim(),
    };
    setDraft((rows) => [...rows, next]);
    setRoomNumber("");
  };

  const removeRow = (localId: string) => {
    setDraft((rows) => rows.filter((r) => r.localId !== localId));
    setSubmittedCount(null);
  };

  const handleDownloadDraft = () => {
    if (draft.length === 0) return;
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    downloadRoomAssignmentsSpreadsheet(
      draft.map(draftRowToInsert),
      `room-assignments-${stamp}.xlsx`
    );
  };

  const handleSubmit = async () => {
    setFormError(null);
    setSubmittedCount(null);
    if (draft.length === 0) {
      setFormError("Add at least one room before submitting.");
      return;
    }
    if (!hasSupabaseConfig()) {
      setFormError("App is missing Supabase configuration.");
      return;
    }

    setSubmitting(true);
    try {
      const sb = getSupabaseAnonBrowserClient();
      const payload = draft.map(draftRowToInsert);
      const { error } = await sb.from("room_assignments").insert(payload);
      if (error) throw error;
      setSubmittedCount(payload.length);
      setDraft([]);
      setRoomNumber("");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Submit failed.";
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pb-8 pt-6 max-[361px]:px-3">
      <header className="space-y-2">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          ECS IT Operations
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Room information</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Enter your details once, then add each room. No sign-in required — submit when your list is
          ready.
        </p>
      </header>

      {lookupError ? (
        <section
          role="alert"
          className="rounded-2xl border border-amber-500/40 bg-amber-950/45 px-4 py-3.5 text-sm text-amber-50"
        >
          {lookupError}
        </section>
      ) : null}

      {submittedCount != null ? (
        <section
          role="status"
          className="rounded-2xl border border-emerald-500/40 bg-emerald-950/40 px-4 py-3.5 text-sm text-emerald-50"
        >
          Submitted {submittedCount} room{submittedCount === 1 ? "" : "s"}. You can add more below if
          needed.
        </section>
      ) : null}

      <section className="rounded-2xl border border-border bg-card/80 p-4 shadow-md shadow-black/20">
        <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
          Your details
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Stays the same while you add multiple rooms.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="room-firstname" className={labelClass}>
              First name
            </label>
            <input
              id="room-firstname"
              autoComplete="given-name"
              className={fieldClass}
              value={person.firstname}
              onChange={(e) => setPersonField("firstname", e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="room-lastname" className={labelClass}>
              Last name
            </label>
            <input
              id="room-lastname"
              autoComplete="family-name"
              className={fieldClass}
              value={person.lastname}
              onChange={(e) => setPersonField("lastname", e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="room-netid" className={labelClass}>
              NetID
            </label>
            <input
              id="room-netid"
              autoComplete="username"
              className={fieldClass}
              value={person.netid}
              onChange={(e) => setPersonField("netid", e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="room-job" className={labelClass}>
              Job title
            </label>
            <input
              id="room-job"
              autoComplete="organization-title"
              className={fieldClass}
              value={person.job_title}
              onChange={(e) => setPersonField("job_title", e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card/80 p-4 shadow-md shadow-black/20">
        <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
          Add a room
        </h2>
        <div className="mt-4 grid gap-3">
          <div>
            <label htmlFor="room-department" className={labelClass}>
              Department
            </label>
            <select
              id="room-department"
              disabled={lookupsLoading || departments.length === 0}
              className={cn(fieldClass, "appearance-none pr-10")}
              value={department}
              onChange={(e) => {
                setDepartment(e.target.value);
                setSubmittedCount(null);
              }}
            >
              <option value="">
                {lookupsLoading
                  ? "Loading…"
                  : departments.length === 0
                    ? "No departments configured"
                    : "Select department"}
              </option>
              {departments.map((d) => (
                <option key={d.name} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="room-building" className={labelClass}>
              Building
            </label>
            <select
              id="room-building"
              disabled={lookupsLoading || buildings.length === 0}
              className={cn(fieldClass, "appearance-none pr-10")}
              value={building}
              onChange={(e) => {
                setBuilding(e.target.value);
                setSubmittedCount(null);
              }}
            >
              <option value="">
                {lookupsLoading
                  ? "Loading…"
                  : buildings.length === 0
                    ? "No buildings configured"
                    : "Select building"}
              </option>
              {buildings.map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="room-number" className={labelClass}>
              Room number
            </label>
            <input
              id="room-number"
              className={fieldClass}
              value={roomNumber}
              onChange={(e) => {
                setRoomNumber(e.target.value);
                setSubmittedCount(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddRoom();
                }
              }}
            />
          </div>
        </div>

        <Button
          type="button"
          size="lg"
          className="mt-4 h-12 w-full gap-2 rounded-2xl touch-manipulation"
          onClick={handleAddRoom}
          disabled={lookupsLoading || !!lookupError}
        >
          <PlusIcon className="size-4 shrink-0" aria-hidden />
          Add room to list
        </Button>
      </section>

      {formError ? (
        <section
          role="alert"
          className="rounded-2xl border border-red-500/40 bg-red-950/50 px-4 py-3.5 text-sm text-red-100"
        >
          {formError}
        </section>
      ) : null}

      <section className="rounded-2xl border border-border bg-card/80 p-4 shadow-md shadow-black/20">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Rooms to submit
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {draft.length === 0
                ? "No rooms yet — add one above."
                : `${draft.length} room${draft.length === 1 ? "" : "s"} ready`}
            </p>
          </div>
          {draft.length > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10 gap-1.5 rounded-xl touch-manipulation"
              onClick={handleDownloadDraft}
            >
              <DownloadIcon className="size-3.5 shrink-0" aria-hidden />
              Download list
            </Button>
          ) : null}
        </div>

        {draft.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-2">
            {draft.map((row) => (
              <li
                key={row.localId}
                className="flex items-start gap-2 rounded-xl border border-border/80 bg-background/60 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-semibold text-foreground">
                    {row.building} · {row.room_number}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{row.department}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.firstname} {row.lastname} · {row.netid} · {row.job_title}
                  </p>
                </div>
                <button
                  type="button"
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground touch-manipulation"
                  aria-label={`Remove room ${row.room_number}`}
                  onClick={() => removeRow(row.localId)}
                >
                  <Trash2Icon className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <Button
          type="button"
          size="lg"
          className="mt-4 h-12 w-full gap-2 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-500 touch-manipulation"
          disabled={draft.length === 0 || submitting}
          onClick={() => void handleSubmit()}
        >
          {submitting ? (
            <>
              <Loader2Icon className="size-4 shrink-0 animate-spin" aria-hidden />
              Submitting…
            </>
          ) : (
            <>
              <SendIcon className="size-4 shrink-0" aria-hidden />
              Submit {draft.length > 0 ? `${draft.length} room${draft.length === 1 ? "" : "s"}` : "rooms"}
            </>
          )}
        </Button>
      </section>
    </div>
  );
}
