// Foto da receita: procura a melhor foto GRÁTIS para o prato e manda o celular direto para ela.
// Ordem: Unsplash (UNSPLASH_KEY) → Pixabay (PIXABAY_KEY) → Pexels (PEXELS_KEY) — bancos profissionais grátis, cada um precisa de uma chave grátis → Wikimedia "Quality images" → Openverse (Flickr etc.).
// A escolha fica guardada no cache da Vercel, então cada prato é pesquisado uma vez só.
const SB = 'https://obqxbokptruohrgjohuy.supabase.co';
const SBK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9icXhib2twdHJ1b2hyZ2pvaHV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ2NzUzNzEsImV4cCI6MjExMDI1MTM3MX0.mQllYqlGzQcdS2sRHPd1J1FM2K56w2q2h_gCzPoSb9Q';

function norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); }
function slug(s) { return norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }

let receitasApp = null, quando = 0;
async function receitaDoApp(id, host) {
  if (!receitasApp || Date.now() - quando > 10 * 60 * 1000) {
    let html = '';
    for (const f of [require('path').join(__dirname, '..', 'index.html'), require('path').join(process.cwd(), 'index.html')]) { try { html = require('fs').readFileSync(f, 'utf8'); break; } catch (e) {} }
    if (!html) html = await (await fetch('https://' + host + '/index.html')).text();
    const m = {};
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

// Tradução dos nomes de prato para inglês (os bancos de fotos têm muito mais fotos com descrição em inglês)
const FRASES = [['grao-de-bico', 'chickpea'], ['batata-doce', 'sweet potato'], ['couve-flor', 'cauliflower'], ['carne moida', 'ground beef'], ['pao de queijo', 'cheese bread'],
  ['arroz doce', 'rice pudding'], ['pudim de leite', 'flan caramel pudding'], ['bolo de cenoura', 'carrot cake'], ['bolo de chocolate', 'chocolate cake'], ['feijao tropeiro', 'beans with cassava flour'],
  ['frango assado', 'roast chicken'], ['peixe assado', 'baked fish'], ['salada de frutas', 'fruit salad'], ['caldo verde', 'kale potato soup'], ['escondidinho', 'shepherds pie'],
  ['macarrao a bolonhesa', 'spaghetti bolognese'], ['a bolonhesa', 'bolognese'], ['a parmegiana', 'parmigiana'], ['a milanesa', 'breaded cutlet'], ['ao sugo', 'tomato sauce'], ['alho e oleo', 'garlic and oil'],
  ['torta de limao', 'lemon pie'], ['mousse de maracuja', 'passion fruit mousse'], ['pao de alho', 'garlic bread'], ['cachorro-quente', 'hot dog'], ['pe de moleque', 'peanut brittle']];
const PAL = { frango: 'chicken', galinha: 'chicken', carne: 'beef', bife: 'steak', bovina: 'beef', bovino: 'beef', porco: 'pork', suino: 'pork', lombo: 'pork loin', costelinha: 'pork ribs', costela: 'ribs',
  linguica: 'sausage', peixe: 'fish', tilapia: 'tilapia', salmao: 'salmon', camarao: 'shrimp', bacalhau: 'cod', atum: 'tuna', sardinha: 'sardines', arroz: 'rice', feijao: 'beans', lentilha: 'lentil',
  macarrao: 'pasta', espaguete: 'spaghetti', penne: 'penne', talharim: 'tagliatelle', lasanha: 'lasagna', nhoque: 'gnocchi', risoto: 'risotto', sopa: 'soup', caldo: 'broth', creme: 'cream soup',
  salada: 'salad', bolo: 'cake', torta: 'pie', quiche: 'quiche', pao: 'bread', ovos: 'eggs', ovo: 'egg', omelete: 'omelette', panqueca: 'pancakes', tapioca: 'tapioca', cuscuz: 'couscous',
  batata: 'potato', batatas: 'potatoes', mandioca: 'cassava', abobora: 'pumpkin', abobrinha: 'zucchini', berinjela: 'eggplant', cogumelos: 'mushrooms', cogumelo: 'mushroom', brocolis: 'broccoli',
  espinafre: 'spinach', cenoura: 'carrot', tomate: 'tomato', milho: 'corn', queijo: 'cheese', legumes: 'vegetables', palmito: 'palm hearts', pimentao: 'bell pepper', vagem: 'green beans',
  strogonoff: 'stroganoff', hamburguer: 'burger', pizza: 'pizza', curry: 'curry', moqueca: 'moqueca fish stew', feijoada: 'feijoada', falafel: 'falafel', homus: 'hummus', tofu: 'tofu', chili: 'chili',
  tacos: 'tacos', burrito: 'burrito', quesadilla: 'quesadilla', yakisoba: 'yakisoba noodles', ratatouille: 'ratatouille', polenta: 'polenta', brigadeiro: 'brigadeiro', mousse: 'mousse',
  sorvete: 'ice cream', chocolate: 'chocolate', banana: 'banana', limao: 'lemon', coco: 'coconut', granola: 'granola', iogurte: 'yogurt', vitamina: 'smoothie', smoothie: 'smoothie', brownie: 'brownie',
  cookies: 'cookies', sanduiche: 'sandwich', wrap: 'wrap', coxinha: 'coxinha', esfiha: 'sfiha', pastel: 'pastel', empada: 'pie', empadao: 'pot pie', farofa: 'farofa', pure: 'mashed', vinagrete: 'salsa',
  assado: 'roasted', assada: 'roasted', grelhado: 'grilled', grelhada: 'grilled', frito: 'fried', frita: 'fried', empanado: 'breaded', recheada: 'stuffed', recheado: 'stuffed', gratinada: 'gratin',
  cremoso: 'creamy', cremosa: 'creamy', vegetariano: 'vegetarian', vegetariana: 'vegetarian', integral: 'whole grain', mexidos: 'scrambled', acebolado: 'with onions', ensopado: 'stew', refogada: 'sauteed' };
const TIRA = /\b(caseir[oa]s?|de liquidificador|na airfryer|na air fryer|de panela de pressao|rapid[oa]s?|facil|fit|da vovo|simples|de frigideira|de forno|no forno|de latinha|de panela|prato feito)\b/g;
const STOP = new Set(['de', 'da', 'do', 'das', 'dos', 'com', 'e', 'a', 'o', 'ao', 'na', 'no', 'em', 'para']);
function ingles(nome) {
  let t = ' ' + norm(nome).replace(/\([^)]*\)/g, ' ').replace(TIRA, ' ') + ' ';
  const achados = [];
  for (const [pt, en] of FRASES) if (t.includes(' ' + pt + ' ')) { achados.push(en); t = t.replace(' ' + pt + ' ', ' '); }
  t.split(/\s+/).filter(w => w && !STOP.has(w)).forEach(w => { if (PAL[w]) achados.push(PAL[w]); });
  return [...new Set(achados)].join(' ');
}
function consultas(row) {
  const nome = row[0], pt = norm(nome).replace(/\([^)]*\)/g, ' ').replace(TIRA, ' ').replace(/\s+/g, ' ').trim();
  const en = ingles(nome), veg = /(^|,)veg(,|$)/.test(row[7] || '') && row[2] !== 'doce';
  const qs = [];
  if (en) qs.push({ q: en + (veg && !/vegetarian/.test(en) ? ' vegetarian' : ''), lang: 'en-US' });
  qs.push({ q: pt, lang: 'pt-BR' });
  if (en && en.split(' ').length > 2) qs.push({ q: en.split(' ').slice(0, 2).join(' '), lang: 'en-US' });
  const pt2 = pt.split(' ').filter(w => !STOP.has(w)).slice(0, 2).join(' '); if (pt2 && pt2 !== pt) qs.push({ q: pt2, lang: 'pt-BR' });
  return qs;
}
// pontua pelo texto da foto: precisa ter a palavra principal do prato
function pontos(desc, q) {
  const d = ' ' + norm(desc) + ' ', ws = norm(q).split(/\s+/).filter(w => w.length > 2 && !STOP.has(w) && !['food', 'dish', 'vegetarian', 'with'].includes(w));
  if (!ws.length) return 0.5;
  const tem = ws.filter(w => d.includes(w.slice(0, Math.max(4, w.length - 1))));
  return tem.length / ws.length;
}
const RUIM = /\b(map|logo|icon|diagram|flag|drawing|illustration|cartoon|vector|clipart|poster|menu|package|label|screenshot|text|people eating|hands? holding|plant|field|farm|market|supermarket|raw meat|butcher)\b/i;

async function unsplash(c) {
  const k = process.env.UNSPLASH_KEY; if (!k) return [];
  const r = await fetch('https://api.unsplash.com/search/photos?per_page=15&orientation=landscape&content_filter=high&lang=' + c.lang.slice(0, 2) + '&query=' + encodeURIComponent(c.q), { headers: { Authorization: 'Client-ID ' + k, 'Accept-Version': 'v1' } });
  if (!r.ok) { LOG.push('unsplash ' + r.status); return []; }
  const j = await r.json(); LOG.push('unsplash ok ' + c.q + ' ' + (j.results || []).length);
  return (j.results || []).map((p, i) => { const d = [p.alt_description, p.description, (p.tags || []).map(t => t.title).join(' ')].filter(Boolean).join(' ');
    if (RUIM.test(d)) return null; return { u: p.urls.regular, s: pontos(d, c.q) * 2 + (15 - i) / 15, fonte: 'Unsplash' }; }).filter(x => x && x.s >= 1.2);
}
async function pixabay(c) {
  const k = process.env.PIXABAY_KEY; if (!k) return [];
  const r = await fetch('https://pixabay.com/api/?key=' + encodeURIComponent(k) + '&image_type=photo&category=food&orientation=horizontal&safesearch=true&per_page=20&order=popular&lang=' + c.lang.slice(0, 2) + '&q=' + encodeURIComponent(c.q.slice(0, 100)));
  if (!r.ok) { LOG.push('pixabay ' + r.status); return []; }
  const j = await r.json(); LOG.push('pixabay ok ' + c.q + ' ' + (j.hits || []).length);
  return (j.hits || []).filter(h => !RUIM.test(h.tags || '')).map((h, i) => ({ u: h.largeImageURL || h.webformatURL, s: pontos(h.tags || '', c.q) * 2 + (20 - i) / 20 + Math.min(1, (h.likes || 0) / 200) * 0.3, fonte: 'Pixabay' }))
    .filter(x => x.s >= 1.2);
}
async function pexels(c) {
  const k = process.env.PEXELS_KEY; if (!k) return [];
  const r = await fetch('https://api.pexels.com/v1/search?per_page=15&orientation=landscape&locale=' + c.lang + '&query=' + encodeURIComponent(c.q), { headers: { Authorization: k } });
  if (!r.ok) return [];
  const j = await r.json();
  return (j.photos || []).filter(p => !RUIM.test(p.alt || '')).map((p, i) => ({ u: p.src.large || p.src.medium, s: pontos(p.alt || '', c.q) * 2 + (15 - i) / 15, fonte: 'Pexels' }))
    .filter(x => x.s >= 1.2);
}
async function commons(c) {
  const busca = async (extra) => {
    const r = await fetch('https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=20&prop=imageinfo&iiprop=url|mime|size&iiurlwidth=1024&gsrsearch='
      + encodeURIComponent(c.q + ' filetype:bitmap' + extra), { headers: { 'User-Agent': 'CardapioDaSemana/1.0 (app pessoal)' } });
    if (!r.ok) { LOG.push('commons ' + r.status + ' ' + c.q); return []; }
    const j = await r.json(); LOG.push('commons ok ' + c.q + extra + ' ' + (j.query ? Object.keys(j.query.pages).length : 0)); const ps = j.query && j.query.pages ? Object.values(j.query.pages) : [];
    return ps.sort((a, b) => (a.index || 0) - (b.index || 0)).map(p => {
      const ii = p.imageinfo && p.imageinfo[0]; if (!ii || !/jpe?g|png|webp/.test(ii.mime || '')) return null;
      if (ii.width < 800 || ii.height < 500 || ii.width / ii.height > 1.9 || ii.width / ii.height < 0.7 || RUIM.test(p.title)) return null;
      const s = pontos(p.title.replace(/^File:/, '').replace(/[_-]/g, ' '), c.q); if (s < 0.5) return null;
      return { u: ii.thumburl || ii.url, s: s + (extra ? 1 : 0), fonte: 'Wikimedia' };
    }).filter(Boolean);
  };
  const boas = await busca(' incategory:"Quality_images"');
  return boas.length ? boas : await busca('');
}
async function openverse(c) {
  const r = await fetch('https://api.openverse.org/v1/images/?page_size=20&mature=false&category=photograph&size=large&aspect_ratio=wide,square&q=' + encodeURIComponent(c.q));
  if (!r.ok) { LOG.push('openverse ' + r.status); return []; }
  const j = await r.json(); LOG.push('openverse ok ' + (j.results || []).length);
  return (j.results || []).filter(x => !RUIM.test((x.title || '') + ' ' + (x.tags || []).map(t => t.name).join(' ')))
    .map(x => ({ u: x.url, s: pontos((x.title || '') + ' ' + (x.tags || []).map(t => t.name).join(' '), c.q), fonte: 'Openverse' })).filter(x => x.s >= 0.6);
}
async function melhores(row) {
  const out = [], visto = new Set();
  const junta = (a) => a.sort((x, y) => y.s - x.s).forEach(x => { if (!visto.has(x.u)) { visto.add(x.u); out.push(x); } });
  for (const c of consultas(row)) {
    junta(await unsplash(c).catch(() => []));
    if (out.length < 3) junta(await pixabay(c).catch(() => []));
    if (out.length < 3) junta(await pexels(c).catch(() => []));
    if (out.length >= 3) return out;
  }
  for (const c of consultas(row)) {
    junta(await commons(c).catch(() => []));
    if (out.length >= 3) return out;
  }
  if (out.length < 3) junta(await openverse(consultas(row)[0]).catch(() => []));
  return out;
}

let LOG = [];
module.exports = async function (req, res) {
  LOG = [];
  const q = new URL(req.url, 'http://x').searchParams;
  const id = String(q.get('id') || ''), v = Math.min(3, Math.max(1, parseInt(q.get('v'), 10) || 1));
  if (!/^[a-z0-9-]{2,90}$/.test(id)) { res.statusCode = 400; return res.end('id'); }
  try {
    const row = id.startsWith('m-') ? await receitaComunidade(id) : await receitaDoApp(id, req.headers.host);
    if (!row) { res.statusCode = 404; res.setHeader('Cache-Control', 'public, s-maxage=600'); return res.end('receita'); }
    const fotos = await melhores(row);
    if (q.get('debug')) { res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); return res.end(JSON.stringify({ log: LOG, fotos }, null, 1)); }
    if (!fotos.length) { res.statusCode = 404; res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600'); return res.end('sem foto'); }
    const f = fotos[(v - 1) % fotos.length];
    res.statusCode = 302; res.setHeader('Location', f.u); res.setHeader('X-Fonte', f.fonte);
    res.setHeader('Cache-Control', 'public, max-age=604800, s-maxage=2592000');
    return res.end();
  } catch (e) {
    console.error('foto', id, e && e.message);
    res.statusCode = 503; res.setHeader('Cache-Control', 'no-store'); return res.end('indisponivel');
  }
};
module.exports.consultas = consultas;
