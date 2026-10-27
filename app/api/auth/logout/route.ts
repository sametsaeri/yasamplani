import { NextRequest } from "next/server";
import { cookieSil } from "@/lib/auth-server";
import { jsonC, optionsCevap } from "@/lib/cors";

export async function OPTIONS(req: NextRequest) {
  return optionsCevap(req);
}

export async function POST(req: NextRequest) {
  const res = jsonC(req, { ok: true });
  res.cookies.set(cookieSil());
  return res;
}
