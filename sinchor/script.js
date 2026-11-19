'use strict';

(function () {
  /* ===== Помощники ===== */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* хранилище недоступно */ }
  }
  function load(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function debounce(fn, ms) {
    var t;
    return function () { clearTimeout(t); t = setTimeout(fn, ms); };
  }
  // Документ для окон с результатом
  function pageDoc(html, css) {
    return '<!doctype html><html><head><meta charset="utf-8">' +
      '<style>body{margin:12px;font-family:Arial,sans-serif;color:#1F2A44}</style>' +
      '<style>' + (css || '') + '</style></head><body>' + html + '</body></html>';
  }

  /* ===== Подсветка кода ===== */
  function hlHtml(src) {
    return src.replace(/<!--[\s\S]*?-->|<\/?[a-zA-Z!][^>]*>|[^<]+|</g, function (tok) {
      if (tok.indexOf('<!--') === 0) return '<span class="tk-c">' + esc(tok) + '</span>';
      var m = tok.match(/^(<\/?)([!\w-]+)([\s\S]*?)(\/?>)$/);
      if (!m) return esc(tok);
      var attrs = esc(m[3]).replace(
        /([\w:-]+)(=)("[^"]*"|'[^']*')/g,
        '<span class="tk-a">$1</span><span class="tk-p">$2</span><span class="tk-s">$3</span>'
      );
      return '<span class="tk-p">' + esc(m[1]) + '</span><span class="tk-t">' + m[2] + '</span>' +
        attrs + '<span class="tk-p">' + esc(m[4]) + '</span>';
    });
  }

  function hlCss(src) {
    var re = /(\/\*[\s\S]*?\*\/)|([^{}\/;]+?)(\{)|([\w-]+)(\s*:\s*)([^;{}]+)(;?)|([{}])|([\s\S])/g;
    return src.replace(re, function (m, comment, sel, ob, prop, colon, val, semi, brace, other) {
      if (comment) return '<span class="tk-c">' + esc(comment) + '</span>';
      if (sel) return '<span class="tk-t">' + esc(sel) + '</span><span class="tk-p">{</span>';
      if (prop) {
        return '<span class="tk-a">' + esc(prop) + '</span><span class="tk-p">' + esc(colon) + '</span>' +
          '<span class="tk-s">' + esc(val) + '</span><span class="tk-p">' + semi + '</span>';
      }
      if (brace) return '<span class="tk-p">' + brace + '</span>';
      return esc(other);
    });
  }

  function setCode(pre, lang, src) {
    var code = $('code', pre) || pre;
    code.innerHTML = lang === 'css' ? hlCss(src) : hlHtml(src);
  }

  $$('pre.code').forEach(function (pre) {
    var code = $('code', pre);
    var src = code.textContent.replace(/^\n/, '').replace(/\s+$/, '');
    if (src) setCode(pre, pre.getAttribute('data-lang'), src);
  });

  /* ===== Включение и выключение CSS ===== */
  var cssLink = $('#siteCss');
  var cssButtons = $$('.css-toggle');
  var cssState = $('.css-state');

  function setCss(on) {
    cssLink.disabled = !on;
    cssButtons.forEach(function (b) { b.textContent = on ? 'Выключить CSS' : 'Включить CSS'; });
    cssState.textContent = on ? '' : 'CSS выключен. Так выглядит страница, в которой остался один HTML.';
  }
  cssButtons.forEach(function (b) {
    b.addEventListener('click', function () { setCss(cssLink.disabled); });
  });

  /* ===== Прогресс по урокам ===== */
  var LESSONS = 7;
  var done = load('htmlcss-done', {});
  var progress = $('#progress');
  var progressText = $('#progressText');

  function renderProgress() {
    var n = 0;
    for (var i = 1; i <= LESSONS; i++) if (done[i]) n++;
    progress.max = LESSONS;
    progress.value = n;
    progressText.textContent = n === LESSONS ? 'Все уроки пройдены' : 'Пройдено ' + n + ' из ' + LESSONS;

    $$('.done-btn').forEach(function (btn) {
      var on = !!done[btn.dataset.lesson];
      btn.setAttribute('aria-pressed', String(on));
      btn.textContent = on ? 'Урок пройден' : 'Отметить урок пройденным';
    });
    $$('.toc a').forEach(function (a) {
      var on = !!done[a.dataset.lesson];
      var label = a.dataset.label || (a.dataset.label = a.textContent);
      a.classList.toggle('is-done', on);
      if (on) a.setAttribute('aria-label', label + ', урок пройден'); else a.removeAttribute('aria-label');
    });
  }
  function setDone(id, value) {
    done[id] = value;
    save('htmlcss-done', done);
    renderProgress();
  }
  $$('.done-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      setDone(btn.dataset.lesson, !done[btn.dataset.lesson]);
    });
  });
  renderProgress();

  // Подсветка урока, который сейчас на экране
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        $$('.toc a').forEach(function (a) {
          a.classList.toggle('is-current', a.getAttribute('href') === '#' + entry.target.id);
        });
      });
    }, { rootMargin: '-25% 0px -65% 0px' });
    $$('.lesson').forEach(function (s) { observer.observe(s); });
  }

  /* ===== Кнопка в первом экране ===== */
  var heroBtn = $('#heroBtn');
  var heroCode = $('#heroCode');
  var hero = { color: '#58a6ff', radius: 12, pad: 12, size: 18 };

  function isLight(hex) {
    var n = parseInt(hex.slice(1), 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
  }
  function renderHero() {
    var fg = isLight(hero.color) ? '#1F2A44' : '#FFFFFF';
    var padX = hero.pad * 2;
    heroBtn.style.background = hero.color;
    heroBtn.style.color = fg;
    heroBtn.style.borderRadius = hero.radius + 'px';
    heroBtn.style.padding = hero.pad + 'px ' + padX + 'px';
    heroBtn.style.fontSize = hero.size + 'px';
    $('#heroRadiusOut').textContent = hero.radius + ' px';
    $('#heroPadOut').textContent = hero.pad + ' px';
    $('#heroSizeOut').textContent = hero.size + ' px';
    setCode(heroCode, 'css',
      '.button {\n' +
      '  background: ' + hero.color + ';\n' +
      '  color: ' + fg + ';\n' +
      '  border-radius: ' + hero.radius + 'px;\n' +
      '  padding: ' + hero.pad + 'px ' + padX + 'px;\n' +
      '  font-size: ' + hero.size + 'px;\n' +
      '}');
  }
  $$('input[name="heroColor"]').forEach(function (r) {
    r.addEventListener('change', function () { hero.color = r.value; renderHero(); });
  });
  $('#heroRadius').addEventListener('input', function (e) { hero.radius = +e.target.value; renderHero(); });
  $('#heroPad').addEventListener('input', function (e) { hero.pad = +e.target.value; renderHero(); });
  $('#heroSize').addEventListener('input', function (e) { hero.size = +e.target.value; renderHero(); });
  renderHero();

  /* ===== Части тега ===== */
  var parts = $$('.part');
  var anatomyText = $('#anatomyText');
  parts.forEach(function (p) {
    p.setAttribute('aria-pressed', 'false');
    p.addEventListener('click', function () {
      parts.forEach(function (x) { x.setAttribute('aria-pressed', String(x === p)); });
      anatomyText.textContent = p.dataset.info;
    });
  });

  /* ===== Справочник: поиск и фильтр ===== */
  var refRows = $$('#refTable tbody tr');
  var refSearch = $('#refSearch');
  var refEmpty = $('#refEmpty');
  var chips = $$('.chip');
  var refGroup = 'all';

  function filterRef() {
    var q = refSearch.value.trim().toLowerCase();
    var shown = 0;
    refRows.forEach(function (row) {
      var okGroup = refGroup === 'all' || row.dataset.group === refGroup;
      var okText = !q || row.textContent.toLowerCase().indexOf(q) !== -1;
      row.hidden = !(okGroup && okText);
      if (!row.hidden) shown++;
    });
    refEmpty.hidden = shown !== 0;
  }
  refSearch.addEventListener('input', filterRef);
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      refGroup = chip.dataset.group;
      chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
      filterRef();
    });
  });

  /* ===== Теги в деле ===== */
  var LAB = [
    {
      id: 'text', title: 'Текст',
      hint: 'Заголовок, абзац, жирный и курсивный текст, линия и перенос строки. Поменяй слова в коде и посмотри на результат.',
      code: [
        '<h2>Мой любимый предмет</h2>',
        '<p>Я люблю <strong>информатику</strong>, потому что на ней можно <em>создавать</em> свои сайты.</p>',
        '<hr>',
        '<p>Первая строка<br>вторая строка</p>'
      ].join('\n')
    },
    {
      id: 'lists', title: 'Списки',
      hint: 'Тег ul делает список с точками, ol — с цифрами. Каждый пункт записывается тегом li. Добавь свой пункт.',
      code: [
        '<h3>Что взять в школу</h3>',
        '<ul>',
        '  <li>Тетрадь</li>',
        '  <li>Ручку</li>',
        '  <li>Ноутбук</li>',
        '</ul>',
        '<h3>Как сделать сайт</h3>',
        '<ol>',
        '  <li>Написать HTML</li>',
        '  <li>Добавить CSS</li>',
        '  <li>Открыть в браузере</li>',
        '</ol>'
      ].join('\n')
    },
    {
      id: 'links', title: 'Ссылки и картинки',
      hint: 'Ссылка пишется тегом a, адрес лежит в href. Файла cat.jpg рядом нет, поэтому браузер показывает текст из alt. В настоящем проекте такой файл кладут рядом с index.html.',
      code: [
        '<p>Справочник по вебу: <a href="https://developer.mozilla.org/ru/" target="_blank">MDN</a></p>',
        '<p><img src="cat.jpg" alt="Рыжий кот на подоконнике" width="200"></p>'
      ].join('\n')
    },
    {
      id: 'table', title: 'Таблица',
      hint: 'table — вся таблица, tr — строка, th — заголовок столбца, td — ячейка. Добавь ещё одну строку с новым предметом.',
      code: [
        '<table border="1">',
        '  <tr>',
        '    <th>Предмет</th>',
        '    <th>Оценка</th>',
        '  </tr>',
        '  <tr>',
        '    <td>Информатика</td>',
        '    <td>5</td>',
        '  </tr>',
        '  <tr>',
        '    <td>Математика</td>',
        '    <td>4</td>',
        '  </tr>',
        '</table>'
      ].join('\n')
    },
  ];

  var labTabs = $('#labTabs');
  var labCode = $('#labCode');
  var labFrame = $('#labFrame');
  var labHint = $('#labHint');
  var labPanel = $('#labPanel');
  var labIndex = 0;
  var labButtons = [];

  function renderLabFrame() { labFrame.srcdoc = pageDoc(labCode.value, ''); }
  var renderLabLater = debounce(renderLabFrame, 200);

  function selectLab(i, focus) {
    labIndex = i;
    labButtons.forEach(function (b, j) {
      b.setAttribute('aria-selected', String(j === i));
      b.tabIndex = j === i ? 0 : -1;
    });
    labHint.textContent = LAB[i].hint;
    labCode.value = LAB[i].code;
    labPanel.setAttribute('aria-labelledby', 'tab-' + LAB[i].id);
    renderLabFrame();
    if (focus) labButtons[i].focus();
  }

  LAB.forEach(function (item, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'tab';
    b.id = 'tab-' + item.id;
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-controls', 'labPanel');
    b.textContent = item.title;
    b.addEventListener('click', function () { selectLab(i); });
    b.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); selectLab((labIndex + 1) % LAB.length, true); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); selectLab((labIndex + LAB.length - 1) % LAB.length, true); }
    });
    labTabs.appendChild(b);
    labButtons.push(b);
  });
  labCode.addEventListener('input', renderLabLater);
  $('#labReset').addEventListener('click', function () { selectLab(labIndex); });
  selectLab(0);

  /* ===== Селекторы ===== */
  var selInput = $('#selInput');
  var selStage = $('#selStage');
  var selOut = $('#selOut');

  function runSelector() {
    var q = selInput.value.trim();
    $$('.is-hit', selStage).forEach(function (el) { el.classList.remove('is-hit'); });
    if (!q) { selOut.textContent = 'Введи селектор или нажми на готовый пример.'; return; }
    try {
      var hits = $$(q, selStage);
      hits.forEach(function (el) { el.classList.add('is-hit'); });
      selOut.textContent = hits.length
        ? 'Выбрано элементов: ' + hits.length + '.'
        : 'Ничего не выбрано: такого элемента на сцене нет.';
    } catch (e) {
      selOut.textContent = 'Селектор записан неверно. Проверь точку, решётку и пробелы.';
    }
  }
  selInput.addEventListener('input', runSelector);
  $$('.ex').forEach(function (b) {
    b.addEventListener('click', function () { selInput.value = b.textContent; runSelector(); });
  });
  runSelector();

  /* ===== Выбор цвета ===== */
  var pick = $('#pick');
  function renderPick() {
    var hex = pick.value.toUpperCase();
    var n = parseInt(hex.slice(1), 16);
    $('#pickSample').style.background = hex;
    $('#pickHex').textContent = hex;
    $('#pickRgb').textContent = 'rgb(' + ((n >> 16) & 255) + ', ' + ((n >> 8) & 255) + ', ' + (n & 255) + ')';
  }
  pick.addEventListener('input', renderPick);
  renderPick();

  /* ===== Коробка элемента ===== */
  var bmM = $('#bmM'), bmB = $('#bmB'), bmP = $('#bmP');
  function renderBox() {
    var m = +bmM.value, b = +bmB.value, p = +bmP.value;
    $('#bmMargin').style.padding = m + 'px';
    $('#bmEl').style.borderWidth = b + 'px';
    $('#bmEl').style.padding = p + 'px';
    $('#bmMOut').textContent = m + ' px';
    $('#bmBOut').textContent = b + ' px';
    $('#bmPOut').textContent = p + ' px';
    setCode($('#bmCode'), 'css',
      '.block {\n' +
      '  margin: ' + m + 'px;\n' +
      '  border: ' + b + 'px solid #1F2A44;\n' +
      '  padding: ' + p + 'px;\n' +
      '}');
  }
  [bmM, bmB, bmP].forEach(function (r) { r.addEventListener('input', renderBox); });
  renderBox();

  /* ===== Практика с автопроверкой ===== */
  var edHtml = $('#edHtml');
  var edCss = $('#edCss');
  var edFrame = $('#edFrame');
  var edStatus = $('#edStatus');
  var taskItems = $$('#tasks li');

  var TASKS = [
    // 1. Красный заголовок
    function (d, w) {
      var h = d.querySelector('h1');
      if (!h) return false;
      var c = (w.getComputedStyle(h).color.match(/[\d.]+/g) || []).map(Number);
      return c.length >= 3 && c[0] > 120 && c[1] < 110 && c[2] < 110 && c[0] - c[1] > 60;
    },
    // 2. Список из трёх пунктов
    function (d) { return d.querySelectorAll('ul li, ol li').length >= 3; },
    // 3. Ссылка с адресом
    function (d) { return !!d.querySelector('a[href]'); },
    // 4. Рамка и скруглённые углы у абзаца
    function (d, w) {
      return Array.prototype.some.call(d.querySelectorAll('p'), function (p) {
        var s = w.getComputedStyle(p);
        return parseFloat(s.borderTopWidth) > 0 && s.borderTopStyle !== 'none' && parseFloat(s.borderTopLeftRadius) > 0;
      });
    }
  ];

  function checkTasks() {
    var d, w;
    try {
      d = edFrame.contentDocument;
      w = edFrame.contentWindow;
      if (!d || !d.body) return;
    } catch (e) {
      edStatus.textContent = 'В этом браузере автопроверка недоступна, но редактор работает.';
      return;
    }
    var count = 0;
    TASKS.forEach(function (test, i) {
      var ok = false;
      try { ok = !!test(d, w); } catch (e) { ok = false; }
      var li = taskItems[i];
      li.classList.toggle('is-done', ok);
      $('.task-state', li).textContent = ok ? 'готово' : 'не выполнено';
      if (ok) count++;
    });
    if (count === TASKS.length) {
      edStatus.textContent = 'Все задания выполнены. Отличная работа!';
      if (!done[6]) setDone(6, true);
    } else {
      edStatus.textContent = 'Выполнено ' + count + ' из ' + TASKS.length + '.';
    }
  }
  function renderEditor() { edFrame.srcdoc = pageDoc(edHtml.value, edCss.value); }
  var renderEditorLater = debounce(renderEditor, 250);

  edFrame.addEventListener('load', checkTasks);
  edHtml.addEventListener('input', renderEditorLater);
  edCss.addEventListener('input', renderEditorLater);
  $('#edReset').addEventListener('click', function () {
    edHtml.value = edHtml.defaultValue;
    edCss.value = edCss.defaultValue;
    renderEditor();
  });
  renderEditor();

  /* ===== Тест ===== */
  var QUIZ = [
    {
      q: 'За что отвечает HTML?',
      a: ['За цвета и шрифты', 'За структуру и содержимое страницы', 'За скорость интернета'],
      right: 1,
      why: 'HTML описывает, что находится на странице: заголовки, абзацы, ссылки, картинки. Цвета и шрифты — работа CSS.'
    },
    {
      q: 'Каким тегом создаётся ссылка?',
      a: ['<a>', '<img>', '<link>'],
      right: 0,
      why: 'Ссылка — это тег <a> с атрибутом href. Тег <img> вставляет картинку, а <link> подключает файл, например со стилями.'
    },
    {
      q: 'Какая запись CSS написана правильно?',
      a: ['h1 { color: red; }', 'h1 (color = red)', '<h1 color=red>'],
      right: 0,
      why: 'Правило состоит из селектора (h1) и блока в фигурных скобках. Внутри пишут свойство, двоеточие, значение и точку с запятой.'
    },
    {
      q: 'Что находится внутри тега <head>?',
      a: ['Всё, что видно на странице', 'Служебная информация: название вкладки, кодировка, подключение стилей', 'Только картинки'],
      right: 1,
      why: 'Видимое содержимое лежит в <body>. В <head> браузер находит название вкладки, кодировку и ссылки на файлы стилей.'
    },
    {
      q: 'Как в CSS выбрать элементы с class="note"?',
      a: ['.note', '#note', 'note.'],
      right: 0,
      why: 'Класс выбирают с точкой перед именем. Решётка нужна для id.'
    },
    {
      q: 'Какое свойство скругляет углы блока?',
      a: ['border-radius', 'corner-style', 'margin'],
      right: 0,
      why: 'Углы скругляет border-radius. Поменяй его у кнопки в начале страницы и увидишь результат.'
    }
  ];

  var qi = 0, score = 0, answered = false;
  var quizRun = $('#quizRun'), quizEnd = $('#quizEnd');
  var quizCount = $('#quizCount'), quizQ = $('#quizQ'), quizOpts = $('#quizOpts');
  var quizWhy = $('#quizWhy'), quizNext = $('#quizNext');

  function showQuestion() {
    var item = QUIZ[qi];
    answered = false;
    quizCount.textContent = 'Вопрос ' + (qi + 1) + ' из ' + QUIZ.length;
    quizQ.textContent = item.q;
    quizOpts.innerHTML = '';
    quizWhy.textContent = '';
    quizNext.hidden = true;
    item.a.forEach(function (text, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'opt';
      b.textContent = text;
      b.addEventListener('click', function () { choose(i); });
      quizOpts.appendChild(b);
    });
  }
  function choose(i) {
    if (answered) return;
    answered = true;
    var item = QUIZ[qi];
    var buttons = $$('.opt', quizOpts);
    buttons[item.right].classList.add('is-right');
    if (i === item.right) {
      score++;
      quizWhy.textContent = 'Верно. ' + item.why;
    } else {
      buttons[i].classList.add('is-wrong');
      quizWhy.textContent = 'Не совсем. Правильный ответ: «' + item.a[item.right] + '». ' + item.why;
    }
    quizNext.textContent = qi === QUIZ.length - 1 ? 'Показать результат' : 'Следующий вопрос';
    quizNext.hidden = false;
  }
  function showResult() {
    quizRun.hidden = true;
    quizEnd.hidden = false;
    $('#quizScore').textContent = 'Правильных ответов: ' + score + ' из ' + QUIZ.length;
    var pass = score >= Math.ceil(QUIZ.length * 0.8);
    $('#quizMsg').textContent = pass
      ? 'Отличный результат. Урок засчитан.'
      : 'Перечитай уроки, в которых ошибся, и пройди тест ещё раз.';
    if (pass && !done[7]) setDone(7, true);
  }
  quizNext.addEventListener('click', function () {
    if (qi === QUIZ.length - 1) { showResult(); return; }
    qi++;
    showQuestion();
  });
  $('#quizAgain').addEventListener('click', function () {
    qi = 0; score = 0;
    quizEnd.hidden = true;
    quizRun.hidden = false;
    showQuestion();
  });
  showQuestion();
})();
