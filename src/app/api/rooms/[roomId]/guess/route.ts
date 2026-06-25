import { NextResponse } from "next/server";
import { getAdminDatabase } from "@/lib/firebase-admin";
import type { GameEvent, PublicGame, PublicRoom } from "@/types/game";

export const runtime = "nodejs";

function appendEvent(game: PublicGame, event: GameEvent) {
  return [event, ...(game.events || [])].slice(0, 10);
}

export async function POST(request: Request, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await params;
    const body = await request.json();
    const playerId = String(body.playerId || "");
    const wordId = String(body.wordId || "");

    if (!playerId || !wordId) {
      return NextResponse.json({ message: "ข้อมูลไม่ครบ" }, { status: 400 });
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
      return NextResponse.json({ message: "ทายคำนี้ไม่ได้" }, { status: 409 });
    }

    if (game.guesses?.[playerId]) {
      return NextResponse.json({ message: "คุณทายไปแล้วในรอบนี้" }, { status: 409 });
    }

    const dangerWordId = (await db.ref(`rooms/${roomId}/private/dangerWordId`).get()).val();
    const now = Date.now();
    const isCorrect = wordId === dangerWordId;
    const scoreDelta = isCorrect ? 8 : -4;

    const updatedPlayer = {
      ...player,
      score: (player.score || 0) + scoreDelta,
      lastSeenAt: now,
    };

    const event: GameEvent = {
      id: `${now}-${playerId}-guess`,
      at: now,
      type: "guess",
      emoji: isCorrect ? "🎯" : "❌",
      title: isCorrect ? "ทายระเบิดถูก!" : "ทายผิด!",
      message: isCorrect ? `${player.name} อ่านเกมออก ทาย “${word.text}” ถูกว่าเป็นคำอันตราย ได้ +8 และจบรอบทันที` : `${player.name} ทาย “${word.text}” ผิด เสีย 4 แต้ม และยังต้องเล่นต่อ`,
      playerId,
      playerName: player.name,
      wordText: word.text,
    };

    const nextGame: PublicGame = {
      ...game,
      guesses: {
        ...(game.guesses || {}),
        [playerId]: isCorrect ? "correct" : "wrong",
      },
      words: isCorrect
        ? {
            ...game.words,
            [wordId]: {
              ...word,
              selectedBy: playerId,
              selectedByName: player.name,
              selectedAt: now,
              dangerHit: true,
            },
          }
        : game.words,
      status: isCorrect ? "ended" : game.status,
      endedAt: isCorrect ? now : game.endedAt,
      loserId: isCorrect ? undefined : game.loserId,
      loserName: isCorrect ? undefined : game.loserName,
      resultMessage: isCorrect ? `${player.name} ทายคำอันตราย “${word.text}” ถูก และชนะรอบนี้!` : game.resultMessage,
      events: appendEvent(game, event),
    };

    const nextRoom: PublicRoom = {
      ...room,
      status: isCorrect ? "ended" : room.status,
      updatedAt: now,
      players: {
        ...room.players,
        [playerId]: updatedPlayer,
      },
      game: nextGame,
    };

    await publicRef.set(JSON.parse(JSON.stringify(nextRoom)));
    return NextResponse.json({ ok: true, isCorrect, scoreDelta, boom: isCorrect, event });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "ทายคำอันตรายไม่สำเร็จ" }, { status: 500 });
  }
}
