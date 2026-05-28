// Tiny, dependency-free CSV writer. RFC-4180-ish: fields containing a comma,
// quote, or newline are wrapped in double quotes with internal quotes doubled.
// Pure + unit-tested (csv.test.ts) — the data-export trust promise (F8).

export type CSVCell = string | number | boolean | null | undefined;

export function csvField(value: CSVCell): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCSV(headers: string[], rows: CSVCell[][]): string {
  const lines = [headers.map(csvField).join(",")];
  for (const row of rows) {
    lines.push(row.map(csvField).join(","));
  }
  // CRLF line endings — the most broadly compatible for spreadsheet apps.
  return lines.join("\r\n");
}
