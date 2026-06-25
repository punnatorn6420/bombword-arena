import { Bomb, Crown, MousePointerClick, RotateCcw, ShieldCheck, Users } from "lucide-react";
import { CreateRoomForm } from "@/components/home/create-room-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const steps = [
  { icon: Users, title: "สร้างห้อง", text: "คนสร้างห้องส่งลิงก์ให้เพื่อนเข้ามาเล่นพร้อมกัน" },
  { icon: Crown, title: "เลือกโหมด", text: "เริ่มด้วย สิ่งของ / ทีมบอลโลก 2026 / สถานที่" },
  { icon: MousePointerClick, title: "เลือกคำทีละคน", text: "ระบบสุ่มคนเริ่ม แล้ววนเทิร์นไปเรื่อย ๆ" },
  { icon: Bomb, title: "เจอคำอันตราย", text: "ใครกดโดนคำนั้น เกมจบทันทีและคนนั้นแพ้รอบนั้น" },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-8 md:px-8">
      <nav className="flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Bomb className="h-5 w-5" />
          </div>
          <div>
            <p className="text-lg font-black tracking-tight">Bombword Arena</p>
            <p className="text-xs text-muted-foreground">Realtime party game</p>
          </div>
        </div>
        <div className="hidden items-center gap-2 rounded-full border bg-white/70 px-4 py-2 text-sm font-medium text-muted-foreground md:flex">
          <ShieldCheck className="h-4 w-4 text-primary" /> Firebase Realtime
        </div>
      </nav>

      <section className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-7">
          <div className="inline-flex rounded-full border bg-white/70 px-4 py-2 text-sm font-semibold text-primary shadow-sm backdrop-blur">
            เกมเลือกคำ ห้ามเจอคำอันตราย
          </div>
          <div className="space-y-5">
            <h1 className="max-w-3xl text-5xl font-black tracking-tight md:text-7xl">
              เลือกคำให้รอด ก่อนเพื่อนจะกดโดนระเบิด
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
              สร้างห้อง ชวนเพื่อน เลือกโหมด แล้วผลัดกันเลือกคำจาก 40 คำ โดยระบบซ่อนคำอันตรายไว้ 1 คำ
              เล่นต่อหลายตาได้ คะแนนสะสมอยู่ใน leaderboard ของห้องเดิม
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {steps.map((step) => (
              <Card key={step.title} className="rounded-2xl bg-white/65">
                <CardContent className="flex gap-3 p-4">
                  <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold">{step.title}</p>
                    <p className="text-sm leading-6 text-muted-foreground">{step.text}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Card className="border-white/70 bg-white/80 shadow-xl shadow-blue-100/60">
          <CardHeader>
            <CardTitle className="text-3xl">เริ่มห้องใหม่</CardTitle>
            <CardDescription>ใส่ชื่อคุณก่อนสร้างห้อง แล้วค่อยส่งลิงก์ให้เพื่อนเข้ามา</CardDescription>
          </CardHeader>
          <CardContent>
            <CreateRoomForm />
            <div className="mt-6 flex items-center gap-3 rounded-2xl bg-secondary/70 p-4 text-sm text-muted-foreground">
              <RotateCcw className="h-5 w-5 text-primary" />
              คะแนนจะเก็บต่อเรื่อย ๆ ตราบใดที่เล่นอยู่ในห้องเดิม
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
