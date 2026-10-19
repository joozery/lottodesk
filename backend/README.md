# LottoDesk API

Express 5 + TypeScript + MongoDB (mongoose). Login ด้วยอีเมล/รหัสผ่าน → JWT ใน httpOnly cookie (`ld_token`)

## เริ่มใช้งาน
```bash
cp .env.example .env        # ใส่ MONGODB_URI, JWT_SECRET (openssl rand -base64 48)
npm run create-user         # สร้างผู้ใช้ผู้ดูแล (ถามรหัสผ่านแบบไม่แสดงบนจอ)
npm run seed                # ใส่ข้อมูลตัวอย่าง (เฉพาะเมื่อฐานข้อมูลว่าง; --reset เพื่อล้างแล้วใส่ใหม่)
npm run dev                 # http://localhost:4000/api
```

## Endpoint (ทุกตัวต้อง login ยกเว้น health และ login)
| Method | Path | หมายเหตุ |
|---|---|---|
| GET | `/api/health` | สถานะเซิร์ฟเวอร์/ฐานข้อมูล |
| POST | `/api/auth/login` · `/logout` · GET `/me` | login จำกัด 20 ครั้ง/15 นาที |
| GET/POST | `/api/dealers` | เจ้ามือ (รวมผู้ส่งโพยและลูกค้า) |
| POST | `/api/dealers/:id/collectors` · `/:id/collectors/:cid/customers` | เพิ่มผู้ส่งโพย / ลูกค้า |
| GET/POST | `/api/periods` | งวด (status = confirmed เมื่อมีผลรางวัล) |
| GET | `/api/ledger?lottery&periodId&from&to` | บิล+รับจ่าย+กิจกรรม พร้อมเงินรางวัลตามอัตราจ่าย |
| GET/POST | `/api/bills` | คีย์บิลใหม่ (ตรวจจำนวนหลักตามประเภท) |
| GET/POST | `/api/payments` · GET `/outstanding` | รับ–จ่ายเงิน; รับจากลูกค้าจะตัดยอดค้างบิลเก่าสุดก่อน |
| GET/PUT | `/api/prize-results/:periodId` | ผลรางวัล |
| GET | `/api/rates` · PUT `/api/rates` · PUT `/api/rates/commission/:dealerId` | อัตราจ่าย (บาทละ) ใช้กับทุกคน + ค่าคอมมิชชันเจ้ามือ |

`src/shared/` คัดลอกมาจาก frontend (`types.ts`, `prize.ts`, `prize-calc.ts`) — แก้สูตรที่ใดที่หนึ่งต้องแก้อีกที่ให้ตรงกัน
