const baseUrl = process.env.API_BASE_URL ?? "http://localhost:4000/api";

async function request(path: string, options?: RequestInit) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`${path} failed with ${response.status}: ${body}`);
  }

  return body ? JSON.parse(body) : {};
}

async function main() {
  const auth = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: "admin@property.local",
      password: "password123",
    }),
  });
  const headers = { Authorization: `Bearer ${auth.accessToken}` };

  await Promise.all([
    request("/dashboard/summary", { headers }),
    request("/properties", { headers }),
    request("/tenants", { headers }),
    request("/leases", { headers }),
    request("/payments", { headers }),
    request("/maintenance", { headers }),
    request("/expenses", { headers }),
    request("/reports/revenue", { headers }),
    request("/notifications", { headers }),
  ]);

  console.log("API smoke test passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
