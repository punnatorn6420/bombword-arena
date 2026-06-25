import { NextResponse } from "next/server";
import { getAdminDatabase } from "@/lib/firebase-admin";
import { nextTurnPlayerId } from "@/lib/game";
import type { PublicRoom } from "@/types/game";

export const runtime = "nodejs";

type TransactionResult = {
  committed: boolean;
  snapshotValue: PublicRoom | null;
};

function runRoomTransaction(
  ref: any,
  updater: (room: PublicRoom | null) => PublicRoom | undefined
) {
  return new Promise<TransactionResult>((resolve, reject) => {
    ref.transaction(
      (current: PublicRoom | null) => updater(current),
      (error: Error | null, committed: boolean, snapshot?: { val: () => PublicRoom | null }) => {
        if (error) {
          reject(error);
          return;
        }

        resolve({ committed, snapshotValue: snapshot?.val() ?? null });
      },
      false
    );
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ roomId: string }> }) {
  let abortReason = "เลือกคำไม่สำเร็จ";

  try {
    const { roomId } = await params;
    const body = await request.json();
    const playerId = String(body.playerId || "");
    const wordId = String(body.wordId || "");

    if (!playerId || !wordId) {
      return NextResponse.json({ message: "ข้อมูลไม่ครบ" }, { status: 400 });
    }

    const db = getAdminDatabase();
    const dangerSnapshot = await db.ref(`rooms/${roomId}/private/dangerWordId`).get();
    const dangerWordId = dangerSnapshot.val();

    if (!dangerWordId) {
      return NextResponse.json({ message: "ยังไม่มีเกมที่กำลังเล่นอยู่" }, { status: 400 });
    }

    const publicRef = db.ref(`rooms/${roomId}/public`);
    const result = await runRoomTransaction(publicRef, (room) => {
      if (!room) {
        abortReason = "ไม่พบห้องนี้";
        return undefined;
      }

      const game = room.game;
      const player = room.players?.[playerId];
      const word = game?.words?.[wordId];

      if (!game || room.status !== "playing" || game.status !== "playing") {
        abortReason = "เกมไม่ได้อยู่ในสถานะกำลังเล่น";
        return undefined;
      }

      if (!player) {
        abortReason = "ไม่พบผู้เล่นในห้องนี้";
        return undefined;
      }

      if (game.turnPlayerId !== playerId) {
        abortReason = "ยังไม่ถึงตาของคุณ";
        return undefined;
      }

      if (!word) {
        abortReason = "ไม่พบคำนี้";
        return undefined;
      }

      if (word.selectedBy) {
        abortReason = "คำนี้ถูกเลือกไปแล้ว";
        return undefined;
      }

      const now = Date.now();
      const isDanger = wordId === dangerWordId;
      const nextRoom: PublicRoom = {
        ...room,
        updatedAt: now,
        game: {
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
        },
      };

      if (isDanger) {
        const updatedPlayers = Object.fromEntries(
          Object.entries(room.players).map(([id, item]) => {
            const scoreDelta = id === playerId ? -3 : 2;
            return [id, { ...item, score: (item.score || 0) + scoreDelta }];
          })
        );

        nextRoom.status = "ended";
        nextRoom.players = updatedPlayers;
        nextRoom.game = {
          ...nextRoom.game!,
          status: "ended",
          endedAt: now,
          loserId: playerId,
          loserName: player.name,
          resultMessage: `${player.name} เลือกคำอันตรายและแพ้รอบนี้!`,
        };

        return nextRoom;
      }

      nextRoom.players = {
        ...room.players,
        [playerId]: {
          ...player,
          score: (player.score || 0) + 1,
          lastSeenAt: now,
        },
      };
      nextRoom.game = {
        ...nextRoom.game!,
        turnPlayerId: nextTurnPlayerId(game.turnOrder, playerId),
      };

      return nextRoom;
    });

    if (!result.committed) {
      return NextResponse.json({ message: abortReason }, { status: 409 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "เลือกคำไม่สำเร็จ" }, { status: 500 });
  }
}
