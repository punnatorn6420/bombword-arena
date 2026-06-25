export type GameMode = "objects" | "worldcup2026" | "places";
export type RoomStatus = "lobby" | "playing" | "ended";

export type WordPower = "normal" | "bonus" | "raid" | "hint" | "scanner" | "doublePick" | "reverse";

export interface Player {
  id: string;
  name: string;
  score: number;
  isHost: boolean;
  joinedAt: number;
  lastSeenAt: number;
}

export interface GameWord {
  id: string;
  text: string;
  power: WordPower;
  selectedBy?: string;
  selectedByName?: string;
  selectedAt?: number;
  dangerHit?: boolean;
}

export interface GameEvent {
  id: string;
  at: number;
  type: "safe" | "danger" | "power";
  emoji: string;
  title: string;
  message: string;
  playerId: string;
  playerName: string;
  wordText: string;
}

export interface PublicGame {
  status: RoomStatus;
  mode: GameMode;
  round: number;
  words: Record<string, GameWord>;
  turnOrder: string[];
  starterPlayerId: string;
  turnPlayerId: string;
  selectedCount: number;
  pickDebt?: Record<string, number>;
  events?: GameEvent[];
  startedAt: number;
  endedAt?: number;
  loserId?: string;
  loserName?: string;
  resultMessage?: string;
}

export interface PublicRoom {
  id: string;
  status: RoomStatus;
  mode?: GameMode;
  round: number;
  hostId: string;
  players: Record<string, Player>;
  game?: PublicGame;
  createdAt: number;
  updatedAt: number;
}

export interface DangerClue {
  category: string;
  detail: string;
}
