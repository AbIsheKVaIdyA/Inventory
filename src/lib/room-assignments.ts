export type RoomPersonFields = {
  firstname: string;
  lastname: string;
  netid: string;
  job_title: string;
};

export type RoomDraftRow = RoomPersonFields & {
  localId: string;
  department: string;
  building: string;
  room_number: string;
};

/** Spreadsheet / DB column order */
export const ROOM_ASSIGNMENT_HEADERS = [
  "department",
  "building",
  "room_number",
  "firstname",
  "lastname",
  "netid",
  "job_title",
] as const;

export type RoomAssignmentInsert = {
  department: string;
  building: string;
  room_number: string;
  firstname: string;
  lastname: string;
  netid: string;
  job_title: string;
};

export function draftRowToInsert(row: RoomDraftRow): RoomAssignmentInsert {
  return {
    department: row.department.trim(),
    building: row.building.trim(),
    room_number: row.room_number.trim(),
    firstname: row.firstname.trim(),
    lastname: row.lastname.trim(),
    netid: row.netid.trim(),
    job_title: row.job_title.trim(),
  };
}

export function roomAssignmentValues(row: RoomAssignmentInsert): string[] {
  return ROOM_ASSIGNMENT_HEADERS.map((h) => row[h]);
}
