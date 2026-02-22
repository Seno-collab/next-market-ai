# API cần backend implement

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
