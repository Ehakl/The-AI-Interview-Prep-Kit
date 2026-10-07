import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // Ensure it's not cached

export async function GET() {
  try {
    const backendUrl = process.env.BACKEND_API_URL || "https://the-ai-interview-prep-kit-teow.onrender.com/api";
    const startTime = Date.now();
    const res = await fetch(`${backendUrl}/health`, { 
      cache: "no-store",
      headers: { "Content-Type": "application/json" }
    });
    
    const latency = Date.now() - startTime;
    const data = await res.json();
    
    return NextResponse.json({
      frontend: "ok",
      backend_status: res.status,
      latency_ms: latency,
      backend_data: data
    }, { status: res.status === 200 ? 200 : 503 });
  } catch (error: any) {
    return NextResponse.json({
      frontend: "ok",
      backend_status: "unreachable",
      error: error.message
    }, { status: 503 });
  }
}
