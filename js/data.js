/**
 * ============================================
 * 博客数据文件 - 在此添加新文章
 * ============================================
 *
 * 添加新文章步骤：
 * 1. 复制一个文章对象
 * 2. 修改 id（必须唯一）、title、date、tags、content
 * 3. cover 可选值: blue, green, orange, purple, teal, rose
 * 4. content 使用 Markdown 格式编写
 * 5. 保存后刷新页面即可看到新文章
 */

const BLOG_CONFIG = {
  siteName: 'Koyomi的小窝',
  author: 'RMKoyomi',
  bio: '热爱技术与生活，分享所思所学',
  // 默认博主头像（公网 URL，所有访客可见；可替换为自己的图片链接）
  avatar: './assets/avatar.gif?v=20260818',
  // 默认全局背景图（公网 URL，所有访客可见；可在管理页上传新背景图自动更新）
  background: './assets/bg.jpeg?v=20260818',
  // 管理页访问密码（修改后需 commit + push 让所有人重新需要新密码登录）
  adminPassword: 'lyf19980818',
  // 关于页面的社交媒体链接
  social: [
    { name: 'GitHub', icon: 'GitHub', url: 'https://github.com/RMKoyomi' },
    { name: '邮箱', icon: 'Email', url: '595560298@qq.com' },
    { name: 'RSS', icon: 'RSS', url: '#/about' }
  ]
};

const BLOG_POSTS = [
  {
    id: 'welcome-to-my-blog',
    title: '欢迎来到Koyomi的小窝',
    date: '2026-08-14',
    tags: ['公告', '随笔'],
    cover: 'blue',
    excerpt: '这是我的个人博客的第一篇文章。在这里，我将分享技术心得、生活感悟和学习笔记。欢迎一起交流！',
    content: `# 欢迎来到Koyomi的小窝

你好，欢迎来到Koyomi的小窝！这是我记录和分享的地方。  

## 为什么创建这个博客？

在信息爆炸的时代，我们每天都在消费大量内容，但真正留下的却很少。创建这个博客，是为了：

- **沉淀知识**：把学到的东西系统化地整理出来
- **分享价值**：如果能帮到哪怕一个人，就值得了
- **记录成长**：回看过去的文章，看到自己的进步
- **交流碰撞**：通过评论和讨论，获得新的视角

## 你能在这里找到什么？

这个博客主要会涉及以下主题：

### 技术分享

包括前端开发、后端架构、数据库设计、DevOps 等技术领域的实战经验和踩坑记录。

\`\`\`javascript
// 一个简单的示例
function greet(name) {
  return \`Hello, \${name}! 欢迎来到我的博客。\`;
}

console.log(greet('朋友'));
\`\`\`

### 学习笔记

读书笔记、课程总结、技术调研报告等。好记性不如烂笔头。

### 生活随笔

偶尔写写生活感悟、旅行见闻、美食探店等轻松的话题。

### 工具推荐

用过的好工具、好资源，分享给需要的人。

## 关于这个网站

这个博客网站本身就是一个技术展示：

- 纯静态部署，无需后端
- 支持 Markdown 渲染和代码高亮
- 可自定义主题色和背景
- 响应式设计，支持各种设备
- 内置搜索功能

> "The best way to learn is to teach." — 通过分享来学习，是最好的方式。

## 最后

感谢你的访问！如果有任何想法或建议，欢迎通过关于页面上的联系方式与我交流。

让我们一起在分享中成长！`
  },

  {
    id: 'modern-css-techniques',
    title: '2026年你必须掌握的现代CSS技巧',
    date: '2026-08-10',
    tags: ['技术', 'CSS', '前端'],
    cover: 'purple',
    excerpt: 'CSS 发展日新月异，本文介绍容器查询、CSS嵌套、@layer、逻辑属性、滚动驱动动画等现代CSS特性，帮你写出更优雅的样式。',
    content: `# 2026年你必须掌握的现代CSS技巧

CSS 经过了多年的发展，现在已经非常强大。很多以前需要 JavaScript 才能实现的效果，现在纯 CSS 就能搞定。

## 1. 容器查询（Container Queries）

容器查询让组件可以根据父容器的大小来调整样式，而不是视口大小。

\`\`\`css
.card-container {
  container-type: inline-size;
}

@container (min-width: 400px) {
  .card {
    display: grid;
    grid-template-columns: 1fr 2fr;
  }
}

@container (max-width: 399px) {
  .card {
    display: flex;
    flex-direction: column;
  }
}
\`\`\`

## 2. CSS 嵌套

原生 CSS 终于支持嵌套了！不再需要 Sass 或 Less。

\`\`\`css
.navbar {
  background: #333;
  padding: 1rem;

  & ul {
    display: flex;
    gap: 1rem;
    list-style: none;
  }

  & a {
    color: white;
    text-decoration: none;

    &:hover {
      color: #4fc3f7;
    }
  }
}
\`\`\`

## 3. @layer 层叠层

用 \`@layer\` 控制样式的优先级，告别 \`!important\` 地狱。

\`\`\`css
@layer base, components, utilities;

@layer base {
  h1 { font-size: 2rem; }
  p { line-height: 1.6; }
}

@layer components {
  .btn { padding: 0.5rem 1rem; }
}

@layer utilities {
  .text-center { text-align: center; }
}
\`\`\`

## 4. 逻辑属性

使用逻辑属性（\`margin-inline\`、\`padding-block\` 等）让布局自动适配不同书写方向。

| 物理属性 | 逻辑属性 |
|---------|---------|
| margin-left | margin-inline-start |
| margin-right | margin-inline-end |
| padding-top | padding-block-start |
| width | inline-size |
| height | block-size |

## 5. 滚动驱动动画

\`\`\`css
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.element {
  animation: fade-in linear;
  animation-timeline: view();
  animation-range: entry 0% entry 100%;
}
\`\`\`

## 6. :has() 选择器

父选择器终于来了！

\`\`\`css
/* 当卡片包含图片时添加内边距 */
.card:has(img) {
  padding: 0;
}

/* 当表单有必填字段未填时显示提示 */
form:has(input:invalid) .warning {
  display: block;
}
\`\`\`

## 7. CSS 三角函数

\`\`\`css
.circle {
  --radius: 50px;
  --angle: 45deg;
  width: calc(cos(var(--angle)) * var(--radius) * 2);
  height: calc(sin(var(--angle)) * var(--radius) * 2);
}
\`\`\`

## 总结

现代 CSS 的能力远超想象。掌握这些特性，可以：

1. 减少对 JavaScript 的依赖
2. 写出更简洁、更可维护的代码
3. 提升页面性能
4. 更好地支持响应式和可访问性

> 建议在实际项目中逐步尝试这些特性，浏览器兼容性已经相当好了。

你最喜欢哪个现代 CSS 特性？欢迎交流！`
  },

  {
    id: 'reading-notes-deep-work',
    title: '《深度工作》读书笔记：如何在分心时代保持专注',
    date: '2026-08-05',
    tags: ['读书', '效率', '随笔'],
    cover: 'green',
    excerpt: '卡尔·纽波特的《深度工作》是一本关于专注力的经典著作。本文分享核心观点和实践方法，帮助你在信息碎片化时代找回深度思考的能力。',
    content: `# 《深度工作》读书笔记

> "深度工作是在无干扰的状态下专注进行职业活动，使个人的认知能力达到极限。"
> —— 卡尔·纽波特

## 核心观点

### 深度工作 vs 浅层工作

| 特征 | 深度工作 | 浅层工作 |
|------|---------|---------|
| 专注度 | 极高 | 低 |
| 认知负荷 | 大 | 小 |
| 价值创造 | 高 | 低 |
| 可替代性 | 低 | 高 |
| 示例 | 写作、编程、策略规划 | 回邮件、开会、刷消息 |

### 为什么深度工作越来越稀缺？

1. **注意力碎片化**：社交媒体、即时通讯不断打断我们
2. **忙碌崇拜**：把"看起来很忙"等同于"有产出"
3. **浅层诱惑**：浅层工作容易获得即时满足感

### 为什么深度工作越来越有价值？

1. **智能机器时代**：高技能工作难以被 AI 替代
2. **赢家通吃**：顶尖人才的价值被放大
3. **快速学习**：深度工作是快速掌握复杂技能的关键

## 四种深度工作模式

### 1. 禁欲者模式

完全隔绝干扰，长期沉浸在深度工作中。适合不需要太多协作的创作者。

### 2. 双峰模式

将时间分为深度期和开放期。比如一周中三天深度工作，四天正常社交。

### 3. 节奏模式

每天固定时段进行深度工作。比如每天早上 9-12 点。

### 4. 记者模式

像记者一样，在任何有空闲的时间段快速切换到深度工作状态。需要较高技巧。

## 实践方法

### 1. 创造仪式感

\`\`\`
// 每日深度工作清单
- 固定时间：早上 9:00 - 11:30
- 固定地点：书房 / 安静的咖啡馆
- 准备物品：一杯咖啡、笔记本
- 开场仪式：关闭手机、关闭通知、打开番茄钟
\`\`\`

### 2. 像经营企业一样执行

- **聚焦最重要的事**：每天确定 1-2 个深度目标
- **关注领先指标**：记录深度工作时间而非产出
- **建立记分板**：可视化你的深度工作时长
- **定期复盘**：每周回顾，调整策略

### 3. 远离社交媒体

- 不要用"有任何好处"来判断，要用"对核心目标的实质贡献"来判断
- 30天实验法：停用 30 天，看生活是否变差

### 4. 训练专注力

- **生产性冥想**：在走路/通勤时专注思考一个工作问题
- **记忆训练**：练习记住一副扑克牌的顺序，锻炼注意力
- **限制浅层工作**：给浅层工作设定严格的时间上限

## 我的实践

读完这本书后，我做了以下改变：

1. **时间分块**：用日历规划每一天，深度工作时段不可被占用
2. **通知管理**：手机所有应用通知关闭，只保留电话和短信
3. **社交媒体限制**：每天只在固定时间（晚上8-9点）查看
4. **深度日志**：记录每天深度工作的时间和质量

效果非常明显——产出质量提升了，焦虑感减少了。

## 总结

> 深度工作不是一种技能，而是一种生活方式的选择。

在这个分心的时代，能够深度工作的人将获得巨大的竞争优势。关键不在于知道方法，而在于**真正去实践**。

推荐每个人都读一读这本书，然后选择一种适合自己的模式开始。`
  },

  {
    id: 'javascript-async-guide',
    title: 'JavaScript 异步编程完全指南',
    date: '2026-07-28',
    tags: ['技术', 'JavaScript', '前端'],
    cover: 'orange',
    excerpt: '从回调地狱到 async/await，全面梳理 JavaScript 异步编程的演进历程和最佳实践。包含 Promise、Generator、async/await 的深入解析。',
    content: `# JavaScript 异步编程完全指南

JavaScript 是单线程的，但通过异步编程模型，它可以高效处理 I/O 密集型任务。本文全面梳理 JS 异步编程的演进。

## 1. 回调函数（Callback）

最原始的异步方式。

\`\`\`javascript
// 经典的回调地狱
getUser(userId, function(err, user) {
  if (err) return console.error(err);
  getOrders(user.id, function(err, orders) {
    if (err) return console.error(err);
    getOrderDetail(orders[0].id, function(err, detail) {
      if (err) return console.error(err);
      console.log(detail);
    });
  });
});
\`\`\`

**问题**：
- 代码呈"金字塔"结构，难以阅读
- 错误处理分散
- 无法正常 return 和 throw

## 2. Promise

ES6 引入，解决了回调地狱。

\`\`\`javascript
// 链式调用
getUser(userId)
  .then(user => getOrders(user.id))
  .then(orders => getOrderDetail(orders[0].id))
  .then(detail => console.log(detail))
  .catch(err => console.error(err));
\`\`\`

### Promise 的状态

\`\`\`
Pending（等待） ──→ Fulfilled（完成）
                └──→ Rejected（失败）
\`\`\`

### 常用 API

\`\`\`javascript
// 并行执行，等待全部完成
Promise.all([fetchA(), fetchB(), fetchC()])
  .then(([a, b, c]) => console.log(a, b, c));

// 并行执行，返回最先完成的
Promise.race([fetchWithTimeout(url, 3000), timeoutPromise(5000)])
  .then(data => console.log(data));

// ES2020: 等待全部完成（无论成功失败）
Promise.allSettled([p1, p2, p3])
  .then(results => {
    results.forEach(r => {
      if (r.status === 'fulfilled') console.log(r.value);
      else console.log(r.reason);
    });
  });

// ES2021: 任意一个成功就返回
Promise.any([p1, p2, p3])
  .then(first => console.log(first));
\`\`\`

## 3. Generator 函数

可以暂停执行的函数，配合执行器实现异步。

\`\`\`javascript
function* fetchFlow() {
  try {
    const user = yield getUser(userId);
    const orders = yield getOrders(user.id);
    const detail = yield getOrderDetail(orders[0].id);
    console.log(detail);
  } catch (err) {
    console.error(err);
  }
}

// 简易执行器
function run(generator) {
  const gen = generator();
  function step(method, arg) {
    const result = gen[method](arg);
    if (result.done) return;
    result.value.then(
      val => step('next', val),
      err => step('throw', err)
    );
  }
  step('next');
}

run(fetchFlow);
\`\`\`

## 4. async/await（推荐）

ES2017 引入，语法糖让异步代码看起来像同步代码。

\`\`\`javascript
async function fetchOrderDetail(userId) {
  try {
    const user = await getUser(userId);
    const orders = await getOrders(user.id);
    const detail = await getOrderDetail(orders[0].id);
    return detail;
  } catch (err) {
    console.error('获取订单详情失败:', err);
    throw err;
  }
}

// 使用
fetchOrderDetail(123).then(detail => console.log(detail));
\`\`\`

### 并行优化

\`\`\`javascript
// ❌ 串行：慢
async function slow() {
  const a = await fetchA();  // 2s
  const b = await fetchB();  // 2s
  // 总共 4s
}

// ✅ 并行：快
async function fast() {
  const [a, b] = await Promise.all([fetchA(), fetchB()]);
  // 总共 2s
}
\`\`\`

### 错误处理策略

\`\`\`javascript
// 方式1：try/catch
async function method1() {
  try {
    const data = await fetch('/api/data');
    return data;
  } catch (err) {
    console.error(err);
  }
}

// 方式2：.catch() 链
async function method2() {
  const data = await fetch('/api/data').catch(err => {
    console.error(err);
    return null;
  });
  if (!data) return;
  // ...
}

// 方式3：封装 to 工具函数
function to(promise) {
  return promise.then(val => [null, val]).catch(err => [err, null]);
}

async function method3() {
  const [err, data] = await to(fetch('/api/data'));
  if (err) return console.error(err);
  // 使用 data
}
\`\`\`

## 5. 实际应用模式

### 请求重试

\`\`\`javascript
async function retry(fn, times = 3, delay = 1000) {
  for (let i = 0; i < times; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === times - 1) throw err;
      await new Promise(r => setTimeout(r, delay * (i + 1)));
    }
  }
}
\`\`\`

### 并发限制

\`\`\`javascript
async function mapLimit(items, limit, asyncFn) {
  const results = [];
  const executing = [];

  for (const item of items) {
    const p = Promise.resolve().then(() => asyncFn(item));
    results.push(p);

    if (limit <= items.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= limit) {
        await Promise.race(executing);
      }
    }
  }

  return Promise.all(results);
}
\`\`\`

## 总结

| 方式 | 可读性 | 错误处理 | 适用场景 |
|------|--------|---------|---------|
| 回调 | 差 | 难 | 简单事件监听 |
| Promise | 中 | 好 | API 请求 |
| Generator | 中 | 好 | 复杂流程控制 |
| async/await | 优 | 优 | 绝大多数场景 |

> **最佳实践**：日常开发优先使用 async/await，并行场景配合 Promise.all。`
  },

  {
    id: 'travel-notes-yunnan',
    title: '云南行记：苍山洱海间的慢时光',
    date: '2026-07-15',
    tags: ['旅行', '随笔', '生活'],
    cover: 'teal',
    excerpt: '从大理到丽江，从苍山到洱海。七天的云南之旅，让我重新认识了"慢生活"的意义。分享行程攻略和沿途感悟。',
    content: `# 云南行记：苍山洱海间的慢时光

> "生活不止眼前的苟且，还有诗和远方。"

七月的云南，雨季刚过，天空澄澈。背上行囊，开启了一段说走就走的旅程。

## Day 1-2：大理

### 初见洱海

从昆明坐高铁到大理，两个小时。出站的那一刻，高原的阳光就给了你一个热情的拥抱。

租了一辆电动车，沿着洱海骑行。风从湖面吹来，带着水草的清香。

\`\`\`
路线：大理古城 → 才村 → 磻溪 → 喜洲
里程：约 40km
耗时：一整天（含停留）
\`\`\`

### 喜洲古镇

喜洲比大理古城安静得多。白族民居的照壁上写着一个大大的"福"字，老人坐在门口晒太阳。

**推荐**：
- 喜洲粑粑（外酥内软，5元一个）
- 严家大院（白族建筑博物馆）
- 稻田拍照（7月正好是绿油油的）

### 大理古城

晚上回到古城，人民路上热闹非凡。找了一家民谣酒吧，听着一首首关于远方的歌。

## Day 3-4：苍山

### 洗马潭索道

苍山有十九峰，最高峰马龙峰海拔4122米。坐索道到洗马潭（海拔3920米），高反让我头痛了一阵，但看到云海的那一刻，一切都值了。

### 感通寺徒步

从感通寺沿玉带云游路徒步，全程约18公里。路在山腰蜿蜒，一边是苍山的绿，一边是洱海的蓝。

> 途中遇到一位当地老爷爷，告诉我："年轻人，走慢点，风景在路上，不在终点。"

## Day 5-6：丽江

### 束河古镇

比大研古城清静得多，适合发呆。找了一家咖啡馆，对着窗户外的雪山坐了一下午。

### 玉龙雪山

提前抢了索道票，清晨6点出发。

| 时间 | 活动 | 海拔 |
|------|------|------|
| 7:00 | 乘索道上山 | 3356m → 4506m |
| 8:00 | 徒步登顶 | 4506m → 4680m |
| 10:00 | 下山 | — |
| 11:00 | 蓝月谷 | — |

**蓝月谷**的水真的是蓝色的！像一块巨大的蓝宝石嵌在山谷里。

### 丽江古城夜景

晚上回到大研古城，四方街热闹非凡。沿着水渠走走停停，灯光映在水面上，美得不像话。

## Day 7：返程与感悟

### 旅行的意义

这趟旅程最大的收获不是拍了多少照片，而是：

1. **学会了慢下来**：在大理，时间似乎变慢了。没有打卡式的赶景点，只有随心所欲的走走停停。
2. **重新发现美**：远离屏幕，才发现真实世界有多美。洱海的日出、苍山的云海、雪山的圣洁。
3. **遇见有趣的灵魂**：旅途中遇到了很多人，听了很多故事。每个人都在用自己的方式生活。
4. **感恩当下**：健康、自由、能去看世界，本身就是一种幸福。

### 实用攻略

**交通**：
- 昆明 → 大理：高铁2h，145元
- 大理 → 丽江：火车2h，34元
- 当地：电动车/租车/包车

**住宿**：
- 大理：才村海景民宿，200-400元/晚
- 丽江：束河古镇客栈，150-300元/晚

**预算**（7天）：
- 交通：~500元
- 住宿：~1500元
- 餐饮：~700元
- 门票+索道：~600元
- 合计：约 3300元

## 写在最后

如果你也累了，不妨给自己放个假。去看看山，去看看水，去看看不一样的生活。

> "世界那么大，我想去看看。"

云南，我一定还会再来的。`
  },

  {
    id: 'productivity-tools-2026',
    title: '2026年我每天在用的高效工具清单',
    date: '2026-07-01',
    tags: ['工具', '效率', '技术'],
    cover: 'rose',
    excerpt: '工欲善其事，必先利其器。分享我日常使用的效率工具，涵盖笔记、任务管理、开发工具、设计工具等，帮你打造高效工作流。',
    content: `# 2026年我每天在用的高效工具清单

> "工欲善其事，必先利其器。"

好的工具不是让你更忙，而是让你有更多时间做真正重要的事。以下是我经过长期使用、筛选后留下的工具清单。

## 笔记与知识管理

### Obsidian

**用途**：个人知识库、日记、项目管理

之前用过 Evernote、Notion、语雀，最终回到了 Obsidian。原因很简单：

- **本地存储**：数据完全在自己手里，不用担心服务商跑路
- **双向链接**：建立知识之间的关联，越用越聪明
- **Markdown 原生**：无需学习特殊语法
- **插件生态**：社区插件极其丰富

\`\`\`markdown
# 我的 Obsidian 结构

01-Inbox/        # 速记，定期整理
02-Notes/        # 永久笔记
03-Daily/        # 日记
04-Projects/     # 项目笔记
05-Templates/    # 模板
99-Archive/      # 归档
\`\`\`

**推荐插件**：
- Dataview（数据查询）
- Templater（模板自动化）
- Calendar（日历视图）
- Excalidraw（手绘图）

## 任务管理

### TickTick（滴答清单）

**用途**：日常任务、习惯追踪、番茄钟

选它的理由：
- 跨平台同步速度快
- 支持自然语言输入（"明天下午3点开会"自动解析）
- 内置番茄钟和习惯追踪
- 清单+日历二合一

### 我的 GTD 工作流

\`\`\`
收集 → Inbox 快速记录
     → 整理到对应清单
     → 每天/每周回顾
     → 完成归档
\`\`\`

## 开发工具

### VS Code

无可争议的编辑器之王。我的核心插件：

| 插件 | 用途 |
|------|------|
| GitLens | Git 增强 |
| ESLint | 代码检查 |
| Prettier | 代码格式化 |
| Tailwind CSS IntelliSense | CSS 自动补全 |
| Error Lens | 行内错误提示 |
| Material Icon Theme | 文件图标 |

### Warp Terminal

新一代终端，速度快、界面美、支持 AI 命令建议。比 iTerm2 更现代。

### Docker

本地开发环境的不二之选。一条命令拉起数据库、缓存、消息队列，干净利落。

\`\`\`yaml
# 我的常用 docker-compose 片段
services:
  db:
    image: postgres:16
    ports: ["5432:5432"]
  redis:
    image: redis:7
    ports: ["6379:6379"]
\`\`\`

## 设计工具

### Figma

设计协作的行业标准。即使不是设计师，用它画个流程图、做个原型也很方便。

### Excalidraw

手绘风格的白板工具。适合画架构图、流程图、头脑风暴。看起来像手画的，降低了完美主义的压力。

## 效率工具

### Raycast（Mac）/ PowerToys（Windows）

系统级启动器，一个快捷键搞定一切：
- 打开应用
- 搜索文件
- 剪贴板历史
- 计算器
- 颜色选择器

### Rectangle（Mac）/ FancyZones（Windows）

窗口管理工具。用快捷键快速排列窗口，告别手动拖拽。

## 信息获取

### RSS + Inoreader

主动获取信息，而非被动接受算法推荐。订阅了约 100 个源，每天早上花 15 分钟浏览标题，挑感兴趣的读。

**推荐订阅源**：
- Hacker News
- 少数派
- 阮一峰的网络日志
- CSS-Tricks
- CSS 周刊

### Readwise Reader

稍后阅读 + 高亮标注。把网上看到的好文章存进来，集中阅读和标注，定期回顾。

## 习惯追踪

### 我的每日习惯

\`\`\`
✅ 早起 6:30
✅ 冥想 10 分钟
✅ 阅读 30 分钟
✅ 运动 30 分钟
✅ 写日记
✅ 深度工作 3 小时
\`\`\`

用 TickTick 的习惯追踪功能，每天打勾。连续完成的天数越多，越不想断。

## 总结

| 类别 | 工具 | 替代品 |
|------|------|--------|
| 笔记 | Obsidian | Notion, Logseq |
| 任务 | TickTick | Todoist, Microsoft To Do |
| 编辑器 | VS Code | WebStorm, Neovim |
| 终端 | Warp | iTerm2, Alacritty |
| 设计 | Figma | Sketch, Adobe XD |
| 白板 | Excalidraw | Miro, FigJam |
| 启动器 | Raycast | Alfred |
| 信息 | Inoreader + Readwise | Feedly, Instapaper |

> **最重要的原则**：工具是手段不是目的。选择适合自己的，然后深度使用，而不是不停换工具。

你的必备工具是什么？欢迎交流！`
  }
];
