# Bombword Arena

Realtime party game built with **Next.js**, **Tailwind CSS**, shadcn-style UI components, and **Firebase Realtime Database**.

## Game Concept

สร้างห้อง ชวนเพื่อน เลือกโหมด แล้วผลัดกันเลือกคำจาก 40 คำ โดยมีคำอันตรายซ่อนอยู่ 1 คำ ถ้าใครเลือกโดน เกมจบทันทีและคนนั้นแพ้รอบนั้น

เวอร์ชันนี้เพิ่มระบบ **Power Words** ทำให้เกมไม่ใช่แค่สุ่มคลิกแล้วรอด/ไม่รอด แต่ผู้เล่นต้องเลือกว่าจะเสี่ยงกับคำที่ให้ผลตอบแทนสูงแค่ไหน

## Power Words

| Power       | ผลเมื่อปลอดภัย                                 | ถ้าเป็นคำอันตราย   |
| ----------- | ---------------------------------------------- | ------------------ |
| ✨ คำธรรมดา | +1                                             | -3                 |
| 💎 Jackpot  | +5                                             | -5                 |
| ⚔️ Raid     | คุณ +2, คนอื่น -1                              | ลบเท่าจำนวนผู้เล่น |
| 🕵️ Hint     | +1 และได้คำใบ้ส่วนตัวเกี่ยวกับหมวดของคำอันตราย | -2                 |
| 📡 Scanner  | +1 และสแกนเจอคำปลอดภัย 3 คำแบบส่วนตัว          | -3                 |
| 🔥 x2 Trap  | +1 และคนถัดไปต้องเลือก 2 คำ                    | -4                 |
| 🔄 Reverse  | +2 และกลับทิศทางเทิร์น                         | -3                 |

## Modes

- สิ่งของ
- ทีมบอลโลก 2026
- สถานที่

โหมดสิ่งของและสถานที่จะใช้ word bank ภายในโปรเจ็ค แล้วสุ่มมา 40 คำต่อรอบ ส่วนคำใบ้ของคำอันตรายใช้ระบบ category rules ใน `src/lib/game.ts`

## Setup

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

## Environment Variables

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_DATABASE_URL=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

FIREBASE_SERVICE_ACCOUNT_BASE64=
FIREBASE_ADMIN_DATABASE_URL=
```

## Firebase Realtime Database Rules

ใช้ rules ใน `database.rules.json`

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        "public": {
          ".read": true,
          ".write": false
        },
        "private": {
          ".read": false,
          ".write": false
        }
      }
    }
  }
}
```

Client อ่านข้อมูลห้องจาก `public` เพื่อ realtime sync แต่การเขียนทั้งหมดผ่าน Next.js API routes + Firebase Admin SDK เท่านั้น

## Deploy

1. Push ขึ้น GitHub
2. Import repo ใน Vercel
3. ใส่ Environment Variables ให้ครบใน Vercel
4. Deploy
