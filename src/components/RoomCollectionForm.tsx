"use client";

import {
  CheckCircle2Icon,
  DownloadIcon,
  Loader2Icon,
  PartyPopperIcon,
  PlusIcon,
  SendIcon,
  Trash2Icon,
} from "lucide-react";
import { useRef, useState } from "react";

import { downloadRoomAssignmentsSpreadsheet } from "@/lib/download-room-assignments-xlsx";
import {
  draftRowToInsert,
  type RoomAssignmentInsert,
  type RoomDraftRow,
  type RoomPersonFields,
} from "@/lib/room-assignments";
import { getSupabaseAnonBrowserClient, hasSupabaseConfig } from "@/lib/supabase/browser-client";

const DEPARTMENTS = [
  "Bioengineering",
  "Computer Science",
  "Electrical Engineering",
  "Materials Science and Engineering",
  "Mechanical Engineering",
  "Systems Engineering",
] as const;

const BUILDINGS = ["ECSW", "ECSN", "ECSS", "NESRL", "ROW"] as const;

const fieldClass =
  "h-12 w-full rounded-2xl border border-border bg-background px-3.5 text-base text-foreground shadow-inner outline-none touch-manipulation focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50";

const labelClass =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground";

function errMsg(error: unknown): string {
  if (error && typeof error === "object") {
    const e = error as { message?: string; details?: string; hint?: string; code?: string };
    return [e.message, e.details, e.hint, e.code].filter(Boolean).join(" — ") || "Submit failed.";
  }
  if (error instanceof Error) return error.message;
  return "Submit failed.";
}

export function RoomCollectionForm() {
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [netid, setNetid] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  /** Increment to remount department/building selects back to placeholder. */
  const [pickerEpoch, setPickerEpoch] = useState(0);
  const departmentRef = useRef<HTMLSelectElement>(null);
  const buildingRef = useRef<HTMLSelectElement>(null);

  const [draft, setDraft] = useState<RoomDraftRow[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  /** After successful submit: replace form with thank-you + submitted list. */
  const [submittedRows, setSubmittedRows] = useState<RoomAssignmentInsert[] | null>(null);

  const resetRoomPickers = () => {
    setRoomNumber("");
    setPickerEpoch((n) => n + 1);
  };

  const resetAll = () => {
    setFirstname("");
    setLastname("");
    setNetid("");
    setJobTitle("");
    setDraft([]);
    resetRoomPickers();
  };

  const handleAddRoom = () => {
    setFormError(null);
    const department = (departmentRef.current?.value ?? "").trim();
    const building = (buildingRef.current?.value ?? "").trim();
    const person: RoomPersonFields = {
      firstname: firstname.trim(),
      lastname: lastname.trim(),
      netid: netid.trim(),
      job_title: jobTitle.trim(),
    };

    if (!person.firstname || !person.lastname || !person.netid || !person.job_title) {
      setFormError("Fill first name, last name, NetID, and job title first.");
      return;
    }
    if (!department) {
      setFormError("Select a department.");
      return;
    }
    if (!building) {
      setFormError("Select a building.");
      return;
    }
    if (!roomNumber.trim()) {
      setFormError("Enter a room number.");
      return;
    }

    setDraft((rows) => [
      ...rows,
      {
        localId: crypto.randomUUID(),
        ...person,
        department,
        building,
        room_number: roomNumber.trim(),
      },
    ]);
    resetRoomPickers();
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (draft.length === 0) {
      setFormError("Add at least one room before submitting.");
      return;
    }
    if (!hasSupabaseConfig()) {
      setFormError("App is missing Supabase configuration.");
      return;
    }

    const payload = draft.map(draftRowToInsert);
    setSubmitting(true);
    try {
      const sb = getSupabaseAnonBrowserClient();
      const { error } = await sb.from("room_assignments").insert(payload);
      if (error) {
        setFormError(errMsg(error));
        return;
      }
      setSubmittedRows(payload);
      resetAll();
    } catch (e: unknown) {
      setFormError(errMsg(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedRows !== null) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pb-8 pt-8 max-[361px]:px-3">
        <section className="rounded-3xl border border-emerald-400/40 bg-gradient-to-b from-emerald-950 to-[#0a1210] p-6 text-center shadow-2xl shadow-black/40 ring-1 ring-emerald-500/25">
          <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-emerald-500/25 text-emerald-300 ring-1 ring-emerald-400/45">
            <PartyPopperIcon className="size-8" aria-hidden />
          </span>
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-white">Thank you!</h1>
          <p className="mt-2 text-sm leading-relaxed text-emerald-100/85">
            That&apos;s all for today — have a good one. Here is what you submitted:
          </p>

          <ul className="mt-6 flex flex-col gap-2 text-left">
            {submittedRows.map((row, i) => (
              <li
                key={`${row.building}-${row.room_number}-${i}`}
                className="rounded-2xl border border-emerald-500/30 bg-black/25 px-4 py-3"
              >
                <p className="flex items-center gap-2 text-sm font-semibold text-emerald-50">
                  <CheckCircle2Icon className="size-4 shrink-0 text-emerald-400" aria-hidden />
                  {row.building} · {row.room_number}
                </p>
                <p className="mt-1 text-xs text-emerald-100/80">{row.department}</p>
                <p className="mt-1 text-xs text-emerald-100/65">
                  {row.firstname} {row.lastname} · {row.netid} · {row.job_title}
                </p>
              </li>
            ))}
          </ul>

          <button
            type="button"
            className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-emerald-600 text-sm font-semibold text-white touch-manipulation hover:bg-emerald-500"
            onClick={() => setSubmittedRows(null)}
          >
            Submit more rooms
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pb-8 pt-6 max-[361px]:px-3">
      <header className="space-y-2">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          ECS IT Operations
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Room information</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Enter your details once, then add each room and submit when your list is ready.
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-card/80 p-4 shadow-md shadow-black/20">
        <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
          Your details
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Kept while you add rooms. Cleared after submit.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="room-firstname" className={labelClass}>
              First name
            </label>
            <input
              id="room-firstname"
              className={fieldClass}
              value={firstname}
              onChange={(e) => setFirstname(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="room-lastname" className={labelClass}>
              Last name
            </label>
            <input
              id="room-lastname"
              className={fieldClass}
              value={lastname}
              onChange={(e) => setLastname(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="room-netid" className={labelClass}>
              NetID
            </label>
            <input
              id="room-netid"
              className={fieldClass}
              value={netid}
              onChange={(e) => setNetid(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="room-job" className={labelClass}>
              Job title
            </label>
            <input
              id="room-job"
              className={fieldClass}
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
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
            <label htmlFor={`room-department-${pickerEpoch}`} className={labelClass}>
              Department
            </label>
            <select
              key={`department-${pickerEpoch}`}
              id={`room-department-${pickerEpoch}`}
              ref={departmentRef}
              className={`${fieldClass} appearance-none pr-10`}
              defaultValue=""
            >
              <option value="" disabled>
                Select department
              </option>
              {DEPARTMENTS.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`room-building-${pickerEpoch}`} className={labelClass}>
              Building / branch
            </label>
            <select
              key={`building-${pickerEpoch}`}
              id={`room-building-${pickerEpoch}`}
              ref={buildingRef}
              className={`${fieldClass} appearance-none pr-10`}
              defaultValue=""
            >
              <option value="" disabled>
                Select building / branch
              </option>
              {BUILDINGS.map((name) => (
                <option key={name} value={name}>
                  {name}
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
              onChange={(e) => setRoomNumber(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddRoom();
                }
              }}
            />
          </div>
        </div>

        <button
          type="button"
          className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground touch-manipulation disabled:opacity-50"
          onClick={handleAddRoom}
        >
          <PlusIcon className="size-4 shrink-0" aria-hidden />
          Add room to list
        </button>
      </section>

      {formError ? (
        <section
          role="alert"
          className="rounded-2xl border border-red-500/50 bg-red-950/60 px-4 py-3.5 text-sm font-medium text-red-50"
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
            <button
              type="button"
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-semibold touch-manipulation"
              onClick={() => {
                const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
                downloadRoomAssignmentsSpreadsheet(
                  draft.map(draftRowToInsert),
                  `room-assignments-${stamp}.xlsx`
                );
              }}
            >
              <DownloadIcon className="size-3.5 shrink-0" aria-hidden />
              Download list
            </button>
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
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted touch-manipulation"
                  aria-label={`Remove ${row.room_number}`}
                  onClick={() => setDraft((rows) => rows.filter((r) => r.localId !== row.localId))}
                >
                  <Trash2Icon className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <button
          type="button"
          className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-sm font-semibold text-white touch-manipulation hover:bg-emerald-500 disabled:opacity-50"
          disabled={draft.length === 0 || submitting}
          onClick={() => void handleSubmit()}
        >
          {submitting ? (
            <>
              <Loader2Icon className="size-4 animate-spin" aria-hidden />
              Submitting…
            </>
          ) : (
            <>
              <SendIcon className="size-4 shrink-0" aria-hidden />
              Submit {draft.length > 0 ? `${draft.length} room${draft.length === 1 ? "" : "s"}` : "rooms"}
            </>
          )}
        </button>
      </section>
    </div>
  );
}
