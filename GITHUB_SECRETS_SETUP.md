# GitHub Secrets Setup Guide

Hướng dẫn cấu hình secrets cho GitHub Actions deployment.

## Bước 1: Truy cập GitHub Secrets

1. Vào repository của bạn trên GitHub
2. Click **Settings** (ở góc phải)
3. Trong sidebar bên trái, click **Secrets and variables** → **Actions**
4. Click nút **New repository secret**

## Bước 2: Thêm các Secrets bắt buộc

### 1. NEXT_PUBLIC_API_URL (BẮT BUỘC)

URL của backend API cho production.

```
Name: NEXT_PUBLIC_API_URL
Value: https://api.yourdomain.com
```

**Ví dụ:**
- `https://api.example.com`
- `https://api.production.yourapp.com`
- `http://157.66.218.138:8080`

**⚠️ LƯU Ý:**
- URL này sẽ được nhúng vào JavaScript bundle khi build
- Nếu thay đổi URL, phải rebuild lại Docker image
- Không thể thay đổi URL ở runtime

### 2. DOCKERHUB_USERNAME (BẮT BUỘC)

Username của Docker Hub account.

```
Name: DOCKERHUB_USERNAME
Value: your-dockerhub-username
```

### 3. DOCKERHUB_TOKEN (BẮT BUỘC)

Access token của Docker Hub (không phải password).

**Cách tạo Docker Hub token:**
1. Đăng nhập vào https://hub.docker.com
2. Click vào avatar → **Account Settings**
3. Click **Security** → **New Access Token**
4. Đặt tên (ví dụ: "github-actions")
5. Copy token và lưu vào GitHub Secret

```
Name: DOCKERHUB_TOKEN
Value: dckr_pat_xxxxxxxxxxxxxxxxxxxxx
```

### 4. SERVER_HOST (BẮT BUỘC)

IP hoặc domain của server production.

```
Name: SERVER_HOST
Value: 123.456.789.012
```

hoặc

```
Value: server.yourdomain.com
```

### 5. SERVER_USER (BẮT BUỘC)

Username SSH để login vào server.

```
Name: SERVER_USER
Value: root
```

hoặc tên user khác như `ubuntu`, `admin`, v.v.

### 6. SERVER_SSH_KEY (BẮT BUỘC)

Private SSH key để connect vào server.

**Cách lấy SSH key:**

```bash
# Trên server, tạo SSH key mới (nếu chưa có)
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions

# Copy private key
cat ~/.ssh/github_actions

# Copy public key vào authorized_keys
cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys
```

Paste nội dung của **private key** vào GitHub Secret:

```
Name: SERVER_SSH_KEY
Value:
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
[... toàn bộ nội dung private key ...]
-----END OPENSSH PRIVATE KEY-----
```

## Bước 3: Thêm các Secrets tùy chọn

### DEPLOYMENT_URL (Khuyến nghị)

URL của frontend sau khi deploy, dùng để health check.

```
Name: DEPLOYMENT_URL
Value: https://yourapp.com
```

Nếu có secret này, GitHub Actions sẽ tự động kiểm tra xem app có chạy đúng không sau khi deploy.

### SERVER_PORT (Tùy chọn)

Port SSH của server (mặc định: 22).

```
Name: SERVER_PORT
Value: 22
```

Chỉ cần thêm nếu server dùng port SSH khác 22.

### SERVER_ENV_FILE (Tùy chọn)

Đường dẫn tới file .env trên server (nếu cần runtime env vars).

```
Name: SERVER_ENV_FILE
Value: /home/user/.env.production
```

**Lưu ý:** Với standalone build, NEXT_PUBLIC_API_URL đã được nhúng vào bundle nên thường không cần file này.

### STAGING_API_URL (Tùy chọn)

URL API cho staging environment.

```
Name: STAGING_API_URL
Value: https://api.staging.yourdomain.com
```

## Bước 4: Kiểm tra cấu hình

Sau khi thêm xong, bạn sẽ thấy danh sách secrets:

```
✅ NEXT_PUBLIC_API_URL
✅ DOCKERHUB_USERNAME
✅ DOCKERHUB_TOKEN
✅ SERVER_HOST
✅ SERVER_USER
✅ SERVER_SSH_KEY
✅ DEPLOYMENT_URL (optional)
✅ SERVER_PORT (optional)
```

## Bước 5: Test Deployment

1. Push code lên branch `main`:
   ```bash
   git push origin main
   ```

2. Vào tab **Actions** trên GitHub để xem workflow chạy

3. Nếu thành công, bạn sẽ thấy:
   - ✅ Build and push image
   - ✅ Deploy to server
   - ✅ Health check passed

## Xử lý lỗi thường gặp

### ❌ "NEXT_PUBLIC_API_URL secret is not set"

**Nguyên nhân:** Chưa thêm NEXT_PUBLIC_API_URL vào Secrets.

**Cách fix:** Thêm secret theo hướng dẫn ở Bước 2.

### ❌ "Permission denied (publickey)"

**Nguyên nhân:** SSH key không đúng hoặc chưa thêm public key vào server.

**Cách fix:**
```bash
# Trên server
cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### ❌ "Health check failed"

**Nguyên nhân:** App chưa start kịp hoặc DEPLOYMENT_URL sai.

**Cách fix:**
1. Kiểm tra DEPLOYMENT_URL có đúng không
2. Đảm bảo server có expose port 3000 (hoặc port bạn đang dùng)
3. Kiểm tra firewall/security group

### ❌ "denied: requested access to the resource is denied"

**Nguyên nhân:** Docker Hub credentials không đúng.

**Cách fix:**
1. Tạo lại Docker Hub token
2. Update DOCKERHUB_TOKEN secret
3. Đảm bảo DOCKERHUB_USERNAME đúng

## Deployment Flow

Khi push code lên `main`:

1. **GitHub Actions starts**
   - Checkout code
   - Verify NEXT_PUBLIC_API_URL is set

2. **Build Docker image**
   - Build với `--build-arg NEXT_PUBLIC_API_URL`
   - API URL được nhúng vào client bundle
   - Push image lên Docker Hub

3. **Deploy to server**
   - SSH vào server
   - Pull image mới từ Docker Hub
   - Stop container cũ
   - Start container mới

4. **Health checks**
   - Đợi 15s cho app khởi động
   - Check DEPLOYMENT_URL (10 lần, mỗi lần cách 10s)
   - Test API connectivity

5. **Done!** 🎉

## Support

Nếu gặp vấn đề, check:
1. GitHub Actions logs (tab Actions)
2. Server logs: `docker logs next-market-ai`
3. Build logs trong GitHub Actions

Hoặc tạo issue trong repository.
