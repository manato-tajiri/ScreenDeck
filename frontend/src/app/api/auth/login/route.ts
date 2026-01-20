import { NextRequest, NextResponse } from "next/server";

// Use API_URL for server-side (Docker network), fallback to NEXT_PUBLIC_API_URL
const API_BASE_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Forward login request to backend
    const backendResponse = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!backendResponse.ok) {
      const error = await backendResponse.json();
      return NextResponse.json(error, { status: backendResponse.status });
    }

    const data = await backendResponse.json();

    // Create response with cookie set on frontend domain
    const response = NextResponse.json(data);
    response.cookies.set("access_token", data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" || API_BASE_URL.startsWith("https"),
      sameSite: API_BASE_URL.startsWith("https") ? "none" : "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { detail: "Internal server error" },
      { status: 500 }
    );
  }
}
