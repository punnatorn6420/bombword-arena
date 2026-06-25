import type { GameMode, GameWord, Player, PublicGame } from "@/types/game";
import { WORD_BANKS } from "@/data/word-banks";

export const GAME_MODES: Record<GameMode, { label: string; description: string }> = {
  objects: {
    label: "สิ่งของ",
    description: "คำของใช้รอบตัว 200 คำ สุ่มมา 40 คำต่อรอบ",
  },
  worldcup2026: {
    label: "ทีมบอลโลก 2026",
    description: "ทีมที่ลงเล่นบอลโลก 2026 ทั้ง 48 ทีม สุ่มมา 40 ทีม",
  },
  places: {
    label: "สถานที่",
    description: "เมือง ประเทศ แลนด์มาร์ก และสถานที่ทั่วไป 200 คำ",
  },
};

const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeRoomCode(size = 6) {
  return Array.from({ length: size }, () => ROOM_ALPHABET[Math.floor(Math.random() * ROOM_ALPHABET.length)]).join("");
}

export function isGameMode(value: unknown): value is GameMode {
  return value === "objects" || value === "worldcup2026" || value === "places";
}

export function shuffle<T>(input: T[]) {
  const array = [...input];
  for (let index = array.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [array[index], array[swapIndex]] = [array[swapIndex], array[index]];
  }
  return array;
}

export function sampleWords(mode: GameMode, count = 40) {
  const bank = WORD_BANKS[mode];
  if (bank.length < count) {
    throw new Error(`Word bank for ${mode} has only ${bank.length} words.`);
  }
  return shuffle(bank).slice(0, count);
}

export function createRound(mode: GameMode, players: Record<string, Player>, round: number) {
  const playerIds = Object.keys(players);
  if (playerIds.length < 2) {
    throw new Error("ต้องมีผู้เล่นอย่างน้อย 2 คนก่อนเริ่มเกม");
  }

  const words: Record<string, GameWord> = Object.fromEntries(
    sampleWords(mode).map((text, index) => {
      const id = `w${String(index + 1).padStart(2, "0")}`;
      return [id, { id, text } satisfies GameWord];
    })
  );

  const wordIds = Object.keys(words);
  const dangerWordId = wordIds[Math.floor(Math.random() * wordIds.length)];
  const turnOrder = shuffle(playerIds);
  const starterPlayerId = turnOrder[0];
  const now = Date.now();

  const game: PublicGame = {
    status: "playing",
    mode,
    round,
    words,
    turnOrder,
    starterPlayerId,
    turnPlayerId: starterPlayerId,
    selectedCount: 0,
    startedAt: now,
  };

  return { game, dangerWordId };
}

export function nextTurnPlayerId(turnOrder: string[], currentPlayerId: string) {
  if (turnOrder.length === 0) return currentPlayerId;
  const currentIndex = Math.max(0, turnOrder.indexOf(currentPlayerId));
  return turnOrder[(currentIndex + 1) % turnOrder.length];
}
