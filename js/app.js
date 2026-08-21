/**
 * ============================================
 * 我的应用逻辑
 * ============================================
 */

(function () {
  'use strict';

  // === 应用状态 ===
  const state = {
    route: '/',
    searchQuery: '',
    heroScrollHandler: null,  // 保存当前的 hero 滚动监听器，便于下次渲染前移除
    heroWheelHandler: null,   // 保存当前的 hero 滚轮劫持监听器
    customPostsLoaded: false, // 远程 custom-posts.json 是否已加载
    customPosts: []           // 远程自定义文章（所有访客共享，存在仓库 posts/custom-posts.json）
  };

  // 异步加载远程 posts/custom-posts.json（所有访客可见的自定义文章）
  function loadCustomPosts() {
    return fetch('posts/custom-posts.json?t=' + Date.now(), { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) return [];
        return r.json();
      })
      .then(function (arr) {
        state.customPosts = Array.isArray(arr) ? arr : [];
        state.customPostsLoaded = true;
      })
      .catch(function () {
        state.customPosts = [];
        state.customPostsLoaded = true;
      });
  }

  // === 主题配置（从 localStorage 恢复；背景默认值取自 BLOG_CONFIG.background） ===
  var storedBgData = localStorage.getItem('blog-bg-data');
  // 访客未主动选过背景风格时，若有全局背景图（BLOG_CONFIG.background）则应用它
  var hasUserBgChoice = localStorage.getItem('blog-bg');
  var globalBg = BLOG_CONFIG.background;
  let theme = {
    mode: localStorage.getItem('blog-mode') || 'dark',
    accent: localStorage.getItem('blog-accent') || 'blue',
    background: hasUserBgChoice ? hasUserBgChoice : (globalBg ? 'custom' : 'none'),
    bgUrl: storedBgData || localStorage.getItem('blog-bg-url') || globalBg || '',
    opacity: localStorage.getItem('blog-opacity') || '95',
    fontSize: localStorage.getItem('blog-fontsize') || '16'
  };

  // === DOM 引用 ===
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);
  const main = $('#main');

  // === Markdown 配置 ===
  if (typeof marked !== 'undefined') {
    marked.setOptions({
      breaks: true,
      gfm: true
    });
  }

  // ========================================
  // 站点设置（文案 / 布局，localStorage 持久化）
  // ========================================
  const SITE_KEYS = {
    siteName: 'site-name',
    heroSubtitle: 'site-hero-sub',
    sectionTitle: 'site-section-title',
    footerText: 'site-footer',
    layout: 'site-layout',
    columns: 'site-columns',
    avatar: 'site-avatar'
  };

  // GitHub 配置（用于网页上传头像/文章等推送到仓库）
  const GH_KEYS = {
    token: 'gh-token',
    owner: 'gh-owner',
    repo: 'gh-repo',
    branch: 'gh-branch'
  };

  function getGhConfig() {
    return {
      token: localStorage.getItem(GH_KEYS.token) || '',
      owner: localStorage.getItem(GH_KEYS.owner) || '',
      repo: localStorage.getItem(GH_KEYS.repo) || '',
      branch: localStorage.getItem(GH_KEYS.branch) || 'main'
    };
  }

  function saveGhConfig(cfg) {
    localStorage.setItem(GH_KEYS.token, cfg.token || '');
    localStorage.setItem(GH_KEYS.owner, cfg.owner || '');
    localStorage.setItem(GH_KEYS.repo, cfg.repo || '');
    localStorage.setItem(GH_KEYS.branch, cfg.branch || 'main');
  }

  function getSite() {
    return {
      siteName: localStorage.getItem(SITE_KEYS.siteName) || BLOG_CONFIG.siteName,
      heroSubtitle: localStorage.getItem(SITE_KEYS.heroSubtitle) ||
        (BLOG_CONFIG.bio + '。在这里分享技术、读书、旅行与生活的点滴。'),
      sectionTitle: localStorage.getItem(SITE_KEYS.sectionTitle) || '最新文章',
      footerText: localStorage.getItem(SITE_KEYS.footerText) ||
        (BLOG_CONFIG.siteName + ' · Powered by Markdown'),
      layout: localStorage.getItem(SITE_KEYS.layout) || 'grid',
      columns: localStorage.getItem(SITE_KEYS.columns) || 'auto',
      avatar: localStorage.getItem(SITE_KEYS.avatar) || BLOG_CONFIG.avatar || ''
    };
  }

  // 应用站点文案到页面骨架（logo / 标题 / 页脚）
  function applySite() {
    const site = getSite();
    $('.logo-text').textContent = site.siteName;
    document.title = site.siteName;
    $('#footer-text').textContent = site.footerText;
    return site;
  }

  function gridClass() {
    const site = getSite();
    let cls = 'article-grid';
    if (site.layout === 'list') cls += ' layout-list';
    if (site.columns !== 'auto') cls += ' cols-' + site.columns;
    return cls;
  }

  // ========================================
  // 文章存储（localStorage：用户新增/编辑的文章 + 内置文章删除记录）
  // ========================================
  function getCustomPosts() {
    try { return JSON.parse(localStorage.getItem('blog-user-posts') || '[]'); }
    catch (e) { return []; }
  }
  function saveCustomPosts(arr) {
    localStorage.setItem('blog-user-posts', JSON.stringify(arr));
  }
  function getDeletedIds() {
    try { return JSON.parse(localStorage.getItem('blog-deleted-ids') || '[]'); }
    catch (e) { return []; }
  }
  function saveDeletedIds(arr) {
    localStorage.setItem('blog-deleted-ids', JSON.stringify(arr));
  }

  // 合并内置文章、远程自定义文章、本地用户文章：本地 > 远程 > 内置
  function getPosts() {
    const custom = getCustomPosts();              // 本地 localStorage 用户文章
    const remote = state.customPosts || [];        // 远程 posts/custom-posts.json
    const deleted = getDeletedIds();
    const builtinIds = BLOG_POSTS.map(p => p.id);
    const customMap = {};
    custom.forEach(p => { customMap[p.id] = p; });
    const remoteMap = {};
    remote.forEach(p => { remoteMap[p.id] = p; });

    const result = [];
    // 内置文章：可被本地或远程版本覆盖（本地优先）
    BLOG_POSTS.forEach(p => {
      if (!deleted.includes(p.id)) result.push(customMap[p.id] || remoteMap[p.id] || p);
    });
    // 远程自定义文章中非内置 id 的（不被本地覆盖）
    remote.forEach(p => {
      if (!builtinIds.includes(p.id) && !deleted.includes(p.id) && !customMap[p.id]) result.push(p);
    });
    // 本地用户文章中非内置、非远程 id 的
    custom.forEach(p => {
      if (!builtinIds.includes(p.id) && !remoteMap[p.id] && !deleted.includes(p.id)) result.push(p);
    });
    return result;
  }

  function isCustomPost(id) {
    return getCustomPosts().some(p => p.id === id) &&
           !BLOG_POSTS.some(p => p.id === id);
  }

  // ========================================
  // 路由系统
  // ========================================
  function parseHash() {
    const hash = window.location.hash.slice(1) || '/';
    const parts = hash.split('/').filter(Boolean);

    if (parts.length === 0) {
      return { page: 'home' };
    }
    if (parts[0] === 'article' && parts[1]) {
      return { page: 'article', id: decodeURIComponent(parts[1]) };
    }
    if (parts[0] === 'tags' && parts[1]) {
      return { page: 'tags', tag: decodeURIComponent(parts[1]) };
    }
    if (parts[0] === 'tags') {
      return { page: 'tags' };
    }
    if (parts[0] === 'about') {
      return { page: 'about' };
    }
    if (parts[0] === 'admin') {
      return { page: 'admin' };
    }
    return { page: 'home' };
  }

  function router() {
    const route = parseHash();
    state.route = route;
    window.scrollTo(0, 0);

    // 更新导航高亮
    $$('.nav-link').forEach(link => {
      const routePath = link.dataset.route;
      link.classList.toggle('active', routePath === '/' + (route.page === 'home' ? '' : route.page));
    });

    // 关闭移动端菜单
    $('.nav')?.classList.remove('open');

    // 离开管理页时重置编辑状态
    if (route.page !== 'admin') adminEditing = null;

    // 渲染页面
    switch (route.page) {
      case 'home': renderHome(); break;
      case 'article': renderArticle(route.id); break;
      case 'tags': renderTags(route.tag); break;
      case 'about': renderAbout(); break;
      case 'admin': renderAdmin(); break;
      default: renderHome();
    }

    // 添加进入动画
    main.classList.remove('page-enter');
    void main.offsetWidth; // 触发重排
    main.classList.add('page-enter');

    // 隐藏阅读进度条
    $('#reading-progress').classList.remove('active');
  }

  window.addEventListener('hashchange', router);

  // ========================================
  // 工具函数
  // ========================================
  function formatDate(dateStr) {
    const d = new Date(dateStr);
    const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    return `${d.getFullYear()}年${months[d.getMonth()]}${d.getDate()}日`;
  }

  function calcReadTime(content) {
    // 粗略计算：中文按字数，英文按词数
    const charCount = content.replace(/[#*`>\-\[\]()!]/g, '').length;
    return Math.max(1, Math.ceil(charCount / 400));
  }

  function getAllTags() {
    const tagMap = {};
    getPosts().forEach(post => {
      post.tags.forEach(tag => {
        tagMap[tag] = (tagMap[tag] || 0) + 1;
      });
    });
    return Object.entries(tagMap)
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count }));
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // base64 -> UTF-8 字符串（正确处理中文等多字节字符）
  function base64ToUtf8(b64) {
    var binary = atob(b64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder('utf-8').decode(bytes);
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function findPost(id) {
    return getPosts().find(p => p.id === id);
  }

  // ========================================
  // 页面渲染：首页
  // ========================================
  function renderHome() {
    const site = getSite();
    const posts = getPosts();
    const sortedPosts = [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
    const allTags = getAllTags();

    const heroHTML = `
      <section class="hero">
        <div class="hero-avatar-wrap">
          ${site.avatar ? `<img class="hero-avatar" src="${site.avatar}" alt="${escapeHtml(BLOG_CONFIG.author)}">` : `<div class="hero-avatar hero-avatar-text">${escapeHtml(BLOG_CONFIG.author.charAt(0))}</div>`}
        </div>
        <h1 class="hero-title">${escapeHtml(site.siteName)}</h1>
        <p class="hero-subtitle">${escapeHtml(site.heroSubtitle)}</p>
        <div class="hero-stats">
          <div class="hero-stat">
            <div class="hero-stat-num">${posts.length}</div>
            <div class="hero-stat-label">篇文章</div>
          </div>
          <div class="hero-stat">
            <div class="hero-stat-num">${allTags.length}</div>
            <div class="hero-stat-label">个标签</div>
          </div>
          <div class="hero-stat">
            <div class="hero-stat-num">${calcTotalWords()}</div>
            <div class="hero-stat-label">总字数</div>
          </div>
        </div>
        <button class="scroll-down-btn" id="scroll-down-btn" type="button" title="向下滚动查看文章" aria-label="向下滚动查看文章">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 5v14M5 12l7 7 7-7"/>
          </svg>
        </button>
      </section>
    `;

    const cardsHTML = sortedPosts.map(post => renderArticleCard(post)).join('');

    main.innerHTML = heroHTML + `
      <h2 class="section-title" id="articles-section">${escapeHtml(site.sectionTitle)}</h2>
      <div class="${gridClass()}">${cardsHTML}</div>
    `;

    // 向下箭头：点击平滑滚动到文章区
    var scrollBtn = $('#scroll-down-btn');
    function scrollToArticles() {
      var target = $('#articles-section');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (scrollBtn) {
      scrollBtn.addEventListener('click', scrollToArticles);
    }

    // 滚动时让 hero 渐出上移（基于滚动距离的视差效果）
    var heroEl = main.querySelector('.hero');
    if (heroEl) {
      // 清理上一次的滚动监听器，避免堆积
      if (state.heroScrollHandler) {
        window.removeEventListener('scroll', state.heroScrollHandler);
        state.heroScrollHandler = null;
      }
      if (state.heroWheelHandler) {
        window.removeEventListener('wheel', state.heroWheelHandler);
        state.heroWheelHandler = null;
      }
      function handleHeroScroll() {
        var scrollY = window.scrollY || window.pageYOffset;
        var heroHeight = heroEl.offsetHeight;
        var progress = heroHeight > 0 ? Math.min(scrollY / heroHeight, 1) : 0;
        heroEl.style.opacity = (1 - progress * 0.9).toString();
        heroEl.style.transform = 'translateY(' + (-progress * 40) + 'px)';
      }
      window.addEventListener('scroll', handleHeroScroll, { passive: true });
      state.heroScrollHandler = handleHeroScroll;
      handleHeroScroll();

      // 劫持滚轮：在 hero 区向下滑一下就直接平滑滚到文章区
      var isAnimating = false;
      function handleWheel(e) {
        var scrollY = window.scrollY || window.pageYOffset;
        // 只在靠近 hero 顶部时劫持向下滚动
        if (e.deltaY > 0 && scrollY < 80 && !isAnimating) {
          e.preventDefault();
          isAnimating = true;
          scrollToArticles();
          // 动画期间锁定，1.2s 后释放（防止多次触发）
          setTimeout(function () { isAnimating = false; }, 1200);
        }
      }
      // 必须 non-passive 才能 preventDefault
      window.addEventListener('wheel', handleWheel, { passive: false });
      state.heroWheelHandler = handleWheel;
    }

    // 文章卡片 + 标题进入视口时淡入上移
    var revealEls = main.querySelectorAll('.article-card, #articles-section');
    if (revealEls.length && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
      revealEls.forEach(function (el) { io.observe(el); });
    } else {
      // 不支持 IntersectionObserver 的浏览器直接显示
      revealEls.forEach(function (el) { el.classList.add('in-view'); });
    }
  }

  function calcTotalWords() {
    const total = getPosts().reduce((sum, p) => sum + p.content.length, 0);
    if (total > 10000) return (total / 10000).toFixed(1) + 'w';
    return total;
  }

  function renderArticleCard(post) {
    const readTime = calcReadTime(post.content);
    const coverVal = post.cover || 'blue';
    const isImage = coverVal.startsWith('http') || coverVal.startsWith('/') || coverVal.startsWith('data:');
    const coverAttr = isImage
      ? `data-cover="image" style="background-image:url('${escapeHtml(coverVal)}')"`
      : `data-cover="${coverVal}"`;
    return `
      <article class="article-card" onclick="location.hash = '#/article/${encodeURIComponent(post.id)}'">
        <div class="card-cover" ${coverAttr}>
          ${isImage ? '' : '<div class="card-cover-pattern"></div>'}
        </div>
        <div class="card-body">
          <div class="card-tags">
            ${post.tags.map(tag => `<span class="tag-pill" onclick="event.stopPropagation(); location.hash='#/tags/${encodeURIComponent(tag)}'">${tag}</span>`).join('')}
          </div>
          <h3 class="card-title">${escapeHtml(post.title)}</h3>
          <p class="card-excerpt">${escapeHtml(post.excerpt)}</p>
          <div class="card-meta">
            <span class="card-meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              ${formatDate(post.date)}
            </span>
            <span class="card-meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              ${readTime} 分钟
            </span>
          </div>
        </div>
      </article>
    `;
  }

  // ========================================
  // 页面渲染：文章详情
  // ========================================
  function renderArticle(id) {
    const post = findPost(id);

    if (!post) {
      main.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">404</div>
          <h2>文章未找到</h2>
          <p>抱歉，你访问的文章不存在。</p>
          <br>
          <a href="#/" class="article-back">← 返回首页</a>
        </div>
      `;
      return;
    }

    const readTime = calcReadTime(post.content);
    const posts = getPosts().sort((a, b) => new Date(b.date) - new Date(a.date));
    const postIndex = posts.findIndex(p => p.id === id);
    const prevPost = posts[postIndex - 1];
    const nextPost = posts[postIndex + 1];

    // 渲染 Markdown
    let htmlContent = '';
    try {
      htmlContent = marked.parse(post.content);
    } catch (e) {
      htmlContent = '<p>文章内容渲染失败。</p>';
    }

    // 提取目录（同时注入 heading ID）
    const tocResult = generateTOC(htmlContent);
    const tocHTML = tocResult.toc;
    htmlContent = tocResult.html;

    const articleHTML = `
      <div class="article-detail">
        <a href="#/" class="article-back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          返回首页
        </a>
        <div class="article-layout">
          <div>
            ${(post.cover && (post.cover.indexOf('http') === 0 || post.cover.indexOf('data:') === 0)) ? `
              <div class="article-cover">
                <img src="${escapeHtml(post.cover)}" alt="${escapeHtml(post.title)} 封面">
              </div>
            ` : ''}
            <div class="article-header">
              <h1 class="article-detail-title">${escapeHtml(post.title)}</h1>
              <div class="article-detail-meta">
                <span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  ${formatDate(post.date)}
                </span>
                <span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  ${readTime} 分钟阅读
                </span>
                <div class="article-detail-tags">
                  ${post.tags.map(tag => `<span class="tag-pill" onclick="location.hash='#/tags/${encodeURIComponent(tag)}'">${tag}</span>`).join('')}
                </div>
              </div>
            </div>
            <hr class="article-divider">
            <div class="markdown-body" id="markdown-body">${htmlContent}</div>
            <div class="article-nav">
              <div>
                ${prevPost ? `
                  <a class="article-nav-item" href="#/article/${encodeURIComponent(prevPost.id)}">
                    <div class="article-nav-label">← 上一篇</div>
                    <div class="article-nav-title">${escapeHtml(prevPost.title)}</div>
                  </a>
                ` : ''}
              </div>
              <div>
                ${nextPost ? `
                  <a class="article-nav-item next" href="#/article/${encodeURIComponent(nextPost.id)}">
                    <div class="article-nav-label">下一篇 →</div>
                    <div class="article-nav-title">${escapeHtml(nextPost.title)}</div>
                  </a>
                ` : ''}
              </div>
            </div>
          </div>
          ${tocHTML ? `<nav class="article-toc" id="article-toc">${tocHTML}</nav>` : ''}
        </div>
      </div>
    `;

    main.innerHTML = articleHTML;

    // 后处理
    highlightCodeBlocks();
    addCodeCopyButtons();
    initReadingProgress();
    initTOCScroll();
  }

  // 对页面中所有代码块执行语法高亮（marked v12 需要后处理方式）
  function highlightCodeBlocks() {
    if (typeof hljs === 'undefined') return;
    $$('.markdown-body pre code').forEach(el => {
      try { hljs.highlightElement(el); } catch (e) { /* ignore */ }
    });
  }

  function generateTOC(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const headings = temp.querySelectorAll('h2, h3, h4');

    if (headings.length < 2) return { toc: '', html: html };

    let toc = '<div class="toc-title">目录</div><ul class="toc-list">';
    headings.forEach((h, i) => {
      const id = `heading-${i}`;
      h.id = id;
      const level = h.tagName.toLowerCase();
      const text = h.textContent.replace(/^#+\s*/, '');
      toc += `<li><a href="#${id}" class="toc-${level}" data-target="${id}">${escapeHtml(text)}</a></li>`;
    });
    toc += '</ul>';

    return { toc: toc, html: temp.innerHTML };
  }

  function addCodeCopyButtons() {
    $$('.markdown-body pre').forEach(pre => {
      const btn = document.createElement('button');
      btn.className = 'code-copy-btn';
      btn.textContent = '复制';
      btn.addEventListener('click', function () {
        const code = pre.querySelector('code');
        const text = code ? code.textContent : pre.textContent;
        navigator.clipboard.writeText(text).then(() => {
          btn.textContent = '已复制';
          btn.classList.add('copied');
          setTimeout(() => {
            btn.textContent = '复制';
            btn.classList.remove('copied');
          }, 2000);
        }).catch(() => {
          btn.textContent = '复制失败';
          setTimeout(() => { btn.textContent = '复制'; }, 2000);
        });
      });
      pre.appendChild(btn);
    });
  }

  function initReadingProgress() {
    const progress = $('#reading-progress');
    progress.classList.add('active');

    function updateProgress() {
      const article = $('.article-detail');
      if (!article) return;
      const rect = article.getBoundingClientRect();
      const total = article.offsetHeight - window.innerHeight;
      const scrolled = Math.max(0, -rect.top);
      const percent = Math.min(100, (scrolled / total) * 100);
      progress.style.width = percent + '%';
    }

    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
  }

  function initTOCScroll() {
    const tocLinks = $$('.toc-list a');
    if (tocLinks.length === 0) return;

    const headings = [];
    tocLinks.forEach(link => {
      const target = document.getElementById(link.dataset.target);
      if (target) headings.push({ el: target, link: link });
    });

    function updateActive() {
      let activeIndex = 0;
      for (let i = 0; i < headings.length; i++) {
        if (headings[i].el.getBoundingClientRect().top < 100) {
          activeIndex = i;
        }
      }
      headings.forEach((h, i) => {
        h.link.classList.toggle('active', i === activeIndex);
      });
    }

    window.addEventListener('scroll', updateActive, { passive: true });
    updateActive();

    // 平滑滚动
    tocLinks.forEach(link => {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.getElementById(this.dataset.target);
        if (target) {
          window.scrollTo({
            top: target.offsetTop - 80,
            behavior: 'smooth'
          });
        }
      });
    });
  }

  // ========================================
  // 页面渲染：标签
  // ========================================
  function renderTags(activeTag) {
    const allTags = getAllTags();

    const cloudHTML = `
      <div class="tags-page">
        <h2 class="section-title">标签分类</h2>
        <div class="tags-cloud">
          ${allTags.map(({ tag, count }) => `
            <span class="tag-cloud-item ${activeTag === tag ? 'active' : ''}"
                  onclick="location.hash='#/tags/${encodeURIComponent(tag)}'">
              ${tag}
              <span class="tag-count">${count}</span>
            </span>
          `).join('')}
        </div>
    `;

    if (activeTag) {
      const filtered = getPosts().filter(p => p.tags.includes(activeTag));
      const filteredHTML = `
          <h2 class="section-title">标签 "${escapeHtml(activeTag)}" 的文章 (${filtered.length})</h2>
          ${filtered.length > 0
            ? `<div class="${gridClass()}">${filtered.map(renderArticleCard).join('')}</div>`
            : `<div class="empty-state"><div class="empty-state-icon">&#128193;</div><p>该标签下暂无文章</p></div>`
          }
        </div>
      `;
      main.innerHTML = cloudHTML + filteredHTML;
    } else {
      // 按标签分组展示
      let groupedHTML = '';
      allTags.forEach(({ tag, count }) => {
        const posts = getPosts().filter(p => p.tags.includes(tag));
        groupedHTML += `
          <h2 class="section-title">${escapeHtml(tag)} <span style="font-size:0.85rem;color:var(--text-tertiary);font-weight:400">(${count})</span></h2>
          <div class="${gridClass()}" style="margin-bottom:var(--space-xl)">
            ${posts.map(renderArticleCard).join('')}
          </div>
        `;
      });
      main.innerHTML = cloudHTML + groupedHTML + '</div>';
    }
  }

  // ========================================
  // 页面渲染：关于
  // ========================================
  function renderAbout() {
    const site = getSite();
    const socialLinks = BLOG_CONFIG.social.map(s => {
      const icons = {
        'GitHub': '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.26.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.73.083-.73 1.205.085 1.838 1.237 1.838 1.237 1.07 1.835 2.807 1.305 3.492.998.108-.776.42-1.305.762-1.605-2.665-.305-5.467-1.332-5.467-5.93 0-1.31.467-2.38 1.235-3.22-.124-.303-.535-1.523.117-3.176 0 0 1.008-.323 3.3 1.23a11.5 11.5 0 0 1 3-.404c1.02.005 2.045.138 3 .404 2.29-1.553 3.297-1.23 3.297-1.23.655 1.653.243 2.873.12 3.176.77.84 1.232 1.91 1.232 3.22 0 4.61-2.807 5.624-5.48 5.92.43.37.823 1.103.823 2.222 0 1.606-.014 2.898-.014 3.293 0 .32.217.694.825.577C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z"/></svg>',
        'Email': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
        'RSS': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/></svg>'
      };
      return `<a href="${s.url}" class="about-link">${icons[s.icon] || ''} ${s.name}</a>`;
    }).join('');

    const aboutContent = marked.parse(`
## 关于我

你好！我是 **${BLOG_CONFIG.author}**，这是我的个人博客。

${BLOG_CONFIG.bio}。

## 关于这个博客

这个博客创建于 2026 年，是我记录和分享的地方。在这里你会找到：

- **技术文章** — 前端、后端、数据库、DevOps 等技术领域的实战经验
- **读书笔记** — 读完每本好书后的思考和总结
- **生活随笔** — 旅行见闻、生活感悟、日常思考
- **工具推荐** — 用过的好工具和好资源

## 技术栈

这个博客网站使用以下技术构建：

- 纯 HTML / CSS / JavaScript，无需构建工具
- [Marked.js](https://marked.js.org/) — Markdown 解析
- [Highlight.js](https://highlightjs.org/) — 代码语法高亮
- CSS 自定义属性实现主题切换
- LocalStorage 保存个性化设置

## 联系方式

如果你想与我交流，可以通过以下方式找到我。

> "分享是学习最好的方式。" 让我们一起在分享中成长！
    `);

    main.innerHTML = `
      <div class="about-page">
        <div class="about-card">
          <div class="about-header">
            <div class="about-avatar">${site.avatar ? '<img src="' + site.avatar + '" alt="' + escapeHtml(BLOG_CONFIG.author) + '">' : BLOG_CONFIG.author.charAt(0)}</div>
            <div>
              <div class="about-name">${BLOG_CONFIG.author}</div>
              <div class="about-bio">${BLOG_CONFIG.bio}</div>
              <div class="about-links">${socialLinks}</div>
            </div>
          </div>
          <hr class="article-divider">
          <div class="markdown-body">${aboutContent}</div>
        </div>
      </div>
    `;
  }

  // ========================================
  // 页面渲染：管理页（文章管理）
  // ========================================
  let adminEditing = null; // null=列表, 'new'=新建, 'settings'=站点设置, 'customize'=网站装修, 其他=编辑的文章 id

  // 管理页鉴权（密码保存在 sessionStorage，关闭标签页即失效）
  function isAdminAuthed() {
    return sessionStorage.getItem('admin-authed') === '1';
  }

  function renderAdmin() {
    if (!isAdminAuthed()) {
      renderAdminLogin();
      return;
    }
    if (adminEditing === 'settings') {
      renderAdminSettings();
    } else if (adminEditing === 'customize') {
      renderAdminCustomize();
    } else if (adminEditing !== null) {
      renderAdminEditor(adminEditing);
    } else {
      renderAdminList();
    }
  }

  function renderAdminLogin() {
    main.innerHTML = `
      <div class="admin-page" style="max-width:420px">
        <div class="admin-card" style="padding:32px">
          <h2 class="section-title" style="margin-bottom:24px">管理登录</h2>
          <div class="admin-field">
            <input type="password" class="admin-input" id="admin-password-input" placeholder="请输入管理密码" autocomplete="current-password" style="font-size:1rem">
          </div>
          <button class="admin-btn primary" id="admin-login-btn" style="width:100%;justify-content:center;padding:10px">登录</button>
          <p class="admin-hint" style="margin-top:16px;text-align:center">默认密码 admin123，可在 js/data.js 的 BLOG_CONFIG.adminPassword 修改</p>
        </div>
      </div>
    `;
    var pwdInput = $('#admin-password-input');
    pwdInput.focus();
    function tryLogin() {
      var pwd = pwdInput.value;
      if (pwd === BLOG_CONFIG.adminPassword) {
        sessionStorage.setItem('admin-authed', '1');
        adminEditing = null;
        renderAdmin();
      } else {
        pwdInput.value = '';
        pwdInput.placeholder = '密码错误，请重新输入';
        pwdInput.focus();
      }
    }
    $('#admin-login-btn').addEventListener('click', tryLogin);
    pwdInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') tryLogin();
    });
  }

  function renderAdminList() {
    const posts = getPosts().sort((a, b) => new Date(b.date) - new Date(a.date));
    const deletedCount = getDeletedIds().length;
    const customCount = getCustomPosts().filter(p => !BLOG_POSTS.some(b => b.id === p.id)).length;

    const rows = posts.map(post => {
      const isBuiltin = BLOG_POSTS.some(b => b.id === post.id);
      return `
        <tr>
          <td class="post-title-cell" title="${escapeHtml(post.title)}">${escapeHtml(post.title)}</td>
          <td class="hide-mobile">${post.date}</td>
          <td class="hide-mobile">${post.tags.map(t => `<span class="admin-badge">${escapeHtml(t)}</span>`).join(' ')}</td>
          <td>${isBuiltin ? '<span class="admin-badge builtin">内置</span>' : (state.customPosts.some(p => p.id === post.id) ? '<span class="admin-badge remote">远程</span>' : '<span class="admin-badge">自建</span>')}</td>
          <td>
            <div class="post-actions">
              <button class="admin-btn" data-edit="${post.id}">编辑</button>
              ${state.customPosts.some(p => p.id === post.id) ? '<button class="admin-btn danger" data-delete-gh="' + post.id + '">从GitHub删除</button>' : ''}
              <button class="admin-btn danger" data-delete="${post.id}">本地删除</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    main.innerHTML = `
      <div class="admin-page">
        <div class="admin-toolbar">
          <h2 class="section-title" style="margin-bottom:0">文章管理 <span style="font-size:0.85rem;color:var(--text-tertiary);font-weight:400">共 ${posts.length} 篇</span></h2>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            ${deletedCount > 0 ? `<button class="admin-btn" id="restore-builtin">恢复内置文章 (${deletedCount})</button>` : ''}
            <button class="admin-btn" id="customize-open-btn">网站装修</button>
            <button class="admin-btn" id="site-settings-btn">站点设置</button>
            <button class="admin-btn primary" id="new-post-btn">+ 新建文章</button>
          </div>
        </div>
        ${customCount > 0 || deletedCount > 0 ? `<p class="admin-hint" style="margin-bottom:12px">自建 ${customCount} 篇 · 文章数据保存在浏览器本地（localStorage）</p>` : '<p class="admin-hint" style="margin-bottom:12px">提示：新建和编辑的文章保存在浏览器本地（localStorage），内置文章可在 data.js 中修改</p>'}
        <div class="admin-card">
          <div class="admin-table-wrap">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>标题</th>
                  <th class="hide-mobile">日期</th>
                  <th class="hide-mobile">标签</th>
                  <th>来源</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:var(--text-tertiary);padding:40px">暂无文章，点击右上角新建</td></tr>'}</tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    $('#new-post-btn').addEventListener('click', function () {
      adminEditing = 'new';
      renderAdmin();
    });

    $('#site-settings-btn').addEventListener('click', function () {
      adminEditing = 'settings';
      renderAdmin();
    });

    $('#customize-open-btn').addEventListener('click', function () {
      var customizer = $('#customizer');
      var customizerOverlay = $('#customizer-overlay');
      if (customizer && customizerOverlay) {
        customizer.classList.add('open');
        customizerOverlay.classList.add('active');
      }
    });

    $$('[data-edit]').forEach(btn => {
      btn.addEventListener('click', function () {
        adminEditing = this.dataset.edit;
        renderAdmin();
      });
    });

    $$('[data-delete]').forEach(btn => {
      btn.addEventListener('click', function () {
        const id = this.dataset.delete;
        const post = findPost(id);
        if (!confirm(`确定从本地删除文章「${post ? post.title : id}」吗？（不会影响 GitHub 上的远程版本）`)) return;
        deletePost(id);
        renderAdmin();
      });
    });

    // 从 GitHub 删除远程文章（仅当该文章在 posts/custom-posts.json 中）
    $$('[data-delete-gh]').forEach(btn => {
      btn.addEventListener('click', function () {
        const id = this.dataset.deleteGh;
        const post = findPost(id);
        if (!confirm(`确定从 GitHub 仓库删除文章「${post ? post.title : id}」吗？\n\n所有访客将看不到这篇文章。`)) return;
        var original = this.textContent;
        this.disabled = true;
        this.textContent = '删除中...';
        var self = this;
        deletePostFromGithub(id, function (err) {
          self.disabled = false;
          self.textContent = original;
          if (err) {
            alert('从 GitHub 删除失败：' + err);
            return;
          }
          // 同步：从内存 state.customPosts 移除
          state.customPosts = state.customPosts.filter(function (p) { return p.id !== id; });
          // 也从本地 userPosts 移除（如果存在）
          var local = getCustomPosts().filter(function (p) { return p.id !== id; });
          saveCustomPosts(local);
          alert('已从 GitHub 删除。GitHub Pages 约 1-2 分钟后重新部署。');
          renderAdmin();
        });
      });
    });

    const restoreBtn = $('#restore-builtin');
    if (restoreBtn) {
      restoreBtn.addEventListener('click', function () {
        saveDeletedIds([]);
        alert('已恢复所有内置文章');
        renderAdmin();
      });
    }
  }

  function deletePost(id) {
    // 从自定义列表移除
    saveCustomPosts(getCustomPosts().filter(p => p.id !== id));
    // 若为内置文章，记录删除
    if (BLOG_POSTS.some(p => p.id === id)) {
      const deleted = getDeletedIds();
      if (!deleted.includes(id)) {
        deleted.push(id);
        saveDeletedIds(deleted);
      }
    }
  }

  function slugify(text) {
    const base = text.trim().toLowerCase()
      .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return base || 'post';
  }

  // 封面渐变定义（与 CSS 一致）
  var COVER_COLORS = [
    { name: 'blue',   gradient: 'linear-gradient(135deg, #667eea, #764ba2)' },
    { name: 'green',  gradient: 'linear-gradient(135deg, #43e97b, #38f9d7)' },
    { name: 'orange', gradient: 'linear-gradient(135deg, #fa709a, #fee140)' },
    { name: 'purple', gradient: 'linear-gradient(135deg, #a18cd1, #fbc2eb)' },
    { name: 'teal',   gradient: 'linear-gradient(135deg, #4facfe, #00f2fe)' },
    { name: 'rose',   gradient: 'linear-gradient(135deg, #ff6b6b, #ee5a6f)' }
  ];

  // ========================================
  // 页面渲染：站点设置（GitHub Token、头像上传）
  // ========================================
  function renderAdminSettings() {
    var gh = getGhConfig();
    var site = getSite();
    var hasToken = !!gh.token && !!gh.owner && !!gh.repo;
    var previewSrc = site.avatar;

    main.innerHTML = `
      <div class="admin-page">
        <div class="admin-toolbar">
          <h2 class="section-title" style="margin-bottom:0">站点设置</h2>
          <button class="admin-btn" id="settings-back">\u2190 返回列表</button>
        </div>
        <div class="admin-editor">
          <div class="admin-field">
            <label>当前头像</label>
            <div style="display:flex;align-items:center;gap:16px;margin-bottom:8px">
              <div class="about-avatar" style="width:96px;height:96px;font-size:2.4rem">
                ${previewSrc ? '<img src="' + previewSrc + '" alt="avatar">' : BLOG_CONFIG.author.charAt(0)}
              </div>
              <div style="flex:1">
                <p class="admin-hint" style="margin:0 0 4px 0">这是访客打开"关于"页看到的头像。</p>
                <p class="admin-hint" style="margin:0">来源：${localStorage.getItem(SITE_KEYS.avatar) ? '本地（仅你浏览器）' : 'data.js 默认'}</p>
              </div>
            </div>
          </div>

          <div class="admin-field">
            <label>上传新头像（推送到 GitHub 仓库，所有访客可见）</label>
            <div class="bg-upload-zone" id="avatar-gh-upload-zone" style="${hasToken ? '' : 'opacity:0.5;pointer-events:none'}">
              <div class="bg-upload-icon">\ud83d\udcf7</div>
              <div class="bg-upload-text">${hasToken ? '点击选择图片或拖拽到此' : '请先在下方填写并保存 GitHub 配置'}</div>
              <div class="admin-hint" style="margin-top:4px">建议正方形 JPG/PNG/WebP，小于 1MB；上传后约 1 分钟生效</div>
              <input type="file" id="avatar-gh-file-input" accept="image/*" style="display:none">
            </div>
            <div id="avatar-gh-status" style="margin-top:8px"></div>
          </div>

          <div class="admin-field">
            <label>上传新背景图（推送到 GitHub 仓库，所有访客可见）</label>
            <div class="bg-upload-zone" id="bg-gh-upload-zone" style="${hasToken ? '' : 'opacity:0.5;pointer-events:none'}">
              <div class="bg-upload-icon">\ud83c\udf10</div>
              <div class="bg-upload-text">${hasToken ? '点击选择图片或拖拽到此' : '请先在下方填写并保存 GitHub 配置'}</div>
              <div class="admin-hint" style="margin-top:4px">建议横向 1920x1080，JPG/WebP，小于 2MB；上传后约 1 分钟生效</div>
              <input type="file" id="bg-gh-file-input" accept="image/*" style="display:none">
            </div>
            <div id="bg-gh-status" style="margin-top:8px"></div>
          </div>

          <hr class="article-divider" style="background:var(--border-color)">

          <div class="admin-field">
            <label>GitHub 仓库配置</label>
            <div class="admin-field-row">
              <div class="admin-field" style="margin-bottom:0">
                <input type="text" class="admin-input" id="gh-owner" placeholder="GitHub 用户名" value="${escapeHtml(gh.owner)}">
              </div>
              <div class="admin-field" style="margin-bottom:0">
                <input type="text" class="admin-input" id="gh-repo" placeholder="仓库名（如 blog）" value="${escapeHtml(gh.repo)}">
              </div>
            </div>
            <div class="admin-field-row" style="margin-top:12px">
              <div class="admin-field" style="margin-bottom:0">
                <input type="text" class="admin-input" id="gh-branch" placeholder="分支名（默认 main）" value="${escapeHtml(gh.branch)}">
              </div>
              <div class="admin-field" style="margin-bottom:0">
                <input type="password" class="admin-input" id="gh-token" placeholder="Personal Access Token" value="${escapeHtml(gh.token)}">
              </div>
            </div>
            <div class="admin-hint">
              获取 Token：GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token。
              权限只勾选 <strong>当前仓库</strong> 的 <strong>Contents: Read and write</strong>。
              Token 仅保存在你浏览器 localStorage，不发送到任何第三方。
            </div>
          </div>

          <div class="admin-actions">
            <button class="admin-btn primary" id="gh-save">保存配置</button>
            <button class="admin-btn" id="gh-test">测试连接</button>
          </div>
        </div>
      </div>
    `;

    $('#settings-back').addEventListener('click', function () {
      adminEditing = null;
      renderAdmin();
    });

    $('#gh-save').addEventListener('click', function () {
      saveGhConfig({
        owner: $('#gh-owner').value.trim(),
        repo: $('#gh-repo').value.trim(),
        branch: $('#gh-branch').value.trim() || 'main',
        token: $('#gh-token').value.trim()
      });
      alert('GitHub 配置已保存');
      renderAdmin();
    });

    $('#gh-test').addEventListener('click', function () {
      var cfg = {
        owner: $('#gh-owner').value.trim(),
        repo: $('#gh-repo').value.trim(),
        branch: $('#gh-branch').value.trim() || 'main',
        token: $('#gh-token').value.trim()
      };
      if (!cfg.owner || !cfg.repo || !cfg.token) {
        alert('请先填写用户名、仓库名、Token');
        return;
      }
      var statusEl = $('#avatar-gh-status');
      statusEl.innerHTML = '<p class="admin-hint" style="margin:0">测试中...</p>';
      fetch('https://api.github.com/repos/' + cfg.owner + '/' + cfg.repo, {
        headers: {
          'Authorization': 'Bearer ' + cfg.token,
          'Accept': 'application/vnd.github+json'
        }
      }).then(function (r) {
        if (r.ok) {
          statusEl.innerHTML = '<p class="admin-hint" style="margin:0;color:var(--accent-green)">✓ 连接成功，仓库可访问</p>';
        } else if (r.status === 404) {
          statusEl.innerHTML = '<p class="admin-hint" style="margin:0;color:var(--accent-rose)">✗ 仓库不存在或无权访问</p>';
        } else if (r.status === 401) {
          statusEl.innerHTML = '<p class="admin-hint" style="margin:0;color:var(--accent-rose)">✗ Token 无效</p>';
        } else {
          statusEl.innerHTML = '<p class="admin-hint" style="margin:0;color:var(--accent-rose)">✗ 错误 ' + r.status + '</p>';
        }
      }).catch(function (err) {
        statusEl.innerHTML = '<p class="admin-hint" style="margin:0;color:var(--accent-rose)">✗ 网络错误：' + err.message + '</p>';
      });
    });

    // 头像上传到 GitHub
    var ghUploadZone = $('#avatar-gh-upload-zone');
    var ghFileInput = $('#avatar-gh-file-input');
    var statusBox = $('#avatar-gh-status');

    function handleGhAvatarUpload(file) {
      if (!hasToken) {
        alert('请先填写并保存 GitHub 配置');
        return;
      }
      if (!file || !file.type.startsWith('image/')) {
        alert('请选择图片文件');
        return;
      }
      if (file.size > 1024 * 1024) {
        if (!confirm('图片超过 1MB，可能上传较慢。是否继续？')) return;
      }
      var reader = new FileReader();
      reader.onload = function (e) {
        var dataUrl = e.target.result;
        // base64 数据部分（去掉 data:image/xxx;base64, 前缀）
        var base64 = dataUrl.split(',')[1];
        var mime = file.type;
        var ext = mime.split('/')[1] || 'jpg';
        var path = 'assets/avatar.' + ext;
        uploadFileToGithub(path, base64, file, dataUrl);
      };
      reader.onerror = function () { alert('读取图片失败'); };
      reader.readAsDataURL(file);
    }

    function uploadFileToGithub(path, base64, file, dataUrl) {
      statusBox.innerHTML = '<p class="admin-hint" style="margin:0">上传中...（可能需要 10-30 秒）</p>';
      var cfg = getGhConfig();
      var url = 'https://api.github.com/repos/' + cfg.owner + '/' + cfg.repo + '/contents/' + path;
      // 1. 先 GET 拿 sha（如果文件已存在需要带 sha 才能更新）
      fetch(url + '?ref=' + encodeURIComponent(cfg.branch), {
        headers: {
          'Authorization': 'Bearer ' + cfg.token,
          'Accept': 'application/vnd.github+json'
        }
      }).then(function (r) {
        if (r.status === 404) return Promise.resolve(null); // 文件不存在，新建
        if (!r.ok) throw new Error('获取文件失败 ' + r.status);
        return r.json();
      }).then(function (existing) {
        // 2. PUT 上传
        var body = {
          message: 'Update avatar via admin',
          content: base64,
          branch: cfg.branch
        };
        if (existing && existing.sha) body.sha = existing.sha;
        return fetch(url, {
          method: 'PUT',
          headers: {
            'Authorization': 'Bearer ' + cfg.token,
            'Accept': 'application/vnd.github+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });
      }).then(function (r) {
        if (!r.ok) {
          return r.json().then(function (j) {
            throw new Error(j.message || ('HTTP ' + r.status));
          });
        }
        return r.json();
      }).then(function (res) {
        // 上传成功：本地也存一份作为立即生效的预览
        try { localStorage.setItem(SITE_KEYS.avatar, dataUrl); } catch (e) {}
        statusBox.innerHTML =
          '<p class="admin-hint" style="margin:0;color:var(--accent-green)">✓ 图片已推送：' + escapeHtml(res.commit?.html_url || '') + '</p>' +
          '<p class="admin-hint" style="margin:4px 0 0 0">正在更新 js/data.js 引用...</p>';
        // 3. 自动更新 js/data.js 让 avatar 字段指向仓库内文件，所有访客才能看到
        var fileRef = './' + path + '?v=' + Date.now();
        updateDataJsAvatarRef(cfg, fileRef, statusBox);
      }).catch(function (err) {
        statusBox.innerHTML = '<p class="admin-hint" style="margin:0;color:var(--accent-rose)">✗ 上传失败：' + escapeHtml(err.message) + '</p>';
      });
    }

    // 通过 GitHub Contents API 把 js/data.js 中的 avatar 字段值改为新引用
    function updateDataJsAvatarRef(cfg, fileRef, statusBox) {
      var dataUrl = 'https://api.github.com/repos/' + cfg.owner + '/' + cfg.repo + '/contents/js/data.js';
      fetch(dataUrl + '?ref=' + encodeURIComponent(cfg.branch), {
        headers: {
          'Authorization': 'Bearer ' + cfg.token,
          'Accept': 'application/vnd.github+json'
        }
      }).then(function (r) {
        if (!r.ok) throw new Error('读取 data.js 失败 ' + r.status);
        return r.json();
      }).then(function (data) {
        var content = base64ToUtf8(data.content.replace(/\n/g, ''));
        var newRef = "avatar: '" + fileRef + "'";
        // 已包含同引用则跳过
        if (content.indexOf(newRef) >= 0) {
          statusBox.innerHTML +=
            '<p class="admin-hint" style="margin:4px 0 0 0;color:var(--accent-green)">✓ data.js 已指向最新头像，无需重复更新</p>' +
            '<p class="admin-hint" style="margin:4px 0 0 0">GitHub Pages 将在约 1 分钟后重新部署。</p>';
          return;
        }
        // 替换 avatar: 'xxx' 行（含可选前导空格）
        var newContent = content.replace(
          /(\s*)avatar:\s*'[^']*'/,
          '$1' + newRef
        );
        if (newContent === content) {
          throw new Error('未在 data.js 找到 avatar 字段');
        }
        var base64 = btoa(unescape(encodeURIComponent(newContent)));
        return fetch(dataUrl, {
          method: 'PUT',
          headers: {
            'Authorization': 'Bearer ' + cfg.token,
            'Accept': 'application/vnd.github+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: 'Update data.js: avatar reference',
            content: base64,
            sha: data.sha,
            branch: cfg.branch
          })
        }).then(function (r) {
          if (!r.ok) {
            return r.json().then(function (j) {
              throw new Error(j.message || ('HTTP ' + r.status));
            });
          }
          statusBox.innerHTML +=
            '<p class="admin-hint" style="margin:4px 0 0 0;color:var(--accent-green)">✓ data.js 已更新</p>' +
            '<p class="admin-hint" style="margin:4px 0 0 0">GitHub Pages 将在约 1 分钟后重新部署。部署完成后所有访客都能看到新头像。</p>';
          setTimeout(renderAdmin, 1500);
        });
      }).catch(function (err) {
        statusBox.innerHTML +=
          '<p class="admin-hint" style="margin:4px 0 0 0;color:var(--accent-rose)">⚠ 图片已推送，但更新 data.js 失败：' + escapeHtml(err.message) + '。请手动将 js/data.js 的 avatar 字段改为 \'' + fileRef + '\' 并 commit。</p>';
      });
    }

    ghUploadZone.addEventListener('click', function () { ghFileInput.click(); });
    ghFileInput.addEventListener('change', function () {
      if (this.files && this.files[0]) handleGhAvatarUpload(this.files[0]);
      this.value = '';
    });
    ghUploadZone.addEventListener('dragover', function (e) {
      e.preventDefault();
      this.classList.add('dragover');
    });
    ghUploadZone.addEventListener('dragleave', function () {
      this.classList.remove('dragover');
    });
    ghUploadZone.addEventListener('drop', function (e) {
      e.preventDefault();
      this.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) handleGhAvatarUpload(e.dataTransfer.files[0]);
    });

    // === 背景图上传到 GitHub ===
    var bgUploadZone = $('#bg-gh-upload-zone');
    var bgFileInput = $('#bg-gh-file-input');
    var bgStatusBox = $('#bg-gh-status');

    function handleGhBgUpload(file) {
      if (!hasToken) {
        alert('请先填写并保存 GitHub 配置');
        return;
      }
      if (!file || !file.type.startsWith('image/')) {
        alert('请选择图片文件');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        if (!confirm('图片超过 2MB，可能上传较慢。是否继续？')) return;
      }
      var reader = new FileReader();
      reader.onload = function (e) {
        var dataUrl = e.target.result;
        var base64 = dataUrl.split(',')[1];
        var ext = file.type.split('/')[1] || 'jpg';
        var path = 'assets/bg.' + ext;
        uploadBgToGithub(path, base64, file, dataUrl);
      };
      reader.onerror = function () { alert('读取图片失败'); };
      reader.readAsDataURL(file);
    }

    function uploadBgToGithub(path, base64, file, dataUrl) {
      bgStatusBox.innerHTML = '<p class="admin-hint" style="margin:0">上传中...（可能需要 10-30 秒）</p>';
      var cfg = getGhConfig();
      var url = 'https://api.github.com/repos/' + cfg.owner + '/' + cfg.repo + '/contents/' + path;
      fetch(url + '?ref=' + encodeURIComponent(cfg.branch), {
        headers: {
          'Authorization': 'Bearer ' + cfg.token,
          'Accept': 'application/vnd.github+json'
        }
      }).then(function (r) {
        if (r.status === 404) return Promise.resolve(null);
        if (!r.ok) throw new Error('获取文件失败 ' + r.status);
        return r.json();
      }).then(function (existing) {
        var body = {
          message: 'Update background via admin',
          content: base64,
          branch: cfg.branch
        };
        if (existing && existing.sha) body.sha = existing.sha;
        return fetch(url, {
          method: 'PUT',
          headers: {
            'Authorization': 'Bearer ' + cfg.token,
            'Accept': 'application/vnd.github+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });
      }).then(function (r) {
        if (!r.ok) {
          return r.json().then(function (j) {
            throw new Error(j.message || ('HTTP ' + r.status));
          });
        }
        return r.json();
      }).then(function (res) {
        // 本地预览：把 dataURL 写入 blog-bg-data，触发当前浏览器立即应用背景
        try { localStorage.setItem('blog-bg-data', dataUrl); } catch (e) {}
        theme.bgUrl = dataUrl;
        theme.background = 'custom';
        applyTheme();
        bgStatusBox.innerHTML =
          '<p class="admin-hint" style="margin:0;color:var(--accent-green)">✓ 背景图已推送：' + escapeHtml(res.commit?.html_url || '') + '</p>' +
          '<p class="admin-hint" style="margin:4px 0 0 0">正在更新 js/data.js 引用...</p>';
        var fileRef = './' + path + '?v=' + Date.now();
        updateDataJsBackgroundRef(cfg, fileRef, bgStatusBox);
      }).catch(function (err) {
        bgStatusBox.innerHTML = '<p class="admin-hint" style="margin:0;color:var(--accent-rose)">✗ 上传失败：' + escapeHtml(err.message) + '</p>';
      });
    }

    function updateDataJsBackgroundRef(cfg, fileRef, statusBox) {
      var dataUrl = 'https://api.github.com/repos/' + cfg.owner + '/' + cfg.repo + '/contents/js/data.js';
      fetch(dataUrl + '?ref=' + encodeURIComponent(cfg.branch), {
        headers: {
          'Authorization': 'Bearer ' + cfg.token,
          'Accept': 'application/vnd.github+json'
        }
      }).then(function (r) {
        if (!r.ok) throw new Error('读取 data.js 失败 ' + r.status);
        return r.json();
      }).then(function (data) {
        var content = base64ToUtf8(data.content.replace(/\n/g, ''));
        var newRef = "background: '" + fileRef + "'";
        if (content.indexOf(newRef) >= 0) {
          statusBox.innerHTML +=
            '<p class="admin-hint" style="margin:4px 0 0 0;color:var(--accent-green)">✓ data.js 已指向最新背景，无需重复更新</p>' +
            '<p class="admin-hint" style="margin:4px 0 0 0">GitHub Pages 将在约 1 分钟后重新部署。</p>';
          return;
        }
        var newContent = content.replace(
          /(\s*)background:\s*'[^']*'/,
          '$1' + newRef
        );
        if (newContent === content) {
          throw new Error('未在 data.js 找到 background 字段');
        }
        var base64 = btoa(unescape(encodeURIComponent(newContent)));
        return fetch(dataUrl, {
          method: 'PUT',
          headers: {
            'Authorization': 'Bearer ' + cfg.token,
            'Accept': 'application/vnd.github+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: 'Update data.js: background reference',
            content: base64,
            sha: data.sha,
            branch: cfg.branch
          })
        }).then(function (r) {
          if (!r.ok) {
            return r.json().then(function (j) {
              throw new Error(j.message || ('HTTP ' + r.status));
            });
          }
          statusBox.innerHTML +=
            '<p class="admin-hint" style="margin:4px 0 0 0;color:var(--accent-green)">✓ data.js 已更新</p>' +
            '<p class="admin-hint" style="margin:4px 0 0 0">GitHub Pages 将在约 1 分钟后重新部署。部署完成后所有访客都能看到新背景。</p>';
        });
      }).catch(function (err) {
        statusBox.innerHTML +=
          '<p class="admin-hint" style="margin:4px 0 0 0;color:var(--accent-rose)">⚠ 图片已推送，但更新 data.js 失败：' + escapeHtml(err.message) + '。请手动将 js/data.js 的 background 字段改为 \'' + fileRef + '\' 并 commit。</p>';
      });
    }

    bgUploadZone.addEventListener('click', function () { bgFileInput.click(); });
    bgFileInput.addEventListener('change', function () {
      if (this.files && this.files[0]) handleGhBgUpload(this.files[0]);
      this.value = '';
    });
    bgUploadZone.addEventListener('dragover', function (e) {
      e.preventDefault();
      this.classList.add('dragover');
    });
    bgUploadZone.addEventListener('dragleave', function () {
      this.classList.remove('dragover');
    });
    bgUploadZone.addEventListener('drop', function (e) {
      e.preventDefault();
      this.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) handleGhBgUpload(e.dataTransfer.files[0]);
    });
  }

  function renderAdminEditor(editId) {
    var isNew = editId === 'new';
    var post = isNew ? null : findPost(editId);
    if (!isNew && !post) {
      adminEditing = null;
      renderAdmin();
      return;
    }

    var today = new Date().toISOString().slice(0, 10);
    var rawCover = post ? (post.cover || 'blue') : 'blue';
    var isUrlCover = rawCover.startsWith('http') || rawCover.startsWith('/');
    var isDataCover = rawCover.startsWith('data:');
    var editorState = {
      coverMode: isUrlCover ? 'image' : (isDataCover ? 'upload' : 'color'),
      coverColor: (isUrlCover || isDataCover) ? 'blue' : rawCover,
      coverImage: (isUrlCover || isDataCover) ? rawCover : '',
      tags: post ? post.tags.slice() : []
    };

    main.innerHTML = '\
      <div class="admin-page">\
        <div class="admin-toolbar">\
          <h2 class="section-title" style="margin-bottom:0">' + (isNew ? '新建文章' : '编辑文章') + '</h2>\
          <button class="admin-btn" id="editor-back">\u2190 返回列表</button>\
        </div>\
        <div class="admin-editor">\
          \
          <div class="admin-field">\
            <label>标题 *</label>\
            <input type="text" class="admin-input" id="f-title" value="' + escapeHtml(post ? post.title : '') + '" placeholder="文章标题">\
          </div>\
          \
          <div class="admin-field">\
            <label>封面</label>\
            <div class="cover-preview" id="cover-preview">\
              <div class="cover-preview-pattern" id="cover-preview-pattern"></div>\
              <span class="cover-preview-label" id="cover-preview-label">预览</span>\
            </div>\
            <div class="cover-picker-tabs">\
              <span class="cover-tab active" data-tab="color">\u6e10\u53d8\u8272</span>\
              <span class="cover-tab" data-tab="image">\u56fe\u7247\u94fe\u63a5</span>\
              <span class="cover-tab" data-tab="upload">\u672c\u5730\u4e0a\u4f20</span>\
            </div>\
            <div id="cover-color-picker" class="cover-swatches"></div>\
            <div id="cover-image-input-group" style="display:none">\
              <input type="text" class="admin-input" id="f-cover-image" placeholder="https://example.com/cover.jpg" value="' + escapeHtml(editorState.coverImage) + '">\
              <div class="admin-hint" style="margin-top:4px">\u8f93\u5165\u56fe\u7247 URL\uff0c\u5c01\u9762\u4f1a\u4ee5\u80cc\u666f\u56fe\u65b9\u5f0f\u663e\u793a</div>\
            </div>\
            <div id="cover-upload-group" style="display:none">\
              <div class="bg-upload-zone" id="cover-upload-zone">\
                <div class="bg-upload-icon">\ud83d\udcf7</div>\
                <div class="bg-upload-text">\u70b9\u51fb\u9009\u62e9\u56fe\u7247\u6216\u62d6\u62fd\u5230\u6b64\u5904</div>\
                <div class="admin-hint" style="margin-top:4px">\u652f\u6301 JPG / PNG / WebP\uff0c\u5efa\u8bae\u5c0f\u4e8e 2MB</div>\
              </div>\
              <input type="file" id="cover-file-input" accept="image/*" style="display:none">\
              <div class="bg-upload-preview" id="cover-upload-preview" style="display:none">\
                <div class="bg-upload-thumb" id="cover-upload-thumb"></div>\
                <div class="bg-upload-info">\
                  <div class="bg-upload-name" id="cover-upload-name"></div>\
                  <div class="bg-upload-size" id="cover-upload-size"></div>\
                </div>\
                <button type="button" class="bg-upload-remove" id="cover-upload-remove">\u00d7</button>\
              </div>\
            </div>\
          </div>\
          \
          <div class="admin-field-row">\
            <div class="admin-field">\
              <label>\u53d1\u5e03\u65e5\u671f</label>\
              <input type="date" class="admin-input" id="f-date" value="' + (post ? post.date : today) + '">\
            </div>\
            <div class="admin-field">\
              <label>\u6458\u8981</label>\
              <input type="text" class="admin-input" id="f-excerpt" value="' + escapeHtml(post ? post.excerpt : '') + '" placeholder="\u4e00\u53e5\u8bdd\u6982\u62ec\uff08\u7559\u7a7a\u81ea\u52a8\u622a\u53d6\uff09">\
            </div>\
          </div>\
          \
          <div class="admin-field">\
            <label>\u6807\u7b7e</label>\
            <div class="tag-editor" id="tag-editor">\
              <div id="tag-chips" style="display:contents"></div>\
              <input type="text" class="tag-editor-input" id="tag-input" placeholder="\u8f93\u5165\u540e\u56de\u8f66\u6216\u9017\u53f7\u6dfb\u52a0">\
            </div>\
            <div class="admin-hint" style="margin-top:4px">\u70b9\u51fb\u6807\u7b7e\u4e0a\u7684 \u00d7 \u53ef\u5220\u9664</div>\
          </div>\
          \
          <div class="admin-editor-grid">\
            <div class="admin-field" style="margin-bottom:0">\
              <label>\u6b63\u6587\uff08Markdown\uff09*</label>\
              <div class="editor-toolbar">\
                <button type="button" class="toolbar-btn" id="insert-image-btn">\ud83d\udcf7 \u63d2\u5165\u56fe\u7247</button>\
                <span class="toolbar-hint">\u53ef\u62d6\u62fd\u56fe\u7247\u5230\u7f16\u8f91\u6846\uff0c\u6216\u7c98\u8d34\u622a\u56fe\uff08Ctrl+V\uff09</span>\
              </div>\
              <input type="file" id="content-image-input" accept="image/*" style="display:none">\
              <textarea class="admin-textarea" id="f-content" placeholder="# \u5728\u8fd9\u91cc\u7528 Markdown \u5199\u4f5c...">' + escapeHtml(post ? post.content : '') + '</textarea>\
              <div class="admin-hint">\u652f\u6301\u6807\u9898\u3001\u5217\u8868\u3001\u8868\u683c\u3001\u4ee3\u7801\u5757\u3001\u5f15\u7528\u3001\u56fe\u7247\u7b49\u5b8c\u6574 Markdown \u8bed\u6cd5</div>\
            </div>\
            <div>\
              <div class="admin-preview-title">\u5b9e\u65f6\u9884\u89c8</div>\
              <div class="admin-preview markdown-body" id="editor-preview"></div>\
            </div>\
          </div>\
          <div class="admin-actions">\
            <button class="admin-btn primary" id="editor-save">\u4fdd\u5b58\u5230\u672c\u5730</button>\
            <button class="admin-btn" id="editor-push-gh" title="\u9700\u5728\u7ad9\u70b9\u8bbe\u7f6e\u914d\u7f6e GitHub Token">\u63a8\u9001\u5230 GitHub\uff08\u6240\u6709\u8bbf\u5ba2\u53ef\u89c1\uff09</button>\
            <button class="admin-btn" id="editor-cancel">\u53d6\u6d88</button>\
          </div>\
        </div>\
      </div>';

    // === 封面选择器 ===
    var coverPreview = $('#cover-preview');
    var coverPattern = $('#cover-preview-pattern');
    var coverLabel = $('#cover-preview-label');
    var colorPicker = $('#cover-color-picker');
    var imageGroup = $('#cover-image-input-group');
    var coverImageInput = $('#f-cover-image');

    // 渲染色板
    colorPicker.innerHTML = COVER_COLORS.map(function (c) {
      return '<div class="cover-swatch' + (editorState.coverColor === c.name ? ' active' : '') + '" data-color="' + c.name + '" style="background:' + c.gradient + '"></div>';
    }).join('');

    function updateCoverPreview() {
      if ((editorState.coverMode === 'image' || editorState.coverMode === 'upload') && editorState.coverImage) {
        coverPreview.style.background = 'url("' + editorState.coverImage + '") center/cover';
        coverPattern.style.display = 'none';
        coverLabel.textContent = editorState.coverMode === 'upload' ? '\u672c\u5730\u4e0a\u4f20' : '\u56fe\u7247\u94fe\u63a5';
      } else {
        var c = COVER_COLORS.find(function (x) { return x.name === editorState.coverColor; }) || COVER_COLORS[0];
        coverPreview.style.background = c.gradient;
        coverPattern.style.display = '';
        coverLabel.textContent = c.name;
      }
    }
    updateCoverPreview();

    // Tab 切换
    var uploadGroup = $('#cover-upload-group');
    $$('.cover-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        editorState.coverMode = this.dataset.tab;
        $$('.cover-tab').forEach(function (t) { t.classList.remove('active'); });
        this.classList.add('active');
        colorPicker.style.display = editorState.coverMode === 'color' ? '' : 'none';
        imageGroup.style.display = editorState.coverMode === 'image' ? '' : 'none';
        uploadGroup.style.display = editorState.coverMode === 'upload' ? '' : 'none';
        updateCoverPreview();
      });
    });

    // 色板点击
    $$('.cover-swatch').forEach(function (sw) {
      sw.addEventListener('click', function () {
        editorState.coverColor = this.dataset.color;
        $$('.cover-swatch').forEach(function (s) { s.classList.remove('active'); });
        this.classList.add('active');
        updateCoverPreview();
      });
    });

    // 图片 URL 输入
    coverImageInput.addEventListener('input', function () {
      editorState.coverImage = this.value.trim();
      updateCoverPreview();
    });

    // === 封面本地上传 ===
    var coverUploadZone = $('#cover-upload-zone');
    var coverFileInput = $('#cover-file-input');
    var coverUploadPreview = $('#cover-upload-preview');
    var coverUploadThumb = $('#cover-upload-thumb');
    var coverUploadName = $('#cover-upload-name');
    var coverUploadSize = $('#cover-upload-size');
    var coverUploadRemove = $('#cover-upload-remove');

    function showCoverUploadPreview(name, size, dataUrl) {
      coverUploadThumb.style.backgroundImage = 'url("' + dataUrl + '")';
      coverUploadName.textContent = name;
      coverUploadSize.textContent = size > 0 ? formatFileSize(size) : '';
      coverUploadZone.style.display = 'none';
      coverUploadPreview.style.display = 'flex';
      editorState.coverImage = dataUrl;
      updateCoverPreview();
    }

    function hideCoverUploadPreview() {
      coverUploadZone.style.display = '';
      coverUploadPreview.style.display = 'none';
      coverFileInput.value = '';
      if (editorState.coverMode === 'upload') {
        editorState.coverImage = '';
        updateCoverPreview();
      }
    }

    function handleCoverFile(file) {
      if (!file || !file.type.startsWith('image/')) {
        alert('\u8bf7\u9009\u62e9\u56fe\u7247\u6587\u4ef6');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        if (!confirm('\u56fe\u7247\u8f83\u5927\uff08' + formatFileSize(file.size) + '\uff09\uff0cbase64 \u7f16\u7801\u540e\u53ef\u80fd\u8d85\u51fa localStorage \u4e0a\u9650\uff0c\u7ee7\u7eed\uff1f')) return;
      }
      var reader = new FileReader();
      reader.onload = function (e) {
        try {
          showCoverUploadPreview(file.name, file.size, e.target.result);
        } catch (err) {
          alert('\u56fe\u7247\u5904\u7406\u5931\u8d25\uff1a' + err.message);
        }
      };
      reader.onerror = function () { alert('\u8bfb\u53d6\u6587\u4ef6\u5931\u8d25'); };
      reader.readAsDataURL(file);
    }

    coverUploadZone.addEventListener('click', function () { coverFileInput.click(); });
    coverFileInput.addEventListener('change', function () {
      if (this.files && this.files[0]) handleCoverFile(this.files[0]);
    });

    coverUploadZone.addEventListener('dragover', function (e) {
      e.preventDefault();
      this.classList.add('dragover');
    });
    coverUploadZone.addEventListener('dragleave', function (e) {
      e.preventDefault();
      this.classList.remove('dragover');
    });
    coverUploadZone.addEventListener('drop', function (e) {
      e.preventDefault();
      this.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) handleCoverFile(e.dataTransfer.files[0]);
    });

    coverUploadRemove.addEventListener('click', function () { hideCoverUploadPreview(); });

    // 初始化：如果已有上传封面，显示预览
    if (editorState.coverMode === 'upload' && editorState.coverImage) {
      showCoverUploadPreview('\u5df2\u4e0a\u4f20\u56fe\u7247', 0, editorState.coverImage);
    }

    // 初始化 tab 状态
    if (editorState.coverMode === 'image') {
      $$('.cover-tab').forEach(function (t) { t.classList.toggle('active', t.dataset.tab === 'image'); });
      colorPicker.style.display = 'none';
      imageGroup.style.display = '';
      uploadGroup.style.display = 'none';
    } else if (editorState.coverMode === 'upload') {
      $$('.cover-tab').forEach(function (t) { t.classList.toggle('active', t.dataset.tab === 'upload'); });
      colorPicker.style.display = 'none';
      imageGroup.style.display = 'none';
      uploadGroup.style.display = '';
    }

    // === 标签编辑器 ===
    var tagChipsContainer = $('#tag-chips');
    var tagInput = $('#tag-input');

    function renderTagChips() {
      tagChipsContainer.innerHTML = editorState.tags.map(function (tag, i) {
        return '<span class="tag-chip">' + escapeHtml(tag) + '<span class="tag-chip-remove" data-tag-idx="' + i + '">\u00d7</span></span>';
      }).join('');
    }
    renderTagChips();

    function addTag(text) {
      text = text.trim();
      if (!text) return;
      if (editorState.tags.indexOf(text) >= 0) return;
      editorState.tags.push(text);
      renderTagChips();
    }

    tagInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ',' || e.key === '\u3001') {
        e.preventDefault();
        addTag(this.value);
        this.value = '';
      } else if (e.key === 'Backspace' && !this.value && editorState.tags.length > 0) {
        editorState.tags.pop();
        renderTagChips();
      }
    });

    tagInput.addEventListener('blur', function () {
      if (this.value.trim()) { addTag(this.value); this.value = ''; }
    });

    tagChipsContainer.addEventListener('click', function (e) {
      if (e.target.classList.contains('tag-chip-remove')) {
        var idx = parseInt(e.target.dataset.tagIdx, 10);
        editorState.tags.splice(idx, 1);
        renderTagChips();
      }
    });

    $('#tag-editor').addEventListener('click', function () {
      tagInput.focus();
    });

    // === 正文图片插入（本地上传 / 拖拽 / 粘贴） ===
    var contentImageInput = $('#content-image-input');
    var insertImageBtn = $('#insert-image-btn');
    var contentEl = $('#f-content');
    var previewEl = $('#editor-preview');
    var previewTimer = null;

    // \u5728\u5149\u6807\u4f4d\u7f6e\u63d2\u5165 Markdown \u56fe\u7247\u8bed\u6cd5
    function insertImageAtCursor(dataUrl, altText) {
      var start = contentEl.selectionStart;
      var end = contentEl.selectionEnd;
      var md = '\n\n![' + (altText || '\u56fe\u7247') + '](' + dataUrl + ')\n\n';
      contentEl.value = contentEl.value.substring(0, start) + md + contentEl.value.substring(end);
      contentEl.selectionStart = contentEl.selectionEnd = start + md.length;
      contentEl.focus();
      // \u89e6\u53d1\u9884\u89c8\u66f4\u65b0
      clearTimeout(previewTimer);
      updatePreview();
    }

    function handleContentImage(file) {
      if (!file || !file.type.startsWith('image/')) {
        alert('\u8bf7\u9009\u62e9\u56fe\u7247\u6587\u4ef6\uff08JPG / PNG / WebP / GIF\uff09');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        if (!confirm('\u56fe\u7247\u8f83\u5927\uff08' + formatFileSize(file.size) + '\uff09\uff0cbase64 \u7f16\u7801\u540e\u53ef\u80fd\u8d85\u51fa\u6d4f\u89c8\u5668\u5b58\u50a8\u9650\u5236\u3002\u5efa\u8bae\u538b\u7f29\u540e\u518d\u63d2\u5165\u3002\u662f\u5426\u7ee7\u7eed\uff1f')) return;
      }
      var reader = new FileReader();
      reader.onload = function (e) {
        var name = file.name ? file.name.replace(/\.[^.]+$/, '') : '\u56fe\u7247';
        insertImageAtCursor(e.target.result, name);
      };
      reader.onerror = function () { alert('\u8bfb\u53d6\u56fe\u7247\u5931\u8d25\uff0c\u8bf7\u91cd\u8bd5'); };
      reader.readAsDataURL(file);
    }

    // \u6309\u94ae\u70b9\u51fb \u2192 \u89e6\u53d1\u6587\u4ef6\u9009\u62e9
    insertImageBtn.addEventListener('click', function () { contentImageInput.click(); });
    contentImageInput.addEventListener('change', function () {
      if (this.files && this.files[0]) handleContentImage(this.files[0]);
      this.value = '';
    });

    // \u62d6\u62fd\u56fe\u7247\u5230\u7f16\u8f91\u6846
    contentEl.addEventListener('dragover', function (e) {
      e.preventDefault();
      this.classList.add('dragover');
    });
    contentEl.addEventListener('dragleave', function (e) {
      e.preventDefault();
      this.classList.remove('dragover');
    });
    contentEl.addEventListener('drop', function (e) {
      e.preventDefault();
      this.classList.remove('dragover');
      var files = e.dataTransfer.files;
      for (var i = 0; i < files.length; i++) {
        if (files[i].type.startsWith('image/')) {
          handleContentImage(files[i]);
        }
      }
    });

    // \u7c98\u8d34\u622a\u56fe\uff08Ctrl+V\uff09
    contentEl.addEventListener('paste', function (e) {
      var items = e.clipboardData ? e.clipboardData.items : null;
      if (!items) return;
      for (var i = 0; i < items.length; i++) {
        if (items[i].type && items[i].type.startsWith('image/')) {
          e.preventDefault();
          var imgFile = items[i].getAsFile();
          if (imgFile) handleContentImage(imgFile);
        }
      }
    });

    // === Markdown 实时预览 ===

    function updatePreview() {
      try {
        previewEl.innerHTML = marked.parse(contentEl.value) || '<p style="color:var(--text-tertiary)">\u5f00\u59cb\u8f93\u5165\u5373\u53ef\u9884\u89c8\u2026</p>';
        if (typeof hljs !== 'undefined') {
          previewEl.querySelectorAll('pre code').forEach(function (b) { try { hljs.highlightElement(b); } catch (e) {} });
        }
      } catch (e) {
        previewEl.innerHTML = '<p style="color:var(--text-tertiary)">\u9884\u89c8\u5931\u8d25</p>';
      }
    }
    updatePreview();

    contentEl.addEventListener('input', function () {
      clearTimeout(previewTimer);
      previewTimer = setTimeout(updatePreview, 300);
    });

    // === 保存 ===
    // 收集编辑器表单数据为 postObj（校验失败返回 null）
    function collectPostData() {
      var title = $('#f-title').value.trim();
      var content = contentEl.value.trim();
      if (!title) { alert('\u8bf7\u586b\u5199\u6587\u7ae0\u6807\u9898'); $('#f-title').focus(); return null; }
      if (!content) { alert('\u8bf7\u586b\u5199\u6587\u7ae0\u6b63\u6587'); contentEl.focus(); return null; }

      var date = $('#f-date').value || today;
      var tags = editorState.tags.slice();
      // 封面值：图片链接/本地上传模式取图片值，颜色模式取色名
      var cover;
      if ((editorState.coverMode === 'image' || editorState.coverMode === 'upload') && editorState.coverImage) {
        cover = editorState.coverImage;
      } else {
        cover = editorState.coverColor;
      }
      var excerpt = $('#f-excerpt').value.trim();
      if (!excerpt) {
        excerpt = content.replace(/[#*`>\-\[\]()!]/g, '').slice(0, 80) + '\u2026';
      }
      var id = isNew ? (slugify(title) + '-' + Date.now().toString(36)) : editId;
      return { id: id, title: title, date: date, tags: tags, cover: cover, excerpt: excerpt, content: content };
    }

    // \u4fdd\u5b58\u5230\u672c\u5730\uff08\u4ec5\u5f53\u524d\u6d4f\u89c8\u5668\u53ef\u89c1\uff09
    $('#editor-save').addEventListener('click', function () {
      var postObj = collectPostData();
      if (!postObj) return;
      var custom = getCustomPosts();
      var idx = custom.findIndex(function (p) { return p.id === postObj.id; });
      if (idx >= 0) custom[idx] = postObj; else custom.push(postObj);
      try {
        saveCustomPosts(custom);
      } catch (e) {
        alert('\u4fdd\u5b58\u5931\u8d25\uff1a\u6587\u7ae0\u5185\u5bb9\uff08\u542b\u56fe\u7247\uff09\u8d85\u51fa\u6d4f\u89c8\u5668\u5b58\u50a8\u9650\u5236\u3002\u8bf7\u51cf\u5c11\u56fe\u7247\u6570\u91cf\u6216\u4f7f\u7528\u66f4\u5c0f\u7684\u56fe\u7247\u540e\u91cd\u8bd5\u3002');
        return;
      }
      saveDeletedIds(getDeletedIds().filter(function (d) { return d !== postObj.id; }));
      adminEditing = null;
      renderAdminList();
    });

    // \u63a8\u9001\u5230 GitHub\uff08\u6240\u6709\u8bbf\u5ba2\u53ef\u89c1\uff09
    $('#editor-push-gh').addEventListener('click', function () {
      var postObj = collectPostData();
      if (!postObj) return;
      var gh = getGhConfig();
      if (!gh.token || !gh.owner || !gh.repo) {
        alert('\u8bf7\u5148\u5728\u7ad9\u70b9\u8bbe\u7f6e\u4e2d\u586b\u5199\u5e76\u4fdd\u5b58 GitHub \u914d\u7f6e\uff08\u7528\u6237\u540d/\u4ed3\u5e93\u540d/Token\uff09');
        adminEditing = 'settings';
        renderAdmin();
        return;
      }
      var btn = $('#editor-push-gh');
      var original = btn.textContent;
      btn.disabled = true;
      btn.textContent = '\u63a8\u9001\u4e2d...';
      pushPostToGithub(postObj, function (err) {
        btn.disabled = false;
        btn.textContent = original;
        if (err) {
          alert('\u63a8\u9001\u5931\u8d25\uff1a' + err);
          return;
        }
        // \u540c\u65f6\u4fdd\u5b58\u5230\u672c\u5730\u4f5c\u4e3a\u5373\u65f6\u9884\u89c8
        var custom = getCustomPosts();
        var idx = custom.findIndex(function (p) { return p.id === postObj.id; });
        if (idx >= 0) custom[idx] = postObj; else custom.push(postObj);
        try { saveCustomPosts(custom); } catch (e) {}
        // \u66f4\u65b0\u5185\u5b58\u4e2d\u7684 state.customPosts
        var remoteIdx = state.customPosts.findIndex(function (p) { return p.id === postObj.id; });
        if (remoteIdx >= 0) state.customPosts[remoteIdx] = postObj; else state.customPosts.push(postObj);
        saveDeletedIds(getDeletedIds().filter(function (d) { return d !== postObj.id; }));
        alert('\u63a8\u9001\u6210\u529f\uff01GitHub Pages \u7ea6 1-2 \u5206\u949f\u540e\u91cd\u65b0\u90e8\u7f72\uff0c\u6240\u6709\u8bbf\u5ba2\u5237\u65b0\u5373\u53ef\u770b\u5230\u3002');
        adminEditing = null;
        renderAdminList();
      });
    });

    $('#editor-cancel').addEventListener('click', function () {
      adminEditing = null;
      renderAdmin();
    });

    $('#editor-back').addEventListener('click', function () {
      adminEditing = null;
      renderAdmin();
    });
  }

  // \u63a8\u9001/\u66f4\u65b0\u6587\u7ae0\u5230 posts/custom-posts.json
  function pushPostToGithub(postObj, callback) {
    var gh = getGhConfig();
    var url = 'https://api.github.com/repos/' + gh.owner + '/' + gh.repo + '/contents/posts/custom-posts.json';
    // 1. GET \u62ff sha + \u5f53\u524d\u5185\u5bb9
    fetch(url + '?ref=' + encodeURIComponent(gh.branch), {
      headers: {
        'Authorization': 'Bearer ' + gh.token,
        'Accept': 'application/vnd.github+json'
      }
    }).then(function (r) {
      if (r.status === 404) return Promise.resolve(null); // \u6587\u4ef6\u4e0d\u5b58\u5728\uff0c\u9996\u6b21\u521b\u5efa
      if (!r.ok) throw new Error('\u8bfb\u53d6 custom-posts.json \u5931\u8d25 ' + r.status);
      return r.json();
    }).then(function (data) {
      var sha = data && data.sha;
      var existing = [];
      if (data && data.content) {
        try {
          existing = JSON.parse(base64ToUtf8(data.content.replace(/\n/g, '')));
          if (!Array.isArray(existing)) existing = [];
        } catch (e) { existing = []; }
      }
      // 2. \u5408\u5e76\u6587\u7ae0\uff1a\u540c id \u8986\u76d6\uff0c\u5426\u5219\u8ffd\u52a0
      var idx = existing.findIndex(function (p) { return p.id === postObj.id; });
      if (idx >= 0) existing[idx] = postObj; else existing.push(postObj);
      var newJson = JSON.stringify(existing, null, 2);
      var base64 = btoa(unescape(encodeURIComponent(newJson)));
      // 3. PUT \u56de\u53bb
      return fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer ' + gh.token,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'Update custom post: ' + postObj.id,
          content: base64,
          sha: sha,
          branch: gh.branch
        })
      });
    }).then(function (r) {
      if (!r.ok) {
        return r.json().then(function (j) {
          throw new Error(j.message || ('HTTP ' + r.status));
        });
      }
      callback(null);
    }).catch(function (err) {
      callback(err.message || err.toString());
    });
  }

  // 从 posts/custom-posts.json 中移除指定 id 的文章
  function deletePostFromGithub(id, callback) {
    var gh = getGhConfig();
    var url = 'https://api.github.com/repos/' + gh.owner + '/' + gh.repo + '/contents/posts/custom-posts.json';
    fetch(url + '?ref=' + encodeURIComponent(gh.branch), {
      headers: {
        'Authorization': 'Bearer ' + gh.token,
        'Accept': 'application/vnd.github+json'
      }
    }).then(function (r) {
      if (r.status === 404) throw new Error('custom-posts.json 不存在');
      if (!r.ok) throw new Error('读取 custom-posts.json 失败 ' + r.status);
      return r.json();
    }).then(function (data) {
      var sha = data && data.sha;
      var existing = [];
      if (data && data.content) {
        try {
          existing = JSON.parse(base64ToUtf8(data.content.replace(/\n/g, '')));
          if (!Array.isArray(existing)) existing = [];
        } catch (e) { existing = []; }
      }
      var filtered = existing.filter(function (p) { return p.id !== id; });
      var newJson = JSON.stringify(filtered, null, 2);
      var base64 = btoa(unescape(encodeURIComponent(newJson)));
      return fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer ' + gh.token,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'Remove custom post: ' + id,
          content: base64,
          sha: sha,
          branch: gh.branch
        })
      });
    }).then(function (r) {
      if (!r.ok) {
        return r.json().then(function (j) {
          throw new Error(j.message || ('HTTP ' + r.status));
        });
      }
      callback(null);
    }).catch(function (err) {
      callback(err.message || err.toString());
    });
  }

  // ========================================
  // 搜索功能
  // ========================================
  function initSearch() {
    const overlay = $('#search-overlay');
    const input = $('#search-input');
    const results = $('#search-results');
    const closeBtn = $('#search-close');

    function openSearch() {
      overlay.classList.add('active');
      input.value = '';
      results.innerHTML = '';
      setTimeout(() => input.focus(), 100);
    }

    function closeSearch() {
      overlay.classList.remove('active');
    }

    $('#search-btn').addEventListener('click', openSearch);
    closeBtn.addEventListener('click', closeSearch);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeSearch();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('active')) {
        closeSearch();
      }
      // Ctrl/Cmd + K 打开搜索
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        openSearch();
      }
    });

    input.addEventListener('input', function () {
      const query = this.value.trim().toLowerCase();
      if (!query) {
        results.innerHTML = '';
        return;
      }

      const matched = getPosts().filter(post => {
        return post.title.toLowerCase().includes(query) ||
               post.excerpt.toLowerCase().includes(query) ||
               post.tags.some(t => t.toLowerCase().includes(query)) ||
               post.content.toLowerCase().includes(query);
      });

      if (matched.length === 0) {
        results.innerHTML = '<div class="search-empty">没有找到相关文章</div>';
        return;
      }

      results.innerHTML = matched.map(post => `
        <div class="search-result-item" onclick="location.hash='#/article/${encodeURIComponent(post.id)}'; document.querySelector('#search-overlay').classList.remove('active')">
          <div class="search-result-title">${escapeHtml(post.title)}</div>
          <div class="search-result-excerpt">${escapeHtml(post.excerpt)}</div>
        </div>
      `).join('');
    });
  }

  // ========================================
  // 主题管理
  // ========================================
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', theme.mode);
    document.documentElement.setAttribute('data-accent', theme.accent);
    document.documentElement.setAttribute('data-bg', theme.background);
    document.documentElement.style.setProperty('--content-opacity', theme.opacity / 100);
    document.documentElement.style.setProperty('--font-size-base', theme.fontSize + 'px');

    // 自定义背景图
    if (theme.background === 'custom' && theme.bgUrl) {
      $('#bg-layer').style.backgroundImage = `url("${theme.bgUrl}")`;
    } else {
      $('#bg-layer').style.backgroundImage = '';
      document.documentElement.removeAttribute('data-bg-luminance');
    }

    // 更新定制面板 UI
    updateCustomizerUI();
  }

  function saveTheme() {
    localStorage.setItem('blog-mode', theme.mode);
    localStorage.setItem('blog-accent', theme.accent);
    localStorage.setItem('blog-bg', theme.background);
    localStorage.setItem('blog-bg-url', theme.bgUrl);
    localStorage.setItem('blog-opacity', theme.opacity);
    localStorage.setItem('blog-fontsize', theme.fontSize);
  }

  // === 背景图亮度分析与文字颜色自适应 ===
  // 计算图片平均亮度（0-255），失败返回 null（如跨域图片无法读取像素）
  function analyzeImageBrightness(src) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function () {
        try {
          var canvas = document.createElement('canvas');
          canvas.width = 32;
          canvas.height = 32;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, 32, 32);
          var data = ctx.getImageData(0, 0, 32, 32).data;
          var total = 0;
          var n = 0;
          for (var i = 0; i < data.length; i += 4) {
            total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            n++;
          }
          resolve(total / n);
        } catch (e) {
          resolve(null); // 跨域污染 canvas，无法分析
        }
      };
      img.onerror = function () { resolve(null); };
      img.src = src;
    });
  }

  // 根据背景图亮度自适应文字颜色
  // switchMode=true 时自动切换深/浅主题（仅在用户上传/应用图片时调用，避免覆盖手动选择）
  function adaptTextToBackground(switchMode) {
    if (theme.background !== 'custom' || !theme.bgUrl) {
      document.documentElement.removeAttribute('data-bg-luminance');
      return Promise.resolve(null);
    }
    return analyzeImageBrightness(theme.bgUrl).then(function (lum) {
      if (lum === null) {
        // 无法分析（跨域URL）：保留现有主题，不设亮度标记
        document.documentElement.removeAttribute('data-bg-luminance');
        return null;
      }
      var isDark = lum < 128; // 加权亮度低于中值视为深色图
      document.documentElement.setAttribute('data-bg-luminance', isDark ? 'dark' : 'light');
      localStorage.setItem('blog-bg-luminance', isDark ? 'dark' : 'light');

      if (switchMode) {
        var targetMode = isDark ? 'dark' : 'light';
        if (theme.mode !== targetMode) {
          theme.mode = targetMode;
          saveTheme();
          applyTheme();
        }
      }
      return isDark;
    });
  }

  function updateCustomizerUI() {
    // 主题模式
    $$('[data-group="mode"] .custom-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.value === theme.mode);
    });
    // 强调色
    $$('[data-group="accent"] .color-swatch').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.value === theme.accent);
    });
    // 背景
    $$('[data-group="background"] .custom-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.value === theme.background);
    });
    // 透明度
    $('#opacity-value').textContent = theme.opacity;
    $('#opacity-slider').value = theme.opacity;
    // 字号
    $('#fontsize-value').textContent = theme.fontSize;
    $('#fontsize-slider').value = theme.fontSize;
    // 自定义URL
    $('#bg-url-group').style.display = theme.background === 'custom' ? 'block' : 'none';
    $('#bg-url-input').value = theme.bgUrl.startsWith('data:') ? '' : theme.bgUrl;

    // 上传预览：如果 bgUrl 是 data URL，显示文件名预览
    var storedData = localStorage.getItem('blog-bg-data');
    if (storedData && theme.bgUrl === storedData) {
      $('#bg-upload-preview').style.display = 'flex';
      $('#bg-upload-zone').style.display = 'none';
      $('#bg-preview-thumb').style.backgroundImage = 'url("' + storedData + '")';
      $('#bg-preview-name').textContent = '已上传的本地图片';
      $('#bg-preview-size').textContent = formatFileSize(storedData.length);
    } else {
      $('#bg-upload-preview').style.display = 'none';
      $('#bg-upload-zone').style.display = '';
    }

    // 站点文案输入框（显示当前生效值，占位符提示默认值）
    const site = getSite();
    $('#site-name-input').value = localStorage.getItem(SITE_KEYS.siteName) || '';
    $('#hero-sub-input').value = localStorage.getItem(SITE_KEYS.heroSubtitle) || '';
    $('#section-title-input').value = localStorage.getItem(SITE_KEYS.sectionTitle) || '';
    $('#footer-text-input').value = localStorage.getItem(SITE_KEYS.footerText) || '';
    $('#site-name-input').placeholder = site.siteName;
    $('#hero-sub-input').placeholder = site.heroSubtitle;
    $('#section-title-input').placeholder = site.sectionTitle;
    $('#footer-text-input').placeholder = site.footerText;

    // 博主头像已移至管理页"站点设置"上传（推送 GitHub 仓库），不再在装修面板中显示

    // 布局
    $$('[data-group="layout"] .custom-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.value === site.layout);
    });
    // 每行卡片数
    $$('[data-group="columns"] .custom-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.value === site.columns);
    });
  }

  function initTheme() {
    // 主题模式切换按钮
    $('#theme-btn').addEventListener('click', function () {
      theme.mode = theme.mode === 'dark' ? 'light' : 'dark';
      applyTheme();
      saveTheme();
    });

    // 定制面板（仅从管理页内部打开，不再有右上角入口）
    const customizer = $('#customizer');
    const overlay = $('#customizer-overlay');

    $('#customizer-close').addEventListener('click', closeCustomizer);
    overlay.addEventListener('click', closeCustomizer);

    function closeCustomizer() {
      customizer.classList.remove('open');
      overlay.classList.remove('active');
    }

    // 主题模式选择
    $$('[data-group="mode"] .custom-option').forEach(btn => {
      btn.addEventListener('click', function () {
        theme.mode = this.dataset.value;
        applyTheme();
        saveTheme();
      });
    });

    // 强调色选择
    $$('[data-group="accent"] .color-swatch').forEach(btn => {
      btn.addEventListener('click', function () {
        theme.accent = this.dataset.value;
        applyTheme();
        saveTheme();
      });
    });

    // 背景选择
    $$('[data-group="background"] .custom-option').forEach(btn => {
      btn.addEventListener('click', function () {
        theme.background = this.dataset.value;
        applyTheme();
        saveTheme();
      });
    });

    // 自定义背景 URL
    $('#bg-url-apply').addEventListener('click', function () {
      theme.bgUrl = $('#bg-url-input').value.trim();
      applyTheme();
      saveTheme();
      // URL 图片也尝试自适应（跨域图无法分析时自动跳过）
      adaptTextToBackground(true);
    });

    // === 背景上传 Tab 切换 ===
    $$('.bg-tab').forEach(tab => {
      tab.addEventListener('click', function () {
        $$('.bg-tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        const isUpload = this.dataset.bgTab === 'upload';
        $('#bg-upload-panel').style.display = isUpload ? 'block' : 'none';
        $('#bg-url-panel').style.display = isUpload ? 'none' : 'block';
      });
    });

    // === 本地图片上传 ===
    const uploadZone = $('#bg-upload-zone');
    const fileInput = $('#bg-file-input');
    const previewBox = $('#bg-upload-preview');
    const previewThumb = $('#bg-preview-thumb');
    const previewName = $('#bg-preview-name');
    const previewSize = $('#bg-preview-size');

    function handleBgFile(file) {
      if (!file || !file.type.startsWith('image/')) {
        alert('请选择图片文件（JPG / PNG / WebP）');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        if (!confirm('图片超过 5MB，可能导致浏览器存储空间不足。是否继续？')) return;
      }
      var reader = new FileReader();
      reader.onload = function (e) {
        var dataUrl = e.target.result;
        try {
          localStorage.setItem('blog-bg-data', dataUrl);
        } catch (err) {
          alert('图片太大，无法保存到本地存储。请使用较小的图片或改用图片链接。');
          return;
        }
        theme.bgUrl = dataUrl;
        theme.background = 'custom';
        saveTheme();
        applyTheme();
        showUploadPreview(file.name, file.size, dataUrl);
        // 根据图片亮度自动切换深/浅主题（深色图→深色主题浅色文字）
        adaptTextToBackground(true);
        // 自动切换 active 状态
        $$('[data-group="background"] .custom-option').forEach(function (btn) {
          btn.classList.toggle('active', btn.dataset.value === 'custom');
        });
      };
      reader.onerror = function () {
        alert('读取图片失败，请重试。');
      };
      reader.readAsDataURL(file);
    }

    function showUploadPreview(name, size, dataUrl) {
      previewThumb.style.backgroundImage = 'url("' + dataUrl + '")';
      previewName.textContent = name;
      previewSize.textContent = formatFileSize(size);
      uploadZone.style.display = 'none';
      previewBox.style.display = 'flex';
    }

    function hideUploadPreview() {
      uploadZone.style.display = '';
      previewBox.style.display = 'none';
      fileInput.value = '';
    }

    // 点击上传区 → 触发文件选择
    uploadZone.addEventListener('click', function () {
      fileInput.click();
    });

    fileInput.addEventListener('change', function () {
      if (this.files && this.files[0]) {
        handleBgFile(this.files[0]);
      }
    });

    // 拖拽上传
    uploadZone.addEventListener('dragover', function (e) {
      e.preventDefault();
      this.classList.add('dragover');
    });
    uploadZone.addEventListener('dragleave', function (e) {
      this.classList.remove('dragover');
    });
    uploadZone.addEventListener('drop', function (e) {
      e.preventDefault();
      this.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleBgFile(e.dataTransfer.files[0]);
      }
    });

    // 移除已上传图片
    $('#bg-remove-btn').addEventListener('click', function () {
      localStorage.removeItem('blog-bg-data');
      localStorage.removeItem('blog-bg-luminance');
      theme.bgUrl = '';
      saveTheme();
      applyTheme();
      hideUploadPreview();
    });

    // 博主头像上传逻辑已移至管理页"站点设置"，这里不再绑定
    // （保留 SITE_KEYS.avatar 字段供 admin 设置页使用）

    // 站点文案应用（留空恢复默认）
    $('#site-text-apply').addEventListener('click', function () {
      const map = [
        [SITE_KEYS.siteName, $('#site-name-input').value.trim()],
        [SITE_KEYS.heroSubtitle, $('#hero-sub-input').value.trim()],
        [SITE_KEYS.sectionTitle, $('#section-title-input').value.trim()],
        [SITE_KEYS.footerText, $('#footer-text-input').value.trim()]
      ];
      map.forEach(([key, value]) => {
        if (value) localStorage.setItem(key, value);
        else localStorage.removeItem(key);
      });
      applySite();
      updateCustomizerUI();
      router(); // 重新渲染当前页面使新文案生效
    });

    // 卡片布局
    $$('[data-group="layout"] .custom-option').forEach(btn => {
      btn.addEventListener('click', function () {
        localStorage.setItem(SITE_KEYS.layout, this.dataset.value);
        updateCustomizerUI();
        router();
      });
    });

    // 每行卡片数
    $$('[data-group="columns"] .custom-option').forEach(btn => {
      btn.addEventListener('click', function () {
        localStorage.setItem(SITE_KEYS.columns, this.dataset.value);
        updateCustomizerUI();
        router();
      });
    });

    // 透明度滑块
    $('#opacity-slider').addEventListener('input', function () {
      theme.opacity = this.value;
      document.documentElement.style.setProperty('--content-opacity', theme.opacity / 100);
      $('#opacity-value').textContent = theme.opacity;
      saveTheme();
    });

    // 字号滑块
    $('#fontsize-slider').addEventListener('input', function () {
      theme.fontSize = this.value;
      document.documentElement.style.setProperty('--font-size-base', theme.fontSize + 'px');
      $('#fontsize-value').textContent = theme.fontSize;
      saveTheme();
    });

    // 重置（含站点文案与布局）
    $('#custom-reset').addEventListener('click', function () {
      theme = {
        mode: 'dark',
        accent: 'blue',
        background: 'none',
        bgUrl: '',
        opacity: '95',
        fontSize: '16'
      };
      localStorage.removeItem('blog-bg-data');
      localStorage.removeItem('blog-bg-luminance');
      applyTheme();
      saveTheme();
      Object.values(SITE_KEYS).forEach(k => localStorage.removeItem(k));
      applySite();
      updateCustomizerUI();
      router();
    });
  }

  // ========================================
  // 其他交互
  // ========================================
  function initInteractions() {
    // 移动端菜单
    $('#menu-toggle').addEventListener('click', function () {
      $('.nav').classList.toggle('open');
    });

    // 回到顶部
    const backToTop = $('#back-to-top');
    window.addEventListener('scroll', function () {
      backToTop.classList.toggle('visible', window.scrollY > 400);
    }, { passive: true });
    backToTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // 页脚年份
    $('#year').textContent = new Date().getFullYear();
  }

  // ========================================
  // 初始化
  // ========================================
  function init() {
    applySite();
    applyTheme();
    // 恢复背景亮度标记（不切换主题模式，尊重用户手动选择；CSS 用它加对比度遮罩）
    if (theme.background === 'custom' && theme.bgUrl) {
      var savedLum = localStorage.getItem('blog-bg-luminance');
      if (savedLum) {
        document.documentElement.setAttribute('data-bg-luminance', savedLum);
      } else if (theme.bgUrl.indexOf('data:') === 0) {
        // 首次（旧数据）：只分析标记，不切主题
        adaptTextToBackground(false);
      }
    }
    initTheme();
    initSearch();
    initInteractions();
    // 先加载远程 custom-posts.json（所有访客共享的自定义文章），再首次渲染
    loadCustomPosts().then(function () {
      router();
    });
  }

  // DOM 就绪后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
