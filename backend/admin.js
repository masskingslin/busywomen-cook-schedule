// Owner dashboard logic. Everything visitor-supplied (feedback text, dish names,
// event names) is written with textContent, never innerHTML, so it can't
// inject markup or script into this page.
(function(){
  var KEY = 'cookScheduleAdminToken';
  var $ = function(id){ return document.getElementById(id); };

  function el(tag, text, cls){
    var n = document.createElement(tag);
    if(text !== undefined) n.textContent = text;
    if(cls) n.className = cls;
    return n;
  }
  function api(path){
    return fetch(path, { headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem(KEY) }, cache: 'no-store' })
      .then(function(r){ return r.json().then(function(j){ return { status: r.status, body: j }; }); });
  }
  function fmt(n){ return Number(n).toLocaleString('en-IN'); }

  function table(target, rows, cols){
    target.textContent = '';
    if(!rows.length){
      var tr0 = el('tr'); var td0 = el('td', 'Nothing yet.'); td0.colSpan = cols.length;
      tr0.appendChild(td0); target.appendChild(tr0); return;
    }
    rows.forEach(function(r){
      var tr = el('tr');
      cols.forEach(function(c){ tr.appendChild(el('td', String(r[c]))); });
      target.appendChild(tr);
    });
  }

  function render(summary, fb){
    $('sToday').textContent = fmt(summary.today);
    $('sTotal').textContent = fmt(summary.total_visits);
    $('sViews').textContent = fmt(summary.total_views);

    var max = Math.max.apply(null, summary.daily.map(function(d){ return d.visitors; }).concat([1]));
    $('bars').textContent = ''; $('barDays').textContent = '';
    summary.daily.forEach(function(d){
      var b = el('div', undefined, 'bar');
      b.style.height = Math.max(2, Math.round(d.visitors / max * 100)) + '%';
      b.title = d.day + ': ' + d.visitors + ' visitors, ' + d.views + ' views';
      b.appendChild(el('i', d.visitors ? String(d.visitors) : ''));
      $('bars').appendChild(b);
      $('barDays').appendChild(el('span', d.day.slice(8)));
    });

    table($('affTable'), summary.top_affiliate_30d, ['dish', 'kind', 'clicks']);
    table($('evTable'), summary.events_30d, ['name', 'count']);

    $('fbCount').textContent = '(' + fb.total + ' total' + (fb.not_emailed ? ', ' + fb.not_emailed + ' not e-mailed' : '') + ')';
    var list = $('fbList'); list.textContent = '';
    if(!fb.items.length) list.appendChild(el('p', 'No feedback yet.'));
    fb.items.forEach(function(f){
      var box = el('div', undefined, 'fb');
      box.appendChild(el('small', '#' + f.id + ' · ' + f.time + ' · ' + (f.name || 'anonymous') + ' · mail: ' + f.mail_status));
      box.appendChild(el('p', f.message));
      list.appendChild(box);
    });
    var note = $('mailNote');
    if(!summary.mail_configured){
      note.textContent = 'E-mail alerts are OFF - set NOTIFY_TO and SMTP_* in backend/.env. Feedback is still saved here.';
      note.classList.remove('hidden');
    }else{
      note.classList.add('hidden');
    }
  }

  function load(){
    Promise.all([api('/api/admin/summary'), api('/api/admin/feedback?limit=50')]).then(function(res){
      var s = res[0], f = res[1];
      if(s.status !== 200 || f.status !== 200){
        sessionStorage.removeItem(KEY);
        $('dash').classList.add('hidden'); $('loginBox').classList.remove('hidden');
        var msg = (s.body && s.body.error) || 'Could not open the dashboard';
        $('loginError').textContent = s.status === 401 ? 'Wrong token.' : msg;
        $('loginError').classList.remove('hidden');
        return;
      }
      $('loginError').classList.add('hidden');
      $('loginBox').classList.add('hidden'); $('dash').classList.remove('hidden');
      render(s.body, f.body);
    }).catch(function(){
      $('loginError').textContent = 'Could not reach the server.';
      $('loginError').classList.remove('hidden');
    });
  }

  $('loginBtn').addEventListener('click', function(){
    sessionStorage.setItem(KEY, $('tokenInput').value.trim());
    $('tokenInput').value = '';
    load();
  });
  $('tokenInput').addEventListener('keydown', function(e){ if(e.key === 'Enter') $('loginBtn').click(); });
  $('logoutBtn').addEventListener('click', function(){
    sessionStorage.removeItem(KEY);
    $('dash').classList.add('hidden'); $('loginBox').classList.remove('hidden');
  });

  if(sessionStorage.getItem(KEY)) load();
})();
