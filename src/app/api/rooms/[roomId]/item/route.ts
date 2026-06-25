import { NextResponse } from "next/server";
import { getAdminDatabase } from "@/lib/firebase-admin";
import { getInventoryCount, isShopItemType, nextTurnPlayerId, SHOP_ITEMS, updateInventory } from "@/lib/game";
import type { GameEvent, PublicGame, PublicRoom, ShopItemType } from "@/types/game";

export const runtime = "nodejs";

function appendEvent(game: PublicGame, event: GameEvent) {
  return [event, ...(game.events || [])].slice(0, 10);
}

export async function POST(request: Request, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await params;
    const body = await request.json();
    const playerId = String(body.playerId || "");
    const itemType: ShopItemType | undefined = isShopItemType(body.itemType) ? body.itemType : undefined;
    const wordId = String(body.wordId || "");

    if (!playerId || !itemType) {
      return NextResponse.json({ message: "ข้อมูลไอเทมไม่ถูกต้อง" }, { status: 400 });
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

    if (!game || room.status !== "playing" || game.status !== "playing") {
      return NextResponse.json({ message: "เกมไม่ได้อยู่ในสถานะกำลังเล่น" }, { status: 409 });
    }

    if (!player) {
      return NextResponse.json({ message: "ไม่พบผู้เล่นในห้องนี้" }, { status: 409 });
    }

    if (getInventoryCount(player, itemType) <= 0) {
      return NextResponse.json({ message: `คุณไม่มี ${SHOP_ITEMS[itemType].label}` }, { status: 409 });
    }

    const now = Date.now();

    if (itemType === "peek") {
      if (!wordId || !game.words[wordId] || game.words[wordId].selectedBy) {
        return NextResponse.json({ message: "เลือกคำที่ต้องการ Peek ให้ถูกต้อง" }, { status: 400 });
      }

      const dangerWordId = (await db.ref(`rooms/${roomId}/private/dangerWordId`).get()).val();
      const updatedPlayer = updateInventory({ ...player, lastSeenAt: now }, "peek", -1);
      const peekIsDanger = wordId === dangerWordId;
      const event: GameEvent = {
        id: `${now}-${playerId}-peek`,
        at: now,
        type: "item",
        emoji: "👁️",
        title: `${player.name} ใช้ Peek`,
        message: `${player.name} แอบเช็คคำหนึ่งแบบส่วนตัว`,
        playerId,
        playerName: player.name,
        wordText: "",
      };

      const nextRoom: PublicRoom = {
        ...room,
        updatedAt: now,
        players: {
          ...room.players,
          [playerId]: updatedPlayer,
        },
        game: {
          ...game,
          events: appendEvent(game, event),
        },
      };

      await publicRef.set(JSON.parse(JSON.stringify(nextRoom)));
      return NextResponse.json({ ok: true, itemType, wordId, peekIsDanger, event });
    }

    if (itemType === "freeze") {
      if (game.turnPlayerId !== playerId) {
        return NextResponse.json({ message: "Freeze ใช้ได้เฉพาะตอนถึงตาคุณ" }, { status: 409 });
      }

      if (game.pendingFreezeBy === playerId) {
        return NextResponse.json({ message: "คุณเปิด Freeze ไว้อยู่แล้ว เลือกคำก่อน" }, { status: 409 });
      }

      const skippedPlayerId = nextTurnPlayerId(game.turnOrder, playerId, 1);
      const updatedPlayer = updateInventory({ ...player, lastSeenAt: now }, "freeze", -1);
      const event: GameEvent = {
        id: `${now}-${playerId}-freeze`,
        at: now,
        type: "item",
        emoji: "🧊",
        title: `${player.name} เปิด Freeze`,
        message: `${player.name} เปิด Freeze ถ้าเลือกรอด ${room.players[skippedPlayerId]?.name || "คนถัดไป"} จะถูกข้าม 1 ตา`,
        playerId,
        playerName: player.name,
        wordText: "",
      };

      const nextRoom: PublicRoom = {
        ...room,
        updatedAt: now,
        players: {
          ...room.players,
          [playerId]: updatedPlayer,
        },
        game: {
          ...game,
          pendingFreezeBy: playerId,
          events: appendEvent(game, event),
        },
      };

      await publicRef.set(JSON.parse(JSON.stringify(nextRoom)));
      return NextResponse.json({ ok: true, itemType, event });
    }

    return NextResponse.json({ message: "Shield ไม่ต้องกดใช้ ระบบจะกันระเบิดให้อัตโนมัติ" }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "ใช้ไอเทมไม่สำเร็จ" }, { status: 500 });
  }
}
