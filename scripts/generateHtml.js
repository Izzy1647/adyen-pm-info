const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "..", "data");
const publishDir = path.join(__dirname, "..", "public");

const csvPath = path.join(dataDir, "all_payment_method_info.csv");
const csvContent = fs.readFileSync(csvPath, "utf-8");

function parseCSV(text) {
  const rows = [];
  const lines = text.trim().split("\n");
  for (const line of lines) {
    const row = [];
    let inQuote = false;
    let field = "";
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuote = !inQuote;
      } else if (ch === "," && !inQuote) {
        row.push(field.trim());
        field = "";
      } else {
        field += ch;
      }
    }
    row.push(field.trim());
    rows.push(row);
  }
  return rows;
}

const rows = parseCSV(csvContent);
const headers = rows[0];
const data = rows.slice(1);

const EXCLUDE_COLS = new Set(["Slug", "Settlement currency"]);
const slugIdx = headers.indexOf("Slug");
const YES_NO_COLS = new Set(["Sales day payout", "Refunds", "Partial refunds", "Multiple partial refunds", "Multiple partial captures", "3D Secure", "Chargebacks", "Local entity required", "Recurring"]);
const DELAY_COL = "Settlement delay";
const displayCols = headers.map((h, i) => i).filter((i) => !EXCLUDE_COLS.has(headers[i]));

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function delayClass(val) {
  if (!val || val === "N/A") return "delay-na";
  const m = val.match(/^(\d+)/);
  if (m) {
    const d = parseInt(m[1]);
    if (d <= 2) return "delay-fast";
    if (d <= 5) return "delay-mid";
    return "delay-slow";
  }
  return "delay-other";
}

function payoutBadge(val) {
  if (val === "Yes") return '<span class="badge badge-yes">Yes</span>';
  if (val === "No") return '<span class="badge badge-no">No</span>';
  return '<span class="badge badge-na">N/A</span>';
}

const tableRows = data
  .map((row, idx) => {
    const cells = displayCols
      .map((ci) => {
        const colName = headers[ci];
        const val = row[ci] || "";
        if (colName === "Payment Method") {
          const slug = row[slugIdx] || "";
          const href = `https://www.adyen.com/payment-methods/${slug}`;
          return `<td><a class="pm-link" href="${href}" target="_blank" rel="noopener">${escapeHtml(val)}</a></td>`;
        }
        if (colName === DELAY_COL) return `<td class="${delayClass(val)}">${escapeHtml(val)}</td>`;
        if (YES_NO_COLS.has(colName)) return `<td>${payoutBadge(val)}</td>`;
        return `<td>${escapeHtml(val)}</td>`;
      })
      .join("");
    const trClass = idx % 2 === 0 ? "even" : "odd";
    return `<tr class="${trClass}">${cells}</tr>`;
  })
  .join("\n");

const displayHeaders = displayCols.map((ci) => headers[ci]);

const filterRow = displayCols
  .map((ci, fi) => {
    const colName = headers[ci];
    if (YES_NO_COLS.has(colName)) {
      return `<th><div class="multi-filter" data-col="${fi}"><label class="mf-label"><input type="checkbox" value="Yes"> Yes</label><label class="mf-label"><input type="checkbox" value="No"> No</label><label class="mf-label"><input type="checkbox" value="N/A"> N/A</label></div></th>`;
    }
    return `<th><input class="filter-input" type="text" placeholder="Filter..." data-col="${fi}"></th>`;
  })
  .join("");
const buildDate = new Date().toISOString().split("T")[0];

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Adyen payment methods - all you need to know</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background: #f5f7fa;
    padding: 40px;
    color: #1a1a2e;
  }
  .container {
    max-width: 1200px;
    margin: 0 auto;
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.08);
    overflow: hidden;
  }
  .table-wrap {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .header {
    background: linear-gradient(135deg, #0abf53 0%, #00a651 100%);
    padding: 32px 40px;
    color: #fff;
  }
  .header h1 {
    font-size: 26px;
    font-weight: 700;
    letter-spacing: -0.5px;
  }
  .header p {
    font-size: 14px;
    opacity: 0.85;
    margin-top: 6px;
  }
  .filter-row th {
    background: #2a2a3e;
    padding: 8px 16px;
    position: sticky;
    top: 38px;
  }
  .filter-row th:first-child { padding-left: 40px; }
  .filter-input {
    width: 100%;
    padding: 6px 10px;
    border: 1px solid #555;
    border-radius: 6px;
    background: #3a3a4e;
    color: #fff;
    font-size: 11px;
    outline: none;
  }
  .filter-input::placeholder { color: #999; }
  .filter-input:focus { border-color: #0abf53; }
  .multi-filter {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
  }
  .mf-label {
    display: flex;
    align-items: center;
    gap: 4px;
    color: #ccc;
    font-size: 11px;
    cursor: pointer;
    white-space: nowrap;
    user-select: none;
  }
  .mf-label input[type=checkbox] {
    accent-color: #0abf53;
    cursor: pointer;
    width: 13px;
    height: 13px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  thead th {
    background: #1a1a2e;
    color: #fff;
    padding: 14px 16px;
    text-align: left;
    font-weight: 600;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    position: sticky;
    top: 0;
  }
  thead th:first-child { padding-left: 40px; }
  tbody td {
    padding: 10px 16px;
    border-bottom: 1px solid #f0f0f0;
    vertical-align: top;
    max-width: 300px;
    word-wrap: break-word;
  }
  tbody td:first-child {
    padding-left: 40px;
    font-weight: 600;
    color: #1a1a2e;
    white-space: nowrap;
  }
  tr.even { background: #fff; }
  tr.odd { background: #fafbfc; }
  tr:hover { background: #f0faf4 !important; }
  .delay-fast { color: #0abf53; font-weight: 600; }
  .delay-mid { color: #f5a623; font-weight: 600; }
  .delay-slow { color: #e74c3c; font-weight: 600; }
  .delay-na { color: #999; font-style: italic; }
  .delay-other { color: #666; }
  .badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    text-align: center;
  }
  .badge-yes { background: #e6f9ee; color: #0abf53; }
  .badge-no { background: #fef0f0; color: #e74c3c; }
  .badge-na { background: #f5f5f5; color: #999; }
  .footer {
    padding: 16px 40px;
    text-align: right;
    font-size: 11px;
    color: #999;
    border-top: 1px solid #f0f0f0;
  }
  .legend {
    display: flex;
    gap: 20px;
    padding: 12px 40px;
    font-size: 11px;
    color: #666;
    border-top: 1px solid #f0f0f0;
    background: #fafbfc;
  }
  .legend span { display: flex; align-items: center; gap: 6px; }
  .legend .dot {
    width: 10px; height: 10px; border-radius: 50%; display: inline-block;
  }
  .dot-fast { background: #0abf53; }
  .dot-mid { background: #f5a623; }
  .dot-slow { background: #e74c3c; }
  .pm-link {
    color: #1a1a2e;
    text-decoration: none;
    font-weight: 600;
  }
  .pm-link:hover {
    color: #0abf53;
    text-decoration: underline;
  }
  .toolbar {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    padding: 10px 40px;
    border-top: 1px solid #f0f0f0;
    background: #fafbfc;
  }
  .export-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 16px;
    background: #1a1a2e;
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }
  .export-btn:hover { background: #0abf53; }
  .export-btn svg { flex-shrink: 0; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>Adyen payment methods - all you need to know</h1>
    <p>Processing currency, settlement delay, and feature support for all ${data.length} supported payment methods &middot; Auto-updated daily</p>
  </div>
  <div class="legend">
    <span><span class="dot dot-fast"></span> 1-2 days</span>
    <span><span class="dot dot-mid"></span> 3-5 days</span>
    <span><span class="dot dot-slow"></span> 6+ days</span>
  </div>
  <div class="toolbar">
    <button class="export-btn" onclick="exportCSV()">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      Export CSV
    </button>
  </div>
  <div class="table-wrap">
  <table>
    <thead>
      <tr>${displayHeaders.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr>
      <tr class="filter-row">${filterRow}</tr>
    </thead>
    <tbody>
${tableRows}
    </tbody>
  </table>
  </div>
  <div class="footer">Source: adyen.com/payment-methods &middot; Last updated: ${buildDate}</div>
</div>
<script>
  const inputs = document.querySelectorAll('.filter-input');
  const multiFilters = document.querySelectorAll('.multi-filter');
  const rows = document.querySelectorAll('tbody tr');

  function applyFilters() {
    const textFilters = {};
    const multiFilterValues = {};
    inputs.forEach(input => { textFilters[input.dataset.col] = input.value.toLowerCase(); });
    multiFilters.forEach(mf => {
      const col = mf.dataset.col;
      const checked = Array.from(mf.querySelectorAll('input[type=checkbox]:checked')).map(cb => cb.value);
      multiFilterValues[col] = checked.length === 0 ? null : checked;
    });

    let visible = 0;
    rows.forEach((row) => {
      const cells = row.querySelectorAll('td');
      let show = true;
      for (const [col, val] of Object.entries(textFilters)) {
        if (!val) continue;
        const cellText = cells[parseInt(col)]?.textContent?.toLowerCase() || '';
        if (!cellText.includes(val)) { show = false; break; }
      }
      if (show) {
        for (const [col, vals] of Object.entries(multiFilterValues)) {
          if (!vals) continue;
          const cellText = cells[parseInt(col)]?.textContent?.trim() || '';
          if (!vals.includes(cellText)) { show = false; break; }
        }
      }
      row.style.display = show ? '' : 'none';
      if (show) {
        row.className = visible % 2 === 0 ? 'even' : 'odd';
        visible++;
      }
    });
  }

  inputs.forEach(input => input.addEventListener('input', applyFilters));
  multiFilters.forEach(mf => mf.addEventListener('change', applyFilters));

  function exportCSV() {
    const headers = Array.from(document.querySelectorAll('thead tr:first-child th')).map(th => th.textContent.trim());
    const visibleRows = Array.from(document.querySelectorAll('tbody tr')).filter(r => r.style.display !== 'none');
    const csvLines = [headers.map(h => '"' + h.replace(/"/g, '""') + '"').join(',')];
    visibleRows.forEach(row => {
      const cells = Array.from(row.querySelectorAll('td')).map(td => '"' + td.textContent.trim().replace(/"/g, '""') + '"');
      csvLines.push(cells.join(','));
    });
    const blob = new Blob([csvLines.join('\\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'adyen-payment-methods.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
</script>
</body>
</html>`;

if (!fs.existsSync(publishDir)) fs.mkdirSync(publishDir, { recursive: true });
const htmlPath = path.join(publishDir, "index.html");
fs.writeFileSync(htmlPath, html, "utf-8");
console.log(`HTML saved to: ${htmlPath}`);
