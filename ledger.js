/* Add-a-debt sheet for the clickable prototype. Loaded after app.js. */
'use strict';
(() => {
  const TD = window.TD;
  const { $, $$, I, S, toast, later, closeSheet, renderDebtList, renderPlan, updateHome, addDebt, updateDebt, removeDebt, displayName, totals, animateHomeTo, relOwner, partnerName, seesFully } = TD;

  function freshAdd() {
    return { name: '', bal: '', apr: '', owner: 'mine', vis: 'full', focus: 'bal', editing: null };
  }
  function centsToDraft(c) {
    const n = Math.abs(Math.round(Number(c) || 0));
    const whole = Math.floor(n / 100);
    const frac = n % 100;
    return frac ? `${whole}.${String(frac).padStart(2, '0')}` : String(whole);
  }
  function draftFrom(d) {
    return {
      editing: d.id, name: d.name, bal: centsToDraft(d.bal), focus: 'bal',
      apr: Number.isFinite(+d.apr) ? String(+d.apr) : '',
      owner: relOwner(d), vis: d.owner === 'ours' ? 'full' : d.vis,
    };
  }
  function centsOf(raw) {
    const n = parseFloat(raw || '0');
    return Math.round((Number.isFinite(n) ? n : 0) * 100);
  }
  function typed(raw) {
    const [ip, fp] = String(raw || '').split('.');
    return (ip ? (+ip).toLocaleString('en-US') : '0') + (String(raw || '').includes('.') ? '.' + (fp || '') : '');
  }
  function visCopy(a) {
    const who = partnerName();
    if (a.owner === 'ours') return { title: 'Shared', help: 'You both see the name, the balance, and the APR.' };
    const mine = a.owner === 'mine';
    const title = mine ? `What ${who} sees` : 'What you see';
    if (a.vis === 'full') return { title, help: mine ? `${who} sees the name, the balance, and the APR.` : 'You see the name, the balance, and the APR.' };
    if (a.vis === 'balance') return { title, help: mine ? `${who} sees the balance. The name and APR stay with you.` : `You see the balance. ${who} kept the name and APR private.` };
    return { title, help: mine ? `${who} sees that it exists. The details stay with you, and the balance still counts.` : `You see that it exists. ${who} kept the details private, and the balance still counts.` };
  }
  function paintSave() {
    const ready = S.add && S.add.name.trim() && centsOf(S.add.bal) > 0;
    const save = $('#ad-save');
    if (!save) return;
    save.style.opacity = ready ? 1 : .38;
  }
  function paintAdd() {
    const a = S.add;
    if (!a || !$('#ad-bal')) return;
    $('#ad-name-wrap').classList.toggle('on', a.focus === 'name');
    $('#ad-bal').classList.toggle('on', a.focus === 'bal');
    $('#ad-apr').classList.toggle('on', a.focus === 'apr');
    const balEmpty = !a.bal;
    const balFs = typed(a.bal).length > 7 ? 40 : 48;
    $('#ad-bal-amt').style.fontSize = balFs + 'px';
    $('#ad-bal-amt').innerHTML = `<span style="font-size:${Math.round(balFs * .5)}px;margin-top:${Math.round(balFs * .12)}px;margin-right:2px;color:var(--ink2)">$</span><span style="color:${balEmpty ? 'var(--ink3)' : 'var(--ink)'}">${typed(a.bal)}</span>${a.focus === 'bal' ? `<span class="caret" style="height:${Math.round(balFs * .72)}px"></span>` : ''}`;
    const aprEmpty = a.apr === '';
    $('#ad-apr-amt').innerHTML = `<span style="color:${aprEmpty ? 'var(--ink3)' : 'var(--ink)'}">${aprEmpty ? '0' : typed(a.apr)}</span><span style="color:var(--ink2);font-size:18px;margin-left:2px">%</span>${a.focus === 'apr' ? '<span class="caret" style="height:22px"></span>' : ''}`;
    $$('#ad-owner .opt').forEach(b => b.classList.toggle('on', b.dataset.o === a.owner));
    const oi = ['mine', 'yours', 'ours'].indexOf(a.owner);
    $('#ad-owner .thumb').style.transform = `translateX(${oi * 100}%)`;
    const shared = a.owner === 'ours';
    $('#ad-vis-block').style.display = shared ? 'none' : '';
    if (!shared) {
      $$('#ad-vis .opt').forEach(b => b.classList.toggle('on', b.dataset.v === a.vis));
      const vi = ['full', 'balance', 'exists'].indexOf(a.vis);
      $('#ad-vis .thumb').style.transform = `translateX(${vi * 100}%)`;
    }
    const copy = visCopy(a);
    $('#ad-vis-title').textContent = copy.title;
    $('#ad-help').textContent = copy.help;
    paintSave();
  }
  function shake(sel) {
    const el = $(sel);
    if (!el) return;
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
  }
  function editField(field, k) {
    let a = S.add[field] || '';
    const maxInt = field === 'apr' ? 2 : 6;
    if (k === 'del') a = a.slice(0, -1);
    else if (k === '.') {
      if (a.includes('.')) return false;
      a = (a || '0') + '.';
    } else {
      if (a === '0') a = '';
      const [ip, fp] = a.split('.');
      if (fp !== undefined && fp.length >= 2) return false;
      if (fp === undefined && (ip || '').length >= maxInt) return false;
      a += k;
    }
    const n = parseFloat(a || '0');
    if (field === 'apr' && n > 99.99) return false;
    if (field === 'bal' && n > 999999.99) return false;
    S.add[field] = a;
    return true;
  }
  function pressKey(k) {
    if (!S.add) return;
    if (S.add.focus === 'name') S.add.focus = 'bal';
    const field = S.add.focus === 'apr' ? 'apr' : 'bal';
    if (!editField(field, k)) shake(field === 'apr' ? '#ad-apr' : '#ad-bal');
    paintAdd();
  }
  function trySave() {
    const a = S.add;
    if (!a) return;
    if (!a.name.trim()) { shake('#ad-name-wrap'); $('#ad-name').focus(); return; }
    const balCents = centsOf(a.bal);
    if (balCents <= 0) { S.add.focus = 'bal'; paintAdd(); shake('#ad-bal'); return; }
    const shownBefore = totals();
    const payload = { name: a.name, balCents, apr: a.apr === '' ? 0 : parseFloat(a.apr), owner: a.owner, vis: a.vis };
    const d = a.editing ? updateDebt(a.editing, payload) : addDebt(payload);
    if (!d) return;
    const verb = a.editing ? 'Updated' : 'Added';
    closeSheet();
    S.add = null;
    S.editId = null;
    renderDebtList(true);
    renderPlan();
    updateHome(true);
    if ($('#v-home').classList.contains('on')) {
      const T = totals();
      later(() => animateHomeTo({ sam: T.sam, alex: T.alex, left: T.left }, { from: { sam: shownBefore.sam, alex: shownBefore.alex, left: shownBefore.left }, heroDur: 1400 }), 420);
    }
    later(() => toast(`${I('check_circle_fill', 18, 'var(--success)', { knock: 'var(--surface)' })}${verb} ${displayName(d)}`), 350);
  }
  function renderAdd() {
    const existing = S.editId && S.debts.find(d => d.id === S.editId);
    S.add = existing && seesFully(existing) ? draftFrom(existing) : freshAdd();
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'];
    $('#sh-add').innerHTML = `<div class="grain"></div><div class="inner">
      <div class="drag" style="touch-action:none"><div class="grabber"></div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 14px 0">
          <button class="gbtn glass press" id="ad-close" aria-label="Cancel">${I('xmark', 19, 'currentColor', { w: 2.4 })}</button>
          <div style="font-size:17px;font-weight:600;letter-spacing:-.4px">${S.add.editing ? 'Edit debt' : 'Add a debt'}</div>
          <button class="gbtn press" id="ad-save" aria-label="Save" style="background:var(--primary);box-shadow:inset 0 .5px 0 rgba(255,255,255,.3),0 4px 12px -4px rgba(91,42,87,.6);opacity:.38">${I('check', 20, 'var(--onprimary)', { w: 3 })}</button>
        </div>
      </div>
      <div class="add-body">
        <div class="eyebrow add-label">Name</div>
        <div class="add-field" id="ad-name-wrap"><input id="ad-name" maxlength="40" enterkeyhint="done" autocomplete="off" autocapitalize="words" placeholder="Chase Sapphire" aria-label="Debt name"></div>
        <div class="eyebrow add-label">Balance</div>
        <button class="add-amt" id="ad-bal" type="button" style="width:calc(100% - 32px)"><div id="ad-bal-amt" class="r" style="font-size:48px;font-weight:700;letter-spacing:-1px;line-height:1;display:inline-flex;align-items:flex-start;height:52px"></div></button>
        <div class="eyebrow add-label">APR</div>
        <button class="add-amt" id="ad-apr" type="button" style="width:calc(100% - 32px)"><div id="ad-apr-amt" class="r" style="font-size:28px;font-weight:700;letter-spacing:-.4px;display:inline-flex;align-items:center;height:36px"></div></button>
        <div class="eyebrow add-label">Whose</div>
        <div class="seg" id="ad-owner" style="margin:0 16px;height:36px" role="tablist">
          <div class="thumb" style="width:calc((100% - 4px)/3)"></div>
          ${[['mine', 'Mine'], ['yours', 'Yours'], ['ours', 'Ours']].map(([k, l]) => `<button class="opt${k === S.add.owner ? ' on' : ''}" data-o="${k}" role="tab">${l}</button>`).join('')}
        </div>
        <div id="ad-vis-block">
          <div class="eyebrow add-label" id="ad-vis-title">What ${partnerName()} sees</div>
          <div class="seg" id="ad-vis" style="margin:0 16px;height:36px" role="tablist">
            <div class="thumb" style="width:calc((100% - 4px)/3)"></div>
            ${[['full', 'All'], ['balance', 'Balance'], ['exists', 'Exists']].map(([k, l]) => `<button class="opt${k === S.add.vis ? ' on' : ''}" data-v="${k}" role="tab">${l}</button>`).join('')}
          </div>
        </div>
        <div class="add-help" id="ad-help"></div>
        ${S.add.editing ? '<button class="press" id="ad-remove" style="display:block;margin:4px auto 8px;font-size:15px;font-weight:600;color:var(--ink2)">Remove debt</button>' : ''}
      </div>
      <div class="kp tight">${keys.map(k => `<button class="key${k === '.' || k === 'del' ? ' bare' : ''}" data-k="${k}" aria-label="${k === 'del' ? 'Delete' : k}">${k === 'del' ? I('delete_left', 22, 'var(--ink)') : k}</button>`).join('')}</div>
    </div>`;
    $('#ad-owner .thumb').style.transition = `transform var(--sp-snappy-d) var(--sp-snappy)`;
    $('#ad-vis .thumb').style.transition = `transform var(--sp-snappy-d) var(--sp-snappy)`;
    $('#ad-close').onclick = () => { S.add = null; S.editId = null; closeSheet(); };
    $('#ad-save').onclick = trySave;
    $('#ad-name').value = S.add.name;
    const remove = $('#ad-remove');
    if (remove) remove.onclick = () => {
      const id = S.add && S.add.editing;
      const label = S.add ? S.add.name : 'Debt';
      if (!id || !removeDebt(id)) return;
      closeSheet();
      S.add = null;
      S.editId = null;
      renderDebtList(false);
      renderPlan();
      updateHome(true);
      later(() => toast(`${I('xmark', 16, 'var(--ink2)')}Removed ${label}`), 280);
    };
    $('#ad-name').addEventListener('input', e => { S.add.name = e.target.value; paintSave(); });
    $('#ad-name').addEventListener('focus', () => { S.add.focus = 'name'; paintAdd(); });
    $('#ad-bal').onclick = () => { $('#ad-name').blur(); S.add.focus = 'bal'; paintAdd(); };
    $('#ad-apr').onclick = () => { $('#ad-name').blur(); S.add.focus = 'apr'; paintAdd(); };
    $$('#ad-owner .opt').forEach(b => b.onclick = () => { S.add.owner = b.dataset.o; paintAdd(); });
    $$('#ad-vis .opt').forEach(b => b.onclick = () => { S.add.vis = b.dataset.v; paintAdd(); });
    $$('#sh-add .key').forEach(b => b.addEventListener('click', () => pressKey(b.dataset.k)));
    paintAdd();
  }
  function onAddKey(e) {
    if (!S.add) return;
    const typing = document.activeElement && document.activeElement.id === 'ad-name';
    if (e.key === 'Escape') { e.preventDefault(); S.add = null; S.editId = null; closeSheet(); return; }
    if (typing) {
      if (e.key === 'Enter') { e.preventDefault(); trySave(); }
      return;
    }
    if (/^[0-9.]$/.test(e.key)) { e.preventDefault(); pressKey(e.key); flash(e.key); }
    else if (e.key === 'Backspace') { e.preventDefault(); pressKey('del'); flash('del'); }
    else if (e.key === 'Enter') { e.preventDefault(); trySave(); }
  }
  function flash(k) {
    const b = $(`#sh-add .key[data-k="${k}"]`);
    if (!b) return;
    b.classList.add('down');
    later(() => b.classList.remove('down'), 120);
  }

  TD.renderAdd = renderAdd;
  TD.onAddKey = onAddKey;
})();
