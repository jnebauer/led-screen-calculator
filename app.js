// app.js — LED Screen Calculator (remote module)
(function(){
  function injectScript(url){return new Promise((res,rej)=>{const s=document.createElement('script');s.src=url;s.onload=res;s.onerror=()=>rej(new Error('Failed '+url));document.head.appendChild(s);});}
  const needHtml2Canvas = !window.html2canvas;
  const needJsPDF = !(window.jspdf && window.jspdf.jsPDF);
  const libPromises = [];
  if (needHtml2Canvas) libPromises.push(injectScript('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js'));
  if (needJsPDF)       libPromises.push(injectScript('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'));

  const style = document.createElement('style');
  style.textContent = `
    :root { --bg:#0b1220; --card:#0f172a; --muted:#94a3b8; --line:#203049; --text:#e2e8f0; --accent:#60a5fa; --chip:#0b2545; }
    *{box-sizing:border-box} body{margin:0;font-family:Inter,system-ui,Arial,sans-serif;background:var(--bg);color:var(--text)}
    a{color:var(--accent);text-decoration:none}
    .container{max-width:1200px;margin:0 auto;padding:20px}
    h1{font-size:22px;margin:0 0 8px 0}
    .muted{color:var(--muted)}
    .grid{display:grid;gap:16px}
    @media(min-width:1000px){ .grid-3{grid-template-columns:320px 1fr} }
    .card{background:var(--card);border:1px solid var(--line);border-radius:16px;box-shadow:0 1px 2px rgba(0,0,0,.15)}
    .card .hd{padding:16px 16px 0} .card .bd{padding:16px}
    label{font-size:12px;color:var(--muted);display:block;margin-bottom:6px}
    input,select,button,textarea{width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:#0b1a2e;color:var(--text)}
    button.btn{background:var(--accent);border-color:transparent;color:#051325;cursor:pointer;font-weight:600}
    button.ghost{background:transparent;border-color:var(--line);color:var(--text)}
    .row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .spec{border:1px solid var(--line);border-radius:12px;padding:10px;background:#0b1a2e}
    .spec .l{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
    .spec .v{font-weight:600}
    .chips{display:flex;gap:8px;flex-wrap:wrap}
    .chip{background:var(--chip);border:1px solid var(--line);padding:4px 10px;border-radius:999px;font-size:12px;color:#bcd7ff;cursor:pointer}
    .center{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
    .frame{border:1px solid var(--line);border-radius:12px;overflow:hidden;background:#031022}
    .note{font-size:12px;color:var(--muted)}
    table{width:100%;border-collapse:collapse;font-size:13px}
    th,td{padding:8px 6px;border-top:1px solid var(--line);text-align:left}
    .danger{color:#fecaca}
    .ok{color:#86efac}
    .inline{display:inline-flex;gap:8px;align-items:center}
    .actions{display:flex;gap:8px;flex-wrap:wrap}
    dialog{border:none;border-radius:14px;padding:0;max-width:640px;width:clamp(300px,90vw,640px);background:#0f172a;color:#e2e8f0}
    dialog .hd{padding:16px;border-bottom:1px solid var(--line)} dialog .bd{padding:16px} dialog .ft{padding:16px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end}
  `;
  document.head.appendChild(style);

  document.body.innerHTML = `
    <div class="container">
      <div class="center" style="margin-bottom:12px">
        <div>
          <h1>LED Screen Calculator — Pro</h1>
          <div class="muted">Pixels → smallest working sender • power + amps • physical size • presets • redundancy • PDF • shareable URL</div>
        </div>
        <div class="actions">
          <button class="ghost" id="btn-settings">Settings</button>
          <button class="btn" id="btn-pdf">Download A4 PDF</button>
          <button class="ghost" id="btn-share">Copy shareable link</button>
        </div>
      </div>

      <div class="grid grid-3">
        <div class="card">
          <div class="hd"><strong>Inputs</strong></div>
          <div class="bd">
            <div class="row">
              <div>
                <label>Tile product</label>
                <select id="tile"></select>
              </div>
              <div>
                <label>Tile size (mm) — W × H</label>
                <div class="row"><input id="tileMmW" type="number" min="1" value="500"/><input id="tileMmH" type="number" min="1" value="500"/></div>
              </div>
            </div>

            <div class="row" style="margin-top:10px">
              <div>
                <label>Tiles (W)</label>
                <input id="tilesW" type="number" min="1" value="6" />
              </div>
              <div>
                <label>Tiles (H)</label>
                <input id="tilesH" type="number" min="1" value="4" />
              </div>
            </div>

            <div class="row" style="margin-top:10px">
              <div>
                <label>Tile max power (W)</label>
                <input id="tilePower" type="number" min="1" value="200" />
              </div>
              <div>
                <label>Utilisation (% of max) • brightness factor</label>
                <div class="row"><input id="utilPct" type="number" min="1" max="100" value="40"/><input id="brightPct" type="number" min="1" max="100" value="80"/></div>
              </div>
            </div>

            <div class="row" style="margin-top:10px">
              <div>
                <label>Headroom (%)</label>
                <input id="headroom" type="number" min="0" value="20" />
              </div>
              <div>
                <label>Redundancy</label>
                <select id="redundancy">
                  <option value="none">None</option>
                  <option value="dual">Dual backup (primary + backup)</option>
                </select>
              </div>
            </div>

            <div style="margin-top:10px">
              <label>Quick presets</label>
              <div class="chips">
                <button class="chip" data-preset="1080p">Target 1080p (1920×1080)</button>
                <button class="chip" data-preset="4k">Target 4K (3840×2160)</button>
                <button class="chip" data-preset="16:9">Closest 16:9 aspect</button>
              </div>
            </div>

            <div style="margin-top:14px">
              <label>Sender inventory (editable here or paste CSV)</label>
              <div id="inv" class="note"></div>
              <div class="row" style="margin-top:8px">
                <button class="ghost" id="btn-edit-senders">Edit senders</button>
                <button class="ghost" id="btn-edit-tiles">Edit tiles</button>
              </div>
            </div>
          </div>
        </div>

        <div class="grid">
          <div class="card">
            <div class="hd"><strong>Calculated Specs</strong></div>
            <div class="bd">
              <div class="grid" style="grid-template-columns:repeat(3,minmax(0,1fr));gap:10px" id="specs"></div>
            </div>
          </div>

          <div class="card">
            <div class="hd"><strong>Signal & Power Schematic (rough)</strong></div>
            <div class="bd">
              <div id="report" class="frame" style="padding:12px"></div>
              <div class="note" style="margin-top:6px">Diagram is schematic. Actual data/power chaining may vary by receiver card and PSU topology.</div>
            </div>
          </div>

          <div class="card">
            <div class="hd"><strong>Sender Fit (ranked — smallest that works first)</strong></div>
            <div class="bd" style="overflow:auto">
              <div class="inline" style="margin-bottom:8px">
                <input type="checkbox" id="showAllModels" />
                <label for="showAllModels" style="margin:0">Show all models (incl. qty 0)</label>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Model</th><th>Qty</th><th>Ports</th><th>Per-port cap</th><th>Total cap</th><th>Ports used</th><th>Max WxH</th><th>Units needed</th>
                  </tr>
                </thead>
                <tbody id="sender-body"></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div class="card" id="editor" style="margin-top:14px">
        <div class="hd"><strong>Data Editor</strong> <span class="muted"> • Add/adjust tiles & senders • CSV paste (“model,qty,ports,perPort,total,maxW,maxH”)</span></div>
        <div class="bd">
          <div class="row">
            <div>
              <label>Sender CSV</label>
              <textarea id="senderCsv" rows="6" placeholder="VX600,2,6,575000,650000,3840,1920"></textarea>
              <div class="inline" style="margin-top:8px">
                <button class="ghost" id="btn-apply-senders">Apply CSV</button>
                <span class="note">Or edit quantities/specs inline in code if you prefer.</span>
              </div>
            </div>
            <div>
              <label>Tile CSV</label>
              <textarea id="tileCsv" rows="6" placeholder="BrandName 2.6,Unilumen,2.6,192,192,500,500,200"></textarea>
              <div class="inline" style="margin-top:8px">
                <button class="ghost" id="btn-apply-tiles">Apply CSV</button>
                <span class="note">Cols: name,brand,pitch,pxW,pxH,mmW,mmH,maxW</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <dialog id="settings">
        <div class="hd"><strong>Settings</strong></div>
        <div class="bd">
          <div class="row">
            <div>
              <label>Google Sheet — Senders CSV URL</label>
              <input id="cfgSenders" placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv" />
            </div>
            <div>
              <label>Google Sheet — Tiles CSV URL</label>
              <input id="cfgTiles" placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv" />
            </div>
          </div>
          <div class="note" style="margin-top:8px">Paste each tab’s “Publish to web → CSV” URL. Saved locally to this device.</div>
        </div>
        <div class="ft">
          <button class="ghost" id="cfgCancel">Cancel</button>
          <button class="btn" id="cfgSave">Save</button>
        </div>
      </dialog>

      <div class="note" style="margin-top:10px">
        Verify limits against NovaStar manuals and your receiver cards. Numbers here are conservative defaults; update per job/firmware.
      </div>
    </div>
  `;

  Promise.all(libPromises).finally(()=>boot());

  function boot(){
    let NOVASTAR_SENDERS = JSON.parse(localStorage.getItem('senders_v2') || 'null') || [
      { model: "MCTRL300", qty: 0, ports: 4,  perPortPxLimit: 520000, totalPxLimit: 650000,  maxW: 3840, maxH: 1920 },
      { model: "MCTRL660 Pro", qty: 0, ports: 6, perPortPxLimit: 383333, totalPxLimit: 650000, maxW: 3840, maxH: 1920 },
      { model: "VX4S", qty: 3, ports: 4,  perPortPxLimit: 575000, totalPxLimit: 650000,  maxW: 3840, maxH: 1920 },
      { model: "VX4",  qty: 4, ports: 4,  perPortPxLimit: 575000, totalPxLimit: 650000,  maxW: 3840, maxH: 1920 },
      { model: "MCTRL4K", qty: 4, ports: 16, perPortPxLimit: 650000, totalPxLimit: 8800000, maxW: 7680, maxH: 7680 },
      { model: "MCTRL660", qty: 5, ports: 4,  perPortPxLimit: 575000, totalPxLimit: 650000,  maxW: 3840, maxH: 1920 },
      { model: "VX600", qty: 0, ports: 6,  perPortPxLimit: 575000, totalPxLimit: 650000,  maxW: 3840, maxH: 1920 },
      { model: "VX1000", qty: 0, ports: 10, perPortPxLimit: 575000, totalPxLimit: 650000,  maxW: 3840, maxH: 1920 }
    ];

    let LED_TILES = JSON.parse(localStorage.getItem('tiles_v2') || 'null') || [
      { id: "unilumen-2.6", name: "Unilumen 2.6", brand: "Unilumen", pitchMm: 2.6, pxW: 192, pxH: 192, mmW: 500, mmH: 500, maxPowerW: 200 },
      { id: "absen-aluvision-2.8", name: "Absen/Aluvision 2.8", brand: "Absen/Aluvision", pitchMm: 2.8, pxW: 176, pxH: 176, mmW: 496, mmH: 496, maxPowerW: 200 },
      { id: "recience-1.9", name: "Recience 1.9", brand: "Recience", pitchMm: 1.9, pxW: 256, pxH: 256, mmW: 500, mmH: 500, maxPowerW: 200 },
      { id: "recience-m-1.9", name: "Recience Mitred 1.9", brand: "Recience (Mitred)", pitchMm: 1.9, pxW: 256, pxH: 256, mmW: 500, mmH: 500, maxPowerW: 200 },
      { id: "led-arts-3.9", name: "LED Arts 3.9", brand: "LED Arts", pitchMm: 3.9, pxW: 128, pxH: 128, mmW: 500, mmH: 500, maxPowerW: 200 }
    ];

    const SHEET_SENDERS_CSV = localStorage.getItem('cfg_senders_csv') || '';
    const SHEET_TILES_CSV   = localStorage.getItem('cfg_tiles_csv') || '';

    async function fetchCsv(url){
      const res = await fetch(url, { cache: 'no-store' });
      const txt = await res.text();
      return txt.split(/\r?\n/).map(l=>l.trim()).filter(Boolean).map(l=>l.split(',').map(s=>s.trim()));
    }
    async function loadDataFromSheets(){
      try {
        if (SHEET_SENDERS_CSV) {
          const rows = await fetchCsv(SHEET_SENDERS_CSV);
          const [header, ...data] = rows;
          NOVASTAR_SENDERS = data.map(r => {
            const idx = (name)=> header.indexOf(name);
            const get = (name)=> r[idx(name)];
            return {
              model: get('model'),
              qty: parseInt(get('qty')||'0',10),
              ports: parseInt(get('ports')||'4',10),
              perPortPxLimit: parseInt(get('perPortPxLimit')||'575000',10),
              totalPxLimit: parseInt(get('totalPxLimit')||'650000',10),
              maxW: parseInt(get('maxW')||'3840',10),
              maxH: parseInt(get('maxH')||'1920',10)
            };
          });
        }
        if (SHEET_TILES_CSV) {
          const rows = await fetchCsv(SHEET_TILES_CSV);
          const [header, ...data] = rows;
          LED_TILES = data.map(r => {
            const idx = (name)=> header.indexOf(name);
            const get = (name)=> r[idx(name)];
            return {
              id: get('id') || (get('name')||'tile').toLowerCase().replace(/[^a-z0-9]+/g,'-'),
              name: get('name') || '',
              brand: get('brand') || '',
              pitchMm: parseFloat(get('pitchMm')||'2.6'),
              pxW: parseInt(get('pxW')||'192',10),
              pxH: parseInt(get('pxH')||'192',10),
              mmW: parseFloat(get('mmW')||'500'),
              mmH: parseFloat(get('mmH')||'500'),
              maxPowerW: parseFloat(get('maxPowerW')||'200')
            };
          });
        }
      } catch (e) { console.warn('Sheet fetch failed, using built-in data', e); }
    }

    const $ = (id)=>document.getElementById(id);
    const round=(n,dp=0)=>{const f=Math.pow(10,dp);return Math.round((n+Number.EPSILON)*f)/f;};
    const mmToM=(mm)=>mm/1000, mmToIn=(mm)=>mm/25.4;

    function visibleSenders(){ const showAll = $('#showAllModels').checked; return NOVASTAR_SENDERS.filter(s => showAll ? true : (s.qty||0) > 0); }
    function rankSenders(totalPx, wPx, hPx){
      const pool = visibleSenders();
      return pool
        .map(s => {
          const portsNeeded = Math.ceil(totalPx / Math.max(1, s.perPortPxLimit));
          const fitsTotal = totalPx <= s.totalPxLimit;
          const fitsDims  = wPx <= s.maxW && hPx <= s.maxH;
          const fitsPorts = portsNeeded <= s.ports;
          const fits = fitsTotal && fitsDims && fitsPorts;
          const unitsNeeded = fits ? 1 : Math.ceil(portsNeeded / Math.max(1, s.ports));
          return { ...s, fits, portsNeeded, unitsNeeded };
        })
        .filter(s => s.fits || s.unitsNeeded > 1)
        .sort((a,b)=>{
          if ((a.fits?0:1)!==(b.fits?0:1)) return (a.fits?0:1)-(b.fits?0:1);
          if (a.totalPxLimit!==b.totalPxLimit) return a.totalPxLimit-b.totalPxLimit;
          if (a.portsNeeded!==b.portsNeeded)   return a.portsNeeded-b.portsNeeded;
          if (a.ports!==b.ports)               return a.ports-b.ports;
          return 0;
        });
    }
    function chooseBest(totalPx, wPx, hPx){ const ranked = rankSenders(totalPx, wPx, hPx); return ranked.find(r=>r.fits) || ranked[0] || null; }

    function updateURL(){
      const params = new URLSearchParams();
      params.set('t', $('#tile').value);
      ['tilesW','tilesH','tileMmW','tileMmH','tilePower','utilPct','brightPct','headroom','redundancy'].forEach(id=>params.set(id, $(id).value));
      params.set('show', $('#showAllModels').checked ? 'all' : 'stock');
      history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
    }
    function loadFromURL(){
      const q = new URLSearchParams(location.search);
      const set=(id,def)=>{if(q.has(id)) $(id).value=q.get(id); else $(id).value=def;};
      set('tilesW',6); set('tilesH',4);
      set('tileMmW',500); set('tileMmH',500);
      set('tilePower',200); set('utilPct',40); set('brightPct',80); set('headroom',20);
      set('redundancy','none');
      $('#showAllModels').checked = q.get('show') === 'all';
    }

    const elTile=$('tile'), elW=$('tilesW'), elH=$('tilesH'), elTP=$('tilePower'), elHR=$('headroom'),
          elSpecs=$('specs'), elSenders=$('sender-body'), elReport=$('report'), elInv=$('inv'),
          elTileMmW=$('tileMmW'), elTileMmH=$('tileMmH'), elUtil=$('utilPct'), elBright=$('brightPct');

    function populateTiles(){
      elTile.innerHTML=''; LED_TILES.forEach(t=>{const o=document.createElement('option');o.value=t.id;o.textContent=`${t.name||t.brand} — ${t.pitchMm}mm (${t.pxW}×${t.pxH})`;elTile.appendChild(o);});
      const q = new URLSearchParams(location.search); const tId=q.get('t');
      if (tId && LED_TILES.find(x=>x.id===tId)) elTile.value=tId; else if (LED_TILES.length) elTile.value=LED_TILES[0].id;
    }
    function renderInventory(){
      const visible = visibleSenders().map(s=>`${s.model}: ${s.qty??0}`).join(' • ');
      elInv.innerHTML = `Visible: ${visible || '—'}<br><span class="note">Hidden models have qty 0 — tick “Show all models” to include them.</span>`;
    }
    function renderAll(){
      const tile = LED_TILES.find(t=>t.id===elTile.value) || LED_TILES[0];
      const tilesW=parseInt(elW.value||'0',10), tilesH=parseInt(elH.value||'0',10);
      const pxW=tile.pxW*tilesW, pxH=tile.pxH*tilesH, totalPx=pxW*pxH;
      const mmW=parseFloat(elTileMmW.value||tile.mmW||500)*tilesW, mmH=parseFloat(elTileMmH.value||tile.mmH||500)*tilesH;
      const mW=mmToM(mmW), mH=mmToM(mmH), inW=mmToIn(mmW), inH=mmToIn(mmH);
      const diagIn=Math.sqrt(inW*inW+inH*inH), ppi=Math.sqrt(pxW*pxW+pxH*pxH)/Math.max(1,diagIn), aspect=`${round(pxW/Math.max(1,pxH),2)}:1`;
      const tileCount=tilesW*tilesH, tilePower=parseFloat(elTP.value||'0'), util=(parseFloat(elUtil.value||'40')/100), bright=(parseFloat(elBright.value||'80')/100), headroom=(parseFloat(elHR.value||'20')/100);
      const powerMaxW=tileCount*tilePower, powerAvgW=powerMaxW*util*bright, powerWithHeadroomW=powerAvgW*(1+headroom), amps230=powerWithHeadroomW/230, amps110=powerWithHeadroomW/110;

      const ranked=rankSenders(totalPx,pxW,pxH), best=chooseBest(totalPx,pxW,pxH);

      elSpecs.innerHTML='';
      const addSpec=(l,v,cls='')=>{const d=document.createElement('div');d.className='spec';d.innerHTML=`<div class="l">${l}</div><div class="v ${cls}">${v}</div>`;elSpecs.appendChild(d);}
      addSpec('Tile', `${tile.name || tile.brand} ${tile.pitchMm}mm (${tile.pxW}×${tile.pxH})`);
      addSpec('Array (tiles)', `${tilesW} × ${tilesH}`);
      addSpec('Screen res', `${pxW} × ${pxH}`);
      addSpec('Pixels total', totalPx.toLocaleString());
      addSpec('Physical size', `${round(mW,3)} m × ${round(mH,3)} m`);
      addSpec('Diagonal', `${round(diagIn,1)} in (${round(ppi,1)} ppi)`);
      addSpec('Power avg', `${round(powerAvgW)} W`);
      addSpec(`Power +${round(headroom*100)}%`, `${round(powerWithHeadroomW)} W`);
      addSpec('Amps @230V', `${round(amps230,2)} A`);
      addSpec('Amps @110V', `${round(amps110,2)} A`);
      addSpec('Aspect', `${aspect}`);
      addSpec('Recommended sender', best ? `${best.model} • Ports ${best.portsNeeded}/${best.ports}` : 'None (check “Show all models”)', best?'ok':'danger');

      elSenders.innerHTML = ranked.length ? '' : '<tr><td colspan="8" class="danger">No in-stock sender fits. Tick “Show all models” for rental options.</td></tr>';
      ranked.forEach(s=>{
        const tr=document.createElement('tr'); const units = s.fits ? 1 : Math.ceil(s.portsNeeded/Math.max(1,s.ports));
        tr.innerHTML = `<td>${s.model}</td><td>${s.qty ?? ''}</td><td>${s.ports}</td><td>${s.perPortPxLimit.toLocaleString()}</td><td>${s.totalPxLimit.toLocaleString()}</td><td>${s.portsNeeded} / ${s.ports}</td><td>${s.maxW} × ${s.maxH}</td><td>${units}</td>`;
        elSenders.appendChild(tr);
      });

      elReport.innerHTML = `
        <div class="center" style="padding:8px 10px">
          <div><strong>Screen</strong></div>
          <div class="chips">
            <div class="chip">${tile.name || tile.brand} • ${tile.pitchMm}mm</div>
            <div class="chip">${tilesW}×${tilesH} tiles</div>
            <div class="chip">${pxW}×${pxH}px</div>
            <div class="chip">${round(mW,2)}m × ${round(mH,2)}m</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(12,1fr);gap:8px;padding:10px">
          <div class="spec" style="grid-column:span 4"><div class="l">Source</div><div class="v">HDMI / DP / DVI</div></div>
          <div class="spec" style="grid-column:span 4"><div class="l">Sender</div><div class="v">${best ? best.model : 'None (stock only)'}</div><div class="l">Ports used</div><div class="v">${best ? best.portsNeeded+'/'+best.ports : '-'}</div></div>
          <div class="spec" style="grid-column:span 4"><div class="l">Power</div><div class="v">${round(powerAvgW)} W avg</div><div class="l">+ headroom</div><div class="v">${round(powerWithHeadroomW)} W</div></div>
        </div>
      `;

      localStorage.setItem('tiles_v2', JSON.stringify(LED_TILES));
      localStorage.setItem('senders_v2', JSON.stringify(NOVASTAR_SENDERS));
      updateURL();
    }

    function solveForTarget(pxTargetW, pxTargetH){
      const tile = (document.getElementById('tile') && Array.from(document.getElementById('tile').options).length)
        ? (LED_TILES.find(t=>t.id===document.getElementById('tile').value) || LED_TILES[0])
        : LED_TILES[0];
      const w = Math.max(1, Math.round(pxTargetW / tile.pxW));
      const h = Math.max(1, Math.round(pxTargetH / tile.pxH));
      document.getElementById('tilesW').value = w; document.getElementById('tilesH').value = h; renderAll();
    }
    function closest169(){
      const tile = LED_TILES.find(t=>t.id===document.getElementById('tile').value) || LED_TILES[0];
      let bestW=1,bestH=1,bestDiff=1e9;
      for(let w=1; w<=60; w++){ for(let h=1; h<=60; h++){ const ratio=(tile.pxW*w)/(tile.pxH*h), diff=Math.abs(ratio-16/9); if (diff<bestDiff){bestDiff=diff;bestW=w;bestH=h;} } }
      document.getElementById('tilesW').value=bestW; document.getElementById('tilesH').value=bestH; renderAll();
    }

    const csvRows = (txt)=> txt.split(/\r?\n/).map(l=>l.trim()).filter(Boolean).map(l=>l.split(',').map(x=>x.trim()));
    document.getElementById('btn-apply-senders').addEventListener('click', ()=>{
      const rows = csvRows(document.getElementById('senderCsv').value);
      rows.forEach(r=>{
        const [model,qty,ports,perPort,total,maxW,maxH] = r;
        const s = { model, qty: qty?parseInt(qty,10):0, ports: parseInt(ports||'4',10), perPortPxLimit: parseInt(perPort||'575000',10), totalPxLimit: parseInt(total||'650000',10), maxW: parseInt(maxW||'3840',10), maxH: parseInt(maxH||'1920',10) };
        const i = NOVASTAR_SENDERS.findIndex(x=>x.model.toUpperCase()===model.toUpperCase());
        if (i>=0) NOVASTAR_SENDERS[i]=s; else NOVASTAR_SENDERS.push(s);
      });
      renderInventory(); renderAll();
    });
    document.getElementById('btn-apply-tiles').addEventListener('click', ()=>{
      const rows = csvRows(document.getElementById('tileCsv').value);
      rows.forEach(r=>{
        const [name,brand,pitch,pxW,pxH,mmW,mmH,maxPowerW] = r;
        const id = (name||brand||'tile').toLowerCase().replace(/[^a-z0-9]+/g,'-');
        const t = { id, name, brand, pitchMm: parseFloat(pitch||'2.6'), pxW: parseInt(pxW||'192',10), pxH: parseInt(pxH||'192',10), mmW: parseFloat(mmW||'500'), mmH: parseFloat(mmH||'500'), maxPowerW: parseFloat(maxPowerW||'200') };
        const i = LED_TILES.findIndex(x=>x.id===id);
        if (i>=0) LED_TILES[i]=t; else LED_TILES.push(t);
      });
      populateTiles(); renderAll();
    });

    document.getElementById('btn-share').addEventListener('click', ()=>{ navigator.clipboard.writeText(location.href).then(()=>alert('Link copied to clipboard')); });
    document.getElementById('btn-pdf').addEventListener('click', async () => {
      try {
        const ReportEl = document.getElementById('report');
        const jsPDFCtor = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
        const canvas = await html2canvas(ReportEl, { scale: 2, useCORS: true, background: '#FFFFFF', windowWidth: document.documentElement.scrollWidth });
        const img = canvas.toDataURL('image/jpeg', 0.95);
        const doc = new jsPDFCtor({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageW = doc.internal.pageSize.getWidth(); const margin = 8; const usableW = pageW - margin*2;
        const imgH = (canvas.height / canvas.width) * usableW;
        doc.setFontSize(16); doc.text('LED Screen — Summary', margin, 12);
        doc.setFontSize(10); doc.addImage(img, 'JPEG', margin, 16, usableW, imgH);
        try { doc.save('LED_Screen_Spec.pdf'); } catch { const datauri = doc.output('bloburl'); window.open(datauri, '_blank'); }
      } catch (err) { console.error(err); alert('PDF export failed. Use Print → Save as PDF as a fallback.'); }
    });

    const dlg = document.getElementById('settings');
    document.getElementById('btn-settings').addEventListener('click', ()=>{
      document.getElementById('cfgSenders').value = localStorage.getItem('cfg_senders_csv') || '';
      document.getElementById('cfgTiles').value   = localStorage.getItem('cfg_tiles_csv') || '';
      dlg.showModal();
    });
    document.getElementById('cfgCancel').addEventListener('click', ()=> dlg.close());
    document.getElementById('cfgSave').addEventListener('click', ()=>{
      const s = document.getElementById('cfgSenders').value.trim();
      const t = document.getElementById('cfgTiles').value.trim();
      if (s) localStorage.setItem('cfg_senders_csv', s); else localStorage.removeItem('cfg_senders_csv');
      if (t) localStorage.setItem('cfg_tiles_csv', t); else localStorage.removeItem('cfg_tiles_csv');
      dlg.close(); (async()=>{ await loadDataFromSheets(); populateTiles(); renderInventory(); renderAll(); })();
    });

    async function wire(){
      await loadDataFromSheets();
      populateTiles(); loadFromURL();
      ['input','change'].forEach(evt=> [document.getElementById('tile'), document.getElementById('tilesW'), document.getElementById('tilesH'), document.getElementById('tilePower'), document.getElementById('headroom'), document.getElementById('tileMmW'), document.getElementById('tileMmH'), document.getElementById('utilPct'), document.getElementById('brightPct'), document.getElementById('redundancy'), document.getElementById('showAllModels')].forEach(el=>el.addEventListener(evt, renderAll)));
      document.querySelectorAll('[data-preset]').forEach(btn=>{
        btn.addEventListener('click', ()=>{ const p=btn.getAttribute('data-preset'); if (p==='1080p') solveForTarget(1920,1080); if (p==='4k') solveForTarget(3840,2160); if (p==='16:9') closest169(); });
      });
      renderInventory(); renderAll();
    }
    wire();
  }
})();
