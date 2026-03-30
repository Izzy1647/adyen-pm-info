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

// Columns: 0=Payment Method, 1=Slug, 2=Settlement currency, 3=Processing currency, 4=Settlement delay, 5=Sales day payout
const displayCols = [0, 2, 3, 4, 5];

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
        const val = row[ci] || "";
        if (ci === 4) return `<td class="${delayClass(val)}">${escapeHtml(val)}</td>`;
        if (ci === 5) return `<td>${payoutBadge(val)}</td>`;
        return `<td>${escapeHtml(val)}</td>`;
      })
      .join("");
    const trClass = idx % 2 === 0 ? "even" : "odd";
    return `<tr class="${trClass}">${cells}</tr>`;
  })
  .join("\n");

const displayHeaders = displayCols.map((ci) => headers[ci]);
const buildDate = new Date().toISOString().split("T")[0];

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Adyen Payment Methods — Settlement Info</title>
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
  .filter-select {
    width: 100%;
    padding: 6px 10px;
    border: 1px solid #555;
    border-radius: 6px;
    background: #3a3a4e;
    color: #fff;
    font-size: 11px;
    outline: none;
    cursor: pointer;
  }
  .filter-select:focus { border-color: #0abf53; }
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
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>Adyen Payment Methods — Settlement Info</h1>
    <p>Settlement currency, processing currency, and settlement delay for all ${data.length} supported payment methods &middot; Auto-updated daily</p>
  </div>
  <div class="legend">
    <span><span class="dot dot-fast"></span> 1-2 days</span>
    <span><span class="dot dot-mid"></span> 3-5 days</span>
    <span><span class="dot dot-slow"></span> 6+ days</span>
  </div>
  <table>
    <thead>
      <tr>${displayHeaders.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr>
      <tr class="filter-row">
        <th><input class="filter-input" type="text" placeholder="Filter..." data-col="0"></th>
        <th><input class="filter-input" type="text" placeholder="Filter currency..." data-col="1"></th>
        <th><input class="filter-input" type="text" placeholder="Filter currency..." data-col="2"></th>
        <th><input class="filter-input" type="text" placeholder="Filter delay..." data-col="3"></th>
        <th><select class="filter-select" data-col="4"><option value="">All</option><option value="Yes">Yes</option><option value="No">No</option><option value="N/A">N/A</option></select></th>
      </tr>
    </thead>
    <tbody>
${tableRows}
    </tbody>
  </table>
  <div class="footer">Source: adyen.com/payment-methods &middot; Last updated: ${buildDate}</div>
</div>
<script>
  const inputs = document.querySelectorAll('.filter-input');
  const selects = document.querySelectorAll('.filter-select');
  const rows = document.querySelectorAll('tbody tr');

  function applyFilters() {
    const filters = {};
    inputs.forEach(input => { filters[input.dataset.col] = input.value.toLowerCase(); });
    selects.forEach(sel => { filters[sel.dataset.col] = sel.value; });

    let visible = 0;
    rows.forEach((row) => {
      const cells = row.querySelectorAll('td');
      let show = true;
      for (const [col, val] of Object.entries(filters)) {
        if (!val) continue;
        const cellText = cells[parseInt(col)]?.textContent?.toLowerCase() || '';
        if (col === '4') {
          if (cellText.trim() !== val.toLowerCase()) { show = false; break; }
        } else {
          if (!cellText.includes(val)) { show = false; break; }
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
  selects.forEach(sel => sel.addEventListener('change', applyFilters));
</script>
</body>
</html>`;

if (!fs.existsSync(publishDir)) fs.mkdirSync(publishDir, { recursive: true });
const htmlPath = path.join(publishDir, "index.html");
fs.writeFileSync(htmlPath, html, "utf-8");
console.log(`HTML saved to: ${htmlPath}`);
