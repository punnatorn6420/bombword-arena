import { NextResponse } from "next/server";
import { getAdminDatabase } from "@/lib/firebase-admin";
import { createRound, isGameMode } from "@/lib/game";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await params;
    const body = await request.json();
    const playerId = String(body.playerId || "");
    const requestedMode = body.mode;

    if (!playerId) {
      return NextResponse.json({ message: "ไม่พบข้อมูลผู้เล่น" }, { status: 400 });
    }

    const db = getAdminDatabase();
    const publicRef = db.ref(`rooms/${roomId}/public`);
    const snapshot = await publicRef.get();

    if (!snapshot.exists()) {
      return NextResponse.json({ message: "ไม่พบห้องนี้" }, { status: 404 });
    }

    const room = snapshot.val();
    if (room.hostId !== playerId) {
      return NextResponse.json({ message: "เฉพาะคนสร้างห้องเท่านั้นที่เริ่มตาใหม่ได้" }, { status: 403 });
    }

    const mode = isGameMode(requestedMode) ? requestedMode : room.mode;
    if (!isGameMode(mode)) {
      return NextResponse.json({ message: "ยังไม่ได้เลือกโหมดเกม" }, { status: 400 });
    }

    const players = room.players || {};
    const { game, dangerWordId } = createRound(mode, players, (room.round || 0) + 1);

    await db.ref(`rooms/${roomId}`).update({
      "public/status": "playing",
      "public/mode": mode,
      "public/round": game.round,
      "public/game": game,
      "public/updatedAt": Date.now(),
      "private/dangerWordId": dangerWordId,
      "private/round": game.round,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "เริ่มตาใหม่ไม่สำเร็จ";
    console.error(error);
    return NextResponse.json({ message }, { status: 400 });
  }
}
