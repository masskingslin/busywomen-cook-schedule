#!/bin/bash
# For each mutation: copy the app, break one thing, run the suite against the
# broken copy, and require that at least one check fails.
SRC="$(cd "$(dirname "$0")/.." && pwd)"
caught=0; total=0
run_mut () {
  local name="$1" file="$2" old="$3" new="$4"
  total=$((total+1))
  rm -rf /tmp/mut && cp -r "$SRC" /tmp/mut
  python3 - "$file" "$old" "$new" << 'PY'
import sys
f, old, new = sys.argv[1], sys.argv[2], sys.argv[3]
p = '/tmp/mut/' + f
s = open(p).read()
assert old in s, "mutation target not found: " + old[:60]
open(p, 'w').write(s.replace(old, new, 1))
PY
  if [ $? -ne 0 ]; then echo "  !! could not apply mutation: $name"; return; fi
  out=$(APP_DIR=/tmp/mut timeout 120 node "$SRC/tests/test_all.js" 2>&1)
  fails=$(echo "$out" | grep -c "✘")
  crashed=$(echo "$out" | grep -c "SUITE CRASHED")
  if [ "$fails" -gt 0 ] || [ "$crashed" -gt 0 ]; then
    caught=$((caught+1)); echo "  CAUGHT   ($fails failing checks${crashed:+, crash=$crashed})  $name"
  else
    echo "  MISSED   $name   <-- suite stayed green on broken code"
  fi
}
run_mut "translatedDayName stops translating"        js/app.js  "return idx >= 0 ? list[idx] : englishDay;" "return englishDay;"
run_mut "import forgets to apply the theme"          js/app.js  "applyTheme(d.theme || 'teal', d.customColor || '#E7A72C');" ""
run_mut "Escape no longer closes modals"             js/app.js  "if(e.key === 'Escape'){" "if(e.key === 'Esc_never'){"
run_mut "export writes the wrong app id"             js/app.js  'app: "busywomen-cook-schedule",' 'app: "wrong-id",'
run_mut "leaf colour reverted to the failing green"  css/styles.css "--leaf:#4F794E;" "--leaf:#5B8C5A;"
run_mut "a Tamil translation key is deleted"         js/i18n.js "toastPlanSaved: \"திட்டம் சேமிக்கப்பட்டது!\"," ""
run_mut "a data-i18n key is misspelt in the HTML"    index.html 'data-i18n="generateBtn"' 'data-i18n="generateBtnX"'
run_mut "print button no longer prints"              js/app.js  "  window.print();" ""
run_mut "saved language ignored on load"             js/app.js  "applyLanguage(storageGet(STORE.LANG, 'en'));" ""
run_mut "light filter threshold broken"              js/app.js  "(!state.lightOnly || d.calories<300)" "(!state.lightOnly || d.calories<9999)"
run_mut "exclusions no longer honoured"              js/app.js  "!excludedDishes.has(d.name)" "true"
run_mut "focus not returned after closing modal"     js/app.js  "if(saved.trigger && saved.trigger.focus) saved.trigger.focus();" ""
run_mut "aria-checked no longer synced on pills"     js/app.js  "        b.setAttribute('aria-checked', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-checked', 'true');" "      });
      btn.classList.add('active');"
echo
echo "Mutations caught: $caught / $total"
