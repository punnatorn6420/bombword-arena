import { NextResponse } from "next/server";
import { getAdminDatabase } from "@/lib/firebase-admin";
import {
  getDangerClue,
  getDangerPenalty,
  getPowerSafeScore,
  nextTurnPlayerId,
  POWER_INFO,
  shuffle,
} from "@/lib/game";
import type { GameEvent, PublicGame, PublicRoom } from "@/types/game";

export const runtime = "nodejs";

function compactPickDebt(input: Record<string, number> | undefined) {
  return Object.fromEntries(Object.entries(input || {}).filter(([, value]) => value > 1));
}

function appendEvent(game: PublicGame, event: GameEvent) {
  return [event, ...(game.events || [])].slice(0, 8);
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
    const roomSnapshot = await publicRef.get();

    if (!roomSnapshot.exists()) {
      return NextResponse.json({ message: "ไม่พบห้องนี้" }, { status: 404 });
    }

    const room = roomSnapshot.val() as PublicRoom;
    const game = room.game;
    const player = room.players?.[playerId];
    const word = game?.words?.[wordId];

    if (!game || room.status !== "playing" || game.status !== "playing") {
      return NextResponse.json({ message: "เกมไม่ได้อยู่ในสถานะกำลังเล่น" }, { status: 409 });
    }

    if (!player) {
      return NextResponse.json({ message: "ไม่พบผู้เล่นในห้องนี้" }, { status: 409 });
    }

    if (game.turnPlayerId !== playerId) {
      return NextResponse.json({ message: "ยังไม่ถึงตาของคุณ" }, { status: 409 });
    }

    if (!word) {
      return NextResponse.json({ message: "ไม่พบคำนี้" }, { status: 409 });
    }

    if (word.selectedBy) {
      return NextResponse.json({ message: "คำนี้ถูกเลือกไปแล้ว" }, { status: 409 });
    }

    const dangerSnapshot = await db.ref(`rooms/${roomId}/private/dangerWordId`).get();
    const dangerWordId = dangerSnapshot.val();

    if (!dangerWordId) {
      return NextResponse.json({ message: "ยังไม่มีเกมที่กำลังเล่นอยู่" }, { status: 400 });
    }

    const now = Date.now();
    const playerCount = Object.keys(room.players || {}).length;
    const isDanger = wordId === dangerWordId;
    const wordPower = word.power || "normal";
    const powerInfo = POWER_INFO[wordPower];
    const currentDebt = Math.max(1, game.pickDebt?.[playerId] || 1);

    const selectedWord = {
      ...word,
      selectedBy: playerId,
      selectedByName: player.name,
      selectedAt: now,
      power: wordPower,
      ...(isDanger ? { dangerHit: true } : {}),
    };

    const nextGameBase: PublicGame = {
      ...game,
      words: {
        ...game.words,
        [wordId]: selectedWord,
      },
      selectedCount: game.selectedCount + 1,
    };

    let responsePayload: Record<string, unknown> = { ok: true };
    let nextRoom: PublicRoom = {
      ...room,
      updatedAt: now,
      game: nextGameBase,
    };

    if (isDanger) {
      const loserPenalty = getDangerPenalty(wordPower, playerCount);
      const updatedPlayers = Object.fromEntries(
        Object.entries(room.players).map(([id, item]) => {
          const scoreDelta = id === playerId ? loserPenalty : 2;
          return [
            id,
            {
              ...item,
              score: (item.score || 0) + scoreDelta,
              lastSeenAt: id === playerId ? now : item.lastSeenAt,
            },
          ];
        })
      );

      const event: GameEvent = {
        id: `${now}-${playerId}-danger`,
        at: now,
        type: "danger",
        emoji: "💥",
        title: "ระเบิดแตก!",
        message: `${player.name} กด “${word.text}” (${powerInfo.label}) และโดน ${loserPenalty} คะแนน คนอื่น +2`,
        playerId,
        playerName: player.name,
        wordText: word.text,
      };

      nextRoom = {
        ...nextRoom,
        status: "ended",
        players: updatedPlayers,
        game: {
          ...nextGameBase,
          status: "ended",
          endedAt: now,
          loserId: playerId,
          loserName: player.name,
          resultMessage: `${player.name} เลือกคำอันตราย “${word.text}” และแพ้รอบนี้!`,
          events: appendEvent(game, event),
        },
      };

      await publicRef.set(nextRoom);
      return NextResponse.json({ ...responsePayload, event });
    }

    let nextTurnOrder = [...game.turnOrder];
    let pickDebt = compactPickDebt(game.pickDebt);
    const safeScore = getPowerSafeScore(wordPower);
    const updatedPlayers = { ...room.players };
    updatedPlayers[playerId] = {
      ...player,
      score: (player.score || 0) + safeScore,
      lastSeenAt: now,
    };

    if (wordPower === "raid") {
      for (const [id, item] of Object.entries(updatedPlayers)) {
        if (id !== playerId) {
          updatedPlayers[id] = {
            ...item,
            score: (item.score || 0) - 1,
          };
        }
      }
    }

    if (wordPower === "reverse") {
      nextTurnOrder = [...nextTurnOrder].reverse();
    }

    const currentStillHasDebt = currentDebt > 1;
    if (currentStillHasDebt) {
      pickDebt[playerId] = currentDebt - 1;
    } else {
      delete pickDebt[playerId];
    }

    const nextOpponentId = nextTurnPlayerId(nextTurnOrder, playerId);

    if (wordPower === "doublePick") {
      pickDebt[nextOpponentId] = Math.max(pickDebt[nextOpponentId] || 1, 2);
    }

    const nextTurnId = currentStillHasDebt ? playerId : nextOpponentId;
    const nextTurnName = updatedPlayers[nextTurnId]?.name || "ผู้เล่นคนถัดไป";

    let message = `${player.name} รอดจาก “${word.text}” และได้ +${safeScore}`;
    if (wordPower === "raid") message = `${player.name} ใช้ปล้นแต้มจาก “${word.text}” ได้ +2 และคนอื่น -1`;
    if (wordPower === "doublePick") message = `${player.name} วางกับดักจาก “${word.text}” ทำให้ ${updatedPlayers[nextOpponentId]?.name || "คนถัดไป"} ต้องเลือก 2 คำ`;
    if (wordPower === "reverse") message = `${player.name} กด “${word.text}” แล้วกลับทิศทางเทิร์น`;
    if (wordPower === "hint") message = `${player.name} ได้คำใบ้ส่วนตัวจาก “${word.text}”`;
    if (wordPower === "scanner") message = `${player.name} สแกนเจอคำปลอดภัยบางคำแบบส่วนตัว`;

    const event: GameEvent = {
      id: `${now}-${playerId}-${wordPower}`,
      at: now,
      type: wordPower === "normal" ? "safe" : "power",
      emoji: powerInfo.emoji,
      title: wordPower === "normal" ? "ผ่านไปได้" : powerInfo.label,
      message,
      playerId,
      playerName: player.name,
      wordText: word.text,
    };

    if (wordPower === "hint") {
      const dangerWord = game.words[dangerWordId];
      const clue = getDangerClue(game.mode, dangerWord?.text || "");
      responsePayload = {
        ...responsePayload,
        hintText: `คำอันตรายอยู่ในหมวด “${clue.category}” — ${clue.detail}`,
      };
    }

    if (wordPower === "scanner") {
      const safeWordIds = shuffle(
        Object.values(game.words)
          .filter((item) => !item.selectedBy && item.id !== dangerWordId && item.id !== wordId)
          .map((item) => item.id)
      ).slice(0, 3);
      responsePayload = {
        ...responsePayload,
        safeWordIds,
      };
    }

    nextRoom = {
      ...nextRoom,
      status: "playing",
      players: updatedPlayers,
      game: {
        ...nextGameBase,
        turnOrder: nextTurnOrder,
        turnPlayerId: nextTurnId,
        pickDebt,
        events: appendEvent(game, event),
      },
    };

    await publicRef.set(nextRoom);

    return NextResponse.json({
      ...responsePayload,
      event,
      nextTurnPlayerId: nextTurnId,
      nextTurnPlayerName: nextTurnName,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "เลือกคำไม่สำเร็จ" }, { status: 500 });
  }
}
