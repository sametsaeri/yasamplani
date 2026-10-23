import { NextResponse } from "next/server";
import { cookieSil } from "@/lib/auth-server";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookieSil());
  return res;
}
