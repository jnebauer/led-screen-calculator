// app.js — LED Screen Calculator (remote module with embedded data + in-app editor)
(function(){
  function injectScript(url){return new Promise((res,rej)=>{const s=document.createElement('script');s.src=url;s.onload=res;s.onerror=()=>rej(new Error('Failed '+url));document.head.appendChild(s);});}
  const needHtml2Canvas = !window.html2canvas;
  const needJsPDF = !(window.jspdf && window.jspdf.jsPDF);
  const libPromises = [];
  if (needHtml2Canvas) libPromises.push(injectScript('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js'));
  if (needJsPDF)       libPromises.push(injectScript('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'));

  // --- Styles ---
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
    dialog{border:none;border-radius:14px;padding:0;max-width:900px;width:clamp(300px,95vw,900px);background:#0f172a;color:#e2e8f0}
    dialog .hd{padding:16px;border-bottom:1px solid var(--line)} dialog .bd{padding:16px} dialog .ft{padding:16px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end}
    .tabs{display:flex;gap:8px;margin-bottom:10px}
    .tab{padding:6px 10px;border:1px solid var(--line);border-radius:999px;cursor:pointer}
    .tab.active{background:var(--accent);color:#041225;border-color:transparent}
    .tbl{max-height:260px;overflow:auto;border:1px solid var(--line);border-radius:12px}
    .flex{display:flex;gap:10px;flex-wrap:wrap}
  `;
  document.head.appendChild(style);

  // --- App HTML ---
  document.body.innerHTML = `
    <div class="container">
      <div class="center" style="margin-bottom:12px">
        <div>
          <h1>LED Screen Calculator — Pro</h1>
          <div class="muted">Pixels → smallest working sender • power + amps • physical size • presets • redundancy • PDF • shareable URL</div>
        </div>
        <div class="actions">
          <button class="ghost" id="btn-manage">Manage data</button>
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

      <div class="note" style="margin-top:10px">
        Verify limits against NovaStar manuals and your receiver cards. Numbers here are conservative defaults; update per job/firmware.
      </div>
    </div>

    <!-- Manage Data modal -->
    <dialog id="manage">
      <div class="hd"><strong>Manage data</strong></div>
      <div class="bd">
        <div class="tabs">
          <button class="tab active" data-tab="senders">Senders</button>
          <button class="tab" data-tab="tiles">Tiles</button>
          <span class="muted" style="margin-left:auto">Data is saved in this browser (localStorage)</span>
        </div>
        <div id="pane-senders">
          <div class="flex" style="margin-bottom:8px">
            <button class="btn" id="addSender">Add sender</button>
            <button class="ghost" id="resetSenders">Reset to defaults</button>
            <button class="ghost" id="exportSenders">Export JSON</button>
            <input id="importSenders" type="file" accept="application/json" style="width:auto"/>
          </div>
          <div class="tbl">
            <table style="width:100%">
              <thead>
                <tr><th>Model</th><th>Qty</th><th>Ports</th><th>perPortPx</th><th>totalPx</th><th>MaxW</th><th>MaxH</th><th></th></tr>
              </thead>
              <tbody id="sendersTable"></tbody>
            </table>
          </div>
        </div>
        <div id="pane-tiles" style="display:none">
          <div class="flex" style="margin-bottom:8px">
            <button class="btn" id="addTile">Add tile</button>
            <button class="ghost" id="resetTiles">Reset to defaults</button>
            <button class="ghost" id="exportTiles">Export JSON</button>
            <input id="importTiles" type="file" accept="application/json" style="width:auto"/>
          </div>
          <div class="tbl">
            <table style="width:100%">
              <thead>
                <tr><th>ID</th><th>Name</th><th>Pitch(mm)</th><th>pxW</th><th>pxH</th><th>mmW</th><th>mmH</th><th>MaxW</th><th></th></tr>
              </thead>
              <tbody id="tilesTable"></tbody>
            </table>
          </div>
        </div>
      </div>
      <div class="ft">
        <button class="ghost" id="mClose">Close</button>
      </div>
    </dialog>
  `;

  Promise.all(libPromises).finally(()=>boot());

  function boot(){
    // ---- Default embedded data ----
    const DEFAULT_SENDERS = [
      { model: "MCTRL300",      qty: 0, ports: 4,  perPortPxLimit: 520000, totalPxLimit: 650000,  maxW: 3840, maxH: 1920 },
      { model: "MCTRL660 Pro",  qty: 0, ports: 6,  perPortPxLimit: 383333, totalPxLimit: 650000,  maxW: 3840, maxH: 1920 },
      { model: "VX4S",          qty: 3, ports: 4,  perPortPxLimit: 575000, totalPxLimit: 650000,  maxW: 3840, maxH: 1920 },
      { model: "VX4",           qty: 4, ports: 4,  perPortPxLimit: 575000, totalPxLimit: 650000,  maxW: 3840, maxH: 1920 },
      { model: "MCTRL4K",       qty: 4, ports: 16, perPortPxLimit: 650000, totalPxLimit: 8800000, maxW: 7680, maxH: 7680 },
      { model: "MCTRL660",      qty: 5, ports: 4,  perPortPxLimit: 575000, totalPxLimit: 650000,  maxW: 3840, maxH: 1920 },
      { model: "VX600",         qty: 0, ports: 6,  perPortPxLimit: 575000, totalPxLimit: 650000,  maxW: 3840, maxH: 1920 },
      { model: "VX1000",        qty: 0, ports: 10, perPortPxLimit: 575000, totalPxLimit: 650000,  maxW: 3840, maxH: 1920 }
    ];
    const DEFAULT_TILES = [
      { id: "unilumen-2.6",       name: "Unilumen 2.6",        brand: "Unilumen",          pitchMm: 2.6, pxW: 192, pxH: 192, mmW: 500, mmH: 500, maxPowerW: 200 },
      { id: "absen-aluvision-2.8",name: "Absen/Aluvision 2.8", brand: "Absen/Aluvision",   pitchMm: 2.8, pxW: 176, pxH: 176, mmW: 496, mmH: 496, maxPowerW: 200 },
      { id: "recience-1.9",       name: "Recience 1.9",        brand: "Recience",          pitchMm: 1.9, pxW: 256, pxH: 256, mmW: 500, mmH: 500, maxPowerW: 200 },
      { id: "recience-m-1.9",     name: "Recience Mitred 1.9", brand: "Recience (Mitred)", pitchMm: 1.9, pxW: 256, pxH: 256, mmW: 500, mmH: 500, maxPowerW: 200 },
      { id: "led-arts-3.9",       name: "LED Arts 3.9",        brand: "LED Arts",          pitchMm: 3.9, pxW: 128, pxH: 128, mmW: 500, mmH: 500, maxPowerW: 200 }
    ];

    // Load from localStorage or defaults
    let NOVASTAR_SENDERS = JSON.parse(localStorage.getItem('senders_v2') || 'null') || DEFAULT_SENDERS.slice();
    let LED_TILES = JSON.parse(localStorage.getItem('tiles_v2') || 'null') || DEFAULT_TILES.slice();

    // ---------------- Helpers ----------------
    const $ = (id)=>document.getElementById(id);
    const round=(n,dp=0)=>{const f=Math.pow(10,dp);return Math.round((n+Number.EPSILON)*f)/f;};
    const mmToM=(mm)=>mm/1000, mmToIn=(mm)=>mm/25.4;

    function saveData(){
      localStorage.setItem('senders_v2', JSON.stringify(NOVASTAR_SENDERS));
      localStorage.setItem('tiles_v2', JSON.stringify(LED_TILES));
    }

    function visibleSenders(){ const showAll = $('#showAllModels').checked; return NOVASTAR_SENDERS.filter(s => showAll ? true : (s.qty||0) > 0); }
    function rankSenders(totalPx, wPx, hPx){
      const pool = visibleSenders();
      return pool
        .map(s => {
          const perPort = Math.max(1, s.perPortPxLimit);
          const portsNeeded = Math.ceil(totalPx / perPort);
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
          elSpecs=$('specs'), elSenders=$('sender-body'), elReport=$('report'),
          elTileMmW=$('tileMmW'), elTileMmH=$('tileMmH'), elUtil=$('utilPct'), elBright=$('brightPct');

    function populateTiles(){
      elTile.innerHTML=''; LED_TILES.forEach(t=>{const o=document.createElement('option');o.value=t.id;o.textContent=`${t.name||t.brand} — ${t.pitchMm}mm (${t.pxW}×${t.pxH})`;elTile.appendChild(o);});
      const q = new URLSearchParams(location.search); const tId=q.get('t');
      if (tId && LED_TILES.find(x=>x.id===tId)) elTile.value=tId; else if (LED_TILES.length) elTile.value=LED_TILES[0].id;
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

      elSenders.innerHTML = ranked.length ? '' : '<tr><td colspan="8" class="danger">No sender fits. Adjust spec or show all models.</td></tr>';
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
          <div class="spec" style="grid-column:span 4"><div class="l">Sender</div><div class="v">${best ? best.model : '—'}</div><div class="l">Ports used</div><div class="v">${best ? best.portsNeeded+'/'+best.ports : '-'}</div></div>
          <div class="spec" style="grid-column:span 4"><div class="l">Power</div><div class="v">${round(powerAvgW)} W avg</div><div class="l">+ headroom</div><div class="v">${round(powerWithHeadroomW)} W</div></div>
        </div>
      `;

      saveData();
      updateURL();
    }

    // ---- Manage modal logic ----
    const dlg = document.getElementById('manage');
    document.getElementById('btn-manage').addEventListener('click', ()=>{
      refreshManageTables();
      dlg.showModal();
    });
    document.getElementById('mClose').addEventListener('click', ()=> dlg.close());
    document.querySelectorAll('.tab').forEach(t=> t.addEventListener('click', ()=>{
      document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
      t.classList.add('active');
      const tab = t.getAttribute('data-tab');
      document.getElementById('pane-senders').style.display = tab==='senders'?'block':'none';
      document.getElementById('pane-tiles').style.display   = tab==='tiles'  ?'block':'none';
    }));

    function refreshManageTables(){
      // Senders
      const tb = document.getElementById('sendersTable'); tb.innerHTML='';
      NOVASTAR_SENDERS.forEach((s,idx)=>{
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${s.model}</td><td>${s.qty??0}</td><td>${s.ports}</td><td>${s.perPortPxLimit}</td><td>${s.totalPxLimit}</td><td>${s.maxW}</td><td>${s.maxH}</td>
                        <td><button class="ghost" data-edit-s="${idx}">Edit</button> <button class="ghost" data-del-s="${idx}">Delete</button></td>`;
        tb.appendChild(tr);
      });
      // Tiles
      const tb2 = document.getElementById('tilesTable'); tb2.innerHTML='';
      LED_TILES.forEach((t,idx)=>{
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${t.id}</td><td>${t.name}</td><td>${t.pitchMm}</td><td>${t.pxW}</td><td>${t.pxH}</td><td>${t.mmW}</td><td>${t.mmH}</td><td>${t.maxPowerW}</td>
                        <td><button class="ghost" data-edit-t="${idx}">Edit</button> <button class="ghost" data-del-t="${idx}">Delete</button></td>`;
        tb2.appendChild(tr);
      });

      // wire buttons
      tb.querySelectorAll('[data-edit-s]').forEach(btn=> btn.addEventListener('click', ()=> editSender(parseInt(btn.getAttribute('data-edit-s'),10)) ));
      tb.querySelectorAll('[data-del-s]').forEach(btn=> btn.addEventListener('click', ()=> { NOVASTAR_SENDERS.splice(parseInt(btn.getAttribute('data-del-s'),10),1); saveData(); refreshManageTables(); renderAll(); } ));
      tb2.querySelectorAll('[data-edit-t]').forEach(btn=> btn.addEventListener('click', ()=> editTile(parseInt(btn.getAttribute('data-edit-t'),10)) ));
      tb2.querySelectorAll('[data-del-t]').forEach(btn=> btn.addEventListener('click', ()=> { LED_TILES.splice(parseInt(btn.getAttribute('data-del-t'),10),1); saveData(); refreshManageTables(); populateTiles(); renderAll(); } ));
    }

    function promptFields(fields, initial={}){
      const vals = {};
      for(const f of fields){
        const val = prompt(f.label, initial[f.key] ?? f.def ?? '');
        if (val===null) return null;
        vals[f.key] = f.type==='number' ? Number(val) : val;
      }
      return vals;
    }

    function editSender(idx){
      const s = NOVASTAR_SENDERS[idx];
      const vals = promptFields([
        {key:'model',label:'Model',def:s.model},
        {key:'qty',label:'Qty',type:'number',def:s.qty||0},
        {key:'ports',label:'Ports',type:'number',def:s.ports},
        {key:'perPortPxLimit',label:'Per-port pixels',type:'number',def:s.perPortPxLimit},
        {key:'totalPxLimit',label:'Total pixels',type:'number',def:s.totalPxLimit},
        {key:'maxW',label:'Max width px',type:'number',def:s.maxW},
        {key:'maxH',label:'Max height px',type:'number',def:s.maxH},
      ], s);
      if (!vals) return;
      NOVASTAR_SENDERS[idx] = vals;
      saveData(); refreshManageTables(); renderAll();
    }
    function editTile(idx){
      const t = LED_TILES[idx];
      const vals = promptFields([
        {key:'id',label:'ID',def:t.id},
        {key:'name',label:'Name',def:t.name},
        {key:'brand',label:'Brand',def:t.brand||''},
        {key:'pitchMm',label:'Pitch (mm)',type:'number',def:t.pitchMm},
        {key:'pxW',label:'Tile px width',type:'number',def:t.pxW},
        {key:'pxH',label:'Tile px height',type:'number',def:t.pxH},
        {key:'mmW',label:'Tile mm width',type:'number',def:t.mmW},
        {key:'mmH',label:'Tile mm height',type:'number',def:t.mmH},
        {key:'maxPowerW',label:'Max power W',type:'number',def:t.maxPowerW},
      ], t);
      if (!vals) return;
      LED_TILES[idx] = vals;
      saveData(); refreshManageTables(); populateTiles(); renderAll();
    }

    document.getElementById('addSender').addEventListener('click', ()=>{
      const vals = promptFields([
        {key:'model',label:'Model'},
        {key:'qty',label:'Qty',type:'number',def:0},
        {key:'ports',label:'Ports',type:'number',def:4},
        {key:'perPortPxLimit',label:'Per-port pixels',type:'number',def:575000},
        {key:'totalPxLimit',label:'Total pixels',type:'number',def:650000},
        {key:'maxW',label:'Max width px',type:'number',def:3840},
        {key:'maxH',label:'Max height px',type:'number',def:1920},
      ]);
      if (!vals) return;
      NOVASTAR_SENDERS.push(vals); saveData(); refreshManageTables(); renderAll();
    });
    document.getElementById('addTile').addEventListener('click', ()=>{
      const vals = promptFields([
        {key:'id',label:'ID (unique, slug)'},
        {key:'name',label:'Name'},
        {key:'brand',label:'Brand'},
        {key:'pitchMm',label:'Pitch (mm)',type:'number',def:2.6},
        {key:'pxW',label:'Tile px width',type:'number',def:192},
        {key:'pxH',label:'Tile px height',type:'number',def:192},
        {key:'mmW',label:'Tile mm width',type:'number',def:500},
        {key:'mmH',label:'Tile mm height',type:'number',def:500},
        {key:'maxPowerW',label:'Max power W',type:'number',def:200},
      ]);
      if (!vals) return;
      LED_TILES.push(vals); saveData(); refreshManageTables(); populateTiles(); renderAll();
    });

    document.getElementById('resetSenders').addEventListener('click', ()=>{
      if (!confirm('Reset senders to defaults?')) return;
      NOVASTAR_SENDERS = DEFAULT_SENDERS.slice(); saveData(); refreshManageTables(); renderAll();
    });
    document.getElementById('resetTiles').addEventListener('click', ()=>{
      if (!confirm('Reset tiles to defaults?')) return;
      LED_TILES = DEFAULT_TILES.slice(); saveData(); refreshManageTables(); populateTiles(); renderAll();
    });

    // Export/Import JSON
    document.getElementById('exportSenders').addEventListener('click', ()=>{
      const blob = new Blob([JSON.stringify(NOVASTAR_SENDERS,null,2)], {type:'application/json'});
      const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='senders.json'; a.click();
    });
    document.getElementById('exportTiles').addEventListener('click', ()=>{
      const blob = new Blob([JSON.stringify(LED_TILES,null,2)], {type:'application/json'});
      const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='tiles.json'; a.click();
    });
    document.getElementById('importSenders').addEventListener('change', (e)=>{
      const file = e.target.files[0]; if(!file) return;
      file.text().then(txt=>{ try{ NOVASTAR_SENDERS = JSON.parse(txt); saveData(); refreshManageTables(); renderAll(); } catch(err){ alert('Invalid JSON'); } });
    });
    document.getElementById('importTiles').addEventListener('change', (e)=>{
      const file = e.target.files[0]; if(!file) return;
      file.text().then(txt=>{ try{ LED_TILES = JSON.parse(txt); saveData(); refreshManageTables(); populateTiles(); renderAll(); } catch(err){ alert('Invalid JSON'); } });
    });

    // ---- Presets & wiring ----
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

    function wire(){
      populateTiles(); loadFromURL();
      ['input','change'].forEach(evt=> [document.getElementById('tile'), document.getElementById('tilesW'), document.getElementById('tilesH'), document.getElementById('tilePower'), document.getElementById('headroom'), document.getElementById('tileMmW'), document.getElementById('tileMmH'), document.getElementById('utilPct'), document.getElementById('brightPct'), document.getElementById('redundancy'), document.getElementById('showAllModels')].forEach(el=>el.addEventListener(evt, renderAll)));
      document.querySelectorAll('[data-preset]').forEach(btn=>{
        btn.addEventListener('click', ()=>{ const p=btn.getAttribute('data-preset'); if (p==='1080p') solveForTarget(1920,1080); if (p==='4k') solveForTarget(3840,2160); if (p==='16:9') closest169(); });
      });
      renderAll();
    }
    wire();
  }
})();
