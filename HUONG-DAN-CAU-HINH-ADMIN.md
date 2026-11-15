# Hướng dẫn cấu hình đăng nhập Admin

Tài liệu này hướng dẫn chạy khu vực Admin của dự án `Website kê khai` trên máy cục bộ hoặc triển khai lên Vercel. Admin gồm hai nhóm chức năng:

- **Ảnh công khai:** upload, xem trước, công khai, ẩn và xóa ảnh thông qua API server, Clerk và Object Storage.
- **Hồ sơ cục bộ:** xem danh sách hồ sơ và ảnh đã lưu trong `localStorage` của đúng trình duyệt/thiết bị hiện tại. Dữ liệu này không tự đồng bộ sang Admin trên thiết bị khác.

> Không đưa `CLERK_SECRET_KEY`, `DATABASE_URL` hoặc thông tin bucket vào biến `VITE_*`. Mọi biến bắt đầu bằng `VITE_` được đóng gói vào JavaScript gửi cho trình duyệt.

## 1. Cấu trúc các ứng dụng

| Thành phần | Thư mục | Vai trò |
|---|---|---|
| Website công khai | `artifacts/cong-dich-vu-moi` | Biểu mẫu, lưu hồ sơ cục bộ, tra cứu bằng số định danh 12 chữ số |
| Admin frontend | `artifacts/cong-dich-vu-admin` | Đăng nhập Clerk, quản lý ảnh công khai và hồ sơ cục bộ |
| API server | `artifacts/api-server` | Xác thực Clerk, kiểm tra quyền Admin, upload và quản lý ảnh |
| Thư viện dùng chung | `lib/*` | API client, schema và database schema |

Admin frontend gọi các endpoint tương đối dưới `/api`. Vì vậy cách triển khai ổn định nhất là phục vụ frontend và API dưới cùng một origin, hoặc cấu hình rewrite `/api/*` từ frontend sang API server.

## 2. Chuẩn bị Clerk

1. Tạo một ứng dụng Clerk mới trong tài khoản Clerk của bạn.
2. Bật phương thức đăng nhập cần dùng, tối thiểu là email + mật khẩu hoặc email verification.
3. Lấy hai giá trị:
   - **Publishable key**: dùng ở frontend.
   - **Secret key**: chỉ dùng ở API server.
4. Thêm domain local và domain production vào phần allowed origins/redirects của Clerk, ví dụ:
   - `http://localhost:4174`
   - `https://admin.example.com`
5. Xác minh email tài khoản Admin trước khi đăng nhập.

Trong backend, quyền quản trị được cấp nếu một trong hai điều kiện đúng:

- User có `publicMetadata.role = "admin"`; hoặc
- Email đã xác minh nằm trong biến `ADMIN_EMAILS`.

Để bắt đầu đơn giản, dùng `ADMIN_EMAILS`. Không cho phép toàn bộ user đăng ký tự động trở thành Admin.

## 3. Biến môi trường

### 3.1. Admin frontend

Tạo file `.env.local` trong thư mục gốc dự án hoặc khai báo trong môi trường build của frontend:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxx
# Chỉ cần khi dùng Clerk proxy qua cùng domain.
# Nếu bỏ trống, Clerk dùng Frontend API mặc định.
VITE_CLERK_PROXY_URL=/api/__clerk
```

`BASE_URL` không cần tự khai báo khi chạy Vite; script chạy Admin sẽ truyền giá trị `/admin/` khi cần.

### 3.2. API server

Tạo `.env` riêng cho API server. Không commit file này lên Git:

```env
NODE_ENV=production
PORT=3000

CLERK_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxx
ADMIN_EMAILS=admin@example.com,backup-admin@example.com

DATABASE_URL=mysql://user:password@host:3306/database

# Object Storage dùng cho ảnh công khai.
# Mỗi giá trị là đường dẫn bucket theo format mà hệ thống Object Storage cấp.
PUBLIC_OBJECT_SEARCH_PATHS=public/images
PRIVATE_OBJECT_DIR=private/uploads

LOG_LEVEL=info
```

`ADMIN_EMAILS` là danh sách phân tách bằng dấu phẩy. Email phải được xác minh trong Clerk. Nếu không khai báo biến này và cũng không gán `publicMetadata.role = "admin"`, API sẽ trả về lỗi chưa được cấp quyền.

## 4. Chạy cục bộ

Từ thư mục gốc dự án:

```bash
pnpm install --frozen-lockfile
pnpm exec tsc -b lib/db lib/api-client-react lib/api-zod --force
```

### Chạy API server

```bash
pnpm --filter @workspace/api-server dev
```

API server đọc các biến trong `.env` của môi trường shell. Kiểm tra endpoint sức khỏe hoặc gọi một endpoint `/api` phù hợp trước khi chạy frontend.

### Chạy Admin frontend

Mở terminal thứ hai:

```bash
PORT=4174 BASE_PATH=/admin/ \
  pnpm --filter @workspace/cong-dich-vu-admin dev
```

Mở:

```text
http://localhost:4174/admin/
```

Đường dẫn chính sau khi đăng nhập:

- `/admin/images`: quản lý ảnh công khai.
- `/admin/profiles`: quản lý hồ sơ và ảnh cục bộ trên trình duyệt hiện tại.

Nếu chạy Admin ở root thay vì `/admin/`, dùng `BASE_PATH=/` và mở `http://localhost:4174/`.

### Kiểm tra type và build

```bash
pnpm --filter @workspace/cong-dich-vu-admin typecheck
PORT=4174 BASE_PATH=/admin/ pnpm --filter @workspace/cong-dich-vu-admin build
```

## 5. Triển khai lên Vercel

Có hai cách triển khai. Cách A dễ vận hành hơn vì tách frontend và API; cách B chỉ phù hợp khi bạn đã chuyển Express API sang Vercel Functions.

### Cách A — hai project Vercel

#### Project 1: Admin frontend

1. Import repository vào Vercel.
2. Đặt **Root Directory** là thư mục repository.
3. Dùng build command:

```bash
pnpm install --frozen-lockfile && pnpm --filter @workspace/cong-dich-vu-admin build
```

4. Đặt output directory:

```text
artifacts/cong-dich-vu-admin/dist/public
```

5. Khai báo:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxxx
VITE_CLERK_PROXY_URL=https://api.example.com/api/__clerk
```

6. Nếu frontend chạy tại `https://admin.example.com`, thêm domain này vào Clerk.

#### Project 2: API server

API hiện tại là Express server chạy lâu dài, không phải Vercel Function thuần. Bạn có thể:

- Chạy API trên một container/Node host có listener cố định rồi để Vercel frontend gọi qua rewrite; hoặc
- Viết adapter Vercel Function cho Express trước khi triển khai.

Với host Node/container, lệnh production là:

```bash
pnpm install --frozen-lockfile
pnpm exec tsc -b lib/db lib/api-client-react lib/api-zod --force
pnpm --filter @workspace/api-server build
pnpm --filter @workspace/api-server start
```

API phải lắng nghe `0.0.0.0` và tôn trọng biến `PORT` do nền tảng cung cấp. Khai báo toàn bộ biến backend ở mục 3.2 trong phần Environment Variables của host.

#### Rewrite `/api`

Nếu dùng cùng domain frontend, thêm rewrite để `/api/*` chuyển tới API. Ví dụ `vercel.json` ở root frontend:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://api.example.com/api/:path*"
    }
  ]
}
```

Không dùng rewrite này nếu API đã chạy cùng origin. Khi dùng API khác origin, Clerk cookie/CORS phải được cấu hình tương thích; ưu tiên same-origin proxy để giảm lỗi cookie cross-site.

### Cách B — một project Vercel với Function

Cách này cần một adapter riêng, ví dụ `api/[...path].ts`, để khởi tạo Express và chuyển request vào app. Không copy trực tiếp `dist/index.mjs` thành một static file. Trước khi dùng cách này cần kiểm tra:

- `@clerk/express` chạy được trong runtime Vercel.
- Object Storage có thể ký URL trong môi trường serverless.
- Database có connection pooling phù hợp.
- Các biến bí mật chỉ nằm ở Vercel server environment, không nằm ở frontend.
- Các endpoint upload không vượt giới hạn body/time của Vercel.

Nếu chưa có adapter và kiểm thử đầy đủ, dùng Cách A.

## 6. Cấu hình Object Storage cho ảnh công khai

Khu vực `/admin/images` không lưu ảnh vào `localStorage`; ảnh công khai dùng API và Object Storage. Cần tạo bucket, sau đó đặt:

```env
PUBLIC_OBJECT_SEARCH_PATHS=public/images
PRIVATE_OBJECT_DIR=private/uploads
```

Không upload ảnh giấy tờ tùy thân, ảnh chứa thông tin cá nhân hoặc hồ sơ riêng tư vào khu vực **Ảnh công khai**. Ảnh đã công khai có thể được nhiều người truy cập.

## 7. Hồ sơ cục bộ và ảnh hồ sơ

Trang `/admin/profiles` dùng cùng khóa `localStorage` với website công khai:

```text
independent-service-local-profiles
```

Vì vậy Admin chỉ thấy hồ sơ khi:

- Admin frontend và website công khai cùng origin; và
- Người dùng đã tạo hồ sơ trên chính trình duyệt đó; và
- Dữ liệu trình duyệt chưa bị xóa.

Nếu cần Admin ở máy khác xem hoặc thêm ảnh vào hồ sơ người dùng, phải chuyển phần hồ sơ/ảnh sang database + object storage có quyền truy cập. Điều đó không còn là mô hình “chỉ lưu cục bộ”. Không bật đồng bộ từ xa bằng cách tự ý thay đổi frontend.

## 8. Checklist trước khi đưa lên Internet

- [ ] `CLERK_SECRET_KEY` không xuất hiện trong frontend bundle.
- [ ] `ADMIN_EMAILS` chỉ chứa email Admin đã xác minh.
- [ ] API trả `401` khi chưa đăng nhập và `403` khi tài khoản không có quyền.
- [ ] Frontend gọi được `/api` qua cùng origin hoặc rewrite đã cấu hình.
- [ ] Clerk allowed origins/redirects có domain production.
- [ ] Object Storage đã có `PUBLIC_OBJECT_SEARCH_PATHS` và `PRIVATE_OBJECT_DIR`.
- [ ] Ảnh công khai không chứa dữ liệu riêng tư.
- [ ] Hồ sơ cục bộ được hiểu đúng là chỉ tồn tại trên từng trình duyệt.
- [ ] Chạy thành công:

```bash
pnpm --filter @workspace/cong-dich-vu-admin typecheck
PORT=4174 BASE_PATH=/admin/ pnpm --filter @workspace/cong-dich-vu-admin build
```

## 9. Lỗi thường gặp

### `Clerk: Failed to load Clerk JS`

Kiểm tra publishable key, domain đã được thêm vào Clerk và `VITE_CLERK_PROXY_URL` có trỏ đúng proxy. Khi chạy local, không dùng proxy production nếu API local chưa có route `/api/__clerk`.

### `401 Vui lòng đăng nhập`

Frontend chưa gửi phiên Clerk tới đúng API origin, cookie bị sai domain hoặc API đang trỏ nhầm Clerk instance.

### `403 Tài khoản chưa được cấp quyền quản trị`

Email chưa xác minh, email không nằm trong `ADMIN_EMAILS`, hoặc chưa gán `publicMetadata.role = "admin"`.

### `PUBLIC_OBJECT_SEARCH_PATHS not set`

API chưa có cấu hình bucket public. Khai báo biến môi trường và khởi động lại API.

### Admin không thấy hồ sơ

Đây thường là do Admin và website đang ở khác origin, dùng trình duyệt khác, hoặc hồ sơ đã bị xóa khỏi `localStorage`. Đây là hành vi đúng của mô hình lưu cục bộ.
