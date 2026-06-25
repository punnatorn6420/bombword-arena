import { Bomb, Crown, MousePointerClick, RotateCcw, ShieldCheck, Sparkles, Trophy, Users } from "lucide-react";
import { CreateRoomForm } from "@/components/home/create-room-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const steps = [
  { icon: Users, title: "สร้างห้อง", text: "ส่งลิงก์ให้เพื่อนเข้ามาเล่นพร้อมกันแบบ realtime" },
  { icon: Crown, title: "เลือกโหมด", text: "สิ่งของ / ทีมบอลโลก 2026 / สถานที่ พร้อมคำพิเศษทุกโหมด" },
  { icon: MousePointerClick, title: "เลือกคำทีละคน", text: "คำบางใบให้ +5 สแกนคำปลอดภัย ขโมยแต้ม หรือบังคับคนถัดไป" },
  { icon: Bomb, title: "ระเบิดซ่อนอยู่", text: "ทุกใบมีโอกาสเป็นคำอันตราย คุ้มแค่ไหนก็ต้องเสี่ยง" },
];

const powers = [
  { emoji: "💎", title: "+5 Jackpot", text: "แต้มเยอะ แต่ถ้าเป็นระเบิดโดนหนัก" },
  { emoji: "⚔️", title: "Raid", text: "คุณได้แต้ม คนอื่นเสียแต้ม" },
  { emoji: "🕵️", title: "Hint", text: "ได้คำใบ้หมวดของคำอันตรายแบบส่วนตัว" },
  { emoji: "📡", title: "Scanner", text: "รู้คำปลอดภัยแน่นอน 3 คำ" },
  { emoji: "🔥", title: "x2 Trap", text: "คนต่อไปต้องเลือก 2 คำติดกัน" },
  { emoji: "🔄", title: "Reverse", text: "กลับทิศทางเทิร์นทันที" },
];

export default function Home() {
  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col overflow-hidden px-5 py-8 md:px-8">
      <div className="pointer-events-none absolute -left-28 top-24 h-80 w-80 rounded-full bg-fuchsia-400/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-16 h-96 w-96 rounded-full bg-cyan-400/25 blur-3xl" />

      <nav className="game-panel relative z-10 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="bomb-logo flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-600 via-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/30">
            <Bomb className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xl font-black tracking-tight">Bombword Arena</p>
            <p className="text-xs font-semibold text-slate-500">Realtime risk party game</p>
          </div>
        </div>
        <div className="hidden items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm font-black text-sky-700 md:flex">
          <ShieldCheck className="h-4 w-4" /> Firebase Realtime
        </div>
      </nav>

      <section className="relative z-10 grid flex-1 items-center gap-8 py-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-7">
          <div className="inline-flex rounded-full bg-gradient-to-r from-yellow-300 to-orange-400 px-5 py-2 text-sm font-black text-yellow-950 shadow-lg shadow-orange-300/35">
            🎲 เลือกคำให้รอด แต่เลือกให้คุ้มด้วย
          </div>
          <div className="space-y-5">
            <h1 className="max-w-3xl text-5xl font-black tracking-tight md:text-7xl">
              ไม่ใช่แค่ดวงแล้ว ระเบิดซ่อนอยู่ในคำที่น่ากดที่สุด
            </h1>
            <p className="max-w-2xl text-lg font-medium leading-8 text-slate-600">
              สร้างห้อง ชวนเพื่อน แล้วผลัดกันเลือกคำจาก 40 คำ แต่รอบนี้มีคำพิเศษให้ล่อใจ เช่น +5 คะแนน ขโมยแต้ม คำใบ้ส่วนตัว สแกนคำปลอดภัย และกับดักให้คนถัดไปเลือก 2 คำ
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {steps.map((step) => (
              <Card key={step.title} className="game-panel">
                <CardContent className="flex gap-3 p-4">
                  <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-sky-500 text-white shadow-md">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-black">{step.title}</p>
                    <p className="text-sm font-medium leading-6 text-slate-600">{step.text}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <Card className="game-panel border-white/80 shadow-2xl">
            <CardHeader>
              <div className="mb-2 flex w-fit items-center gap-2 rounded-full bg-fuchsia-100 px-4 py-2 text-sm font-black text-fuchsia-700">
                <Sparkles className="h-4 w-4" /> New rules
              </div>
              <CardTitle className="text-4xl">เริ่มห้องใหม่</CardTitle>
              <CardDescription>ใส่ชื่อคุณก่อนสร้างห้อง แล้วค่อยส่งลิงก์ให้เพื่อนเข้ามา</CardDescription>
            </CardHeader>
            <CardContent>
              <CreateRoomForm />
              <div className="mt-6 flex items-center gap-3 rounded-2xl bg-white/70 p-4 text-sm font-bold text-slate-600">
                <RotateCcw className="h-5 w-5 text-primary" /> คะแนนจะเก็บต่อเรื่อย ๆ ตราบใดที่เล่นอยู่ในห้องเดิม
              </div>
            </CardContent>
          </Card>

          <Card className="game-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Trophy className="h-5 w-5 text-yellow-500" /> คำพิเศษในเกม
              </CardTitle>
              <CardDescription>คำพิเศษคือของล่อใจ เพราะมันอาจเป็นระเบิดได้เหมือนกัน</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {powers.map((power) => (
                <div key={power.title} className="rounded-2xl bg-white/70 p-3 shadow-sm">
                  <p className="font-black"><span className="mr-2 text-xl">{power.emoji}</span>{power.title}</p>
                  <p className="mt-1 text-xs font-medium leading-5 text-slate-600">{power.text}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
