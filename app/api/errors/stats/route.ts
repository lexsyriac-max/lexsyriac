import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const stats = await prisma.sentence_errors.groupBy({
      by: ["root"],
      _count: {
        root: true,
      },
      orderBy: {
        _count: {
          root: "desc",
        },
      },
      take: 10,
    });

    const formatted = stats.map((item: any) => ({
      root: item.root,
      error_count: item._count.root,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("ERROR STATS API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
