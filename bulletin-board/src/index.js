const MAX_NAME_LEN = 30;
const MAX_BODY_LEN = 500;

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

async function handleGetPosts(env) {
  const { results } = await env.DB.prepare(
    "SELECT id, name, body, created_at FROM posts ORDER BY id DESC LIMIT 100"
  ).all();
  return jsonResponse({ posts: results });
}

async function handlePostPost(request, env) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "不正なリクエストです" }, 400);
  }

  let name = typeof payload.name === "string" ? payload.name.trim() : "";
  const body = typeof payload.body === "string" ? payload.body.trim() : "";

  if (!body) {
    return jsonResponse({ error: "本文を入力してください" }, 400);
  }
  if (body.length > MAX_BODY_LEN) {
    return jsonResponse({ error: `本文は${MAX_BODY_LEN}文字以内で入力してください` }, 400);
  }
  if (name.length > MAX_NAME_LEN) {
    return jsonResponse({ error: `名前は${MAX_NAME_LEN}文字以内で入力してください` }, 400);
  }
  if (!name) {
    name = "名無しさん";
  }

  await env.DB.prepare(
    "INSERT INTO posts (name, body, created_at) VALUES (?, ?, datetime('now'))"
  )
    .bind(name, body)
    .run();

  return jsonResponse({ ok: true }, 201);
}

function renderPage() {
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>簡単掲示板</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: "Hiragino Sans", "Yu Gothic", system-ui, sans-serif;
    background: #f4f5f7;
    color: #222;
  }
  header {
    background: #2f6feb;
    color: #fff;
    padding: 1.2rem 1rem;
    text-align: center;
  }
  header h1 { margin: 0; font-size: 1.4rem; }
  main {
    max-width: 640px;
    margin: 0 auto;
    padding: 1rem;
  }
  form {
    background: #fff;
    border-radius: 8px;
    padding: 1rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    margin-bottom: 1.5rem;
  }
  form label {
    display: block;
    font-size: 0.85rem;
    margin-bottom: 0.3rem;
    color: #555;
  }
  form input, form textarea {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 1rem;
    margin-bottom: 0.8rem;
    font-family: inherit;
  }
  form textarea { resize: vertical; min-height: 80px; }
  form button {
    background: #2f6feb;
    color: #fff;
    border: none;
    padding: 0.6rem 1.4rem;
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
  }
  form button:disabled { opacity: 0.6; cursor: default; }
  #error {
    color: #c0392b;
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
    min-height: 1.2em;
  }
  .post {
    background: #fff;
    border-radius: 8px;
    padding: 0.8rem 1rem;
    margin-bottom: 0.8rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  }
  .post .meta {
    font-size: 0.8rem;
    color: #888;
    margin-bottom: 0.4rem;
  }
  .post .name { font-weight: bold; color: #2f6feb; }
  .post .body { white-space: pre-wrap; word-break: break-word; line-height: 1.5; }
  #empty { text-align: center; color: #888; padding: 2rem 0; }
</style>
</head>
<body>
<header><h1>簡単掲示板</h1></header>
<main>
  <form id="post-form">
    <label for="name">名前（省略可）</label>
    <input id="name" maxlength="${MAX_NAME_LEN}" placeholder="名無しさん">
    <label for="body">メッセージ</label>
    <textarea id="body" maxlength="${MAX_BODY_LEN}" placeholder="ここに書き込んでください" required></textarea>
    <div id="error"></div>
    <button type="submit" id="submit-btn">投稿する</button>
  </form>
  <div id="posts"></div>
  <div id="empty" style="display:none">まだ投稿がありません。最初の投稿をしてみましょう！</div>
</main>
<script>
const postsEl = document.getElementById('posts');
const emptyEl = document.getElementById('empty');
const form = document.getElementById('post-form');
const errorEl = document.getElementById('error');
const submitBtn = document.getElementById('submit-btn');

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function formatDate(iso) {
  const d = new Date(iso.replace(' ', 'T') + 'Z');
  return d.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
}

async function loadPosts() {
  const res = await fetch('/api/posts');
  const data = await res.json();
  const posts = data.posts || [];
  postsEl.innerHTML = '';
  emptyEl.style.display = posts.length === 0 ? 'block' : 'none';
  for (const p of posts) {
    const div = document.createElement('div');
    div.className = 'post';
    div.innerHTML =
      '<div class="meta"><span class="name">' + escapeHtml(p.name) + '</span> ・ ' +
      formatDate(p.created_at) + '</div>' +
      '<div class="body">' + escapeHtml(p.body) + '</div>';
    postsEl.appendChild(div);
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorEl.textContent = '';
  const name = document.getElementById('name').value;
  const body = document.getElementById('body').value;
  if (!body.trim()) {
    errorEl.textContent = 'メッセージを入力してください';
    return;
  }
  submitBtn.disabled = true;
  try {
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, body }),
    });
    const data = await res.json();
    if (!res.ok) {
      errorEl.textContent = data.error || '投稿に失敗しました';
      return;
    }
    document.getElementById('body').value = '';
    await loadPosts();
  } catch (err) {
    errorEl.textContent = '通信エラーが発生しました';
  } finally {
    submitBtn.disabled = false;
  }
});

loadPosts();
setInterval(loadPosts, 5000);
</script>
</body>
</html>`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/posts") {
      if (request.method === "GET") {
        return handleGetPosts(env);
      }
      if (request.method === "POST") {
        return handlePostPost(request, env);
      }
      return jsonResponse({ error: "Method Not Allowed" }, 405);
    }

    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(renderPage(), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
};
