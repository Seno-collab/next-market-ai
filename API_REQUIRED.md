# API cần backend implement

## Trading API

Frontend gọi qua nginx (`/api/trading/...` được proxy về backend).
File client: `src/lib/api/trading.ts`
Types: `src/types/trading.ts`

---

### Response format chung

Tất cả endpoint phải trả về dạng:

```json
{
  "message": "success",
  "data": <payload>
}
```

Khi lỗi:
```json
{
  "message": "mô tả lỗi"
}
```

---

### 1. GET `/api/trading/ticker/:symbol`

Lấy giá và thống kê 24h của một symbol.

**Poll interval:** mỗi 3–5 giây.

**Params:**
| Tên | Ví dụ | Mô tả |
|-----|-------|-------|
| `symbol` | `BTCUSDT` | Symbol viết hoa |

**Response `data`:**
```json
{
  "symbol": "BTCUSDT",
  "last_price": "67450.12",
  "price_change": "1234.56",
  "price_change_percent": "1.87",
  "volume": "28450.321",
  "quote_volume": "1918273645.12",
  "high_price": "68000.00",
  "low_price": "65800.00",
  "open_price": "66215.56"
}
```

---

### 2. GET `/api/trading/ohlcv/:symbol?interval=1h&limit=100`

Lấy dữ liệu nến (OHLCV) để vẽ chart.

**Poll interval:** 5–10s cho `1m`, 30–60s cho `≥15m`.

**Params:**
| Tên | Mặc định | Cho phép |
|-----|----------|----------|
| `symbol` | — | viết hoa, vd `BTCUSDT` |
| `interval` | `1h` | `1m` `3m` `5m` `15m` `30m` `1h` `4h` `1d` `1w` |
| `limit` | `100` | 1–1000 |

**Response `data`:** mảng nến, từ cũ → mới

```json
[
  {
    "open_time": 1714000000000,
    "open": "67000.00",
    "high": "67500.00",
    "low": "66800.00",
    "close": "67450.12",
    "volume": "120.45",
    "close_time": 1714003599999
  }
]
```

> `open_time` và `close_time` là milliseconds timestamp.

---

### 3. GET `/api/trading/orderbook/:symbol?limit=20`

Lấy order book (bids/asks).

**Poll interval:** mỗi 1–2 giây.

**Params:**
| Tên | Mặc định | Cho phép |
|-----|----------|----------|
| `symbol` | — | viết hoa, vd `BTCUSDT` |
| `limit` | `20` | 1–5000 |

**Response `data`:**
```json
{
  "last_update_id": 123456789,
  "bids": [
    { "price": "67400.00", "quantity": "0.542" },
    { "price": "67399.00", "quantity": "1.200" }
  ],
  "asks": [
    { "price": "67450.00", "quantity": "0.310" },
    { "price": "67451.00", "quantity": "2.100" }
  ]
}
```

> `bids`: giảm dần theo giá. `asks`: tăng dần theo giá.

---

### 4. GET `/api/trading/trades/:symbol?limit=50`

Lấy lịch sử giao dịch gần nhất.

**Poll interval:** mỗi 1–2 giây.

**Params:**
| Tên | Mặc định | Cho phép |
|-----|----------|----------|
| `symbol` | — | viết hoa, vd `BTCUSDT` |
| `limit` | `50` | 1–1000 |

**Response `data`:** mảng trade, mới nhất trước

```json
[
  {
    "id": 987654321,
    "price": "67450.12",
    "qty": "0.025",
    "time": 1714003590000,
    "is_buyer_maker": false
  }
]
```

> `is_buyer_maker = true` → bên bán là aggressor (hiển thị `SELL`).
> `is_buyer_maker = false` → bên mua là aggressor (hiển thị `BUY`).

---

## Auth API — Online Status

Frontend gọi qua nginx (`/api/auth/...` được proxy về backend).
Route handlers: `src/app/api/auth/heartbeat/route.ts`, `src/app/api/auth/users/[id]/online/route.ts`
Hook: `src/features/auth/hooks/useHeartbeat.ts`

### Luồng hoạt động

```
User mở app (AdminShell mount)
  → useHeartbeat gọi POST /api/auth/heartbeat ngay lập tức
  → Lặp lại mỗi 2 phút

Backend nhận heartbeat
  → SetOnline(userID) → lưu user:online:{userID} vào Redis, TTL 5 phút

User không thao tác nhưng vẫn mở tab
  → Heartbeat vẫn chạy → TTL liên tục được reset → is_online = true

User đóng tab / mất kết nối
  → Heartbeat dừng → sau 5 phút TTL hết → is_online = false

User bấm Logout
  → Backend gọi DeleteOnline → is_online = false ngay lập tức
```

---

### 5. POST `/api/auth/heartbeat` [protected]

Gia hạn TTL online trong Redis. Frontend gọi mỗi 2 phút.

**Headers:**
| Tên | Mô tả |
|-----|-------|
| `Authorization` | `Bearer <access_token>` |

**Request body:** không cần (empty)

**Backend cần làm:**
- Verify JWT → lấy `userID`
- Gọi `SetOnline(userID)` → set key `user:online:{userID}` với TTL 5 phút

**Response thành công (`200`):**
```json
{
  "message": "OK"
}
```

**Response lỗi (`401`):**
```json
{
  "message": "Unauthorized"
}
```

---

### 6. GET `/api/auth/users/:id/online` [protected]

Kiểm tra một user có đang online không.

**Headers:**
| Tên | Mô tả |
|-----|-------|
| `Authorization` | `Bearer <access_token>` |

**Path params:**
| Tên | Ví dụ | Mô tả |
|-----|-------|-------|
| `id` | `550e8400-e29b-41d4-a716-446655440000` | UUID của user cần check |

**Backend cần làm:**
- Verify JWT (caller phải authenticated)
- Gọi `IsOnline(id)` → kiểm tra key `user:online:{id}` tồn tại trong Redis

**Response (`200`):**
```json
{
  "message": "OK",
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "is_online": true
  }
}
```

---

### Redis cache interface (infrastructure/cache/auth.go)

```go
// Lưu user online, TTL 5 phút
SetOnline(ctx context.Context, userID string) error

// Kiểm tra user có online không
IsOnline(ctx context.Context, userID string) (bool, error)

// Xóa khi logout
DeleteOnline(ctx context.Context, userID string) error
```

Key pattern: `user:online:{userID}`

---

## Nginx config cần thêm

Bên backend thêm location để proxy trading API:

```nginx
location /api/trading/ {
    proxy_pass http://backend;
    proxy_http_version 1.1;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```
