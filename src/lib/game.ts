import type { DangerClue, GameMode, GameWord, Player, PublicGame, WordPower } from "@/types/game";
import { WORD_BANKS } from "@/data/word-banks";

export const GAME_MODES: Record<GameMode, { label: string; description: string; emoji: string }> = {
  objects: {
    label: "สิ่งของ",
    description: "ของใช้รอบตัว พร้อมคำพิเศษ +5 / สแกน / โจมตี / ใบ้หมวด",
    emoji: "🎒",
  },
  worldcup2026: {
    label: "ทีมบอลโลก 2026",
    description: "สุ่ม 40 ทีม พร้อมคำใบ้ทวีปของคำอันตราย",
    emoji: "⚽",
  },
  places: {
    label: "สถานที่",
    description: "เมือง แลนด์มาร์ก ธรรมชาติ และสถานที่ทั่วไป พร้อมคำใบ้ประเภทพื้นที่",
    emoji: "🗺️",
  },
};

export const POWER_INFO: Record<
  WordPower,
  { label: string; shortLabel: string; description: string; emoji: string; safeScore: number; dangerPenalty: (playerCount: number) => number }
> = {
  normal: {
    label: "คำธรรมดา",
    shortLabel: "+1",
    description: "ปลอดภัยได้ +1 คะแนน",
    emoji: "✨",
    safeScore: 1,
    dangerPenalty: () => -3,
  },
  bonus: {
    label: "แจ็กพอต",
    shortLabel: "+5",
    description: "ถ้าปลอดภัยได้ +5 แต่ถ้าเป็นระเบิดจะโดน -5",
    emoji: "💎",
    safeScore: 5,
    dangerPenalty: () => -5,
  },
  raid: {
    label: "ปล้นแต้ม",
    shortLabel: "Raid",
    description: "ถ้าปลอดภัยคุณได้ +2 และคนอื่น -1 แต่ถ้าเป็นระเบิดจะโดนลบเท่าจำนวนผู้เล่น",
    emoji: "⚔️",
    safeScore: 2,
    dangerPenalty: (playerCount) => -Math.max(2, playerCount),
  },
  hint: {
    label: "สายสืบ",
    shortLabel: "Hint",
    description: "ถ้าปลอดภัยได้ +1 และได้คำใบ้ส่วนตัวเกี่ยวกับคำอันตราย",
    emoji: "🕵️",
    safeScore: 1,
    dangerPenalty: () => -2,
  },
  scanner: {
    label: "สแกนเนอร์",
    shortLabel: "Scan",
    description: "ถ้าปลอดภัยได้ +1 และรู้คำที่ปลอดภัยแน่นอน 3 คำแบบส่วนตัว",
    emoji: "📡",
    safeScore: 1,
    dangerPenalty: () => -3,
  },
  doublePick: {
    label: "บังคับ 2 คำ",
    shortLabel: "x2",
    description: "ถ้าปลอดภัยได้ +1 และคนถัดไปต้องเลือก 2 คำติดกัน",
    emoji: "🔥",
    safeScore: 1,
    dangerPenalty: () => -4,
  },
  reverse: {
    label: "ย้อนศร",
    shortLabel: "Reverse",
    description: "ถ้าปลอดภัยได้ +2 และกลับทิศทางเทิร์นทันที",
    emoji: "🔄",
    safeScore: 2,
    dangerPenalty: () => -3,
  },
};

const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const WORLD_CUP_CONTINENTS: Record<string, string> = {
  Mexico: "อเมริกาเหนือ/คอนคาเคฟ",
  "South Africa": "แอฟริกา",
  "South Korea": "เอเชีย",
  Czechia: "ยุโรป",
  Canada: "อเมริกาเหนือ/คอนคาเคฟ",
  Switzerland: "ยุโรป",
  "Bosnia and Herzegovina": "ยุโรป",
  Qatar: "เอเชีย",
  Brazil: "อเมริกาใต้",
  Morocco: "แอฟริกา",
  Haiti: "อเมริกาเหนือ/คอนคาเคฟ",
  Scotland: "ยุโรป",
  "United States": "อเมริกาเหนือ/คอนคาเคฟ",
  Paraguay: "อเมริกาใต้",
  Australia: "เอเชีย/โอเชียเนีย",
  Turkey: "ยุโรป/เอเชีย",
  Germany: "ยุโรป",
  Curaçao: "อเมริกาเหนือ/คอนคาเคฟ",
  "Ivory Coast": "แอฟริกา",
  Ecuador: "อเมริกาใต้",
  Netherlands: "ยุโรป",
  Japan: "เอเชีย",
  Sweden: "ยุโรป",
  Tunisia: "แอฟริกา",
  Belgium: "ยุโรป",
  Egypt: "แอฟริกา",
  Iran: "เอเชีย",
  "New Zealand": "โอเชียเนีย",
  Spain: "ยุโรป",
  "Cape Verde": "แอฟริกา",
  "Saudi Arabia": "เอเชีย",
  Uruguay: "อเมริกาใต้",
  France: "ยุโรป",
  Senegal: "แอฟริกา",
  Iraq: "เอเชีย",
  Norway: "ยุโรป",
  Argentina: "อเมริกาใต้",
  Algeria: "แอฟริกา",
  Austria: "ยุโรป",
  Jordan: "เอเชีย",
  Portugal: "ยุโรป",
  "DR Congo": "แอฟริกา",
  Uzbekistan: "เอเชีย",
  Colombia: "อเมริกาใต้",
  England: "ยุโรป",
  Croatia: "ยุโรป",
  Ghana: "แอฟริกา",
  Panama: "อเมริกาเหนือ/คอนคาเคฟ",
};

const OBJECT_CATEGORY_RULES = [
  { category: "อุปกรณ์ไอที/ไฟฟ้า", detail: "มักใช้ไฟหรือเกี่ยวกับเทคโนโลยี", words: ["โทรศัพท์", "โน้ตบุ๊ก", "แท็บเล็ต", "คีย์บอร์ด", "เมาส์", "หูฟัง", "ลำโพง", "ไมโครโฟน", "กล้องถ่ายรูป", "รีโมต", "ทีวี", "เราเตอร์", "ฮาร์ดดิสก์", "แฟลชไดรฟ์", "เมมโมรีการ์ด", "เครื่องคิดเลข", "เครื่องพิมพ์", "สายชาร์จ", "พาวเวอร์แบงก์", "ถ่านไฟฉาย", "หลอดไฟ", "พัดลม", "แอร์", "โคมไฟ", "เครื่องฟอกอากาศ", "เครื่องดูดฝุ่น"] },
  { category: "ของใช้ในครัว/กินดื่ม", detail: "มักอยู่บนโต๊ะอาหารหรือในครัว", words: ["แก้วน้ำ", "ขวดน้ำ", "หลอดดูด", "จาน", "ชาม", "ช้อน", "ส้อม", "ตะเกียบ", "แก้วกาแฟ", "กาน้ำชา", "กระทะ", "หม้อ", "เขียง", "มีดครัว", "ตู้เย็น", "ไมโครเวฟ", "หม้อหุงข้าว", "เครื่องปิ้งขนมปัง", "กาต้มน้ำ", "กล่องข้าว", "กระติกน้ำ", "ช้อนตวง"] },
  { category: "เครื่องแต่งกาย/ของพกติดตัว", detail: "มักใส่กับตัวหรือพกออกจากบ้าน", words: ["นาฬิกา", "แว่นตา", "กระเป๋าสตางค์", "กระเป๋าเป้", "ร่ม", "หมวก", "รองเท้า", "ถุงเท้า", "เสื้อแจ็กเก็ต", "ผ้าพันคอ", "รองเท้าแตะ", "เข็มขัด", "เนกไท", "เข็มกลัด", "สร้อยคอ", "แหวน", "ต่างหู", "กำไล", "กุญแจ", "พวงกุญแจ"] },
  { category: "เครื่องเขียน/ออฟฟิศ", detail: "มักอยู่บนโต๊ะทำงานหรือใช้กับเอกสาร", words: ["ปากกา", "ดินสอ", "ยางลบ", "ไม้บรรทัด", "สมุด", "หนังสือ", "แฟ้มเอกสาร", "คลิปหนีบกระดาษ", "กรรไกร", "คัตเตอร์", "เทปใส", "กาวแท่ง", "โพสต์อิท", "ปฏิทิน", "ซองจดหมาย", "แสตมป์", "กล่องพัสดุ", "เทปกาว", "เครื่องเย็บกระดาษ", "ลวดเย็บกระดาษ", "ที่เจาะกระดาษ", "กระดาษโน้ต", "กระดานไวท์บอร์ด", "ปากกาไวท์บอร์ด"] },
  { category: "เฟอร์นิเจอร์/ของในบ้าน", detail: "มักเป็นของชิ้นใหญ่หรือใช้ในห้อง", words: ["เก้าอี้", "โต๊ะ", "โซฟา", "เตียง", "หมอน", "ผ้าห่ม", "ผ้าปูที่นอน", "ตู้เสื้อผ้า", "ชั้นวางของ", "กระจก", "นาฬิกาปลุก", "กล่องเก็บของ", "ไม้แขวนเสื้อ", "ตะกร้าผ้า", "ถังขยะ", "นาฬิกาแขวน", "แจกัน", "เทียนหอม", "กรอบรูป", "อัลบั้มรูป"] },
  { category: "ของใช้ห้องน้ำ/สุขอนามัย", detail: "เกี่ยวกับการอาบน้ำ แต่งตัว หรือทำความสะอาดตัว", words: ["ผ้าเช็ดตัว", "สบู่", "แชมพู", "แปรงสีฟัน", "ยาสีฟัน", "หวี", "ไดร์เป่าผม", "มีดโกน", "กรรไกรตัดเล็บ", "ทิชชู่", "กระดาษชำระ", "น้ำหอม", "ครีมกันแดด", "ลิปมัน", "กระจกพกพา", "กระเป๋าเครื่องสำอาง", "หน้ากากอนามัย", "เจลล้างมือ"] },
  { category: "เดินทาง/เอกสาร", detail: "เกี่ยวกับการเดินทาง การยืนยันตัวตน หรือทิศทาง", words: ["บัตรประชาชน", "บัตรเครดิต", "ตั๋วรถไฟ", "ตั๋วเครื่องบิน", "พาสปอร์ต", "แผนที่", "เข็มทิศ", "ไฟฉาย", "กระเป๋าเดินทาง", "หมอนรองคอ"] },
  { category: "กีฬา/ดนตรี/เกม", detail: "ใช้เล่น ออกกำลัง หรือความบันเทิง", words: ["ลูกบอล", "ไม้แบดมินตัน", "ลูกขนไก่", "ไม้ปิงปอง", "ลูกปิงปอง", "เสื่อโยคะ", "ดัมเบล", "จักรยาน", "หมวกกันน็อก", "สเก็ตบอร์ด", "กีตาร์", "เปียโน", "กลอง", "ไวโอลิน", "ไมค์ร้องเพลง", "บอร์ดเกม", "ลูกเต๋า", "ไพ่", "จิ๊กซอว์", "ตุ๊กตา", "หุ่นยนต์ของเล่น", "รถของเล่น", "ตัวต่อ", "สีไม้", "สีน้ำ", "พู่กัน"] },
  { category: "ทำความสะอาด/ซักรีด", detail: "ใช้ทำความสะอาดบ้านหรือเสื้อผ้า", words: ["ไม้กวาด", "ที่โกยผง", "ไม้ถูพื้น", "สเปรย์ทำความสะอาด", "ผ้าไมโครไฟเบอร์", "ถุงผ้า", "ไม้หนีบผ้า", "ราวตากผ้า", "เครื่องซักผ้า", "เตารีด", "โต๊ะรีดผ้า"] },
  { category: "เครื่องมือ/สวน/สัตว์เลี้ยง", detail: "เกี่ยวกับงานซ่อม งานสวน หรือสัตว์เลี้ยง", words: ["สายวัด", "ไขควง", "ค้อน", "คีม", "ตะปู", "น็อต", "ประแจ", "บันไดพับ", "สายยาง", "กระถางต้นไม้", "บัวรดน้ำ", "พลั่วเล็ก", "เมล็ดพันธุ์", "กรงนก", "ชามอาหารสัตว์", "สายจูงสุนัข", "ปลอกคอสัตว์เลี้ยง", "ทรายแมว"] },
];

const PLACE_CATEGORY_RULES = [
  { category: "ประเทศไทย", detail: "เป็นจังหวัด/ย่าน/แลนด์มาร์กในไทย", words: ["กรุงเทพมหานคร", "เชียงใหม่", "ภูเก็ต", "พัทยา", "หัวหิน", "กระบี่", "เกาะสมุย", "เกาะพีพี", "เกาะช้าง", "อยุธยา", "สุโขทัย", "กาญจนบุรี", "นครราชสีมา", "ขอนแก่น", "อุดรธานี", "อุบลราชธานี", "นครศรีธรรมราช", "หาดใหญ่", "สงขลา", "เชียงราย", "แม่ฮ่องสอน", "ปาย", "น่าน", "ลำปาง", "พิษณุโลก", "เพชรบูรณ์", "เลย", "หนองคาย", "ตราด", "ระยอง", "จันทบุรี", "ชลบุรี", "นครปฐม", "ราชบุรี", "เพชรบุรี", "สมุทรปราการ", "สมุทรสาคร", "ปทุมธานี", "นนทบุรี", "นครนายก", "เขาใหญ่", "ดอยอินทนนท์", "ดอยสุเทพ", "ดอยหลวงเชียงดาว", "สามพันโบก", "ภูกระดึง", "ภูชี้ฟ้า", "เขื่อนศรีนครินทร์", "เขื่อนรัชชประภา", "ตลาดน้ำอัมพวา", "ตลาดน้ำดำเนินสะดวก", "เยาวราช", "สยาม", "อโศก", "ทองหล่อ", "อารีย์", "จตุจักร", "บางแสน", "สวนลุมพินี", "สนามหลวง", "วัดพระแก้ว", "วัดอรุณ", "วัดโพธิ์", "พระบรมมหาราชวัง", "สนามบินสุวรรณภูมิ", "สนามบินดอนเมือง"] },
  { category: "เอเชีย", detail: "เป็นเมืองหรือสถานที่ในเอเชีย", words: ["โตเกียว", "โอซาก้า", "เกียวโต", "ซัปโปโร", "โซล", "ปูซาน", "ไทเป", "ฮ่องกง", "มาเก๊า", "สิงคโปร์", "กัวลาลัมเปอร์", "ปีนัง", "มะละกา", "บาหลี", "จาการ์ตา", "ย่างกุ้ง", "มัณฑะเลย์", "ฮานอย", "โฮจิมินห์", "ดานัง", "ฮอยอัน", "เวียงจันทน์", "หลวงพระบาง", "พนมเปญ", "เสียมราฐ", "มะนิลา", "เซบู", "ปักกิ่ง", "เซี่ยงไฮ้", "กว่างโจว", "เซินเจิ้น", "เฉิงตู", "ฉงชิ่ง"] },
  { category: "ยุโรป", detail: "เป็นเมืองหรือสถานที่ในยุโรป", words: ["ลอนดอน", "แมนเชสเตอร์", "ลิเวอร์พูล", "เอดินบะระ", "ปารีส", "นีซ", "มาร์กเซย", "โรม", "มิลาน", "เวนิส", "ฟลอเรนซ์", "มาดริด", "บาร์เซโลนา", "ลิสบอน", "ปอร์โต", "อัมสเตอร์ดัม", "รอตเตอร์ดัม", "บรัสเซลส์", "เบอร์ลิน", "มิวนิก", "แฟรงก์เฟิร์ต", "ซูริก", "เจนีวา", "เวียนนา", "ปราก", "บูดาเปสต์", "วอร์ซอ", "คราคูฟ", "โคเปนเฮเกน", "สตอกโฮล์ม", "ออสโล", "เฮลซิงกิ", "เรคยาวิก", "เอเธนส์", "อิสตันบูล"] },
  { category: "ตะวันออกกลาง/แอฟริกา", detail: "อยู่แถบตะวันออกกลางหรือแอฟริกา", words: ["ดูไบ", "อาบูดาบี", "โดฮา", "ริยาด", "เจดดาห์", "ไคโร", "เคปทาวน์", "โจฮันเนสเบิร์ก", "ไนโรบี", "มาร์ราเกช", "คาซาบลังกา"] },
  { category: "อเมริกา", detail: "เป็นเมืองในอเมริกาเหนือหรืออเมริกาใต้", words: ["นิวยอร์ก", "ลอสแอนเจลิส", "ซานฟรานซิสโก", "ลาสเวกัส", "ซีแอตเทิล", "ชิคาโก", "ไมอามี", "วอชิงตัน ดี.ซี.", "บอสตัน", "โตรอนโต", "แวนคูเวอร์", "มอนทรีออล", "เม็กซิโกซิตี้", "กังกุน", "ริโอเดจาเนโร", "เซาเปาโล", "บัวโนสไอเรส", "ซานติอาโก", "ลิมา", "โบโกตา", "เมเดยิน", "กีโต"] },
  { category: "โอเชียเนีย", detail: "เป็นเมืองหรือสถานที่ในออสเตรเลีย/นิวซีแลนด์", words: ["ซิดนีย์", "เมลเบิร์น", "บริสเบน", "เพิร์ท", "โอ๊คแลนด์", "ควีนส์ทาวน์"] },
  { category: "ธรรมชาติ", detail: "เป็นพื้นที่ธรรมชาติ เช่น น้ำ ภูเขา ป่า ถ้ำ", words: ["ชายหาด", "ภูเขา", "น้ำตก", "ทะเลสาบ", "เกาะ", "ป่าไม้", "ทะเลทราย", "ถ้ำ"] },
  { category: "สถานที่ในเมือง", detail: "เป็นสถานที่บริการหรือกิจกรรมในเมือง", words: ["สวนสนุก", "พิพิธภัณฑ์", "หอศิลป์", "โรงภาพยนตร์", "สนามกีฬา", "ห้างสรรพสินค้า", "ตลาดกลางคืน", "ร้านกาแฟ", "ห้องสมุด", "มหาวิทยาลัย", "โรงพยาบาล", "สถานีรถไฟ", "ท่าเรือ", "สวนสัตว์", "อควาเรียม", "รีสอร์ต", "สถานีตำรวจ", "ศูนย์ประชุม", "สวนพฤกษศาสตร์"] },
];

export function makeRoomCode(size = 6) {
  return Array.from({ length: size }, () => ROOM_ALPHABET[Math.floor(Math.random() * ROOM_ALPHABET.length)]).join("");
}

export function isGameMode(value: unknown): value is GameMode {
  return value === "objects" || value === "worldcup2026" || value === "places";
}

export function shuffle<T>(input: T[]) {
  const array = [...input];
  for (let index = array.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [array[index], array[swapIndex]] = [array[swapIndex], array[index]];
  }
  return array;
}

export function sampleWords(mode: GameMode, count = 40) {
  const bank = Array.from(new Set(WORD_BANKS[mode]));
  if (bank.length < count) {
    throw new Error(`Word bank for ${mode} has only ${bank.length} words.`);
  }
  return shuffle(bank).slice(0, count);
}

function createPowerDeck(count: number): WordPower[] {
  const deck: WordPower[] = [
    ...Array<WordPower>(22).fill("normal"),
    ...Array<WordPower>(5).fill("bonus"),
    ...Array<WordPower>(4).fill("raid"),
    ...Array<WordPower>(3).fill("hint"),
    ...Array<WordPower>(2).fill("scanner"),
    ...Array<WordPower>(2).fill("doublePick"),
    ...Array<WordPower>(2).fill("reverse"),
  ];

  while (deck.length < count) deck.push("normal");
  return shuffle(deck).slice(0, count);
}

export function createRound(mode: GameMode, players: Record<string, Player>, round: number) {
  const playerIds = Object.keys(players);
  if (playerIds.length < 2) {
    throw new Error("ต้องมีผู้เล่นอย่างน้อย 2 คนก่อนเริ่มเกม");
  }

  const sampledWords = sampleWords(mode);
  const powerDeck = createPowerDeck(sampledWords.length);
  const words: Record<string, GameWord> = Object.fromEntries(
    sampledWords.map((text, index) => {
      const id = `w${String(index + 1).padStart(2, "0")}`;
      return [id, { id, text, power: powerDeck[index] } satisfies GameWord];
    })
  );

  const wordIds = Object.keys(words);
  const dangerWordId = wordIds[Math.floor(Math.random() * wordIds.length)];
  const turnOrder = shuffle(playerIds);
  const starterPlayerId = turnOrder[0];
  const now = Date.now();

  const game: PublicGame = {
    status: "playing",
    mode,
    round,
    words,
    turnOrder,
    starterPlayerId,
    turnPlayerId: starterPlayerId,
    selectedCount: 0,
    pickDebt: {},
    events: [
      {
        id: `${now}-start`,
        at: now,
        type: "power",
        emoji: "🎲",
        title: `รอบที่ ${round} เริ่มแล้ว`,
        message: `${players[starterPlayerId]?.name || "ผู้เล่นคนแรก"} ได้เริ่มก่อน ระวังคำพิเศษอาจเป็นระเบิดได้เหมือนกัน`,
        playerId: starterPlayerId,
        playerName: players[starterPlayerId]?.name || "ผู้เล่น",
        wordText: "",
      },
    ],
    startedAt: now,
  };

  return { game, dangerWordId };
}

export function nextTurnPlayerId(turnOrder: string[], currentPlayerId: string) {
  if (turnOrder.length === 0) return currentPlayerId;
  const currentIndex = Math.max(0, turnOrder.indexOf(currentPlayerId));
  return turnOrder[(currentIndex + 1) % turnOrder.length];
}

function findCategory(text: string, rules: { category: string; detail: string; words: string[] }[], fallback: DangerClue): DangerClue {
  const match = rules.find((rule) => rule.words.includes(text));
  return match ? { category: match.category, detail: match.detail } : fallback;
}

export function getDangerClue(mode: GameMode, wordText: string): DangerClue {
  if (mode === "worldcup2026") {
    return {
      category: WORLD_CUP_CONTINENTS[wordText] || "ไม่ทราบทวีป",
      detail: "คำอันตรายเป็นทีมชาติในกลุ่มทวีป/สมาพันธ์นี้",
    };
  }

  if (mode === "objects") {
    return findCategory(wordText, OBJECT_CATEGORY_RULES, {
      category: "ของใช้ทั่วไป",
      detail: "เป็นสิ่งของที่พบได้ในชีวิตประจำวัน",
    });
  }

  return findCategory(wordText, PLACE_CATEGORY_RULES, {
    category: "สถานที่ทั่วไป",
    detail: "เป็นสถานที่หรือพื้นที่ที่พบได้ทั่วไป",
  });
}

export function getDangerPenalty(power: WordPower, playerCount: number) {
  return POWER_INFO[power].dangerPenalty(playerCount);
}

export function getPowerSafeScore(power: WordPower) {
  return POWER_INFO[power].safeScore;
}
