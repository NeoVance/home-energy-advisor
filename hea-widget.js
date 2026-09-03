/**
 * Home Energy Savings Advisor — embeddable widget (Phase 3).
 * Components per BUILD_SPEC.json: ProfileParser, SavingsEngine, NarrativeLayer, MonetizationWidget.
 * API contract: GET /api/v1/rate-tables, POST /api/v1/savings/engine.
 * STUB FLAG: if API calls fail, widget degrades to clearly-flagged stub data (labelled "demo data").
 */
(function () {
  'use strict';

  var API_BASE = (window.HEA_CONFIG && window.HEA_CONFIG.apiBase) || 'http://127.0.0.1:8001';

  // ---------------- Utilities ----------------
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function setState(root, state, message) {
    root.dataset.state = state; // loading | success | error | empty | idle | processing | rendering | complete
    var banner = root.querySelector('.hea-state-banner');
    if (banner) banner.remove();
    if (state === 'loading' || state === 'processing' || state === 'rendering') {
      banner = el('div', 'hea-state-banner hea-state-loading', message || 'Loading…');
      root.appendChild(banner);
    } else if (state === 'error') {
      banner = el('div', 'hea-state-banner hea-state-error', message || 'Something went wrong. Please try again.');
      root.appendChild(banner);
    } else if (state === 'empty') {
      banner = el('div', 'hea-state-banner hea-state-empty', message || 'No data yet.');
      root.appendChild(banner);
    }
  }

  function stub(label) {
    return { __stub: true, label: label };
  }

  // ---------------- Component 1: ProfileParser ----------------
  // props: zip_code, sq_ft, heating_type, monthly_bill, ownership_status
  // states: loading, success, error
  var ProfileParser = {
    validate: function (props) {
      var errors = {};
      if (!/^\d{5}$/.test(String(props.zip_code || ''))) errors.zip_code = 'Enter a 5-digit ZIP code.';
      var sq = Number(props.sq_ft);
      if (!props.sq_ft || isNaN(sq) || sq < 100 || sq > 20000) errors.sq_ft = 'Enter square footage between 100 and 20,000.';
      if (!props.heating_type) errors.heating_type = 'Select a heating type.';
      var bill = Number(props.monthly_bill);
      if (!props.monthly_bill || isNaN(bill) || bill <= 0) errors.monthly_bill = 'Enter a monthly bill greater than $0.';
      if (!props.ownership_status) errors.ownership_status = 'Select ownership status.';
      return { valid: Object.keys(errors).length === 0, errors: errors };
    },
    parse: function (props) {
      // Returns structured object; dependency: RateData fetched by caller.
      return {
        zip_code: String(props.zip_code),
        sq_ft: Number(props.sq_ft),
        heating_type: props.heating_type,
        monthly_bill: Number(props.monthly_bill),
        ownership_status: props.ownership_status
      };
    }
  };

  // ---------------- Component 2: SavingsEngine ----------------
  // props: profileData ; states: idle, processing, success, error
  var SavingsEngine = {
    fetchRates: function () {
      return fetch(API_BASE + '/api/v1/rate-tables')
        .then(function (r) { if (!r.ok) throw new Error('rate-tables HTTP ' + r.status); return r.json(); })
        .then(function (data) { return data; })
        .catch(function () { return stub('rate-tables'); });
    },
    compute: function (profileData) {
      return fetch(API_BASE + '/api/v1/savings/engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      })
        .then(function (r) { if (!r.ok) throw new Error('engine HTTP ' + r.status); return r.json(); })
        .catch(function () {
          // Clearly-flagged stub so the widget degrades gracefully when the API is down.
          return {
            __stub: true,
            interventions: [
              { name: 'Switch to a heat pump', savings_estimate: 1140, payback_period_years: 9.2 },
              { name: 'Switch energy provider', savings_estimate: 310, payback_period_years: 0 },
              { name: 'Install a smart thermostat', savings_estimate: 180, payback_period_years: 1.2 }
            ]
          };
        });
    }
  };

  // ---------------- Component 3: NarrativeLayer ----------------
  // props: savingsPlan ; states: idle, rendering, complete
  var NarrativeLayer = {
    narrate: function (plan) {
      // Plain-English rationale grounded in the computed plan figures only.
      var stubNote = plan && plan.__stub ? ' (demo data — live API unavailable)' : '';
      var lines = plan.interventions.map(function (iv, i) {
        var payback = iv.payback_period_years > 0
          ? ' Estimated payback: ' + iv.payback_period_years.toFixed(1) + ' years.'
          : ' Immediate monthly savings.';
        return (i + 1) + '. ' + iv.name + ': estimated savings of $' +
          Math.round(iv.savings_estimate).toLocaleString() + '/yr.' + payback;
      });
      var disclaimer = 'Estimates are ranges based on regional rate tables; actual savings vary by home and usage.';
      return Promise.resolve({
        __stub: plan.__stub || false,
        headline: 'Your ranked savings plan' + stubNote,
        narratives: lines,
        disclaimer: disclaimer
      });
    }
  };

  // ---------------- Component 4: MonetizationWidget ----------------
  // props: apiToken, branding ; states: idle, loading, complete
  var MonetizationWidget = {
    render: function (container, plan, props) {
      container.innerHTML = '';
      setState(container, 'loading', 'Loading offers…');
      // Affiliate/lead-gen wiring per intervention. apiToken tags conversions.
      var OFFER_MAP = {
        'heat pump': { type: 'lead-gen', label: 'Get 3 heat pump quotes', href: 'https://partners.example.com/heat-pump?site_token=' + encodeURIComponent(props.apiToken || 'demo') },
        'provider': { type: 'affiliate', label: 'Compare providers', href: 'https://partners.example.com/compare?site_token=' + encodeURIComponent(props.apiToken || 'demo') },
        'thermostat': { type: 'affiliate', label: 'Shop smart thermostats', href: 'https://partners.example.com/thermostat?site_token=' + encodeURIComponent(props.apiToken || 'demo') }
      };
      setTimeout(function () {
        container.innerHTML = '';
        setState(container, 'complete');
        var list = el('div', 'hea-offers');
        plan.interventions.forEach(function (iv) {
          var key = Object.keys(OFFER_MAP).find(function (k) { return iv.name.toLowerCase().indexOf(k) !== -1; });
          if (!key) return;
          var offer = OFFER_MAP[key];
          var a = el('a', 'hea-offer-link hea-offer-' + offer.type, offer.label);
          a.href = offer.href;
          a.target = '_blank';
          a.rel = 'noopener sponsored';
          a.dataset.intervention = iv.name;
          a.addEventListener('click', function () {
            // Conversion-event logging hook (per-site earnings reporting).
            if (window.HEA_CONFIG && typeof window.HEA_CONFIG.onConversion === 'function') {
              window.HEA_CONFIG.onConversion({ intervention: iv.name, type: offer.type, ts: Date.now() });
            }
          });
          list.appendChild(a);
        });
        if (list.children.length) {
          var consent = el('p', 'hea-consent',
            'By requesting quotes you consent to be contacted about offers. No robocalls; estimates are ranges, not guarantees.');
          container.appendChild(list);
          container.appendChild(consent);
        }
      }, 250);
    }
  };

  // ---------------- Widget root ----------------
  function mount(target, config) {
    config = config || {};
    var root = el('div', 'hea-widget');
    root.innerHTML =
      '<h3 class="hea-title">Home Energy Savings Advisor</h3>' +
      '<form class="hea-form">' +
      '  <label>ZIP code <input name="zip_code" placeholder="80538" inputmode="numeric" maxlength="5"></label>' +
      '  <label>Home size (sq ft) <input name="sq_ft" type="number" placeholder="2000"></label>' +
      '  <label>Heating type <select name="heating_type">' +
      '    <option value="">Select…</option><option value="gas">Gas furnace</option>' +
      '    <option value="electric">Electric resistance</option><option value="oil">Oil</option>' +
      '    <option value="heat_pump">Heat pump</option></select></label>' +
      '  <label>Monthly electric bill ($) <input name="monthly_bill" type="number" step="0.01" placeholder="180"></label>' +
      '  <label>Ownership <select name="ownership_status"><option value="">Select…</option>' +
      '    <option value="own">Own</option><option value="rent">Rent</option></select></label>' +
      '  <button type="submit" class="hea-submit">Estimate my savings</button>' +
      '</form>' +
      '<div class="hea-results" data-state="idle"></div>';
    target.appendChild(root);

    var form = root.querySelector('.hea-form');
    var results = root.querySelector('.hea-results');
    setState(results, 'idle', '');

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var f = form.elements;
      var props = {
        zip_code: f.zip_code.value.trim(),
        sq_ft: f.sq_ft.value,
        heating_type: f.heating_type.value,
        monthly_bill: f.monthly_bill.value,
        ownership_status: f.ownership_status.value
      };
      var v = ProfileParser.validate(props);
      root.querySelectorAll('.hea-field-error').forEach(function (n) { n.remove(); });
      if (!v.valid) {
        Object.keys(v.errors).forEach(function (k) {
          var input = f[k];
          var err = el('span', 'hea-field-error', v.errors[k]);
          input.parentElement.appendChild(err);
        });
        setState(results, 'error', 'Please fix the highlighted fields.');
        return;
      }
      setState(results, 'loading', 'Checking profile…');

      // Pipeline: ProfileParser -> SavingsEngine (with RateData dependency) -> NarrativeLayer
      SavingsEngine.fetchRates()
        .then(function (rateData) {
          setState(results, 'processing', 'Computing savings…');
          var profileData = ProfileParser.parse(props);
          if (rateData.__stub) profileData.__rate_stub = true;
          return SavingsEngine.compute(profileData);
        })
        .then(function (plan) {
          setState(results, 'rendering', 'Writing your plan…');
          return NarrativeLayer.narrate(plan);
        })
        .then(function (narrative) {
          results.innerHTML = '';
          setState(results, 'success');
          results.appendChild(el('h4', 'hea-plan-headline', narrative.headline));
          var ul = el('ul', 'hea-plan-list');
          narrative.narratives.forEach(function (n) { ul.appendChild(el('li', null, n)); });
          results.appendChild(ul);
          results.appendChild(el('p', 'hea-disclaimer', narrative.disclaimer));
          var mon = el('div', 'hea-monetization');
          results.appendChild(mon);
          MonetizationWidget.render(mon, plan, config);
        })
        .catch(function (e) {
          setState(results, 'error', 'Could not compute your plan: ' + e.message);
        });
    });

    return root;
  }

  window.HomeEnergyAdvisor = { mount: mount, ProfileParser: ProfileParser, SavingsEngine: SavingsEngine, NarrativeLayer: NarrativeLayer, MonetizationWidget: MonetizationWidget };
})();
