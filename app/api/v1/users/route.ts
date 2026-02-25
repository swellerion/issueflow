import { NextResponse } from "next/server";
import { registerUser } from "@/lib/services/users.service";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).username !== "string" ||
    typeof (body as Record<string, unknown>).password !== "string"
  ) {
    return NextResponse.json(
      { error: "username and password are required." },
      { status: 400 }
    );
  }

  const { username, password } = body as { username: string; password: string };

  try {
    const user = await registerUser({ username, password });
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registration failed.";

    if (message === "Username is already taken.") {
      return NextResponse.json({ error: message }, { status: 409 });
    }

    if (
      message.startsWith("Username must") ||
      message.startsWith("Password must")
    ) {
      return NextResponse.json({ error: message }, { status: 422 });
    }

    console.error("[POST /api/v1/users]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
