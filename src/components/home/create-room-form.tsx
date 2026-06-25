"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CreateRoomForm() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function createRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "สร้างห้องไม่สำเร็จ");
      }

      localStorage.setItem("bombword.playerId", data.playerId);
      localStorage.setItem("bombword.playerName", playerName.trim());
      router.push(`/room/${data.roomId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "สร้างห้องไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={createRoom}>
      <div className="space-y-2">
        <label className="text-sm font-semibold" htmlFor="playerName">
          ชื่อผู้เล่น
        </label>
        <Input
          id="playerName"
          placeholder="เช่น ปัน"
          value={playerName}
          maxLength={30}
          onChange={(event) => setPlayerName(event.target.value)}
        />
      </div>
      {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}
      <Button className="w-full" size="lg" disabled={isLoading || !playerName.trim()}>
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        สร้างห้องเล่นเกม
      </Button>
    </form>
  );
}
