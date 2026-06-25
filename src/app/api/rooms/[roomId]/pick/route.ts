import { NextResponse } from "next/server";
import { getAdminDatabase } from "@/lib/firebase-admin";
import { nextTurnPlayerId } from "@/lib/game";
import type { PublicRoom } from "@/types/game";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
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

    const roomSnapshot = await publicRef.get();

    if (!roomSnapshot.exists()) {
      return NextResponse.json({ message: "ไม่พบห้องนี้" }, { status: 404 });
    }

    const room = roomSnapshot.val() as PublicRoom;

    const dangerSnapshot = await db
      .ref(`rooms/${roomId}/private/dangerWordId`)
      .get();
    const dangerWordId = dangerSnapshot.val();

    if (!dangerWordId) {
      return NextResponse.json(
        { message: "ยังไม่มีเกมที่กำลังเล่นอยู่" },
        { status: 400 },
      );
    }

    const game = room.game;
    const player = room.players?.[playerId];
    const word = game?.words?.[wordId];

    if (!game || room.status !== "playing" || game.status !== "playing") {
      return NextResponse.json(
        { message: "เกมไม่ได้อยู่ในสถานะกำลังเล่น" },
        { status: 409 },
      );
    }

    if (!player) {
      return NextResponse.json(
        { message: "ไม่พบผู้เล่นในห้องนี้" },
        { status: 409 },
      );
    }

    if (game.turnPlayerId !== playerId) {
      return NextResponse.json(
        { message: "ยังไม่ถึงตาของคุณ" },
        { status: 409 },
      );
    }

    if (!word) {
      return NextResponse.json({ message: "ไม่พบคำนี้" }, { status: 409 });
    }

    if (word.selectedBy) {
      return NextResponse.json(
        { message: "คำนี้ถูกเลือกไปแล้ว" },
        { status: 409 },
      );
    }

    const now = Date.now();
    const isDanger = wordId === dangerWordId;

    const nextGame = {
      ...game,
      words: {
        ...game.words,
        [wordId]: {
          ...word,
          selectedBy: playerId,
          selectedByName: player.name,
          selectedAt: now,
          ...(isDanger ? { dangerHit: true } : {}),
        },
      },
      selectedCount: game.selectedCount + 1,
    };

    let nextRoom: PublicRoom = {
      ...room,
      updatedAt: now,
      game: nextGame,
    };

    if (isDanger) {
      const updatedPlayers = Object.fromEntries(
        Object.entries(room.players).map(([id, item]) => {
          const scoreDelta = id === playerId ? -3 : 2;

          return [
            id,
            {
              ...item,
              score: (item.score || 0) + scoreDelta,
              lastSeenAt: id === playerId ? now : item.lastSeenAt,
            },
          ];
        }),
      );

      nextRoom = {
        ...nextRoom,
        status: "ended",
        players: updatedPlayers,
        game: {
          ...nextGame,
          status: "ended",
          endedAt: now,
          loserId: playerId,
          loserName: player.name,
          resultMessage: `${player.name} เลือกคำอันตรายและแพ้รอบนี้!`,
        },
      };
    } else {
      nextRoom = {
        ...nextRoom,
        players: {
          ...room.players,
          [playerId]: {
            ...player,
            score: (player.score || 0) + 1,
            lastSeenAt: now,
          },
        },
        game: {
          ...nextGame,
          turnPlayerId: nextTurnPlayerId(game.turnOrder, playerId),
        },
      };
    }

    await publicRef.set(nextRoom);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "เลือกคำไม่สำเร็จ" }, { status: 500 });
  }
}
