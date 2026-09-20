/** Client-side export helpers (mock-friendly, no backend). */

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportCSV(
  filename: string,
  headers: string[],
  rows: (string | number)[][]
) {
  const escape = (v: string | number) => {
    const s = String(v ?? "");
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const bom = "﻿"; // Excel-friendly UTF-8
  const csv =
    bom +
    [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
  download(new Blob([csv], { type: "text/csv;charset=utf-8" }), `${filename}.csv`);
}

/** "Excel" export: CSV with .csv extension that Excel opens natively. */
export function exportExcel(
  filename: string,
  headers: string[],
  rows: (string | number)[][]
) {
  exportCSV(filename, headers, rows);
}

/** PDF export: opens the browser print dialog with a printable table. */
export function exportPDF(title: string, headers: string[], rows: (string | number)[][]) {
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;
  const style = `
    body { font-family: ui-sans-serif, system-ui, sans-serif; padding: 32px; color: #1a1a2e; }
    h1 { font-size: 18px; margin-bottom: 4px; }
    p { color: #666; font-size: 12px; margin-top: 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
    th, td { border: 1px solid #e2e2ea; padding: 6px 10px; text-align: left; }
    th { background: #f6f6fa; font-weight: 600; }
    tr:nth-child(even) td { background: #fafafc; }
  `;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>${style}</style></head><body>
    <h1>${title}</h1>
    <p>EduFlow CRM · ${new Date().toLocaleDateString()}</p>
    <table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c ?? ""}</td>`).join("")}</tr>`).join("")}</tbody></table>
    <script>window.onload = () => setTimeout(() => window.print(), 150)</script>
  </body></html>`;
  w.document.write(html);
  w.document.close();
}
