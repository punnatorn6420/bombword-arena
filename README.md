# Bombword Arena

Realtime party game built with Next.js, Tailwind CSS, shadcn-style UI components, and Firebase Realtime Database.

## Game concept

ผู้เล่นเข้าห้องเดียวกัน แล้วเลือกโหมดเกม จากนั้นระบบจะสุ่มคำขึ้นมา 40 คำ พร้อมซ่อนคำอันตรายไว้ 1 คำ

- เลือกคำปลอดภัย: ได้ +1 คะแนน แล้วส่งเทิร์นให้คนถัดไป
- เลือกคำอันตราย: เกมจบรอบทันที คนเลือกได้ -3 คะแนน คนอื่นได้ +2 คะแนน
- กดเริ่มตาใหม่ได้ โดยคะแนน leaderboard ของห้องเดิมยังอยู่

## Tech stack

- Next.js App Router + TypeScript
- Tailwind CSS
- shadcn/ui style components copied into `src/components/ui`
- Firebase Realtime Database for realtime room state
- Firebase Admin SDK in Next.js Route Handlers for secure writes and hidden danger word
- Deploy-ready for GitHub + Vercel

## Word banks

`src/data/word-banks.ts`

- `objects`: 200 คำ สุ่มมา 40 คำ
- `worldcup2026`: 48 ทีม สุ่มมา 40 ทีม
- `places`: 200 คำ สุ่มมา 40 คำ

แนวทางนี้เหมาะกว่าเรียก AI หรือ external API ทุกครั้ง เพราะเกมต้องเร็ว คุมคำได้ และไม่มีค่าใช้จ่ายเพิ่ม ถ้าอยากเพิ่มความสดใหม่ค่อยทำหน้า Admin เพิ่ม/แก้ word bank ภายหลังได้

## 1) Install

```bash
pnpm install
pnpm dev
```

เปิดเว็บที่ `http://localhost:3000`

## 2) Create Firebase project

1. ไปที่ Firebase Console
2. Create project
3. Add app: Web app
4. Copy Firebase config มาใส่ `.env.local`
5. Build > Realtime Database > Create Database
6. เลือก region ที่ใกล้ไทย เช่น Asia Southeast ถ้ามีให้เลือก
7. ตั้ง Rules ตามไฟล์ `database.rules.json`

## 3) Environment variables

สร้างไฟล์ `.env.local` จาก `.env.example`

```bash
cp .env.example .env.local
```

ค่าฝั่ง client:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.asia-southeast1.firebasedatabase.app
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

ค่าฝั่ง server:

```env
FIREBASE_SERVICE_ACCOUNT_BASE64=base64_encoded_service_account_json
FIREBASE_ADMIN_DATABASE_URL=https://your_project-default-rtdb.asia-southeast1.firebasedatabase.app
```

### Generate `FIREBASE_SERVICE_ACCOUNT_BASE64`

Firebase Console > Project settings > Service accounts > Generate new private key

macOS/Linux:

```bash
base64 -i service-account.json
```

Windows PowerShell:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("service-account.json"))
```

นำ string ยาว ๆ ที่ได้ไปใส่ใน `.env.local` และใน Vercel Environment Variables

## 4) Firebase Realtime Database Rules

ใช้ rules นี้เพื่อให้ client อ่านได้เฉพาะ public room state และเขียนเองไม่ได้ ทุกการเขียนผ่าน Next.js API + Firebase Admin SDK เท่านั้น

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

ถ้าใช้ Firebase CLI:

```bash
firebase deploy --only database
```

หรือ copy rules ไปวางใน Firebase Console ก็ได้

## 5) Deploy to GitHub + Vercel

```bash
git init
git add .
git commit -m "init bombword arena"
git branch -M main
git remote add origin https://github.com/<your-username>/bombword-arena.git
git push -u origin main
```

จากนั้นไปที่ Vercel:

1. Add New Project
2. Import GitHub repo
3. Framework: Next.js
4. Add Environment Variables ทั้งหมดจาก `.env.local`
5. Deploy

## Notes

ตอนนี้ยังไม่มีระบบ Login จริง ใช้ `localStorage` เก็บ player id/name เพื่อให้เริ่มเล่นง่ายก่อน ถ้าจะจริงจังขึ้น แนะนำเพิ่ม Firebase Auth แบบ anonymous auth แล้วใช้ uid เป็น player id

คำอันตรายถูกเก็บไว้ใน `rooms/{roomId}/private/dangerWordId` ซึ่ง client อ่านไม่ได้ตาม rules แต่ Firebase Admin SDK ใน API routes อ่าน/เขียนได้
