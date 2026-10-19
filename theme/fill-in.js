// Fill-in-the-blank snippet: a fenced code block with `{{NAME}}` tokens,
// each turned into a real inline <input> embedded in the code:
//
//   <div class="fill-in" data-fill-in>
//
//   ```bash
//   curl https://api.example.com/v1/users \
//     -H "Authorization: Bearer {{API_KEY}}" \
//     -H "X-Region: {{REGION:us-east-1}}"
//   ```
//
//   </div>
//
// `{{NAME:default text}}` seeds that field's starting value. The same
// NAME can appear more than once; every copy stays in sync as the
// reader types. "Copy filled snippet" copies the CURRENT values, not
// the static template mdBook's own copy button would grab.
(function () {
  // One token: {{NAME}} or {{NAME:default}}. Default text may be empty
  // but not contain `}` (kept deliberately simple — no nested braces).
  var TOKEN = /\{\{([A-Za-z0-9_-]+)(?::([^}]*))?\}\}/g;

  // Pure: find every {{NAME}} / {{NAME:default}} token in a plain-text
  // string. -> [{ name, default, start, end }], end exclusive, in
  // source order. A repeated name keeps the FIRST default seen.
  function extractPlaceholders(text) {
    var out = [];
    var seen = {};
    var re = new RegExp(TOKEN.source, 'g');
    var m;
    while ((m = re.exec(String(text || '')))) {
      var name = m[1];
      var def = m[2] || '';
      if (!(name in seen)) seen[name] = def;
      out.push({ name: name, default: seen[name], start: m.index, end: m.index + m[0].length });
    }
    return out;
  }

  // Pure: the template text with every token replaced by values[name],
  // falling back to that token's own default, then ''.
  function fillTemplate(text, values) {
    values = values || {};
    return String(text || '').replace(new RegExp(TOKEN.source, 'g'), function (whole, name, def) {
      var v = values[name];
      if (v != null && v !== '') return v;
      return def || '';
    });
  }

  // Split a text node at [start, end) into before/after, replacing the
  // middle with `el`. Returns the node after `el` (for further splitting).
  function spliceNode(node, start, end, el) {
    var mid = node.splitText(start);
    mid.splitText(end - start);
    node.parentNode.replaceChild(el, mid);
    return el.nextSibling;
  }

  function fieldEl(name, def) {
    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'fi-field';
    input.setAttribute('data-fi-name', name);
    input.placeholder = name;
    input.value = def || '';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.size = Math.max(3, (def || name).length);
    return input;
  }

  // Walk every text node under `code`, replacing each {{...}} token with
  // an <input>. Returns the inputs in source order.
  function installFields(code) {
    var texts = [];
    var walker = document.createTreeWalker(code, NodeFilter.SHOW_TEXT, null);
    var n;
    while ((n = walker.nextNode())) texts.push(n);

    var fields = [];
    texts.forEach(function (textNode) {
      var node = textNode;
      for (;;) {
        var tokens = extractPlaceholders(node.nodeValue);
        if (!tokens.length) break;
        var t = tokens[0];
        var el = fieldEl(t.name, t.default);
        node = spliceNode(node, t.start, t.end, el);
        fields.push(el);
      }
    });
    return fields;
  }

  function wireOne(root) {
    var pre = root.querySelector(':scope > pre');
    var code = pre && pre.querySelector('code');
    if (!code) return;

    var template = code.textContent;
    var fields = installFields(code);
    if (!fields.length) return;

    root.classList.add('fi-ready');

    var bar = document.createElement('div');
    bar.className = 'fi-bar';
    var copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'fi-copy';
    copyBtn.textContent = 'Copy filled snippet';
    bar.appendChild(copyBtn);
    root.appendChild(bar);

    function currentValues() {
      var values = {};
      fields.forEach(function (f) { values[f.getAttribute('data-fi-name')] = f.value; });
      return values;
    }

    function resize(field) {
      field.size = Math.max(3, (field.value || field.placeholder || '').length);
    }

    code.addEventListener('input', function (e) {
      var field = e.target;
      if (!field.classList || !field.classList.contains('fi-field')) return;
      var name = field.getAttribute('data-fi-name');
      var value = field.value;
      fields.forEach(function (f) {
        if (f.getAttribute('data-fi-name') === name) {
          if (f !== field) f.value = value;
          resize(f);
        }
      });
    });

    var resetTimer = null;
    copyBtn.addEventListener('click', function () {
      var filled = fillTemplate(template, currentValues());
      function done(ok) {
        clearTimeout(resetTimer);
        copyBtn.textContent = ok ? 'Copied!' : 'Could not copy';
        copyBtn.classList.toggle('fi-copied', ok);
        resetTimer = setTimeout(function () {
          copyBtn.textContent = 'Copy filled snippet';
          copyBtn.classList.remove('fi-copied');
        }, 1600);
      }
      try {
        navigator.clipboard.writeText(filled).then(function () { done(true); }, function () { done(false); });
      } catch (e) {
        done(false);
      }
    });
  }

  function wire() {
    document.querySelectorAll('[data-fill-in]').forEach(wireOne);
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', wire);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { extractPlaceholders: extractPlaceholders, fillTemplate: fillTemplate };
  }
})();
