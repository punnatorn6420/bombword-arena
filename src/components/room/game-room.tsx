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
  Trophy,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getClientDatabase } from "@/lib/firebase-client";
import { GAME_MODES } from "@/lib/game";
import { cn } from "@/lib/utils";
import type { GameMode, GameWord, Player, PublicRoom } from "@/types/game";

const MODE_ORDER: GameMode[] = ["objects", "worldcup2026", "places"];

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

  const players = useMemo(() => Object.values(room?.players || {}) as Player[], [room?.players]);
  const sortedPlayers = useMemo(() => [...players].sort((a, b) => b.score - a.score), [players]);
  const currentPlayer = playerId && room?.players?.[playerId] ? room.players[playerId] : null;
  const isHost = currentPlayer?.id === room?.hostId;
  const game = room?.game;
  const words = useMemo(() => Object.values(game?.words || {}) as GameWord[], [game?.words]);
  const selectedWords = words.filter((word) => word.selectedBy).length;
  const turnPlayer = game?.turnPlayerId ? room?.players?.[game.turnPlayerId] : null;
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/room/${roomId}` : "";

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
    await callRoomApi("pick", { playerId, wordId }, `pick-${wordId}`);
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
        <Card className="w-full max-w-md bg-white/80">
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
        <Card className="w-full max-w-md bg-white/85 text-center">
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
        <Card className="w-full bg-white/85 shadow-xl">
          <CardHeader>
            <Badge className="w-fit" variant="secondary">
              ห้อง {roomId}
            </Badge>
            <CardTitle className="text-3xl">เข้าร่วมห้อง</CardTitle>
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
              <Button className="w-full" size="lg" disabled={!joinName.trim() || busyAction === "join"}>
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
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-6 md:px-8">
      <div className="mb-6 flex flex-col gap-4 rounded-3xl border bg-white/75 p-4 shadow-sm backdrop-blur md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Bomb className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight">Bombword Arena</h1>
              <Badge variant="outline">ห้อง {roomId}</Badge>
              <Badge variant={room?.status === "playing" ? "default" : room?.status === "ended" ? "destructive" : "secondary"}>
                {room?.status === "playing" ? "กำลังเล่น" : room?.status === "ended" ? "จบรอบ" : "รอเริ่ม"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">คุณคือ {playerName || currentPlayer.name}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={copyShareUrl}>
            {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "คัดลอกแล้ว" : "คัดลอกลิงก์"}
          </Button>
          <Button variant="secondary" onClick={() => navigator.share?.({ title: "Bombword Arena", url: shareUrl })}>
            <Share2 className="h-4 w-4" /> แชร์
          </Button>
        </div>
      </div>

      {error ? <p className="mb-5 rounded-2xl bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">{error}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="space-y-6">
          {room?.status === "lobby" ? (
            <LobbyPanel isHost={isHost} players={players} busyAction={busyAction} onStart={startGame} />
          ) : null}

          {game ? (
            <Card className="bg-white/80">
              <CardHeader className="gap-3 md:flex-row md:items-start md:justify-between md:space-y-0">
                <div>
                  <div className="mb-2 flex flex-wrap gap-2">
                    <Badge variant="secondary">รอบที่ {game.round}</Badge>
                    <Badge variant="outline">{GAME_MODES[game.mode].label}</Badge>
                    <Badge variant="outline">เลือกแล้ว {selectedWords}/40</Badge>
                  </div>
                  <CardTitle className="text-3xl">
                    {game.status === "playing" ? `ตาของ ${turnPlayer?.name || "ผู้เล่น"}` : "รอบนี้จบแล้ว"}
                  </CardTitle>
                  <CardDescription>
                    {game.status === "playing"
                      ? game.turnPlayerId === playerId
                        ? "ถึงตาคุณแล้ว เลือก 1 คำให้รอด"
                        : "รอผู้เล่นเจ้าของเทิร์นเลือกคำ"
                      : game.resultMessage}
                  </CardDescription>
                </div>
                {game.status === "ended" && isHost ? (
                  <Button onClick={resetRound} disabled={busyAction === "reset"}>
                    {busyAction === "reset" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                    เริ่มตาใหม่
                  </Button>
                ) : null}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                  {words.map((word) => {
                    const isSelected = Boolean(word.selectedBy);
                    const isMyTurn = game.status === "playing" && game.turnPlayerId === playerId;
                    const isPicking = busyAction === `pick-${word.id}`;

                    return (
                      <button
                        key={word.id}
                        disabled={!isMyTurn || isSelected || Boolean(busyAction)}
                        onClick={() => pickWord(word.id)}
                        className={cn(
                          "min-h-24 rounded-2xl border bg-white/75 p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md disabled:hover:translate-y-0 disabled:hover:border-border disabled:hover:shadow-sm",
                          isSelected && "bg-secondary/70 text-muted-foreground",
                          word.dangerHit && "border-red-300 bg-red-50 text-red-700"
                        )}
                      >
                        <div className="flex h-full flex-col justify-between gap-2">
                          <span className="text-base font-black leading-6">{word.text}</span>
                          <span className="text-xs font-semibold text-muted-foreground">
                            {isPicking ? "กำลังเลือก..." : word.dangerHit ? `💥 ${word.selectedByName}` : isSelected ? `เลือกโดย ${word.selectedByName}` : "ยังไม่ถูกเลือก"}
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
          <Card className="bg-white/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Trophy className="h-5 w-5 text-primary" /> Leaderboard
              </CardTitle>
              <CardDescription>คะแนนสะสมในห้องนี้</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {sortedPlayers.map((player, index) => (
                <div key={player.id} className="flex items-center justify-between rounded-2xl border bg-white/70 p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary font-black text-primary">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-bold">
                        {player.name} {player.isHost ? <Crown className="ml-1 inline h-4 w-4 text-amber-500" /> : null}
                      </p>
                      <p className="text-xs text-muted-foreground">{player.id === playerId ? "คุณ" : "ผู้เล่น"}</p>
                    </div>
                  </div>
                  <p className="text-xl font-black">{player.score}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-white/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Users className="h-5 w-5 text-primary" /> ผู้เล่น
              </CardTitle>
              <CardDescription>{players.length} คนในห้อง</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {players.map((player) => (
                <Badge key={player.id} variant={player.id === game?.turnPlayerId ? "default" : "secondary"}>
                  {player.name}{player.id === room?.hostId ? " 👑" : ""}
                </Badge>
              ))}
            </CardContent>
          </Card>
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
    <Card className="bg-white/80">
      <CardHeader>
        <CardTitle className="text-3xl">เลือกโหมดเพื่อเริ่มเกม</CardTitle>
        <CardDescription>
          {isHost ? "คุณเป็นคนสร้างห้อง เลือกโหมดแล้วเริ่มเกมได้เลย" : "รอคนสร้างห้องเลือกโหมดและเริ่มเกม"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-3">
          {MODE_ORDER.map((mode) => (
            <button
              key={mode}
              disabled={!isHost || players.length < 2 || Boolean(busyAction)}
              onClick={() => onStart(mode)}
              className="rounded-3xl border bg-white/70 p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:border-border disabled:hover:shadow-sm"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                {busyAction === `start-${mode}` ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
              </div>
              <p className="text-xl font-black">{GAME_MODES[mode].label}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{GAME_MODES[mode].description}</p>
            </button>
          ))}
        </div>
        {players.length < 2 ? <p className="mt-4 text-sm font-medium text-muted-foreground">ต้องมีผู้เล่นอย่างน้อย 2 คนก่อนเริ่มเกม</p> : null}
      </CardContent>
    </Card>
  );
}
