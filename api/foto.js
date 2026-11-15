// Foto da receita: gera uma vez com IA (estilo fotografia de livro de receitas), guarda no Supabase
// e depois todo mundo recebe a mesma foto pronta, sem gerar de novo.
const SB = 'https://obqxbokptruohrgjohuy.supabase.co';
const SBK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9icXhib2twdHJ1b2hyZ2pvaHV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ2NzUzNzEsImV4cCI6MjExMDI1MTM3MX0.mQllYqlGzQcdS2sRHPd1J1FM2K56w2q2h_gCzPoSb9Q';
const BUCKET = 'cd-fotos';
const MODELO = 'bfl/flux-3-image-klein';

function slug(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }

let receitasApp = null, quando = 0;
async function receitaDoApp(id, host) {
  if (!receitasApp || Date.now() - quando > 10 * 60 * 1000) {
    const r = await fetch('https://' + host + '/index.html', { headers: { 'x-foto': '1' } });
    const html = await r.text(); const m = {};
    for (const ln of html.split('\n')) {
      if (!/^\["/.test(ln)) continue;
      try { const row = JSON.parse(ln.replace(/,\s*$/, '')); if (Array.isArray(row) && row.length === 10) m[slug(row[0])] = row; } catch (e) {}
    }
    receitasApp = m; quando = Date.now();
  }
  return receitasApp[id] || null;
}
async function receitaComunidade(id) {
  const r = await fetch(SB + '/rest/v1/cd_receitas?select=dados&rid=eq.' + encodeURIComponent(id), { headers: { apikey: SBK, Authorization: 'Bearer ' + SBK } });
  if (!r.ok) return null; const j = await r.json(); return j[0] ? j[0].dados : null;
}

const EN = { frango: 'chicken', carne: 'beef', bovina: 'beef', bovino: 'beef', porco: 'pork', suino: 'pork', peixe: 'fish', camarao: 'shrimp', arroz: 'rice', feijao: 'beans', lentilha: 'lentils',
  'grao-de-bico': 'chickpeas', macarrao: 'pasta', sopa: 'soup', creme: 'creamy soup', salada: 'salad', bolo: 'cake', torta: 'pie', pao: 'bread', ovos: 'eggs', ovo: 'egg', batata: 'potato',
  mandioca: 'cassava', abobora: 'pumpkin', abobrinha: 'zucchini', berinjela: 'eggplant', cogumelos: 'mushrooms', brocolis: 'broccoli', queijo: 'cheese', legumes: 'vegetables', assado: 'roasted', assada: 'roasted', recheada: 'stuffed', recheado: 'stuffed' };
function dica(nome) { const sl = '-' + slug(nome) + '-'; const w = Object.keys(EN).filter(k => sl.indexOf('-' + k + '-') >= 0).map(k => EN[k]); return w.length ? ' (' + [...new Set(w)].join(', ') + ')' : ''; }

function prompt(row, v) {
  const [nome, , cat, , , , , tags, ings] = row;
  const principais = String(ings || '').split(';').map(s => s.replace(/#\w\s*$/, '').replace(/^\s*(\d+(?:[.,]\d+)?\s+\S+\s+|ag\s+)/, '').trim())
    .filter(s => s && !/^(sal|azeite|óleo|oleo|água|agua|pimenta-do-reino)\b/i.test(s)).slice(0, 6).join(', ');
  const veg = /(^|,)veg(,|$)/.test(tags || '') && cat !== 'doce' ? ' Fully vegetarian, absolutely no meat.' : '';
  const angulo = ['three-quarter angle, 45 degrees', 'overhead flat lay', 'low side angle, close-up'][(v - 1) % 3];
  const tipo = { doce: 'dessert', cafe: 'breakfast', lanche: 'snack', sopa: 'soup', salada: 'salad', massa: 'pasta dish', acomp: 'side dish' }[cat] || 'main dish';
  return `Award-winning editorial food photography for a premium cookbook. The Brazilian ${tipo} "${nome}"${dica(nome)}, made with ${principais}.${veg} ` +
    `Artfully plated on handmade ceramic, styled by a professional food stylist, garnished with fresh herbs. Soft natural window light, gentle shadows, shallow depth of field, ` +
    `rich true-to-life colors, rustic linen and dark wood surface, ${angulo}. Appetizing, realistic, magazine quality. No text, no logos, no people, no hands.`;
}

async function gerar(texto, token) {
  const pedir = (corpo) => fetch('https://ai-gateway.vercel.sh/v1/images/generations', {
    method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
  const base = { model: MODELO, prompt: texto, n: 1, providerOptions: { blackForestLabs: { outputFormat: 'jpeg' } } };
  let r = await pedir(Object.assign({ size: '1024x768' }, base));
  if (r.status === 400) r = await pedir(base);
  if (!r.ok) throw new Error('gerar ' + r.status + ' ' + (await r.text()).slice(0, 300));
  const j = await r.json(); const d = j.data && j.data[0];
  if (d && d.b64_json) return Buffer.from(d.b64_json, 'base64');
  if (d && d.url) { const im = await fetch(d.url); return Buffer.from(await im.arrayBuffer()); }
  throw new Error('sem imagem');
}

module.exports = async function (req, res) {
  const q = new URL(req.url, 'http://x').searchParams;
  const id = String(q.get('id') || ''), v = Math.min(3, Math.max(1, parseInt(q.get('v'), 10) || 1));
  if (!/^[a-z0-9-]{2,90}$/.test(id)) { res.statusCode = 400; return res.end('id'); }
  const nome = id + '.v' + v + '.jpg', pub = SB + '/storage/v1/object/public/' + BUCKET + '/' + nome;
  const pronta = () => { res.statusCode = 302; res.setHeader('Location', pub); res.setHeader('Cache-Control', 'public, max-age=604800, s-maxage=31536000, immutable'); res.end(); };
  try {
    const h = await fetch(pub, { method: 'HEAD' });
    if (h.ok) return pronta();
    const row = id.startsWith('m-') ? await receitaComunidade(id) : await receitaDoApp(id, req.headers.host);
    if (!row) { res.statusCode = 404; res.setHeader('Cache-Control', 'public, s-maxage=600'); return res.end('receita'); }
    const token = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || req.headers['x-vercel-oidc-token'];
    if (!token) throw new Error('sem token do AI Gateway');
    const img = await gerar(prompt(row, v), token);
    const up = await fetch(SB + '/storage/v1/object/' + BUCKET + '/' + nome, { method: 'POST',
      headers: { apikey: SBK, Authorization: 'Bearer ' + SBK, 'Content-Type': 'image/jpeg', 'x-upsert': 'false', 'Cache-Control': '31536000' }, body: img });
    if (up.ok || up.status === 409 || up.status === 400) {
      const ok2 = await fetch(pub, { method: 'HEAD' }); if (ok2.ok) return pronta();
    }
    console.error('upload falhou', up.status, (await up.text()).slice(0, 200));
    res.statusCode = 200; res.setHeader('Content-Type', 'image/jpeg'); res.setHeader('Cache-Control', 'public, max-age=3600'); return res.end(img);
  } catch (e) {
    console.error('foto', id, e && e.message);
    res.statusCode = 503; res.setHeader('Cache-Control', 'no-store'); return res.end('indisponivel');
  }
};
module.exports.prompt = prompt;
