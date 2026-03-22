const SUPABASE_URL = 'https://lyodbjvysuvlgdaqrrpp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5b2RianZ5c3V2bGdkYXFycnBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMzUyMzIsImV4cCI6MjA4OTcxMTIzMn0.5oE5e2Bhd5KlvAM57V8JnFx6uw6tGvOaqQ-2QTjUzAg';

async function db(path, method, body) {
  const h = {
    'apikey': SUPABASE_KEY,
    'Authorization': 'Bearer ' + SUPABASE_KEY,
    'Content-Type': 'application/json'
  };
  if (method === 'POST' || method === 'PATCH') h['Prefer'] = 'return=representation';
  const r = await fetch(SUPABASE_URL + '/rest/v1/' + path, {
    method: method || 'GET',
    headers: h,
    body: body ? JSON.stringify(body) : undefined
  });
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch(e) { j = t; }
  if (!r.ok) throw new Error('DB ' + r.status + ': ' + (j?.message || j?.hint || JSON.stringify(j)));
  return j;
}
