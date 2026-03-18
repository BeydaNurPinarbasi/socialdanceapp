/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

async function main() {
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL (veya EXPO_PUBLIC_SUPABASE_URL) gerekli.');
  }
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY gerekli (sadece seed/import için).');
  }

  const seedPath = path.join(process.cwd(), 'supabase', 'seed', 'schools.json');
  const raw = fs.readFileSync(seedPath, 'utf8');
  const schools = JSON.parse(raw);

  const chunkSize = 500;
  let inserted = 0;

  for (let i = 0; i < schools.length; i += chunkSize) {
    const chunk = schools.slice(i, i + chunkSize);
    const res = await fetch(`${supabaseUrl}/rest/v1/schools?on_conflict=name,address`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(chunk),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Import failed (${res.status}): ${text}`);
    }

    inserted += chunk.length;
    console.log(`Imported ${inserted}/${schools.length}`);
  }

  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

