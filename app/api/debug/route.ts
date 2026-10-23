import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const checks = {
      timestamp: new Date().toISOString(),
      env: {
        DATABASE_URL: !!process.env.DATABASE_URL,
        JWT_SECRET: !!process.env.JWT_SECRET,
        NODE_ENV: process.env.NODE_ENV,
      },
      prisma: { connected: false, error: null as string | null },
      db: { userCount: 0, error: null as string | null },
    };

    // Test Prisma connection
    try {
      await prisma.$connect();
      checks.prisma.connected = true;
      const count = await prisma.user.count();
      checks.db.userCount = count;
    } catch (e: any) {
      checks.prisma.error = e?.message || String(e);
      checks.db.error = e?.message || String(e);
    }

    return NextResponse.json({ ok: true, checks });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  }
}