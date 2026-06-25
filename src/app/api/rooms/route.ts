import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getAdminDatabase } from "@/lib/firebase-admin";
import { makeRoomCode } from "@/lib/game";
import type { PublicRoom } from "@/types/game";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const playerName = String(body.playerName || "").trim().slice(0, 30);

    if (!playerName) {
      return NextResponse.json({ message: "กรุณากรอกชื่อผู้เล่น" }, { status: 400 });
    }

    const db = getAdminDatabase();
    let roomId = makeRoomCode();
    let roomRef = db.ref(`rooms/${roomId}`);
    let exists = (await roomRef.get()).exists();

    while (exists) {
      roomId = makeRoomCode();
      roomRef = db.ref(`rooms/${roomId}`);
      exists = (await roomRef.get()).exists();
    }

    const playerId = randomUUID();
    const now = Date.now();

    const room: PublicRoom = {
      id: roomId,
      status: "lobby",
      round: 0,
      hostId: playerId,
      players: {
        [playerId]: {
          id: playerId,
          name: playerName,
          score: 0,
          isHost: true,
          joinedAt: now,
          lastSeenAt: now,
        },
      },
      createdAt: now,
      updatedAt: now,
    };

    await roomRef.set({
      public: room,
      private: {
        createdBy: playerId,
      },
    });

    return NextResponse.json({ roomId, playerId });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "สร้างห้องไม่สำเร็จ" }, { status: 500 });
  }
}
