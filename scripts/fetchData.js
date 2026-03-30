const https = require("https");
const fs = require("fs");
const path = require("path");

const SITEMAP_URL = "https://www.adyen.com/sitemap-en.xml";
const BASE_URL = "https://www.adyen.com/payment-methods/";

const FIELDS_TO_EXTRACT = [
  "Settlement currency",
  "Processing currency",
  "Settlement delay",
];

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectUrl = res.headers.location.startsWith("http")
            ? res.headers.location
            : `https://www.adyen.com${res.headers.location}`;
          return fetchPage(redirectUrl).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
        res.on("error", reject);
      })
      .on("error", reject);
  });
}

async function discoverSlugs() {
  console.log("Fetching sitemap to discover all payment methods...");
  const xml = await fetchPage(SITEMAP_URL);
  const slugs = [];
  const regex = /payment-methods\/([a-z0-9][a-z0-9\-]*)/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    const slug = match[1];
    if (slug !== "all" && !slugs.includes(slug)) slugs.push(slug);
  }
  console.log(`Found ${slugs.length} payment methods in sitemap.`);
  return slugs;
}

function extractField(html, fieldName) {
  const labelIdx = html.toLowerCase().indexOf(fieldName.toLowerCase());
  if (labelIdx === -1) return "N/A";
  const afterLabel = html.substring(labelIdx, labelIdx + 1000);
  const valueCellMatch = afterLabel.match(
    /<\/div>[\s\S]*?<div[^>]*features__table__col-td[^>]*>([\s\S]*?)<\/div>/i
  );
  if (!valueCellMatch) return "N/A";
  const valueCell = valueCellMatch[1];
  const spanTexts = [];
  const spanRegex = /<span[^>]*>([^<]+)<\/span>/gi;
  let m;
  while ((m = spanRegex.exec(valueCell)) !== null) {
    const text = m[1].trim();
    if (text) spanTexts.push(text);
  }
  return spanTexts.length > 0 ? spanTexts.join("; ") : "N/A";
}

function extractSalesDayPayout(html) {
  const labelIdx = html.toLowerCase().indexOf("sales day payout");
  if (labelIdx === -1) return "N/A";
  const afterLabel = html.substring(labelIdx, labelIdx + 2000);
  const svgMatch = afterLabel.match(/aria-label="([^"]+)"/i);
  if (!svgMatch) return "N/A";
  const ariaLabel = svgMatch[1].toLowerCase();
  if (ariaLabel.includes("checkmark") || ariaLabel.includes("check")) return "Yes";
  if (ariaLabel.includes("cross")) return "No";
  return "N/A";
}

function normalizeDelay(value) {
  if (!value || value === "N/A") return value;
  if (/^\d+$/.test(value.trim())) return `${value.trim()} days`;
  return value;
}

function extractTitle(html) {
  const ogMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i);
  if (ogMatch) {
    let title = ogMatch[1];
    title = title.replace(/\s*payment method.*$/i, "").replace(/\s*-\s*Adyen$/i, "");
    return title.trim();
  }
  return null;
}

async function processSlug(slug) {
  const url = `${BASE_URL}${slug}`;
  try {
    const html = await fetchPage(url);
    const title = extractTitle(html) || slug;
    const result = { "Payment Method": title, Slug: slug };
    for (const field of FIELDS_TO_EXTRACT) {
      result[field] = extractField(html, field);
    }
    result["Settlement delay"] = normalizeDelay(result["Settlement delay"]);
    result["Sales day payout"] = extractSalesDayPayout(html);
    return result;
  } catch (err) {
    return {
      "Payment Method": slug, Slug: slug,
      "Settlement currency": `Error: ${err.message}`,
      "Processing currency": "", "Settlement delay": "", "Sales day payout": "",
    };
  }
}

function toCSV(rows) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => `"${(row[h] || "").replace(/"/g, '""')}"`).join(","));
  }
  return lines.join("\n");
}

async function main() {
  const slugs = await discoverSlugs();
  const BATCH_SIZE = 5;
  const DELAY_MS = 500;
  const results = [];

  for (let i = 0; i < slugs.length; i += BATCH_SIZE) {
    const batch = slugs.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map((s) => processSlug(s)));
    results.push(...batchResults);
    const done = Math.min(i + BATCH_SIZE, slugs.length);
    process.stdout.write(`  Processed ${done}/${slugs.length}\r`);
    if (i + BATCH_SIZE < slugs.length) await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  console.log(`\nDone! Processed ${results.length} payment methods.`);

  const dataDir = path.join(__dirname, "..", "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const csvPath = path.join(dataDir, "all_payment_method_info.csv");
  fs.writeFileSync(csvPath, toCSV(results), "utf-8");
  console.log(`CSV saved to: ${csvPath}`);

  const jsonPath = path.join(dataDir, "all_payment_method_info.json");
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2), "utf-8");
  console.log(`JSON saved to: ${jsonPath}`);
}

main();
