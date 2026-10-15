/* NurseFlow theme: menu, reveal, compare switch, medicine calculator, mascot. */
(() => {
  'use strict';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = (kind) => { try { return window[kind]; } catch (e) { return null; } };
  const read = (kind, key) => { try { return store(kind)?.getItem(key) ?? null; } catch (e) { return null; } };
  const write = (kind, key, value) => { try { store(kind)?.setItem(key, value); } catch (e) { /* storage blocked */ } };
  const mascot = (mood, text) => document.dispatchEvent(new CustomEvent('nf:mascot', { detail: { mood, text } }));

  /* ---------- mobile menu ---------- */
  const initMenu = (root = document) => {
    root.querySelectorAll('[data-nf-menu-toggle]').forEach((toggle) => {
      if (toggle.dataset.bound) return;
      toggle.dataset.bound = '1';
      const menu = document.getElementById(toggle.getAttribute('aria-controls'));
      if (!menu) return;
      const set = (open) => {
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? toggle.dataset.labelClose : toggle.dataset.labelOpen);
        menu.hidden = !open;
        menu.classList.toggle('is-open', open);
      };
      toggle.addEventListener('click', () => set(toggle.getAttribute('aria-expanded') !== 'true'));
      menu.addEventListener('click', (e) => { if (e.target.closest('[data-nf-menu-link]')) set(false); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { set(false); toggle.focus(); } });
      window.matchMedia('(min-width: 990px)').addEventListener('change', (e) => { if (e.matches) set(false); });
    });
  };

  /* ---------- reveal on scroll ---------- */
  const initReveal = (root = document) => {
    const items = root.querySelectorAll('[data-nf-reveal]:not(.is-visible)');
    if (reduceMotion || !('IntersectionObserver' in window)) { items.forEach((el) => el.classList.add('is-visible')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); io.unobserve(entry.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach((el) => io.observe(el));
  };

  /* ---------- gentle tilt on cards ---------- */
  const initTilt = (root = document) => {
    if (reduceMotion || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    root.querySelectorAll('[data-nf-tilt]').forEach((card) => {
      if (card.dataset.bound) return;
      card.dataset.bound = '1';
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(900px) rotateX(${(-y * 3).toFixed(2)}deg) rotateY(${(x * 3).toFixed(2)}deg) translateY(-2px)`;
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
  };

  /* ---------- AI compare segmented control ---------- */
  const initCompare = (root = document) => {
    root.querySelectorAll('[data-nf-compare]').forEach((box) => {
      if (box.dataset.bound) return;
      box.dataset.bound = '1';
      const buttons = [...box.querySelectorAll('[data-mode]')];
      const thumb = box.querySelector('.nf-segment__thumb');
      const answers = box.querySelector('.nf-compare__answers');
      const select = (btn, focus) => {
        buttons.forEach((b) => { b.setAttribute('aria-checked', String(b === btn)); b.tabIndex = b === btn ? 0 : -1; });
        thumb.style.transform = `translateX(${buttons.indexOf(btn) * 100}%)`;
        answers.dataset.view = btn.dataset.mode;
        if (focus) btn.focus();
      };
      buttons.forEach((btn, i) => {
        btn.addEventListener('click', () => select(btn));
        btn.addEventListener('keydown', (e) => {
          const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
          if (!step) return;
          e.preventDefault();
          select(buttons[(i + step + buttons.length) % buttons.length], true);
        });
      });
      select(buttons.find((b) => b.getAttribute('aria-checked') === 'true') || buttons[buttons.length - 1]);
    });
  };

  /* ---------- medicine calculator ---------- */
  const parseNum = (raw) => {
    let s = String(raw ?? '').trim().replace(/\s/g, '');
    if (s === '') return NaN;
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    return /^-?\d*\.?\d+$/.test(s) ? Number(s) : NaN;
  };
  const fmt = (n, max = 2) => {
    if (!isFinite(n)) return '–';
    const digits = Math.abs(n) > 0 && Math.abs(n) < 0.1 ? Math.max(max, 3) : max;
    return n.toLocaleString('da-DK', { maximumFractionDigits: digits });
  };
  const UNIT_TO_MCG = { g: 1e6, mg: 1e3, mikrogram: 1 };
  const SUBSTANCES = {
    kcl: { label: 'Kaliumklorid (KCl)', m: 74.55, potassium: true },
    nacl: { label: 'Natriumklorid (NaCl)', m: 58.44 },
    k: { label: 'Kalium (K⁺)', m: 39.10, potassium: true },
    na: { label: 'Natrium (Na⁺)', m: 22.99 },
    ca: { label: 'Calcium (Ca²⁺)', m: 40.08 },
    mg: { label: 'Magnesium (Mg²⁺)', m: 24.31 },
    custom: { label: 'Andet stof', m: null },
  };

  const CALCS = {
    ampul: {
      desc: 'Hvor mange ml skal du trække op fra ampullen?',
      fields: [
        { id: 'dose', label: 'Ordineret dosis', unit: 'mg', value: '75' },
        { id: 'strength', label: 'Styrke', unit: 'mg/ml', value: '25' },
      ],
      run: ({ dose, strength }) => {
        const ml = dose / strength;
        let check = ['ok', 'Realistisk volumen at trække op.'];
        if (ml > 10) check = ['warn', 'Over 10 ml fra ampuller er usædvanligt – tjek dosis og styrke.'];
        else if (ml < 0.1) check = ['warn', 'Under 0,1 ml er svært at afmåle præcist – overvej fortynding.'];
        return {
          given: `Dosis ${fmt(dose)} mg · styrke ${fmt(strength)} mg/ml`,
          formula: 'Volumen = dosis ÷ styrke',
          calc: `${fmt(dose)} mg ÷ ${fmt(strength)} mg/ml`,
          result: `${fmt(ml)} ml`, check,
        };
      },
    },
    toerstof: {
      desc: 'Opløs pulver i hætteglas og find det volumen, der skal gives.',
      fields: [
        { id: 'dose', label: 'Ordineret dosis', unit: 'mg', value: '500' },
        { id: 'powder', label: 'Pulver i hætteglas', unit: 'mg', value: '1000' },
        { id: 'solvent', label: 'Opløses i', unit: 'ml', value: '10' },
      ],
      run: ({ dose, powder, solvent }) => {
        const conc = powder / solvent;
        const ml = dose / conc;
        const check = dose > powder
          ? ['warn', 'Dosis er større end indholdet i ét hætteglas – du skal bruge flere.']
          : ['ok', 'Realistisk. Tjek produktresuméet for evt. fortrængningsvolumen.'];
        return {
          given: `Dosis ${fmt(dose)} mg · ${fmt(powder)} mg pulver opløst i ${fmt(solvent)} ml`,
          formula: 'Koncentration = pulver ÷ væske · Volumen = dosis ÷ koncentration',
          calc: `${fmt(powder)} mg ÷ ${fmt(solvent)} ml = ${fmt(conc)} mg/ml → ${fmt(dose)} mg ÷ ${fmt(conc)} mg/ml`,
          result: `${fmt(ml)} ml`, check,
        };
      },
    },
    vaeske: {
      desc: 'Find infusionshastigheden i ml pr. time.',
      fields: [
        { id: 'volume', label: 'Volumen', unit: 'ml', value: '1000' },
        { id: 'hours', label: 'Over', unit: 'timer', value: '8' },
      ],
      run: ({ volume, hours }) => {
        const rate = volume / hours;
        const check = rate > 500
          ? ['warn', 'Høj infusionshastighed – kontrollér ordinationen og patientens tilstand.']
          : ['ok', 'Realistisk hastighed for en infusionspumpe.'];
        return {
          given: `${fmt(volume)} ml over ${fmt(hours)} timer`,
          formula: 'Hastighed = volumen ÷ tid',
          calc: `${fmt(volume)} ml ÷ ${fmt(hours)} t`,
          result: `${fmt(rate, 1)} ml/t`, check,
        };
      },
    },
    draaber: {
      desc: 'Beregn dråber pr. minut ved tyngdekraftsinfusion.',
      fields: [
        { id: 'volume', label: 'Volumen', unit: 'ml', value: '500' },
        { id: 'hours', label: 'Over', unit: 'timer', value: '4' },
        { id: 'factor', label: 'Dråbefaktor', type: 'select', value: '20', options: [['20', '20 dråber/ml (standardsæt)'], ['15', '15 dråber/ml (blodsæt)'], ['60', '60 dråber/ml (mikrodråber)']] },
      ],
      run: ({ volume, hours, factor }) => {
        const minutes = hours * 60;
        const drops = (volume * factor) / minutes;
        let check = ['ok', 'Realistisk dråbehastighed – tæl i et helt minut.'];
        if (drops > 100) check = ['warn', 'Meget hurtig dråbehastighed – svær at tælle. Overvej infusionspumpe.'];
        else if (drops < 5) check = ['warn', 'Meget langsom – svær at holde stabil. Overvej infusionspumpe.'];
        return {
          given: `${fmt(volume)} ml over ${fmt(hours)} t · ${fmt(factor)} dråber/ml`,
          formula: 'Dråber/min = volumen × dråbefaktor ÷ minutter',
          calc: `${fmt(volume)} × ${fmt(factor)} ÷ ${fmt(minutes)} min = ${fmt(drops, 1)}`,
          result: `${fmt(Math.round(drops), 0)} dråber/min`, check,
        };
      },
    },
    fortynding: {
      desc: 'Fortynd en stamopløsning til en ønsket koncentration (C₁ × V₁ = C₂ × V₂).',
      fields: [
        { id: 'c1', label: 'Stamopløsning (C₁)', unit: 'mg/ml', value: '10' },
        { id: 'c2', label: 'Ønsket koncentration (C₂)', unit: 'mg/ml', value: '2' },
        { id: 'v2', label: 'Ønsket slutvolumen (V₂)', unit: 'ml', value: '50' },
      ],
      run: ({ c1, c2, v2 }) => {
        if (c2 >= c1) throw new Error('Den ønskede koncentration skal være lavere end stamopløsningen.');
        const v1 = (c2 * v2) / c1;
        return {
          given: `C₁ ${fmt(c1)} mg/ml · C₂ ${fmt(c2)} mg/ml · V₂ ${fmt(v2)} ml`,
          formula: 'V₁ = C₂ × V₂ ÷ C₁ · fortyndingsvæske = V₂ − V₁',
          calc: `${fmt(c2)} × ${fmt(v2)} ÷ ${fmt(c1)} = ${fmt(v1)} ml`,
          result: `${fmt(v1)} ml stamopløsning + ${fmt(v2 - v1)} ml væske`,
          check: ['ok', 'Bland grundigt og mærk sprøjten/posen med den nye koncentration.'],
        };
      },
    },
    vaegt: {
      desc: 'Dosering efter kropsvægt – med ekstra opmærksomhed på børn.',
      fields: [
        { id: 'dosePerKg', label: 'Dosis pr. kg', unit: 'mg/kg', value: '15' },
        { id: 'weight', label: 'Vægt', unit: 'kg', value: '20' },
        { id: 'times', label: 'Doser pr. døgn', unit: 'gange', value: '4' },
      ],
      run: ({ dosePerKg, weight, times }) => {
        const single = dosePerKg * weight;
        const daily = single * times;
        let check = ['ok', 'Kontrollér mod maksimal enkelt- og døgndosis for præparatet.'];
        if (weight > 250) check = ['warn', 'Vægten virker urealistisk – tjek indtastningen.'];
        else if (weight < 40) check = ['warn', 'Pædiatrisk patient: kontrollér mod maks. døgndosis og børneformularen, og få dobbeltkontrol.'];
        return {
          given: `${fmt(dosePerKg)} mg/kg · ${fmt(weight)} kg · ${fmt(times, 0)} gange i døgnet`,
          formula: 'Enkeltdosis = dosis pr. kg × vægt · døgndosis = enkeltdosis × antal',
          calc: `${fmt(dosePerKg)} × ${fmt(weight)} = ${fmt(single)} mg · × ${fmt(times, 0)} = ${fmt(daily)} mg/døgn`,
          result: `${fmt(single)} mg pr. dosis`, check,
        };
      },
    },
    pumpe: {
      desc: 'Indstil sprøjtepumpen i ml pr. time.',
      fields: [
        { id: 'mode', label: 'Ordineret som', type: 'select', value: 'mcgkgmin', options: [['mcgkgmin', 'mikrogram/kg/min'], ['mgh', 'mg/time']] },
        { id: 'dose', label: 'Dosis', unit: '', value: '0,1' },
        { id: 'weight', label: 'Vægt (ved mikrogram/kg/min)', unit: 'kg', value: '70', optional: true },
        { id: 'conc', label: 'Koncentration i sprøjten', unit: 'mg/ml', value: '0,04' },
      ],
      run: ({ mode, dose, weight, conc }) => {
        const perKg = mode === 'mcgkgmin';
        if (perKg && !(weight > 0)) throw new Error('Angiv vægten, når dosis er i mikrogram/kg/min.');
        const mgPerHour = perKg ? (dose * weight * 60) / 1000 : dose;
        const rate = mgPerHour / conc;
        let check = ['ok', 'Realistisk hastighed for en sprøjtepumpe.'];
        if (rate > 50) check = ['warn', 'Usædvanligt høj hastighed for en sprøjtepumpe – tjek koncentration og enheder.'];
        else if (rate < 0.1) check = ['warn', 'Meget lav hastighed – overvej en svagere koncentration.'];
        return {
          given: perKg ? `${fmt(dose, 3)} mikrogram/kg/min · ${fmt(weight)} kg · ${fmt(conc, 3)} mg/ml` : `${fmt(dose)} mg/t · ${fmt(conc, 3)} mg/ml`,
          formula: perKg ? 'mg/t = dosis × vægt × 60 ÷ 1000 · ml/t = mg/t ÷ koncentration' : 'ml/t = mg/t ÷ koncentration',
          calc: perKg
            ? `${fmt(dose, 3)} × ${fmt(weight)} × 60 ÷ 1000 = ${fmt(mgPerHour, 3)} mg/t → ÷ ${fmt(conc, 3)} mg/ml`
            : `${fmt(mgPerHour, 3)} mg/t ÷ ${fmt(conc, 3)} mg/ml`,
          result: `${fmt(rate, 1)} ml/t`, check,
        };
      },
    },
    enheder: {
      desc: 'Omregn mellem g, mg og mikrogram.',
      fields: [
        { id: 'value', label: 'Mængde', unit: '', value: '0,25' },
        { id: 'from', label: 'Fra', type: 'select', value: 'mg', options: [['g', 'g'], ['mg', 'mg'], ['mikrogram', 'mikrogram']] },
        { id: 'to', label: 'Til', type: 'select', value: 'mikrogram', options: [['g', 'g'], ['mg', 'mg'], ['mikrogram', 'mikrogram']] },
      ],
      run: ({ value, from, to }) => {
        const factor = UNIT_TO_MCG[from] / UNIT_TO_MCG[to];
        const out = value * factor;
        return {
          given: `${fmt(value, 4)} ${from}`,
          formula: '1 g = 1.000 mg = 1.000.000 mikrogram',
          calc: `${fmt(value, 4)} × ${fmt(factor, 6)}`,
          result: `${fmt(out, 4)} ${to}`,
          check: ['ok', 'Tjek antallet af nuller – mikrogram og mg forveksles ofte. Skriv “mikrogram” fuldt ud.'],
        };
      },
    },
    elektrolyt: {
      desc: 'Omregn mellem mg og mmol med stoffets molarmasse.',
      fields: [
        { id: 'direction', label: 'Omregn', type: 'select', value: 'mg2mmol', options: [['mg2mmol', 'mg → mmol'], ['mmol2mg', 'mmol → mg']] },
        { id: 'substance', label: 'Stof', type: 'select', value: 'kcl', options: Object.entries(SUBSTANCES).map(([k, v]) => [k, v.label]) },
        { id: 'value', label: 'Mængde', unit: '', value: '1000' },
        { id: 'molar', label: 'Molarmasse', unit: 'g/mol', value: '74,55' },
      ],
      run: ({ direction, substance, value, molar }) => {
        const toMmol = direction === 'mg2mmol';
        const out = toMmol ? value / molar : value * molar;
        const mmol = toMmol ? out : value;
        let check = ['ok', 'Tjek, om ordinationen er angivet i mmol eller mg.'];
        if (SUBSTANCES[substance]?.potassium && mmol > 40) check = ['warn', 'Stor mængde kalium – følg lokal instruks for maks. koncentration og infusionshastighed.'];
        return {
          given: `${fmt(value)} ${toMmol ? 'mg' : 'mmol'} · molarmasse ${fmt(molar)} g/mol`,
          formula: toMmol ? 'mmol = mg ÷ molarmasse' : 'mg = mmol × molarmasse',
          calc: `${fmt(value)} ${toMmol ? '÷' : '×'} ${fmt(molar)}`,
          result: `${fmt(out, 2)} ${toMmol ? 'mmol' : 'mg'}`, check,
        };
      },
    },
  };

  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ICON_OK = '<svg class="nf-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
  const ICON_WARN = '<svg class="nf-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 2 20h20Z"/><path d="M12 10v4M12 17h.01"/></svg>';

  const initCalc = (root = document) => {
    root.querySelectorAll('[data-nf-calc]').forEach((calc) => {
      if (calc.dataset.bound) return;
      calc.dataset.bound = '1';
      const L = calc.dataset;
      const tabs = [...calc.querySelectorAll('[role="tab"]')];
      const fieldsEl = calc.querySelector('[data-nf-calc-fields]');
      const form = calc.querySelector('[data-nf-calc-form]');
      const out = calc.querySelector('[data-nf-calc-out]');
      const panel = calc.querySelector('[role="tabpanel"]');
      let current = null;

      const fieldHtml = (type, f) => {
        const id = `${panel.id}-${type}-${f.id}`;
        if (f.type === 'select') {
          const opts = f.options.map(([v, l]) => `<option value="${escapeHtml(v)}"${v === f.value ? ' selected' : ''}>${escapeHtml(l)}</option>`).join('');
          return `<label class="nf-field" for="${id}"><span>${escapeHtml(f.label)}</span><select id="${id}" name="${f.id}">${opts}</select></label>`;
        }
        return `<label class="nf-field" for="${id}"><span>${escapeHtml(f.label)}</span><span class="nf-field__wrap"><input id="${id}" name="${f.id}" type="text" inputmode="decimal" autocomplete="off" value="${escapeHtml(f.value)}"${f.optional ? '' : ' required'}>${f.unit ? `<span class="nf-field__unit" data-unit>${escapeHtml(f.unit)}</span>` : ''}</span></label>`;
      };

      const select = (type, focus) => {
        const def = CALCS[type];
        if (!def) return;
        current = type;
        tabs.forEach((t) => {
          const on = t.dataset.type === type;
          t.setAttribute('aria-selected', String(on));
          t.tabIndex = on ? 0 : -1;
          if (on) { panel.setAttribute('aria-labelledby', t.id); if (focus) t.focus(); t.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' }); }
        });
        fieldsEl.innerHTML = `<p class="nf-calc__desc">${escapeHtml(def.desc)}</p>${def.fields.map((f) => fieldHtml(type, f)).join('')}`;
        out.innerHTML = '';
        if (type === 'elektrolyt') {
          const sub = form.elements.substance;
          const dir = form.elements.direction;
          const molar = form.elements.molar;
          const unit = form.elements.value.parentElement;
          const sync = () => {
            const m = SUBSTANCES[sub.value]?.m;
            if (m) molar.value = fmt(m, 2);
            molar.readOnly = Boolean(m);
          };
          const syncUnit = () => {
            let u = unit.querySelector('[data-unit]');
            if (!u) { u = document.createElement('span'); u.className = 'nf-field__unit'; u.dataset.unit = ''; unit.append(u); }
            u.textContent = dir.value === 'mg2mmol' ? 'mg' : 'mmol';
          };
          sub.addEventListener('change', sync); dir.addEventListener('change', syncUnit); sync(); syncUnit();
        }
        if (type === 'pumpe') {
          const mode = form.elements.mode;
          const doseWrap = form.elements.dose.parentElement;
          const weight = form.elements.weight.closest('.nf-field');
          const syncMode = () => {
            let u = doseWrap.querySelector('[data-unit]');
            if (!u) { u = document.createElement('span'); u.className = 'nf-field__unit'; u.dataset.unit = ''; doseWrap.append(u); }
            const perKg = mode.value === 'mcgkgmin';
            u.textContent = perKg ? 'mikrog/kg/min' : 'mg/t';
            weight.hidden = !perKg;
          };
          mode.addEventListener('change', syncMode); syncMode();
        }
      };

      tabs.forEach((tab, i) => {
        tab.addEventListener('click', () => select(tab.dataset.type));
        tab.addEventListener('keydown', (e) => {
          let next = null;
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = tabs[(i + 1) % tabs.length];
          if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = tabs[(i - 1 + tabs.length) % tabs.length];
          if (e.key === 'Home') next = tabs[0];
          if (e.key === 'End') next = tabs[tabs.length - 1];
          if (next) { e.preventDefault(); select(next.dataset.type, true); }
        });
      });

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const def = CALCS[current];
        const values = {};
        let valid = true;
        def.fields.forEach((f) => {
          const el = form.elements[f.id];
          if (f.type === 'select') { values[f.id] = /^\d+$/.test(el.value) ? Number(el.value) : el.value; return; }
          const n = parseNum(el.value);
          const hiddenField = el.closest('.nf-field')?.hidden;
          const ok = (f.optional && (el.value.trim() === '' || hiddenField)) || (isFinite(n) && n > 0);
          el.setAttribute('aria-invalid', String(!ok));
          if (!ok) valid = false;
          values[f.id] = n;
        });
        if (!valid) {
          out.innerHTML = `<p class="nf-result__error" role="alert">${escapeHtml(L.lInvalid)}</p>`;
          mascot('worried');
          return;
        }
        let r;
        try { r = def.run(values); } catch (err) {
          out.innerHTML = `<p class="nf-result__error" role="alert">${escapeHtml(err.message)}</p>`;
          mascot('worried');
          return;
        }
        const [state, note] = r.check;
        out.innerHTML = `<dl class="nf-result nf-result--${state}">
          <div class="nf-result__row"><dt>${escapeHtml(L.lGiven)}</dt><dd>${escapeHtml(r.given)}</dd></div>
          <div class="nf-result__row"><dt>${escapeHtml(L.lFormula)}</dt><dd>${escapeHtml(r.formula)}</dd></div>
          <div class="nf-result__row"><dt>${escapeHtml(L.lCalc)}</dt><dd>${escapeHtml(r.calc)}</dd></div>
          <div class="nf-result__row nf-result__row--result"><dt>${escapeHtml(L.lResult)}</dt><dd>${escapeHtml(r.result)}</dd></div>
          <div class="nf-result__row nf-result__row--check"><dt>${escapeHtml(L.lCheck)}</dt><dd>${state === 'ok' ? ICON_OK : ICON_WARN}<span>${escapeHtml(note)}</span></dd></div>
        </dl>`;
        mascot(state === 'ok' ? 'happy' : 'worried');
      });

      form.addEventListener('input', (e) => { if (e.target.matches('input')) e.target.removeAttribute('aria-invalid'); });

      // Deep link: /#medicinregner?type=draaber is awkward, so also accept #medicinregner-draaber
      const fromHash = (location.hash.match(/^#medicinregner-(\w+)/) || [])[1];
      select(CALCS[fromHash] ? fromHash : (CALCS[calc.dataset.default] ? calc.dataset.default : 'ampul'));
    });
  };

  /* ---------- mascot ---------- */
  const initMascot = () => {
    const el = document.querySelector('[data-nf-mascot]');
    if (!el || el.dataset.bound) return;
    el.dataset.bound = '1';
    if (read('sessionStorage', 'nf-mascot-hidden') === '1') { el.hidden = true; return; }
    const bubble = el.querySelector('[data-nf-mascot-bubble]');
    const handle = el.querySelector('[data-nf-mascot-handle]');
    const tips = ['Tip: skriv decimaler med komma – 2,5 ml.', 'Spørg AI-assistenten om SBAR, ABCDE eller interaktioner.', 'Dobbeltkontrol ved medicin er aldrig spild af tid.', 'Lav en quiz ud fra dine egne noter før eksamen.'];
    let tipIndex = 0;
    let hideTimer;
    const say = (text, ms = 4200) => {
      if (!text) return;
      bubble.textContent = text;
      bubble.classList.add('is-visible');
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => bubble.classList.remove('is-visible'), ms);
    };
    const react = (cls) => {
      el.classList.remove('is-happy', 'is-worried');
      void el.offsetWidth;
      el.classList.add(cls);
      setTimeout(() => el.classList.remove(cls), 1500);
    };

    // position (persisted per viewer)
    const place = (x, y) => {
      const w = el.offsetWidth; const h = el.offsetHeight;
      const nx = Math.min(Math.max(8, x), window.innerWidth - w - 8);
      const ny = Math.min(Math.max(8, y), window.innerHeight - h - 8);
      Object.assign(el.style, { left: `${nx}px`, top: `${ny}px`, right: 'auto', bottom: 'auto' });
      el.classList.toggle('is-left', nx + w / 2 < window.innerWidth / 2);
      return [nx, ny];
    };
    try {
      const saved = JSON.parse(read('localStorage', 'nf-mascot-pos') || 'null');
      if (saved) place(saved.x * window.innerWidth, saved.y * window.innerHeight);
    } catch (e) { /* ignore */ }

    let drag = null;
    handle.addEventListener('pointerdown', (e) => {
      const r = el.getBoundingClientRect();
      drag = { dx: e.clientX - r.left, dy: e.clientY - r.top, sx: e.clientX, sy: e.clientY, moved: false };
      handle.setPointerCapture(e.pointerId);
    });
    handle.addEventListener('pointermove', (e) => {
      if (!drag) return;
      if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 5) return;
      drag.moved = true;
      el.classList.add('is-dragging');
      place(e.clientX - drag.dx, e.clientY - drag.dy);
    });
    const end = () => {
      if (!drag) return;
      if (drag.moved) {
        const r = el.getBoundingClientRect();
        write('localStorage', 'nf-mascot-pos', JSON.stringify({ x: r.left / window.innerWidth, y: r.top / window.innerHeight }));
      }
      el.classList.remove('is-dragging');
      setTimeout(() => { drag = null; }, 0);
    };
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
    handle.addEventListener('click', (e) => {
      if (drag?.moved) { e.preventDefault(); return; }
      react('is-happy');
      say(tips[tipIndex++ % tips.length]);
    });
    el.querySelector('[data-nf-mascot-hide]').addEventListener('click', () => { el.hidden = true; write('sessionStorage', 'nf-mascot-hidden', '1'); });
    window.addEventListener('resize', () => { if (el.style.left) { const r = el.getBoundingClientRect(); place(r.left, r.top); } });

    document.addEventListener('nf:mascot', (e) => {
      const { mood, text } = e.detail || {};
      if (mood === 'happy') { react('is-happy'); say(text || el.dataset.success); }
      if (mood === 'worried') { react('is-worried'); say(text || el.dataset.warning); }
    });

    if (read('sessionStorage', 'nf-mascot-greeted') !== '1') {
      setTimeout(() => { say(el.dataset.greeting, 5200); write('sessionStorage', 'nf-mascot-greeted', '1'); }, 1600);
    }
  };

  const init = (root) => { initMenu(root); initReveal(root); initTilt(root); initCompare(root); initCalc(root); };
  const boot = () => { init(document); initMascot(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  // Theme editor: re-init a section after it is re-rendered.
  document.addEventListener('shopify:section:load', (e) => init(e.target));
})();
