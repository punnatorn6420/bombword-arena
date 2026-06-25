import { NextResponse } from "next/server";
import { getAdminDatabase } from "@/lib/firebase-admin";
import { getInventoryCount, isShopItemType, SHOP_ITEMS, updateInventory } from "@/lib/game";
import type { GameEvent, PublicGame, PublicRoom } from "@/types/game";

export const runtime = "nodejs";

function appendEvent(game: PublicGame | undefined, event: GameEvent) {
  return [event, ...(game?.events || [])].slice(0, 10);
}

export async function POST(request: Request, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await params;
    const body = await request.json();
    const playerId = String(body.playerId || "");
    const itemType = body.itemType;

    if (!playerId || !isShopItemType(itemType)) {
      return NextResponse.json({ message: "ข้อมูลไอเทมไม่ถูกต้อง" }, { status: 400 });
    }

    const db = getAdminDatabase();
    const publicRef = db.ref(`rooms/${roomId}/public`);
    const snapshot = await publicRef.get();

    if (!snapshot.exists()) {
      return NextResponse.json({ message: "ไม่พบห้องนี้" }, { status: 404 });
    }

    const room = snapshot.val() as PublicRoom;
    const player = room.players?.[playerId];

    if (!player) {
      return NextResponse.json({ message: "ไม่พบผู้เล่นในห้องนี้" }, { status: 409 });
    }

    const item = SHOP_ITEMS[itemType];
    if ((player.score || 0) < item.cost) {
      return NextResponse.json({ message: `คะแนนไม่พอ ต้องใช้ ${item.cost} แต้ม` }, { status: 409 });
    }

    const now = Date.now();
    const updatedPlayer = updateInventory(
      {
        ...player,
        score: (player.score || 0) - item.cost,
        lastSeenAt: now,
      },
      itemType,
      1
    );

    const event: GameEvent = {
      id: `${now}-${playerId}-shop-${itemType}`,
      at: now,
      type: "shop",
      emoji: item.emoji,
      title: `${player.name} ซื้อ ${item.label}`,
      message: `${player.name} ใช้ ${item.cost} แต้มซื้อ ${item.label} ตอนนี้มี ${getInventoryCount(updatedPlayer, itemType)} ชิ้น`,
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
      game: room.game
        ? {
            ...room.game,
            events: appendEvent(room.game, event),
          }
        : room.game,
    };

    await publicRef.set(JSON.parse(JSON.stringify(nextRoom)));
    return NextResponse.json({ ok: true, itemType, itemCount: getInventoryCount(updatedPlayer, itemType), scoreDelta: -item.cost, event });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "ซื้อไอเทมไม่สำเร็จ" }, { status: 500 });
  }
}
