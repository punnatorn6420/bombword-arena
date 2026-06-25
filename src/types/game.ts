export type GameMode = "objects" | "worldcup2026" | "places";
export type RoomStatus = "lobby" | "playing" | "ended";

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
  selectedBy?: string;
  selectedByName?: string;
  selectedAt?: number;
  dangerHit?: boolean;
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
