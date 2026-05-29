# Tổng kết Rocket.Chat Integration — Học lại từ đầu

> Bài tổng kết toàn bộ quá trình tích hợp Rocket.Chat vào Green STEM Compass.
> Đọc xong là tự làm được Phase 3 (Livechat widget) và Phase 4 (Mentor channel)
> mà không cần copy code.

## Mục lục
1. [Khái niệm: Rocket.Chat là gì, dùng để làm gì](#1)
2. [Deploy local với Docker](#2)
3. [3 cách integrate (chọn Incoming Webhook)](#3)
4. [Setup webhook trong Rocket.Chat UI](#4)
5. [Backend helper `notifyAdmin()`](#5)
6. [Tích hợp vào API route](#6)
7. [Docker networking gotcha](#7)
8. [Các bug đã debug + bài học](#8)
9. [Data flow end-to-end](#9)
10. [Checklist add notification cho event mới](#10)

---

## <a name="1"></a>1. Khái niệm: Rocket.Chat là gì

**Rocket.Chat** = open-source team chat platform (giống Slack/Discord), self-hostable, có REST API + WebSocket SDK đầy đủ.

| Đặc điểm | Detail |
|---|---|
| Backend | Node.js + Meteor framework |
| Database | MongoDB (bắt buộc, không thay được) |
| License | MIT (free, dùng thương mại OK) |
| Tự host | Có (Docker image `rocket.chat:latest`) hoặc dùng Rocket.Chat Cloud (paid) |

### Tại sao dùng trong project Green STEM Compass?

3 vai trò khả thi (chọn 1 hoặc cả 3):

| Vai trò | Phase | Ai dùng |
|---|---|---|
| **Admin notification hub** | Phase 2 (đã làm) | Backend → bot post message vào channel admin |
| **Livechat support widget** | Phase 3 | Student click widget → chat với support |
| **Mentor chat backend** | Phase 4 | Tự tạo channel student↔mentor qua REST API |

Pattern này phổ biến trong SaaS: Vercel, Linear, Stripe đều push event sang Slack/Discord webhook tương tự.

---

## <a name="2"></a>2. Deploy local với Docker

### 2.1 Vì sao cần MongoDB + replica set

- Rocket.Chat lưu mọi thứ (messages, users, channels) trong MongoDB
- **Khác Postgres**, MongoDB phải có **replica set** (kể cả single-node) để Meteor framework theo dõi changes realtime
- Nên docker-compose cần **3 service**:
  1. `mongodb` — database
  2. `mongodb-init` — one-shot container chạy `rs.initiate()` rồi exit
  3. `rocketchat` — server chính

### 2.2 docker-compose architecture (snippet)

```yaml
rocketchat:
  image: rocket.chat:latest
  platform: linux/amd64           # ❶ Mac M-series không có ARM build
  ports: ["3030:3000"]            # ❷ Host:Container — 3000 đã dùng cho Next.js
  environment:
    - PORT=3000
    - ROOT_URL=http://localhost:3030
    - MONGO_URL=mongodb://mongodb:27017/rocketchat?replicaSet=rs0
    - MONGO_OPLOG_URL=mongodb://mongodb:27017/local?replicaSet=rs0
  depends_on:
    mongodb-init: { condition: service_completed_successfully }

mongodb:
  image: mongo:8.0                # ❸ Rocket.Chat 8.x cần Mongo 8.0+
  command: ["--replSet", "rs0", "--oplogSize", "128", "--bind_ip_all"]
  volumes:
    - mongo_data:/data/db         # ❹ Persist data giữa restart
  healthcheck: ...                # đợi Mongo ready trước khi init replica set

mongodb-init:
  image: mongo:8.0
  restart: "no"                   # ❺ Chỉ chạy 1 lần
  depends_on:
    mongodb: { condition: service_healthy }
  command: >
    mongosh --host mongodb:27017 --quiet --eval
    "try { rs.status() } catch(e) { rs.initiate({_id:'rs0', members:[{_id:0, host:'mongodb:27017'}]}) }"
```

### 2.3 Tại sao mỗi line nhãn ❶-❺ quan trọng

| Nhãn | Vấn đề nếu thiếu |
|---|---|
| ❶ `platform: linux/amd64` | Mac Silicon (M1/M2/M3) pull image fail: "no matching manifest for arm64" |
| ❷ Map host port 3030 | Conflict với Next.js (cũng dùng 3000 internal) |
| ❸ `mongo:8.0` (không phải 6.0) | Rocket.Chat 8.x check version → "MongoDB NOT SUPPORTED, upgrade to 8.0+" → server error |
| ❹ Named volume `mongo_data` | Mất data mỗi lần `docker compose down` |
| ❺ `restart: "no"` | Container cố chạy lại sau khi exit thành công → spam restart loop |

### 2.4 Khởi động + verify

```bash
docker compose up -d
docker compose logs -f rocketchat        # đợi "SERVER RUNNING" banner
curl http://localhost:3030/api/info       # phải trả JSON, không HTML
```

Lần đầu mất ~3-5 phút (pull ~800MB images, init replica set, build search index).

---

## <a name="3"></a>3. Ba cách integrate (đã chọn Incoming Webhook)

| Cách | Direction | Use case | Phức tạp |
|---|---|---|---|
| **Incoming Webhook** | App → RC | Send notification vào channel | ⭐ |
| **Outgoing Webhook / Bot** | RC → App | User gõ trigger word, RC gọi API anh | ⭐⭐ |
| **REST API + iframe embed** | Full bidirectional | Mentor chat, dynamic channel creation | ⭐⭐⭐⭐ |

### Tại sao Incoming Webhook là cách dễ nhất

- Không cần auth phức tạp (URL chính là credential)
- HTTP POST đơn giản, mọi language đều làm được
- Rocket.Chat tự format message từ JSON payload

### Cấu trúc payload (lý thuyết)

```json
{
  "text": "Main message body",
  "alias": "Override bot name",
  "emoji": ":robot:",
  "channel": "#override-channel-here",
  "attachments": [
    {
      "color": "#00ff00",
      "title": "Title shown bold",
      "title_link": "https://...",
      "text": "Longer description supporting markdown",
      "fields": [
        { "title": "Label", "value": "Content", "short": true }
      ],
      "image_url": "https://image.png",
      "thumb_url": "https://thumb.png",
      "ts": 1779880000
    }
  ]
}
```

→ Hỗ trợ rich format với title, image, fields. Helper `notifyAdmin()` chỉ expose 3 cái dùng nhiều nhất (text, color, fields). Anh có thể extend khi cần.

---

## <a name="4"></a>4. Setup webhook trong Rocket.Chat UI (4 steps)

### Step 1: Tạo channel
Sidebar → `+` → Channel → name `admin-notifications` → Private ON → Create.

### Step 2: Tạo Incoming Webhook
Avatar góc trên trái → **Administration** → **Workspace** → Sidebar **Integrations** → tab **New** → **Incoming**.

Điền form:
- **Enabled**: True
- **Name**: `GreenSTEM App Bot`
- **Post to Channel**: `#admin-notifications`
- **Post as**: `admin`
- **Alias**: `GreenSTEM Bot` (tên hiển thị)
- **Emoji**: `:robot:`
- (skip Script — chỉ cần khi muốn transform JSON)

Click Save → scroll xuống → copy **Webhook URL** dạng `http://localhost:3030/hooks/<id>/<token>`.

### Step 3: Save URL
URL chính là credential (token nằm trong URL). Lưu cẩn thận.

### Step 4: Test bằng curl
```bash
curl -X POST -H "Content-Type: application/json" \
  --data '{"text":"Hello :rocket:","alias":"Curl Test"}' \
  http://localhost:3030/hooks/<id>/<token>
# → {"success":true}
```

Mở channel → thấy message → OK.

---

## <a name="5"></a>5. Backend helper `notifyAdmin()`

File: `src/backend/rocketchat.ts`

### 5.1 Ba nguyên tắc design

| Nguyên tắc | Lý do |
|---|---|
| **Fail silent nếu env var không set** | Dev/CI không cần Rocket.Chat → app vẫn chạy được |
| **Never throw** | Notification fail KHÔNG được làm API request fail (user không quan tâm) |
| **Có timeout 5 giây** | Webhook hang không được stall API response |

### 5.2 Code breakdown

```ts
type NotifyOptions = {
  text: string                // required
  fields?: NotifyField[]      // optional table rows
  color?: string              // 'good'|'warning'|'danger' or hex
  channel?: string            // override target
}

export async function notifyAdmin(opts: NotifyOptions): Promise<void> {
  const url = process.env.ROCKETCHAT_WEBHOOK_URL
  if (!url) return                                  // ❶ Fail silent

  const payload: Record<string, unknown> = {
    text: opts.text,
    channel: opts.channel,
  }

  if (opts.fields?.length) {
    payload.attachments = [{
      color: opts.color ?? '#3b82f6',
      fields: opts.fields,
    }]
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),            // ❷ Timeout
    })
    if (!res.ok) {
      console.error('[rocketchat] non-OK', res.status)
    }
  } catch (err) {
    console.error('[rocketchat] failed:', err)     // ❸ Never throw
  }
}
```

### 5.3 Tại sao tách thành helper riêng

- **DRY** — 1 nơi cập nhật khi đổi payload format
- **Testable** — unit test cho `notifyAdmin` mà không cần spin Rocket.Chat thật
- **Swappable** — sau này đổi sang Slack/Discord chỉ sửa 1 file (helper), call sites không đổi

---

## <a name="6"></a>6. Tích hợp vào API route

File: `src/app/api/activities/[activityId]/trust/route.ts`

```ts
import { notifyAdmin } from '@/backend/rocketchat'

export async function POST(req, { params }) {
  // ... auth, validation, DB writes ...

  await notifyAdmin({
    text: `🎓 *TrustFactor Tier 3* — chứng chỉ mới cần admin review`,
    color: 'danger',
    fields: [
      { title: 'Activity',  value: activity.title,        short: true },
      { title: 'Student ID', value: user.id,              short: true },
      { title: 'Issuer',    value: data.certificate_issuer, short: true },
      { title: 'URL',       value: data.certificate_url,  short: false },
    ],
  })

  return NextResponse.json({ success: true })
}
```

### Pattern lưu ý

| Quy tắc | Lý do |
|---|---|
| `await` (không fire-and-forget) | Vercel function tắt sau khi return; pending promise bị kill |
| Gọi SAU DB write thành công | Không notify nếu DB fail (consistency) |
| Không gọi trong vòng lặp | Nếu cần notify nhiều, build 1 message tổng hợp |

---

## <a name="7"></a>7. Docker networking gotcha quan trọng nhất

### Problem

Anh tạo webhook URL trong Rocket.Chat UI → URL là `http://localhost:3030/hooks/...`. Nhưng URL này KHÔNG dùng được từ trong Next.js container, vì:

- **Bên ngoài Docker** (terminal host): `localhost:3030` = Rocket.Chat (đúng)
- **Bên trong Next.js container**: `localhost:3030` = chính nó (sai)

### Solution

Trong docker-compose network, mỗi service có 1 hostname = service name. Anh dùng:

| Context | Hostname đúng | Port |
|---|---|---|
| Terminal anh dùng curl test | `localhost` | 3030 (host port) |
| Code Next.js chạy trong container | `rocketchat` | 3000 (container internal port) |
| Browser anh mở Rocket.Chat | `localhost` | 3030 (host port) |

### Cách set
Trong `.env.local`:
```
ROCKETCHAT_WEBHOOK_URL=http://rocketchat:3000/hooks/<id>/<token>
                          ^^^^^^^^^^      ^^^^
                          service name    container port
```

### Pattern tương tự với CHROMA_URL

Lúc deploy Chroma trên Railway, set `CHROMA_URL=https://....railway.app`. Nhưng trong docker compose, override thành `http://chromadb:8000` (internal service name + port).

→ Đây là pattern chung của Docker Compose: app trong container giao tiếp với service khác qua **service name**, không qua localhost.

---

## <a name="8"></a>8. Các bug đã debug + bài học

### Bug 1: Rocket.Chat image không có ARM64
**Triệu chứng:** `no matching manifest for linux/arm64/v8`
**Fix:** Thêm `platform: linux/amd64` vào compose (chạy qua Rosetta emulation, chậm hơn 10-20% nhưng OK cho dev)

### Bug 2: MongoDB 6.0 không support Rocket.Chat 8.x
**Triệu chứng:** Container "Up" nhưng API trả về `SERVER ERROR — MongoDB NOT SUPPORTED`
**Fix:** Upgrade `mongo:6.0` → `mongo:8.0`. Vì replica set 6.0 không migrate sang 8.0, phải `docker volume rm` data Mongo cũ.

### Bug 3: Webhook URL từ host không dùng được trong container
**Triệu chứng:** `[rocketchat] notification failed: fetch failed`
**Fix:** Đổi hostname từ `localhost:3030` sang `rocketchat:3000` (service name + container internal port).

### Bug 4: `vercel env pull` pull empty values
**Triệu chứng:** `.env.local` có `KEY=""` cho tất cả Supabase/Anthropic vars
**Nguyên nhân:** Env var add qua Vercel dashboard mặc định mark là **Sensitive** → không pull được qua CLI
**Fix:** Paste giá trị thật manual vào `.env.local`.

### Bug 5: Supabase free tier direct connection chỉ IPv6
**Triệu chứng:** `ENOTFOUND db.<ref>.supabase.co` trong Docker container
**Nguyên nhân:** Q1/2024 Supabase migrate direct connection sang IPv6-only; Docker Desktop trên Mac không có IPv6
**Fix:** Dùng Supavisor pooler (port 6543) hoặc Session pooler (port 5432) — cả 2 đều có IPv4 và miễn phí.

### Bug 6: Email confirmation flow phá vỡ register
**Triệu chứng:** `/api/profile 404` mãi sau khi click email link
**Nguyên nhân:** Code register chỉ tạo profile khi `data.session` không null sau signUp. Nhưng với email confirmation BẬT, `data.session = null` → block tạo profile không chạy.
**Fix:** Move logic bootstrap profile vào `AuthDataLoader` (chạy trên mọi protected page). Nếu GET profile trả 404 → POST tạo profile từ `session.user.user_metadata`.

### Bug 7: `addActivity` chỉ lưu local Zustand
**Triệu chứng:** Click "Xác thực" trên activity vừa tạo → `Internal server error`
**Nguyên nhân:** `addActivity` tạo ID dạng `activity-${userId}-${Date.now()}` và chỉ lưu local. Khi trust API query DB không tìm thấy.
**Fix:** Thêm action `addServerActivity(activity)` trong store. `onSubmit` của Portfolio gọi `POST /api/activities` trước, nhận activity với DB-backed ID, rồi add vào store.

### Bug 8: Home page không redirect sau email confirm
**Triệu chứng:** Click email link → landing trang `/#access_token=...` → mắc kẹt
**Nguyên nhân:** Supabase SDK auto-parse hash + lưu session, nhưng landing page không redirect
**Fix:** Thêm `useEffect` lắng nghe `onAuthStateChange` event `SIGNED_IN` → `router.replace('/dashboard')`.

### Bài học chung từ 8 bugs này

1. **Stack có nhiều layer** — mỗi layer (Supabase, Docker, Mongo, Next.js) có gotcha riêng, đọc docs là chưa đủ, phải dùng đúng cách
2. **Logs là bạn tốt nhất** — `docker compose logs app | grep error` đã cứu 5/8 bugs
3. **State machine của auth có nhiều nhánh** — email confirm ON/OFF tạo 2 flow rất khác nhau, dễ miss
4. **Local-only state là technical debt** — Zustand làm UI nhanh nhưng phải sync server, không thì gây bug khó truy

---

## <a name="9"></a>9. Data flow end-to-end (vẽ ra cho dễ nhớ)

```
┌───────────────────────────────────────────────────────────────────────┐
│                          USER (browser)                               │
│  1. Click "Xác thực" trên Portfolio                                   │
│  2. Modal hiện → chọn Tier 3, điền Issuer + URL                       │
│  3. Click "Gửi yêu cầu xác thực"                                      │
└───────────────────────────────────────────────────────────────────────┘
                              │
                              │ fetch('/api/activities/<id>/trust', {
                              │   method:'POST',
                              │   headers:{ Authorization: 'Bearer <JWT>' },
                              │   body: {...}
                              │ })
                              ▼
┌───────────────────────────────────────────────────────────────────────┐
│              VERCEL Next.js API route handler                         │
│              src/app/api/activities/[id]/trust/route.ts               │
│                                                                       │
│  ┌───────────────┐   ┌───────────────┐   ┌────────────────────┐       │
│  │ requireAuth   │──▶│ Zod validate  │──▶│ Drizzle: find      │       │
│  │ (Supabase JWT)│   │ tier 2 or 3   │   │ activity + verify  │       │
│  └───────────────┘   └───────────────┘   │ ownership          │       │
│                                          └────────────────────┘       │
│                                                    │                  │
│                                                    ▼                  │
│                                          ┌────────────────────┐       │
│                                          │ Drizzle: INSERT    │       │
│                                          │ audit_log + UPDATE │       │
│                                          │ activity status    │       │
│                                          └────────────────────┘       │
│                                                    │                  │
│                                                    ▼                  │
│                                          ┌────────────────────┐       │
│                                          │ await notifyAdmin({│       │
│                                          │   text, fields,    │       │
│                                          │   color: 'danger'  │       │
│                                          │ })                 │       │
│                                          └────────────────────┘       │
│                                                    │                  │
└────────────────────────────────────────────────────┼──────────────────┘
                                                    │
                              ┌─────────────────────┘
                              │
       ┌──────────────────────┴───────────────────────┐
       ▼                                              ▼
┌──────────────────┐                       ┌──────────────────────┐
│  Supabase        │                       │  Rocket.Chat         │
│  Postgres        │                       │  (Docker container)  │
│                  │                       │                      │
│  activities      │                       │  Incoming Webhook    │
│  audit_logs      │                       │  receives JSON       │
└──────────────────┘                       └──────────┬───────────┘
                                                      │
                                                      ▼
                                           ┌──────────────────────┐
                                           │ #admin-notifications │
                                           │ channel              │
                                           │ Bot post message     │
                                           │ Admin nhận           │
                                           │ notification 📨      │
                                           └──────────────────────┘
```

### Insight quan trọng

- **2 side-effects** xảy ra: DB write (Postgres) và notification (Rocket.Chat)
- DB write **dù cho** notification fail vẫn hoàn thành (vì `notifyAdmin` không throw)
- Return success cho user **không phụ thuộc** notification status → UX không bị chậm/fail vì Rocket.Chat hang

---

## <a name="10"></a>10. Checklist add notification cho event mới

Khi muốn add notification cho 1 event mới, đi qua checklist này:

- [ ] **Q1:** Event này admin có CẦN biết real-time không, hay log audit là đủ?
  → Nếu chỉ cần audit, dùng `auditLogs` table thay vì Rocket.Chat
- [ ] **Q2:** Notification thuộc loại nào (info/warning/danger)?
- [ ] **Q3:** Nội dung cần show: title + những field nào? (≤ 6 field, mỗi field ngắn gọn)
- [ ] **Q4:** Có cần kèm link không? Nếu có, link đi đâu? (admin panel? hồ sơ user?)
- [ ] **Q5:** Channel nào? `#admin-notifications` (default) hay channel khác?
- [ ] **Q6:** File API route nào sẽ chứa logic?

Khi đã trả lời xong, code 3 dòng:

```ts
// 1. Import
import { notifyAdmin } from '@/backend/rocketchat'

// 2. Call sau DB write thành công, trước return
await notifyAdmin({
  text: 'Message với emoji + *markdown*',
  color: 'good' | 'warning' | 'danger',
  fields: [
    { title: '...', value: '...', short: true },
  ],
})

// 3. Return response như cũ
return NextResponse.json({...})
```

→ Test: trigger event qua UI → check `#admin-notifications` channel.

---

## Phụ lục — Files Rocket.Chat changes đã commit

| File | Mục đích |
|---|---|
| `docker-compose.yml` | Thêm `mongodb`, `mongodb-init`, `rocketchat` services |
| `src/backend/rocketchat.ts` | Helper `notifyAdmin()` |
| `src/app/api/activities/[id]/trust/route.ts` | Tích hợp call notify (Tier 2 + Tier 3) |
| `.env.example` | Document `ROCKETCHAT_WEBHOOK_URL` var |
| `.env.local` (gitignored) | Webhook URL thật (dùng hostname `rocketchat:3000`) |

## Commits liên quan

| SHA | Mô tả |
|---|---|
| `89b7c90` | Add Rocket.Chat + MongoDB to docker-compose |
| `71ed269` | Notify admins on TrustFactor requests |
| `049a748` | Wire trust verification modal + auth redirect |
| `7e3255a` | Persist new activities + bootstrap profile |
| `134c20c` | Bootstrap profile from AuthDataLoader |

---

## Bài exercise tự làm sau khi đọc xong

**Mục tiêu:** Add notification "🎉 User mới đăng ký" vào channel `#new-users`.

**Steps:**
1. Tạo channel `#new-users` trong Rocket.Chat UI
2. Mở `src/app/api/profile/route.ts` → tìm POST handler
3. Sau khi `db.insert(userProfiles)` thành công, gọi `notifyAdmin` với text "🎉 User mới...", fields có display_name + email + school + grade
4. Test: register account mới → check channel

Làm được exercise này = đã nắm pattern. Sẵn sàng cho Phase 3 (Livechat widget) hoặc Phase 4 (Mentor channel REST API integration).
