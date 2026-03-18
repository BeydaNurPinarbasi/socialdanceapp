/* eslint-disable no-console */
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

function toNumber(value) {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s) return null;
  // Handles both:
  // - "4,7"  -> 4.7
  // - "1.234,56" (TR) -> 1234.56
  // - "40.8167156" (lat/lng) -> 40.8167156
  let normalized = s;
  const hasDot = normalized.includes('.');
  const hasComma = normalized.includes(',');
  if (hasDot && hasComma) {
    // assume dot as thousands separator, comma as decimal
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else if (hasComma && !hasDot) {
    // assume comma as decimal
    normalized = normalized.replace(',', '.');
  } else {
    // keep as-is (dot decimal or integer)
  }
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function toInteger(value) {
  const n = toNumber(value);
  return n == null ? null : Math.trunc(n);
}

function toText(value) {
  if (value == null) return null;
  const s = String(value).trim();
  return s ? s : null;
}

function parseScrapedAt(value) {
  const s = toText(value);
  if (!s) return null;
  // Expected: '2025-10-21 09:05:43'
  const iso = s.includes('T') ? s : s.replace(' ', 'T') + 'Z';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function main() {
  const xlsxPath = path.join(process.cwd(), 'Data', 'Dans Mekan Data.xlsx');
  const outPath = path.join(process.cwd(), 'supabase', 'seed', 'schools.json');
  const wb = XLSX.readFile(xlsxPath);
  const sheetName = wb.SheetNames.includes('Dans Okulu Data') ? 'Dans Okulu Data' : wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: null });

  const mapped = rows
    .map((r) => ({
      name: toText(r.Name),
      category: toText(r.Category),
      address: toText(r.Address),
      city: toText(r['İl adı']),
      district: toText(r['İlçe adı']),
      latitude: toNumber(r.Latitude),
      longitude: toNumber(r.Longitude),
      rating: toNumber(r.Rating),
      review_count: toInteger(r.Review_count),
      price_range: toText(r.Price_range),
      current_status: toText(r.Current_status),
      next_status: toText(r.Next_status),
      website: toText(r.Website),
      telephone: toText(r.Telephone),
      original_url: toText(r.Original_URL),
      keyword: toText(r.Keyword),
      detail_url: toText(r.Detail_URL),
      scraped_at: parseScrapedAt(r.Scraped_at),
      snippet: toText(r.Tags),
      image_url: null,
    }))
    .filter((r) => r.name);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(mapped, null, 2), 'utf8');
  console.log(`Wrote ${mapped.length} records to ${path.relative(process.cwd(), outPath)}`);
}

main();

