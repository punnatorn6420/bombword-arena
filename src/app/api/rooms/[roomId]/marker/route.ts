import { NextResponse } from "next/server";
import { getAdminDatabase } from "@/lib/firebase-admin";
import type { BluffMarker, GameEvent, PublicGame, PublicRoom } from "@/types/game";

export const runtime = "nodejs";

function isMarker(value: unknown): value is BluffMarker | "clear" {
  return value === "suspect" || value === "safe" || value === "bait" || value === "clear";
}

function appendEvent(game: PublicGame, event: GameEvent) {
  return [event, ...(game.events || [])].slice(0, 10);
}

const MARKER_EMOJI: Record<BluffMarker, string> = {
  suspect: "🚩",
  safe: "🟢",
  bait: "🎭",
};

export async function POST(request: Request, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await params;
    const body = await request.json();
    const playerId = String(body.playerId || "");
    const wordId = String(body.wordId || "");
    const marker = body.marker;

    if (!playerId || !wordId || !isMarker(marker)) {
      return NextResponse.json({ message: "ข้อมูล marker ไม่ถูกต้อง" }, { status: 400 });
    }

    const db = getAdminDatabase();
    const publicRef = db.ref(`rooms/${roomId}/public`);
    const snapshot = await publicRef.get();

    if (!snapshot.exists()) {
      return NextResponse.json({ message: "ไม่พบห้องนี้" }, { status: 404 });
    }

    const room = snapshot.val() as PublicRoom;
    const game = room.game;
    const player = room.players?.[playerId];
    const word = game?.words?.[wordId];

    if (!game || room.status !== "playing" || game.status !== "playing") {
      return NextResponse.json({ message: "เกมไม่ได้อยู่ในสถานะกำลังเล่น" }, { status: 409 });
    }

    if (!player || !word || word.selectedBy) {
      return NextResponse.json({ message: "ปัก marker ไม่ได้" }, { status: 409 });
    }

    const markers = { ...(game.markers || {}) };
    const wordMarkers = { ...(markers[wordId] || {}) };
    if (marker === "clear") {
      delete wordMarkers[playerId];
    } else {
      wordMarkers[playerId] = marker;
    }

    if (Object.keys(wordMarkers).length) {
      markers[wordId] = wordMarkers;
    } else {
      delete markers[wordId];
    }

    const now = Date.now();
    const event: GameEvent = {
      id: `${now}-${playerId}-marker`,
      at: now,
      type: "marker",
      emoji: marker === "clear" ? "🧽" : MARKER_EMOJI[marker],
      title: marker === "clear" ? `${player.name} ลบ marker` : `${player.name} ปัก marker`,
      message: marker === "clear" ? `${player.name} ลบ marker ออกจาก “${word.text}”` : `${player.name} ปัก ${MARKER_EMOJI[marker]} บน “${word.text}” จะจริงหรือหลอกก็ไม่รู้`,
      playerId,
      playerName: player.name,
      wordText: word.text,
    };

    const nextRoom: PublicRoom = {
      ...room,
      updatedAt: now,
      game: {
        ...game,
        markers,
        events: appendEvent(game, event),
      },
    };

    await publicRef.set(JSON.parse(JSON.stringify(nextRoom)));
    return NextResponse.json({ ok: true, marker });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "ปัก marker ไม่สำเร็จ" }, { status: 500 });
  }
}
