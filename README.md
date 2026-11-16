# Dữ liệu Công

Website React/Vite bằng tiếng Việt, gồm giao diện public và khu vực Admin. Dữ liệu hồ sơ và ảnh đính kèm của luồng public được lưu cục bộ trong trình duyệt bằng `localStorage`; website không gửi các hồ sơ này lên máy chủ trong luồng public hiện tại.

> **Lưu ý nhận diện:** Cổng dữ liệu quốc gia,website chính thức của cơ quan nhà nước. Khi triển khai thực tế, giữ nguyên thông tin nhận diện và chỉ sử dụng dữ liệu thử nghiệm, không nhập dữ liệu cá nhân thật.

## Repository

- GitHub: <https://github.com/dichvucong/Dichvucongquocgia>
- Nhánh chính: `main`
- Stack: React, TypeScript, Vite, Tailwind CSS, pnpm workspaces
- Website public: `artifacts/cong-dich-vu-moi`
- Giao diện Admin: `artifacts/cong-dich-vu-admin`
- API server mẫu: `artifacts/api-server`

## Cấu trúc thư mục

```text
.
├── artifacts/
│   ├── cong-dich-vu-moi/       # Frontend public được triển khai lên Vercel
│   │   ├── public/              # favicon, logo, ảnh và manifest route
│   │   ├── src/
│   │   │   ├── components/      # Component giao diện dùng chung
│   │   │   ├── lib/             # localStorage, route và tiện ích
│   │   │   └── pages/            # Trang chủ, biểu mẫu, tra cứu dữ liệu
│   │   ├── package.json
│   │   └── vite.config.ts
│   ├── cong-dich-vu-admin/     # Frontend quản trị
│   │   ├── src/pages/admin/      # Danh sách hồ sơ, thư viện ảnh và trang Admin
│   │   ├── src/lib/              # Clerk, upload và local profiles
│   │   └── vite.config.ts
│   └── api-server/              # Express/API server và mã nguồn quản lý ảnh
├── lib/
│   ├── api-client-react/        # Client API được sinh từ OpenAPI
│   ├── api-spec/                # Đặc tả API
│   ├── api-zod/                 # Schema và kiểu dữ liệu Zod
│   └── db/                      # Schema/migration cho phần server
├── scripts/
│   └── build-publish.mjs        # Build riêng website public để xuất bản tĩnh
├── app.config.ts                # Metadata project
├── package.json                 # Workspace scripts và dependencies
├── pnpm-workspace.yaml          # Khai báo workspace
├── pnpm-lock.yaml               # Khóa phiên bản dependencies
├── vercel.json                  # Cấu hình build frontend trên Vercel
└── tsconfig*.json               # Cấu hình TypeScript
```

## Yêu cầu môi trường

- Node.js LTS, khuyến nghị Node.js 20 trở lên.
- pnpm 10 hoặc 11. Repository dùng `pnpm-lock.yaml`; không dùng npm hoặc Yarn để cài dependencies.
- Git nếu muốn clone và commit thay đổi.

Kiểm tra phiên bản:

```bash
node --version
pnpm --version
```

Nếu chưa có pnpm:

```bash
corepack enable
corepack prepare pnpm@11 --activate
```

## Clone và cài dependencies

```bash
git clone https://github.com/dichvucong/Dichvucongquocgia.git
cd Dichvucongquocgia
pnpm install --frozen-lockfile --ignore-scripts
```

`--frozen-lockfile` giúp bảo đảm dependencies khớp với `pnpm-lock.yaml`. Hook `preinstall` của workspace cũng chặn việc cài bằng npm/Yarn để tránh tạo lockfile không tương thích.

## Chạy website public ở local

Vào thư mục frontend public:

```bash
cd artifacts/cong-dich-vu-moi
PORT=3000 BASE_PATH=/ pnpm exec vite --host 0.0.0.0
```

Mở trình duyệt tại:

```text
http://localhost:3000
```

Các luồng public chính:

- `/` — trang chủ.
- `/an-sinh-xa-hoi` — biểu mẫu nhập số định danh 12 chữ số và thông tin thử nghiệm.
- `/tim-du-lieu` — tra cứu hồ sơ đã lưu cục bộ.
- `/tra-cuu-du-lieu` — trang tra cứu dữ liệu.

Có thể chạy lệnh từ thư mục gốc bằng cách chỉ định filter:

```bash
pnpm --filter @workspace/cong-dich-vu-moi exec vite --host 0.0.0.0
```

## Build website public

Đây là lệnh build được khuyến nghị cho website public:

```bash
pnpm --filter @workspace/cong-dich-vu-moi build
```

Output sẽ nằm tại:

```text
artifacts/cong-dich-vu-moi/dist/public/
```

Trong output phải có:

```text
artifacts/cong-dich-vu-moi/dist/public/index.html
```

Script build dành cho xuất bản tĩnh thực hiện cùng việc này và tự đặt các biến build cần thiết:

```bash
node scripts/build-publish.mjs
```

Script đặt:

```text
NODE_ENV=production
PORT=3000
BASE_PATH=/
```

## Typecheck

Typecheck riêng frontend public:

```bash
pnpm --filter @workspace/cong-dich-vu-moi exec tsc -p tsconfig.json --noEmit
```

Typecheck Admin:

```bash
pnpm --filter @workspace/cong-dich-vu-admin exec tsc -p tsconfig.json --noEmit
```

Lệnh tổng ở root:

```bash
pnpm run typecheck
```

Lệnh tổng có thể kiểm tra cả `api-server`. Nếu API chưa được chuẩn bị đầy đủ dependency/output TypeScript, lỗi API có thể làm lệnh tổng thất bại dù frontend public vẫn build được. Khi mục tiêu là website tĩnh, dùng lệnh filter của `cong-dich-vu-moi` hoặc `node scripts/build-publish.mjs`.

## Cấu hình Vercel

File `vercel.json` đã cấu hình Vercel chỉ build frontend public, không để lỗi API/Admin chặn deployment:

```json
{
  "buildCommand": "pnpm --filter @workspace/cong-dich-vu-moi build",
  "outputDirectory": "artifacts/cong-dich-vu-moi/dist/public",
  "framework": "vite"
}
```

Khi import repository vào Vercel, giữ Root Directory là thư mục gốc của repository. Không cần thêm secret cho website public nếu chỉ dùng `localStorage`.

Nếu Vercel yêu cầu biến môi trường cho Vite, dùng:

```text
PORT=3000
BASE_PATH=/
```

Các biến bắt đầu bằng `VITE_` có thể được đưa vào bundle trình duyệt. Không đặt mật khẩu, Clerk secret hoặc API secret vào biến `VITE_`.

## Dữ liệu cục bộ và ảnh đính kèm

Luồng public dùng tiện ích tại `artifacts/cong-dich-vu-moi/src/lib/local-profile.ts` để lưu hồ sơ vào `localStorage`. Dữ liệu này chỉ tồn tại trong profile trình duyệt và thiết bị hiện tại; xóa dữ liệu trình duyệt hoặc đổi thiết bị sẽ không còn hồ sơ.

Ảnh đính kèm được xử lý ở phía trình duyệt theo luồng public. Người dùng có thể xem và tải ảnh về thiết bị. Không coi `localStorage` là nơi lưu trữ hồ sơ chính thức hoặc nơi lưu dữ liệu nhạy cảm.

## Admin và backend

`artifacts/cong-dich-vu-admin` có giao diện quản trị, Clerk và các hook gọi API đã chuẩn bị. Tuy nhiên, để Admin quản lý dữ liệu dùng chung cần triển khai backend, cấu hình Clerk, lưu trữ và database riêng. Việc deploy frontend public lên Vercel không tự bật backend hoặc database.

Các biến Clerk/API chỉ thêm trong Vercel khi backend và tài khoản dịch vụ đã được cấu hình. Không commit file `.env`, token, mật khẩu hay khóa API vào GitHub.

## Quy trình thay đổi an toàn

```bash
git checkout -b fix/ten-thay-doi
pnpm install --frozen-lockfile --ignore-scripts
pnpm --filter @workspace/cong-dich-vu-moi exec tsc -p tsconfig.json --noEmit
pnpm --filter @workspace/cong-dich-vu-moi build
git diff
git add .
git commit -m "Mo ta thay doi"
git push -u origin fix/ten-thay-doi
```

Sau khi kiểm tra branch, có thể merge vào `main` rồi Vercel sẽ tạo deployment mới từ commit đó. Luôn kiểm tra preview `.vercel.app` trước khi trỏ domain Namecheap.

## Domain Namecheap

Chỉ cấu hình domain sau khi deployment Vercel đã ở trạng thái `Ready`. Thêm domain trong Vercel trước để Vercel hiển thị đúng bản ghi DNS riêng của project. Sau đó vào Namecheap:

```text
Domain List → Manage → Advanced DNS → Host Records
```

Nhập đúng bản ghi Vercel hiển thị cho domain gốc và `www`. Không tự dùng bản ghi của project Vercel khác. Giữ các bản ghi MX/TXT/SPF/DKIM nếu domain đang dùng email.

## Tải ZIP và xuất bản

Không commit các thư mục sau:

```text
node_modules/
*/dist/
.env
.env.*
```

Khi cần tạo bản build tĩnh, chạy:

```bash
node scripts/build-publish.mjs
```

Sau đó lấy nội dung trong:

```text
artifacts/cong-dich-vu-moi/dist/public/
```

## Giấy phép và sử dụng

Mã nguồn trong repository được quản lý bởi chủ sở hữu repository. Chỉ sử dụng dữ liệu thử nghiệm và không dùng giao diện này để thu thập, xử lý hoặc lưu trữ dữ liệu cá nhân thật nếu chưa có hệ thống bảo mật, pháp lý và backend phù hợp.
