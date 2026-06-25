"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { onValue, ref } from "firebase/database";
import {
  Bomb,
  CheckCircle2,
  Copy,
  Crown,
  Loader2,
  LogIn,
  Play,
  RotateCcw,
  Share2,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getClientDatabase } from "@/lib/firebase-client";
import { GAME_MODES, POWER_INFO } from "@/lib/game";
import { cn } from "@/lib/utils";
import type { GameMode, GameWord, Player, PublicRoom, WordPower } from "@/types/game";

const MODE_ORDER: GameMode[] = ["objects", "worldcup2026", "places"];

const POWER_CARD_CLASS: Record<WordPower, string> = {
  normal: "border-slate-200 bg-white/80 hover:border-sky-300 hover:shadow-sky-200/60",
  bonus: "border-yellow-300 bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-100 hover:border-yellow-400 hover:shadow-yellow-300/60",
  raid: "border-rose-300 bg-gradient-to-br from-rose-50 via-pink-50 to-red-100 hover:border-rose-400 hover:shadow-rose-300/60",
  hint: "border-violet-300 bg-gradient-to-br from-violet-50 via-fuchsia-50 to-purple-100 hover:border-violet-400 hover:shadow-violet-300/60",
  scanner: "border-cyan-300 bg-gradient-to-br from-cyan-50 via-sky-50 to-blue-100 hover:border-cyan-400 hover:shadow-cyan-300/60",
  doublePick: "border-orange-300 bg-gradient-to-br from-orange-50 via-red-50 to-amber-100 hover:border-orange-400 hover:shadow-orange-300/60",
  reverse: "border-emerald-300 bg-gradient-to-br from-emerald-50 via-teal-50 to-lime-100 hover:border-emerald-400 hover:shadow-emerald-300/60",
};

const POWER_BADGE_CLASS: Record<WordPower, string> = {
  normal: "bg-slate-100 text-slate-700",
  bonus: "bg-yellow-300 text-yellow-950",
  raid: "bg-rose-500 text-white",
  hint: "bg-violet-500 text-white",
  scanner: "bg-cyan-500 text-white",
  doublePick: "bg-orange-500 text-white",
  reverse: "bg-emerald-500 text-white",
};

export function GameRoom({ roomId }: { roomId: string }) {
  const [room, setRoom] = useState<PublicRoom | null>(null);
  const [isMissing, setIsMissing] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [playerId, setPlayerId] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [joinName, setJoinName] = useState("");
  const [error, setError] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [personalHints, setPersonalHints] = useState<string[]>([]);
  const [revealedSafeWordIds, setRevealedSafeWordIds] = useState<string[]>([]);

  useEffect(() => {
    const storedPlayerId = localStorage.getItem("bombword.playerId") || "";
    const storedPlayerName = localStorage.getItem("bombword.playerName") || "";
    setPlayerId(storedPlayerId);
    setPlayerName(storedPlayerName);
    setJoinName(storedPlayerName);
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    const db = getClientDatabase();
    const unsubscribe = onValue(ref(db, `rooms/${roomId}/public`), (snapshot) => {
      if (!snapshot.exists()) {
        setIsMissing(true);
        setRoom(null);
        return;
      }
      setIsMissing(false);
      setRoom(snapshot.val() as PublicRoom);
    });

    return () => unsubscribe();
  }, [roomId]);

  useEffect(() => {
    setPersonalHints([]);
    setRevealedSafeWordIds([]);
  }, [room?.game?.round]);

  const players = useMemo(() => Object.values(room?.players || {}) as Player[], [room?.players]);
  const sortedPlayers = useMemo(() => [...players].sort((a, b) => b.score - a.score), [players]);
  const currentPlayer = playerId && room?.players?.[playerId] ? room.players[playerId] : null;
  const isHost = currentPlayer?.id === room?.hostId;
  const game = room?.game;
  const words = useMemo(() => Object.values(game?.words || {}) as GameWord[], [game?.words]);
  const selectedWords = words.filter((word) => word.selectedBy).length;
  const turnPlayer = game?.turnPlayerId ? room?.players?.[game.turnPlayerId] : null;
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/room/${roomId}` : "";
  const isMyTurn = game?.status === "playing" && game.turnPlayerId === playerId;
  const myPickDebt = game?.pickDebt?.[playerId] || 1;
  const specialWordsLeft = words.filter((word) => !word.selectedBy && (word.power || "normal") !== "normal").length;

  async function callRoomApi(path: string, payload: Record<string, unknown>, actionName: string) {
    setError("");
    setBusyAction(actionName);

    try {
      const response = await fetch(`/api/rooms/${roomId}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "ทำรายการไม่สำเร็จ");
      }

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "ทำรายการไม่สำเร็จ");
      return null;
    } finally {
      setBusyAction(null);
    }
  }

  async function joinRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const safePlayerId = playerId || crypto.randomUUID();
    const data = await callRoomApi("join", { playerId: safePlayerId, playerName: joinName }, "join");

    if (data?.playerId) {
      localStorage.setItem("bombword.playerId", data.playerId);
      localStorage.setItem("bombword.playerName", joinName.trim());
      setPlayerId(data.playerId);
      setPlayerName(joinName.trim());
    }
  }

  async function startGame(mode: GameMode) {
    await callRoomApi("start", { playerId, mode }, `start-${mode}`);
  }

  async function resetRound() {
    await callRoomApi("reset", { playerId, mode: room?.mode }, "reset");
  }

  async function pickWord(wordId: string) {
    const data = await callRoomApi("pick", { playerId, wordId }, `pick-${wordId}`);

    if (typeof data?.hintText === "string") {
      setPersonalHints((items) => [data.hintText as string, ...items].slice(0, 5));
    }

    if (Array.isArray(data?.safeWordIds)) {
      setRevealedSafeWordIds((items) => Array.from(new Set([...items, ...(data.safeWordIds as string[])])));
    }
  }

  async function copyShareUrl() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!isHydrated || (!room && !isMissing)) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <Card className="game-panel w-full max-w-md">
          <CardContent className="flex items-center gap-3 p-6 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> กำลังโหลดห้อง...
          </CardContent>
        </Card>
      </main>
    );
  }

  if (isMissing) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <Card className="game-panel w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>ไม่พบห้อง {roomId}</CardTitle>
            <CardDescription>ห้องนี้อาจถูกลบ หรือพิมพ์รหัสห้องผิด</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/">กลับไปสร้างห้องใหม่</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!currentPlayer) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg items-center justify-center p-6">
        <Card className="game-panel w-full shadow-2xl">
          <CardHeader>
            <Badge className="w-fit" variant="secondary">
              ห้อง {roomId}
            </Badge>
            <CardTitle className="text-4xl">เข้าร่วมห้อง</CardTitle>
            <CardDescription>ใส่ชื่อของคุณเพื่อเข้าร่วมเกมในห้องนี้</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={joinRoom}>
              <Input
                value={joinName}
                maxLength={30}
                placeholder="ชื่อผู้เล่น"
                onChange={(event) => setJoinName(event.target.value)}
              />
              {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}
              <Button className="w-full bg-gradient-to-r from-fuchsia-600 to-sky-500 text-white shadow-lg shadow-sky-300/40" size="lg" disabled={!joinName.trim() || busyAction === "join"}>
                {busyAction === "join" ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                เข้าห้อง
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="relative mx-auto min-h-screen max-w-7xl overflow-hidden px-4 py-6 md:px-8">
      <div className="pointer-events-none absolute -left-28 top-20 h-72 w-72 rounded-full bg-fuchsia-400/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-64 h-80 w-80 rounded-full bg-cyan-400/25 blur-3xl" />

      <div className="game-panel relative z-10 mb-6 flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="bomb-logo flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-600 via-blue-600 to-cyan-500 text-white shadow-xl shadow-blue-500/30">
            <Bomb className="h-7 w-7" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight md:text-3xl">Bombword Arena</h1>
              <Badge variant="outline" className="bg-white/60">ห้อง {roomId}</Badge>
              <Badge className={cn("border-0", room?.status === "playing" ? "bg-emerald-500 text-white" : room?.status === "ended" ? "bg-red-500 text-white" : "bg-yellow-300 text-yellow-950")}>
                {room?.status === "playing" ? "กำลังเดือด" : room?.status === "ended" ? "ระเบิดแล้ว" : "รอเริ่ม"}
              </Badge>
            </div>
            <p className="text-sm font-medium text-slate-600">คุณคือ {playerName || currentPlayer.name}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={copyShareUrl} className="bg-white/75">
            {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "คัดลอกแล้ว" : "คัดลอกลิงก์"}
          </Button>
          <Button variant="secondary" onClick={() => navigator.share?.({ title: "Bombword Arena", url: shareUrl })} className="bg-sky-100 text-sky-950">
            <Share2 className="h-4 w-4" /> แชร์
          </Button>
        </div>
      </div>

      {error ? <p className="relative z-10 mb-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700 shadow-sm">{error}</p> : null}

      <div className="relative z-10 grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="space-y-6">
          {room?.status === "lobby" ? (
            <LobbyPanel isHost={isHost} players={players} busyAction={busyAction} onStart={startGame} />
          ) : null}

          {game ? (
            <Card className="game-panel overflow-hidden">
              <CardHeader className="relative gap-4 border-b border-white/60 bg-white/45 md:flex-row md:items-start md:justify-between md:space-y-0">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-fuchsia-500 via-yellow-400 to-cyan-400" />
                <div>
                  <div className="mb-3 flex flex-wrap gap-2">
                    <Badge className="bg-indigo-600 text-white">รอบที่ {game.round}</Badge>
                    <Badge className="bg-white/75 text-slate-800" variant="outline">
                      {GAME_MODES[game.mode].emoji} {GAME_MODES[game.mode].label}
                    </Badge>
                    <Badge className="bg-white/75 text-slate-800" variant="outline">เลือกแล้ว {selectedWords}/40</Badge>
                    <Badge className="bg-white/75 text-slate-800" variant="outline">คำพิเศษเหลือ {specialWordsLeft}</Badge>
                  </div>
                  <CardTitle className="text-3xl md:text-4xl">
                    {game.status === "playing" ? `ตาของ ${turnPlayer?.name || "ผู้เล่น"}` : "รอบนี้จบแล้ว"}
                  </CardTitle>
                  <CardDescription className="mt-2 text-base">
                    {game.status === "playing"
                      ? isMyTurn
                        ? myPickDebt > 1
                          ? `โดนบังคับเลือก 2 คำ! คุณยังต้องเลือกอีก ${myPickDebt} คำ`
                          : "ถึงตาคุณแล้ว เลือกคำที่คุ้มที่สุด แต่ระวังทุกคำพิเศษก็อาจเป็นระเบิดได้"
                        : "รอเจ้าของเทิร์นเลือกคำ ระหว่างนี้ดูคำพิเศษแล้วกดดันได้เต็มที่"
                      : game.resultMessage}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  {game.status === "playing" && isMyTurn ? (
                    <div className="turn-badge rounded-2xl bg-gradient-to-r from-yellow-300 to-orange-400 px-4 py-3 text-sm font-black text-yellow-950 shadow-lg shadow-orange-300/50">
                      ⚡ YOUR TURN
                    </div>
                  ) : null}
                  {game.status === "ended" && isHost ? (
                    <Button onClick={resetRound} disabled={busyAction === "reset"} className="bg-gradient-to-r from-fuchsia-600 to-blue-600 text-white shadow-lg shadow-blue-300/40">
                      {busyAction === "reset" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                      เริ่มตาใหม่
                    </Button>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="p-4 md:p-6">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                  {words.map((word) => {
                    const isSelected = Boolean(word.selectedBy);
                    const isPicking = busyAction === `pick-${word.id}`;
                    const revealedSafe = revealedSafeWordIds.includes(word.id);
                    const wordPower = word.power || "normal";
                    const power = POWER_INFO[wordPower];

                    return (
                      <button
                        key={word.id}
                        disabled={!isMyTurn || isSelected || Boolean(busyAction)}
                        onClick={() => pickWord(word.id)}
                        className={cn(
                          "word-card group relative min-h-32 overflow-hidden rounded-3xl border-2 p-3 text-left shadow-md transition-all duration-200 hover:-translate-y-1 hover:rotate-[-0.4deg] hover:shadow-xl active:scale-95 disabled:hover:translate-y-0 disabled:hover:rotate-0 disabled:hover:shadow-md",
                          POWER_CARD_CLASS[wordPower],
                          isMyTurn && !isSelected && "ring-2 ring-white/80",
                          isSelected && "border-slate-200 bg-slate-100/80 text-slate-500 grayscale-[0.2]",
                          word.dangerHit && "danger-pop border-red-500 bg-gradient-to-br from-red-100 to-orange-100 text-red-800 grayscale-0",
                          revealedSafe && !isSelected && "safe-glow border-emerald-400 ring-4 ring-emerald-200"
                        )}
                      >
                        <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/35 transition-transform group-hover:scale-125" />
                        <div className="relative flex h-full flex-col justify-between gap-3">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-2xl">{revealedSafe && !isSelected ? "🛡️" : power.emoji}</span>
                            <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide", POWER_BADGE_CLASS[wordPower])}>
                              {revealedSafe && !isSelected ? "SAFE" : power.shortLabel}
                            </span>
                          </div>
                          <span className="text-base font-black leading-6 md:text-lg">{word.text}</span>
                          <span className="text-xs font-bold leading-5 text-slate-600">
                            {isPicking
                              ? "กำลังเลือก..."
                              : word.dangerHit
                                ? `💥 ${word.selectedByName}`
                                : isSelected
                                  ? `เลือกโดย ${word.selectedByName}`
                                  : revealedSafe
                                    ? "สแกนแล้ว: ปลอดภัยแน่นอน"
                                    : power.description}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </section>

        <aside className="space-y-6">
          <PersonalIntelPanel hints={personalHints} revealedCount={revealedSafeWordIds.length} />
          <LeaderboardPanel players={sortedPlayers} currentPlayerId={playerId} />
          <EventLogPanel game={game} />
          <PlayersPanel players={players} room={room} turnPlayerId={game?.turnPlayerId} />
          <PowerGuidePanel />
        </aside>
      </div>
    </main>
  );
}

function LobbyPanel({
  isHost,
  players,
  busyAction,
  onStart,
}: {
  isHost: boolean;
  players: Player[];
  busyAction: string | null;
  onStart: (mode: GameMode) => void;
}) {
  return (
    <Card className="game-panel overflow-hidden">
      <CardHeader className="border-b border-white/60 bg-white/45">
        <div className="mb-2 inline-flex w-fit items-center gap-2 rounded-full bg-yellow-300 px-4 py-2 text-sm font-black text-yellow-950 shadow-sm">
          <Sparkles className="h-4 w-4" /> New battle rules
        </div>
        <CardTitle className="text-3xl md:text-4xl">เลือกโหมดเพื่อเริ่มเกม</CardTitle>
        <CardDescription>
          {isHost ? "คุณเป็นคนสร้างห้อง เลือกโหมดแล้วเริ่มเกมได้เลย" : "รอคนสร้างห้องเลือกโหมดและเริ่มเกม"}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 md:p-6">
        <div className="grid gap-4 md:grid-cols-3">
          {MODE_ORDER.map((mode) => (
            <button
              key={mode}
              disabled={!isHost || players.length < 2 || Boolean(busyAction)}
              onClick={() => onStart(mode)}
              className="group rounded-3xl border-2 border-white/80 bg-white/70 p-5 text-left shadow-lg shadow-blue-200/40 transition-all hover:-translate-y-1 hover:border-cyan-300 hover:shadow-xl disabled:opacity-60 disabled:hover:translate-y-0"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-cyan-500 text-2xl text-white shadow-lg transition-transform group-hover:rotate-6 group-hover:scale-110">
                {busyAction === `start-${mode}` ? <Loader2 className="h-5 w-5 animate-spin" /> : GAME_MODES[mode].emoji}
              </div>
              <p className="text-xl font-black">{GAME_MODES[mode].label}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{GAME_MODES[mode].description}</p>
            </button>
          ))}
        </div>
        {players.length < 2 ? <p className="mt-4 text-sm font-bold text-slate-500">ต้องมีผู้เล่นอย่างน้อย 2 คนก่อนเริ่มเกม</p> : null}
      </CardContent>
    </Card>
  );
}

function PersonalIntelPanel({ hints, revealedCount }: { hints: string[]; revealedCount: number }) {
  if (!hints.length && !revealedCount) return null;

  return (
    <Card className="game-panel border-violet-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">🧠 Intel ส่วนตัว</CardTitle>
        <CardDescription>ข้อมูลนี้เห็นเฉพาะเครื่องคุณจากผลของคำใบ้/สแกน</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {revealedCount ? <div className="rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">🛡️ สแกนพบคำปลอดภัยแล้ว {revealedCount} คำ บนกระดานจะขึ้นป้าย SAFE</div> : null}
        {hints.map((hint, index) => (
          <div key={`${hint}-${index}`} className="rounded-2xl bg-violet-50 p-3 text-sm font-bold leading-6 text-violet-800">
            🕵️ {hint}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function LeaderboardPanel({ players, currentPlayerId }: { players: Player[]; currentPlayerId: string }) {
  return (
    <Card className="game-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Trophy className="h-5 w-5 text-yellow-500" /> Leaderboard
        </CardTitle>
        <CardDescription>คะแนนสะสมในห้องนี้</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {players.map((player, index) => (
          <div key={player.id} className="flex items-center justify-between rounded-3xl border border-white/70 bg-white/70 p-3 shadow-sm">
            <div className="flex min-w-0 items-center gap-3">
              <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl font-black", index === 0 ? "bg-yellow-300 text-yellow-950" : "bg-sky-100 text-sky-800")}>
                {index + 1}
              </div>
              <div className="min-w-0">
                <p className="truncate font-black">
                  {player.name} {player.isHost ? <Crown className="ml-1 inline h-4 w-4 text-amber-500" /> : null}
                </p>
                <p className="text-xs font-medium text-slate-500">{player.id === currentPlayerId ? "คุณ" : "ผู้เล่น"}</p>
              </div>
            </div>
            <p className="text-2xl font-black">{player.score}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function EventLogPanel({ game }: { game?: PublicRoom["game"] }) {
  if (!game?.events?.length) return null;

  return (
    <Card className="game-panel">
      <CardHeader>
        <CardTitle className="text-2xl">Battle Log</CardTitle>
        <CardDescription>เหตุการณ์ล่าสุดในรอบนี้</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {game.events.slice(0, 5).map((event) => (
          <div key={event.id} className="rounded-2xl bg-white/70 p-3 text-sm shadow-sm">
            <p className="font-black">
              <span className="mr-1">{event.emoji}</span> {event.title}
            </p>
            <p className="mt-1 leading-6 text-slate-600">{event.message}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function PlayersPanel({ players, room, turnPlayerId }: { players: Player[]; room: PublicRoom | null; turnPlayerId?: string }) {
  return (
    <Card className="game-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Users className="h-5 w-5 text-sky-500" /> ผู้เล่น
        </CardTitle>
        <CardDescription>{players.length} คนในห้อง</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {players.map((player) => (
          <Badge key={player.id} className={cn(player.id === turnPlayerId ? "bg-gradient-to-r from-fuchsia-600 to-blue-600 text-white" : "bg-white/80 text-slate-700")}>
            {player.name}{player.id === room?.hostId ? " 👑" : ""}{player.id === turnPlayerId ? " ⚡" : ""}
          </Badge>
        ))}
      </CardContent>
    </Card>
  );
}

function PowerGuidePanel() {
  const order: WordPower[] = ["bonus", "raid", "hint", "scanner", "doublePick", "reverse"];
  return (
    <Card className="game-panel">
      <CardHeader>
        <CardTitle className="text-2xl">คำพิเศษ</CardTitle>
        <CardDescription>เลือกเพื่อพลิกเกม แต่ทุกใบก็อาจเป็นคำอันตราย</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {order.map((power) => (
          <div key={power} className="flex gap-3 rounded-2xl bg-white/70 p-3 text-sm">
            <span className="text-2xl">{POWER_INFO[power].emoji}</span>
            <div>
              <p className="font-black">{POWER_INFO[power].label}</p>
              <p className="leading-5 text-slate-600">{POWER_INFO[power].description}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
