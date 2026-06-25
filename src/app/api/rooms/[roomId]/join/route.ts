import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getAdminDatabase } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await params;
    const body = await request.json();
    const playerName = String(body.playerName || "").trim().slice(0, 30);
    const playerId = String(body.playerId || randomUUID());

    if (!playerName) {
      return NextResponse.json({ message: "กรุณากรอกชื่อผู้เล่น" }, { status: 400 });
    }

    const db = getAdminDatabase();
    const publicRef = db.ref(`rooms/${roomId}/public`);
    const snapshot = await publicRef.get();

    if (!snapshot.exists()) {
      return NextResponse.json({ message: "ไม่พบห้องนี้" }, { status: 404 });
    }

    const room = snapshot.val();
    const existingScore = room.players?.[playerId]?.score ?? 0;
    const existingJoinedAt = room.players?.[playerId]?.joinedAt ?? Date.now();

    await publicRef.update({
      [`players/${playerId}`]: {
        id: playerId,
        name: playerName,
        score: existingScore,
        isHost: room.hostId === playerId,
        joinedAt: existingJoinedAt,
        lastSeenAt: Date.now(),
      },
      updatedAt: Date.now(),
    });

    return NextResponse.json({ roomId, playerId });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "เข้าห้องไม่สำเร็จ" }, { status: 500 });
  }
}
