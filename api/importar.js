// Lê uma página de receita (qualquer site) e devolve nome, ingredientes, modo de preparo, tempo, porções e foto.
// Usa os dados estruturados (schema.org/Recipe) que os sites de receita publicam para o Google.

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ordm: 'º', ordf: 'ª', deg: '°', frac12: '½', frac14: '¼', frac34: '¾' };
function txt(s) {
  return String(s == null ? '' : s)
    .replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&([a-z]+\d*);/gi, (m, n) => ENT[n.toLowerCase()] != null ? ENT[n.toLowerCase()] : m)
    .replace(/\s+/g, ' ').trim();
}
function tipos(o) { const t = o && o['@type']; return Array.isArray(t) ? t : [t]; }
function acharReceita(o, prof = 0) {
  if (!o || prof > 6) return null;
  if (Array.isArray(o)) { for (const x of o) { const r = acharReceita(x, prof + 1); if (r) return r; } return null; }
  if (typeof o !== 'object') return null;
  if (tipos(o).some(t => String(t).toLowerCase() === 'recipe')) return o;
  for (const k of ['@graph', 'mainEntity', 'mainEntityOfPage', 'itemListElement', 'item']) {
    if (o[k]) { const r = acharReceita(o[k], prof + 1); if (r) return r; }
  }
  return null;
}
function passosDe(ri) {
  const out = [];
  (function vai(x) {
    if (!x) return;
    if (typeof x === 'string') { x.split(/\n+|(?<=\.)\s+(?=\d+[.)-]\s)/).forEach(p => { p = txt(p).replace(/^\d+[.)-]\s*/, ''); if (p) out.push(p); }); return; }
    if (Array.isArray(x)) { x.forEach(vai); return; }
    if (x.itemListElement) { vai(x.itemListElement); return; }
    if (x.text) { vai(String(x.text)); return; }
    if (x.name) vai(String(x.name));
  })(ri);
  return out;
}
function fotoDe(im) {
  if (!im) return '';
  if (typeof im === 'string') return im;
  if (Array.isArray(im)) return fotoDe(im[0]);
  return im.url || im.contentUrl || '';
}
function meta(html, prop) {
  const re = new RegExp('<meta[^>]+(?:property|name)=["\']' + prop + '["\'][^>]*>', 'i');
  const m = html.match(re); if (!m) return '';
  const c = m[0].match(/content=["']([^"']*)["']/i); return c ? txt(c[1]) : '';
}
// Plano B: páginas sem dados estruturados — pega as listas depois de "Ingredientes" e "Modo de preparo".
function porTitulos(html) {
  const limpo = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
  function listaDepois(re) {
    const i = limpo.search(re); if (i < 0) return [];
    const trecho = limpo.slice(i, i + 25000);
    const fim = trecho.slice(30).search(/<h[1-4][^>]*>/i);
    const bloco = fim > 0 ? trecho.slice(0, fim + 30) : trecho;
    const itens = [...bloco.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map(m => txt(m[1])).filter(x => x && x.length < 400);
    if (itens.length) return itens;
    return [...bloco.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map(m => txt(m[1])).filter(x => x && x.length < 600);
  }
  return {
    ingredientes: listaDepois(/>\s*ingredientes\s*</i),
    passos: listaDepois(/>\s*(modo de preparo|modo de fazer|preparo|como fazer)\s*</i)
  };
}
function lerReceita(html, url) {
  let rec = null;
  for (const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    let j; try { j = JSON.parse(m[1].trim()); } catch (e) { try { j = JSON.parse(m[1].trim().replace(/[\u0000-\u001f]+/g, ' ')); } catch (e2) { continue; } }
    rec = acharReceita(j); if (rec) break;
  }
  let d;
  if (rec) {
    const y = Array.isArray(rec.recipeYield) ? rec.recipeYield.join(' ') : String(rec.recipeYield || '');
    d = {
      nome: txt(rec.name), ingredientes: [].concat(rec.recipeIngredient || rec.ingredients || []).map(txt).filter(Boolean),
      passos: passosDe(rec.recipeInstructions), tempo: rec.totalTime || rec.cookTime || rec.prepTime || '',
      porcoes: (y.match(/\d+/) || [''])[0], foto: fotoDe(rec.image), categoria: txt([].concat(rec.recipeCategory || []).join(' '))
    };
  } else {
    const b = porTitulos(html);
    d = { nome: meta(html, 'og:title') || txt((html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1]), ingredientes: b.ingredientes, passos: b.passos, tempo: '', porcoes: '', foto: meta(html, 'og:image'), categoria: '' };
  }
  if (!d.foto) d.foto = meta(html, 'og:image');
  if (d.foto) { try { d.foto = new URL(d.foto, url).href; } catch (e) { d.foto = ''; } }
  d.nome = (d.nome || '').replace(/\s*[|–-]\s*[^|–-]*$/, '').replace(/^receita (de|da|do)\s+/i, (m) => '').trim();
  d.nome = d.nome ? d.nome.charAt(0).toUpperCase() + d.nome.slice(1) : 'Receita importada';
  return d;
}
function bloqueado(h) {
  return /^(localhost|0\.0\.0\.0|\[?::1\]?|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(h) || !/\./.test(h);
}
async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  let url;
  try { url = new URL(String((req.query && req.query.url) || new URL(req.url, 'http://x').searchParams.get('url') || '')); } catch (e) { url = null; }
  if (!url || !/^https?:$/.test(url.protocol) || bloqueado(url.hostname)) { res.statusCode = 400; return res.end(JSON.stringify({ erro: 'Link inválido.' })); }
  try {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 12000);
    const r = await fetch(url.href, { signal: ctrl.signal, redirect: 'follow', headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'pt-BR,pt;q=0.9' } });
    clearTimeout(t);
    if (!r.ok) { res.statusCode = 502; return res.end(JSON.stringify({ erro: 'O site recusou a leitura (' + r.status + '). Tente outro site.' })); }
    const html = (await r.text()).slice(0, 4000000);
    const d = lerReceita(html, r.url || url.href);
    if (!d.ingredientes.length && !d.passos.length) { res.statusCode = 422; return res.end(JSON.stringify({ erro: 'Não achei uma receita nessa página. Abra a página da receita em si (não a lista de busca) e copie o link.' })); }
    d.fonte = url.href;
    res.statusCode = 200; return res.end(JSON.stringify(d));
  } catch (e) {
    res.statusCode = 502; return res.end(JSON.stringify({ erro: 'Não consegui abrir o site agora. Tente de novo.' }));
  }
}
module.exports = handler;
module.exports.lerReceita = lerReceita;
