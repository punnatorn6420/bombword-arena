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
import { GAME_MODES, POWER_INFO, SHOP_ITEMS, WAGER_INFO } from "@/lib/game";
import { cn } from "@/lib/utils";
import type { BluffMarker, GameMode, GameWord, PickRisk, Player, PublicRoom, ShopItemType, WordPower } from "@/types/game";

const MODE_ORDER: GameMode[] = ["objects", "worldcup2026", "places"];
const PICK_RISK_ORDER: PickRisk[] = ["safe", "risk", "allIn"];
const SHOP_ITEM_ORDER: ShopItemType[] = ["shield", "peek", "freeze"];

const MARKER_INFO: Record<BluffMarker, { label: string; emoji: string; className: string }> = {
  suspect: { label: "น่าสงสัย", emoji: "🚩", className: "bg-red-100 text-red-700" },
  safe: { label: "น่าปลอดภัย", emoji: "🟢", className: "bg-emerald-100 text-emerald-700" },
  bait: { label: "ล่อเพื่อน", emoji: "🎭", className: "bg-violet-100 text-violet-700" },
};

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

type PeekResult = "safe" | "danger";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function markerSummary(markers: Record<string, BluffMarker> | undefined) {
  const values = Object.values(markers || {}) as BluffMarker[];
  return (Object.keys(MARKER_INFO) as BluffMarker[])
    .map((marker) => ({ marker, count: values.filter((item) => item === marker).length }))
    .filter((item) => item.count > 0);
}

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
  const [peekResults, setPeekResults] = useState<Record<string, PeekResult>>({});
  const [pickRisk, setPickRisk] = useState<PickRisk>("safe");
  const [guessMode, setGuessMode] = useState(false);
  const [animatingWordId, setAnimatingWordId] = useState<string | null>(null);
  const [flippingWordId, setFlippingWordId] = useState<string | null>(null);
  const [scoreBurst, setScoreBurst] = useState<{ wordId: string; delta: number } | null>(null);
  const [boomOverlay, setBoomOverlay] = useState<string | null>(null);

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
    setPeekResults({});
    setGuessMode(false);
    setAnimatingWordId(null);
    setFlippingWordId(null);
    setScoreBurst(null);
    setBoomOverlay(null);
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
  const hasGuessedThisRound = Boolean(game?.guesses?.[playerId]);
  const actionBusy = Boolean(busyAction || animatingWordId);

  async function requestRoomApi(path: string, payload: Record<string, unknown>) {
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
  }

  async function callRoomApi(path: string, payload: Record<string, unknown>, actionName: string) {
    setError("");
    setBusyAction(actionName);

    try {
      return await requestRoomApi(path, payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ทำรายการไม่สำเร็จ");
      return null;
    } finally {
      setBusyAction(null);
    }
  }

  function handlePrivateRewards(data: Record<string, unknown> | null) {
    if (!data) return;

    if (typeof data.hintText === "string") {
      setPersonalHints((items) => [data.hintText as string, ...items].slice(0, 5));
    }

    if (Array.isArray(data.safeWordIds)) {
      setRevealedSafeWordIds((items) => Array.from(new Set([...items, ...(data.safeWordIds as string[])])));
    }
  }

  function playResultEffects(wordId: string, data: Record<string, unknown> | null) {
    if (!data) return;

    setFlippingWordId(wordId);
    setTimeout(() => setFlippingWordId((current) => (current === wordId ? null : current)), 900);

    if (typeof data.scoreDelta === "number") {
      setScoreBurst({ wordId, delta: data.scoreDelta as number });
      setTimeout(() => setScoreBurst((current) => (current?.wordId === wordId ? null : current)), 1100);
    }

    if (data.boom) {
      const event = data.event as { message?: string } | undefined;
      setBoomOverlay(event?.message || "BOOM! ระเบิดแตก");
      setTimeout(() => setBoomOverlay(null), 2300);
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
    if (actionBusy) return;

    if (guessMode) {
      await guessDangerWord(wordId);
      return;
    }

    setError("");
    setBusyAction(`pick-${wordId}`);
    setAnimatingWordId(wordId);

    try {
      await sleep(1000);
      const data = await requestRoomApi("pick", { playerId, wordId, pickRisk });
      handlePrivateRewards(data);
      playResultEffects(wordId, data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เลือกคำไม่สำเร็จ");
    } finally {
      setAnimatingWordId(null);
      setBusyAction(null);
    }
  }

  async function guessDangerWord(wordId: string) {
    if (actionBusy) return;
    setError("");
    setBusyAction(`guess-${wordId}`);
    setAnimatingWordId(wordId);

    try {
      await sleep(850);
      const data = await requestRoomApi("guess", { playerId, wordId });
      playResultEffects(wordId, data);
      setGuessMode(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ทายคำอันตรายไม่สำเร็จ");
    } finally {
      setAnimatingWordId(null);
      setBusyAction(null);
    }
  }

  async function buyItem(itemType: ShopItemType) {
    await callRoomApi("shop", { playerId, itemType }, `buy-${itemType}`);
  }

  async function useFreeze() {
    await callRoomApi("item", { playerId, itemType: "freeze" }, "use-freeze");
  }

  async function usePeek(wordId: string) {
    const data = await callRoomApi("item", { playerId, itemType: "peek", wordId }, `peek-${wordId}`);
    if (typeof data?.peekIsDanger === "boolean") {
      setPeekResults((items) => ({ ...items, [wordId]: data.peekIsDanger ? "danger" : "safe" }));
    }
  }

  async function markWord(wordId: string, marker: BluffMarker | "clear") {
    await callRoomApi("marker", { playerId, wordId, marker }, `marker-${wordId}-${marker}`);
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
      {boomOverlay ? <BoomOverlay message={boomOverlay} /> : null}
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

      <div className="relative z-10 grid gap-6 lg:grid-cols-[1fr_370px]">
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
                      ? guessMode
                        ? hasGuessedThisRound
                          ? "คุณทายไปแล้วในรอบนี้ ปิดโหมดทายแล้วเล่นตามเทิร์นต่อ"
                          : "โหมดทายระเบิดเปิดอยู่: กดคำที่คิดว่าเป็นระเบิด ถ้าถูก +8 และจบรอบ ถ้าผิด -4"
                        : isMyTurn
                          ? myPickDebt > 1
                            ? `โดนบังคับเลือก 2 คำ! คุณยังต้องเลือกอีก ${myPickDebt} คำ`
                            : "ถึงตาคุณแล้ว เลือกแผน Safe / Risk / All-in แล้วกดคำที่คุ้มที่สุด"
                          : "รอเจ้าของเทิร์นเลือกคำ ระหว่างนี้ปัก marker หลอกเพื่อน หรือใช้ Peek ได้"
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
              <CardContent className="space-y-5 p-4 md:p-6">
                {game.status === "playing" ? (
                  <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
                    <PickRiskPanel value={pickRisk} onChange={setPickRisk} disabled={!isMyTurn || actionBusy || guessMode} />
                    <GuessPanel
                      guessMode={guessMode}
                      hasGuessed={hasGuessedThisRound}
                      disabled={actionBusy || game.status !== "playing"}
                      onToggle={() => setGuessMode((value) => !value)}
                    />
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                  {words.map((word) => {
                    const isSelected = Boolean(word.selectedBy);
                    const revealedSafe = revealedSafeWordIds.includes(word.id);
                    const peekResult = peekResults[word.id];
                    const wordPower = word.power || "normal";
                    const power = POWER_INFO[wordPower];
                    const isAnimating = animatingWordId === word.id;
                    const isFlipping = flippingWordId === word.id;
                    const isWorking = busyAction === `pick-${word.id}` || busyAction === `guess-${word.id}`;
                    const markerItems = markerSummary(game.markers?.[word.id]);
                    const disabledMain = guessMode
                      ? isSelected || hasGuessedThisRound || actionBusy || game.status !== "playing"
                      : !isMyTurn || isSelected || actionBusy || game.status !== "playing";

                    return (
                      <div
                        key={word.id}
                        className={cn(
                          "word-card group relative min-h-40 overflow-hidden rounded-3xl border-2 p-3 shadow-md transition-all duration-200 hover:-translate-y-1 hover:rotate-[-0.4deg] hover:shadow-xl",
                          POWER_CARD_CLASS[wordPower],
                          isMyTurn && !isSelected && !guessMode && "ring-2 ring-white/80",
                          guessMode && !isSelected && "ring-4 ring-red-300/80",
                          isSelected && "border-slate-200 bg-slate-100/80 text-slate-500 grayscale-[0.2]",
                          word.dangerHit && "danger-pop border-red-500 bg-gradient-to-br from-red-100 to-orange-100 text-red-800 grayscale-0",
                          word.shieldedBy && "safe-glow border-emerald-400 bg-gradient-to-br from-emerald-50 to-cyan-50 grayscale-0",
                          revealedSafe && !isSelected && "safe-glow border-emerald-400 ring-4 ring-emerald-200",
                          peekResult === "danger" && !isSelected && "ring-4 ring-red-300",
                          peekResult === "safe" && !isSelected && "ring-4 ring-emerald-300",
                          isAnimating && "card-shake",
                          isFlipping && "card-flip"
                        )}
                      >
                        {scoreBurst?.wordId === word.id ? <div className={cn("score-burst", scoreBurst.delta >= 0 ? "text-emerald-700" : "text-red-700")}>{scoreBurst.delta >= 0 ? `+${scoreBurst.delta}` : scoreBurst.delta}</div> : null}
                        <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/35 transition-transform group-hover:scale-125" />
                        <button
                          disabled={disabledMain}
                          onClick={() => pickWord(word.id)}
                          className="relative flex h-full min-h-28 w-full flex-col justify-between gap-3 text-left disabled:cursor-not-allowed"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-2xl">
                              {peekResult === "danger" && !isSelected ? "💣" : peekResult === "safe" && !isSelected ? "🛡️" : revealedSafe && !isSelected ? "🛡️" : power.emoji}
                            </span>
                            <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide", peekResult === "danger" ? "bg-red-600 text-white" : peekResult === "safe" ? "bg-emerald-500 text-white" : POWER_BADGE_CLASS[wordPower])}>
                              {peekResult === "danger" ? "DANGER" : peekResult === "safe" ? "SAFE" : revealedSafe && !isSelected ? "SAFE" : power.shortLabel}
                            </span>
                          </div>

                          <div>
                            <span className="block text-base font-black leading-6 md:text-lg">{word.text}</span>
                            <span className="mt-2 block text-xs font-bold leading-5 text-slate-600">
                              {isWorking || isAnimating
                                ? "ตึง... กำลังเปิดการ์ด"
                                : word.dangerHit
                                  ? `💥 ${word.selectedByName}`
                                  : word.shieldedBy
                                    ? `🛡️ Shield กันไว้โดย ${word.selectedByName}`
                                    : isSelected
                                      ? `เลือกโดย ${word.selectedByName}`
                                      : peekResult === "danger"
                                        ? "Peek ส่วนตัว: คำนี้คือระเบิด"
                                        : peekResult === "safe"
                                          ? "Peek ส่วนตัว: ปลอดภัย"
                                          : revealedSafe
                                            ? "สแกนแล้ว: ปลอดภัยแน่นอน"
                                            : guessMode
                                              ? "กดเพื่อทายว่าเป็นระเบิด"
                                              : power.description}
                            </span>
                          </div>
                        </button>

                        {markerItems.length ? (
                          <div className="relative mt-2 flex flex-wrap gap-1">
                            {markerItems.map(({ marker, count }) => (
                              <span key={marker} className={cn("rounded-full px-2 py-0.5 text-[10px] font-black", MARKER_INFO[marker].className)}>
                                {MARKER_INFO[marker].emoji} {count}
                              </span>
                            ))}
                          </div>
                        ) : null}

                        {game.status === "playing" && !isSelected ? (
                          <div className="relative mt-2 flex flex-wrap gap-1">
                            {(Object.keys(MARKER_INFO) as BluffMarker[]).map((marker) => (
                              <button
                                key={marker}
                                type="button"
                                disabled={actionBusy}
                                onClick={() => markWord(word.id, marker)}
                                className="rounded-full bg-white/80 px-2 py-1 text-xs shadow-sm transition hover:-translate-y-0.5 disabled:opacity-50"
                                title={MARKER_INFO[marker].label}
                              >
                                {MARKER_INFO[marker].emoji}
                              </button>
                            ))}
                            <button
                              type="button"
                              disabled={actionBusy}
                              onClick={() => markWord(word.id, "clear")}
                              className="rounded-full bg-white/80 px-2 py-1 text-xs shadow-sm transition hover:-translate-y-0.5 disabled:opacity-50"
                              title="ลบ marker ของคุณ"
                            >
                              🧽
                            </button>
                            {(currentPlayer.inventory?.peek || 0) > 0 ? (
                              <button
                                type="button"
                                disabled={actionBusy || Boolean(peekResult)}
                                onClick={() => usePeek(word.id)}
                                className="ml-auto rounded-full bg-cyan-500 px-2 py-1 text-xs font-black text-white shadow-sm transition hover:-translate-y-0.5 disabled:opacity-50"
                              >
                                👁️ Peek
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </section>

        <aside className="space-y-6">
          <PersonalIntelPanel hints={personalHints} revealedCount={revealedSafeWordIds.length} peekResults={peekResults} words={words} />
          <LeaderboardPanel players={sortedPlayers} currentPlayerId={playerId} />
          <ShopPanel currentPlayer={currentPlayer} busyAction={busyAction} isMyTurn={isMyTurn} pendingFreezeBy={game?.pendingFreezeBy} onBuy={buyItem} onUseFreeze={useFreeze} />
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
        <CardDescription>{isHost ? "คุณเป็นคนสร้างห้อง เลือกโหมดแล้วเริ่มเกมได้เลย" : "รอคนสร้างห้องเลือกโหมดและเริ่มเกม"}</CardDescription>
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

function PickRiskPanel({ value, onChange, disabled }: { value: PickRisk; onChange: (value: PickRisk) => void; disabled: boolean }) {
  return (
    <div className="rounded-3xl border border-white/70 bg-white/55 p-3">
      <p className="mb-2 text-sm font-black text-slate-700">เลือกแผนก่อนกดคำ</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {PICK_RISK_ORDER.map((risk) => (
          <button
            key={risk}
            type="button"
            disabled={disabled}
            onClick={() => onChange(risk)}
            className={cn(
              "rounded-2xl border-2 p-3 text-left transition-all hover:-translate-y-0.5 disabled:opacity-60",
              value === risk ? "border-fuchsia-400 bg-gradient-to-br from-fuchsia-100 to-cyan-100 shadow-lg" : "border-white/70 bg-white/70"
            )}
          >
            <p className="text-sm font-black">{WAGER_INFO[risk].emoji} {WAGER_INFO[risk].label}</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">{WAGER_INFO[risk].description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function GuessPanel({ guessMode, hasGuessed, disabled, onToggle }: { guessMode: boolean; hasGuessed: boolean; disabled: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-3xl border border-red-200 bg-gradient-to-br from-red-50 to-orange-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-black text-red-800">🎯 ทายคำระเบิด</p>
          <p className="mt-1 text-xs leading-5 text-red-700">ทายถูก +8 จบรอบทันที / ทายผิด -4 ใช้ได้รอบละ 1 ครั้ง</p>
        </div>
        <Button type="button" variant={guessMode ? "destructive" : "secondary"} disabled={disabled || hasGuessed} onClick={onToggle} className="shrink-0">
          {hasGuessed ? "ทายแล้ว" : guessMode ? "ปิด" : "เปิด"}
        </Button>
      </div>
    </div>
  );
}

function PersonalIntelPanel({ hints, revealedCount, peekResults, words }: { hints: string[]; revealedCount: number; peekResults: Record<string, PeekResult>; words: GameWord[] }) {
  const peekEntries = Object.entries(peekResults);
  if (!hints.length && !revealedCount && !peekEntries.length) return null;

  return (
    <Card className="game-panel border-violet-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">🧠 Intel ส่วนตัว</CardTitle>
        <CardDescription>ข้อมูลนี้เห็นเฉพาะเครื่องคุณจาก Hint / Scanner / Peek</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {revealedCount ? <div className="rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">🛡️ สแกนพบคำปลอดภัยแล้ว {revealedCount} คำ บนกระดานจะขึ้นป้าย SAFE</div> : null}
        {peekEntries.map(([wordId, result]) => {
          const word = words.find((item) => item.id === wordId);
          return (
            <div key={wordId} className={cn("rounded-2xl p-3 text-sm font-bold leading-6", result === "danger" ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800")}>
              👁️ Peek “{word?.text || wordId}”: {result === "danger" ? "เป็นระเบิด" : "ปลอดภัย"}
            </div>
          );
        })}
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
    <Card className="game-panel score-box">
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
                <p className="mt-1 text-xs font-bold text-slate-500">
                  🛡️ {player.inventory?.shield || 0} · 👁️ {player.inventory?.peek || 0} · 🧊 {player.inventory?.freeze || 0}
                </p>
              </div>
            </div>
            <p className="text-2xl font-black">{player.score}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ShopPanel({
  currentPlayer,
  busyAction,
  isMyTurn,
  pendingFreezeBy,
  onBuy,
  onUseFreeze,
}: {
  currentPlayer: Player;
  busyAction: string | null;
  isMyTurn: boolean;
  pendingFreezeBy?: string;
  onBuy: (itemType: ShopItemType) => void;
  onUseFreeze: () => void;
}) {
  return (
    <Card className="game-panel border-cyan-200">
      <CardHeader>
        <CardTitle className="text-2xl">🛒 Item Shop</CardTitle>
        <CardDescription>ใช้คะแนนซื้อไอเทมเพื่อพลิกเกม คะแนนคุณ: {currentPlayer.score}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {SHOP_ITEM_ORDER.map((itemType) => {
          const item = SHOP_ITEMS[itemType];
          const count = currentPlayer.inventory?.[itemType] || 0;
          return (
            <div key={itemType} className="rounded-3xl border border-white/70 bg-white/70 p-3 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black">{item.emoji} {item.label} <span className="text-xs text-slate-500">x{count}</span></p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{item.description}</p>
                </div>
                <Button size="sm" disabled={Boolean(busyAction) || currentPlayer.score < item.cost} onClick={() => onBuy(itemType)}>
                  {busyAction === `buy-${itemType}` ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  {item.cost} แต้ม
                </Button>
              </div>
              {itemType === "freeze" && count > 0 ? (
                <Button size="sm" variant="secondary" disabled={Boolean(busyAction) || !isMyTurn || pendingFreezeBy === currentPlayer.id} onClick={onUseFreeze} className="mt-3 w-full bg-cyan-100 text-cyan-900">
                  {pendingFreezeBy === currentPlayer.id ? "เปิด Freeze แล้ว" : "ใช้ Freeze ตอนนี้"}
                </Button>
              ) : null}
              {itemType === "peek" && count > 0 ? <p className="mt-2 text-xs font-bold text-cyan-700">กดปุ่ม 👁️ Peek บนการ์ดคำที่อยากเช็ค</p> : null}
              {itemType === "shield" && count > 0 ? <p className="mt-2 text-xs font-bold text-emerald-700">Shield จะทำงานอัตโนมัติเมื่อคุณโดนระเบิด</p> : null}
            </div>
          );
        })}
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
        {game.events.slice(0, 6).map((event) => (
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
        <CardTitle className="text-2xl">คำพิเศษ + Marker</CardTitle>
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
        <div className="rounded-2xl bg-white/70 p-3 text-sm leading-6 text-slate-600">
          <p className="font-black text-slate-800">Marker คือการปั่นเพื่อน</p>
          <p>🚩 น่าสงสัย · 🟢 น่าปลอดภัย · 🎭 ล่อเพื่อน — Marker ไม่ได้บอกความจริง ใช้หลอกกันได้เต็มที่</p>
        </div>
      </CardContent>
    </Card>
  );
}

function BoomOverlay({ message }: { message: string }) {
  return (
    <div className="boom-screen fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="boom-card text-center">
        <div className="text-7xl md:text-9xl">💥</div>
        <h2 className="mt-3 text-5xl font-black text-white md:text-7xl">BOOM!</h2>
        <p className="mt-4 max-w-xl text-lg font-bold leading-8 text-white/90">{message}</p>
      </div>
    </div>
  );
}
