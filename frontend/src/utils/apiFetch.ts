export class ApiError extends Error {
  public status: number;
  public data: any;

  constructor(status: number, message: string, data: any = null) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = "ApiError";
  }
}

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const url = endpoint.startsWith("/api") ? endpoint : `/api${endpoint}`;

  let attempts = 0;
  const maxAttempts = 2; // initial + 1 retry

  while (attempts < maxAttempts) {
    attempts++;
    try {
      const response = await fetch(url, options);

      // Check content-type before parsing
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        // We got HTML or something unexpected (like Vercel's 504 page)
        if (!response.ok) {
          const statusMap: Record<number, string> = {
            502: "Bad Gateway: The backend server is down or unreachable.",
            503: "Service Unavailable: The backend is overloaded.",
            504: "Gateway Timeout: The request took too long.",
            404: "Not Found: The API endpoint does not exist.",
          };
          const msg = statusMap[response.status] || `Unexpected response type from server. Please try again.`;
          
          if (response.status >= 500 && attempts < maxAttempts) {
            console.warn(`[apiFetch] Server error ${response.status}. Retrying...`);
            await new Promise((r) => setTimeout(r, 1000));
            continue;
          }
          throw new ApiError(response.status, msg);
        }
        throw new ApiError(500, "Server returned invalid content type (expected JSON).");
      }

      const data = await response.json();

      if (!response.ok) {
        // Handle JSON error response from backend
        // Do not retry 4xx errors
        if (response.status >= 500 && attempts < maxAttempts) {
          console.warn(`[apiFetch] API error ${response.status}. Retrying...`);
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }
        throw new ApiError(response.status, data.message || "An error occurred.", data);
      }

      return data;
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Network error (e.g. CORS failure, no internet connection, or fetch throws)
      if (attempts < maxAttempts) {
        console.warn(`[apiFetch] Network error: ${error.message}. Retrying...`);
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      console.error("[apiFetch] Request failed entirely:", error);
      throw new ApiError(0, "Can't reach the server, please try again.");
    }
  }
}
