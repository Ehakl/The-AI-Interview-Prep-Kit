const args = process.argv.slice(2);
const urlIndex = args.indexOf('--url');
if (urlIndex === -1 || !args[urlIndex + 1]) {
  console.error("Usage: node smoke-test.js --url <deployed-frontend-url>");
  process.exit(1);
}

const baseUrl = args[urlIndex + 1].replace(/\/+$/, ''); // remove trailing slash
const randomEmail = `test_${Date.now()}@example.com`;
const password = "password123";

let cookie = "";

async function runStep(name, fn) {
  try {
    process.stdout.write(`Testing ${name}... `);
    await fn();
    console.log("✅ PASS");
  } catch (err) {
    console.log("❌ FAIL");
    console.error(err.message || err);
    process.exit(1);
  }
}

async function fetchApi(endpoint, options = {}) {
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (cookie) headers["Cookie"] = cookie;

  const url = `${baseUrl}${endpoint}`;
  const res = await fetch(url, { ...options, headers });
  
  // Extract set-cookie to simulate browser
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) {
    cookie = setCookie.split(';')[0];
  }

  const isJson = res.headers.get("content-type")?.includes("application/json");
  if (!isJson) {
    throw new Error(`Expected JSON but got ${res.headers.get("content-type")}. Status: ${res.status}`);
  }

  const data = await res.json();
  return { status: res.status, data };
}

(async () => {
  console.log(`Starting smoke test against ${baseUrl}\n`);

  await runStep("GET /api/health", async () => {
    const { status, data } = await fetchApi("/api/health");
    if (status !== 200 || data.status !== "ok") throw new Error("Health check failed");
  });

  await runStep("POST /api/auth/register", async () => {
    const { status, data } = await fetchApi("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email: randomEmail, password })
    });
    if (status !== 200 || !data.user) throw new Error("Registration failed");
    if (!cookie) throw new Error("No cookie received on register");
  });

  await runStep("POST /api/auth/logout (to clear session)", async () => {
    const { status } = await fetchApi("/api/auth/logout", { method: "POST" });
    if (status !== 200) throw new Error("Logout failed");
    cookie = ""; // clear local cookie state
  });

  await runStep("GET /api/auth/me (without cookie - expecting 401)", async () => {
    const { status, data } = await fetchApi("/api/auth/me");
    if (status !== 401) throw new Error(`Expected 401, got ${status}`);
    if (data.message !== "No token provided") throw new Error(`Unexpected error message: ${data.message}`);
  });

  await runStep("POST /api/auth/login", async () => {
    const { status, data } = await fetchApi("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: randomEmail, password })
    });
    if (status !== 200 || !data.user) throw new Error("Login failed");
    if (!cookie) throw new Error("No cookie received on login");
  });

  await runStep("GET /api/auth/me (with cookie)", async () => {
    const { status, data } = await fetchApi("/api/auth/me");
    if (status !== 200 || data.user.email !== randomEmail) {
      throw new Error("Failed to get protected route with cookie");
    }
  });

  console.log("\nAll smoke tests passed! 🎉");
})();
