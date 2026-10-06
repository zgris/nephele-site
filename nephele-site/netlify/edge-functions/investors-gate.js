// Password gate for /investors/ (page + business plan PDF).
// Runs on Netlify's servers before anything under /investors is served.
// The password lives in the Netlify environment variable INVESTOR_PASSWORD,
// never in this repo. Changing it logs everyone out.

const COOKIE = "nephele_investor";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

// Case-insensitive, ignores stray spaces: "stratocumulus " works too.
async function tokenFor(password) {
  const data = new TextEncoder().encode("nephele-investors:" + password.trim().toLowerCase());
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default async (request, context) => {
  const password = Netlify.env.get("INVESTOR_PASSWORD");
  if (!password) {
    return new Response("Investor area is not configured yet.", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
  const expected = await tokenFor(password);

  // Password form submitted
  if (request.method === "POST") {
    const form = await request.formData();
    const attempt = String(form.get("password") || "");
    if ((await tokenFor(attempt)) === expected) {
      const headers = new Headers({ Location: "/investors/", "Cache-Control": "no-store" });
      headers.append(
        "Set-Cookie",
        `${COOKIE}=${expected}; Path=/investors; Max-Age=${THIRTY_DAYS}; HttpOnly; Secure; SameSite=Lax`
      );
      return new Response(null, { status: 303, headers });
    }
    return loginPage(true);
  }

  // Already unlocked: serve the real page/PDF
  if (context.cookies.get(COOKIE) === expected) {
    const response = await context.next();
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  }

  return loginPage(false);
};

export const config = { path: ["/investors", "/investors/*"] };

function loginPage(wrongPassword) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>Investors — Nephele</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=IBM+Plex+Sans:wght@300;400;500&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  :root {
    --bg-deep: #0a0e14; --bg-surface: #0f1419; --text-primary: #e8eaed; --text-secondary: #8b9bb4;
    --text-muted: #5a6a82; --accent: #6fa3c7; --accent-dim: #3d6a8a;
    --border: rgba(107, 140, 175, 0.12); --border-hover: rgba(107, 140, 175, 0.25);
    --serif: 'Cormorant Garamond', Georgia, serif; --sans: 'IBM Plex Sans', -apple-system, sans-serif;
  }
  body { background: var(--bg-deep); color: var(--text-primary); font-family: var(--sans); font-weight: 300; line-height: 1.7; -webkit-font-smoothing: antialiased; }
  nav { position: fixed; top: 0; left: 0; right: 0; padding: 1.5rem 3rem; display: flex; justify-content: space-between; align-items: center; background: rgba(10, 14, 20, 0.85); border-bottom: 1px solid var(--border); }
  .nav-wordmark { font-family: var(--serif); font-size: 1.4rem; font-weight: 500; letter-spacing: 0.15em; text-transform: uppercase; color: var(--text-primary); text-decoration: none; }
  .nav-links { display: flex; gap: 2.5rem; list-style: none; }
  .nav-links a { color: var(--text-secondary); text-decoration: none; font-size: 0.82rem; font-weight: 400; letter-spacing: 0.08em; text-transform: uppercase; transition: color 0.3s; }
  .nav-links a:hover { color: var(--text-primary); }
  main { min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 8rem 2rem 6rem; }
  .section-label { font-size: 0.72rem; font-weight: 500; letter-spacing: 0.2em; text-transform: uppercase; color: var(--accent); margin-bottom: 1.5rem; }
  h1 { font-family: var(--serif); font-size: clamp(1.8rem, 3.5vw, 2.8rem); font-weight: 300; line-height: 1.25; margin-bottom: 1.5rem; }
  p { color: var(--text-secondary); max-width: 460px; margin-bottom: 2.5rem; font-size: 1.02rem; }
  p a { color: var(--accent); text-decoration: none; }
  form { display: flex; gap: 0.75rem; width: 100%; max-width: 420px; }
  input { flex: 1; min-width: 0; padding: 0.85rem 1rem; background: var(--bg-surface); border: 1px solid var(--border-hover); border-radius: 2px; color: var(--text-primary); font-family: var(--sans); font-size: 0.95rem; font-weight: 300; }
  input:focus { outline: none; border-color: var(--accent); }
  button { padding: 0.85rem 1.6rem; background: var(--accent-dim); border: 1px solid var(--accent-dim); border-radius: 2px; color: var(--text-primary); font-family: var(--sans); font-size: 0.82rem; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer; transition: all 0.35s ease; }
  button:hover { background: var(--accent); border-color: var(--accent); color: var(--bg-deep); }
  .error { color: #d98c8c; font-size: 0.88rem; margin-top: 1rem; min-height: 1.4em; }
  @media (max-width: 768px) { nav { padding: 1.2rem 1.5rem; } .nav-links { gap: 1.5rem; } .nav-links a { font-size: 0.75rem; } }
  @media (max-width: 480px) { .nav-links { display: none; } form { flex-direction: column; } }
</style>
</head>
<body>
<nav>
  <a href="/" class="nav-wordmark">Nephele</a>
  <ul class="nav-links">
    <li><a href="/#approach">Approach</a></li>
    <li><a href="/whitepaper/">Whitepaper</a></li>
    <li><a href="/investors/">Investors</a></li>
    <li><a href="/contact/">Contact</a></li>
  </ul>
</nav>
<main>
  <div class="section-label">Investors</div>
  <h1>Investor materials</h1>
  <p>Enter the password you received from the Nephele team. Don't have one? Reach us at <a href="mailto:info@nephele.earth">info@nephele.earth</a>.</p>
  <form method="POST" action="/investors/">
    <input type="password" name="password" placeholder="Password" aria-label="Password" autocomplete="current-password" required autofocus>
    <button type="submit">Enter</button>
  </form>
  <div class="error" role="alert">${wrongPassword ? "That password didn't work. Try again." : ""}</div>
</main>
</body>
</html>`;
  return new Response(html, {
    status: wrongPassword ? 401 : 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
