# Mã nguồn dichvucongsd.com — website và Admin

Gói này chứa mã nguồn của website công khai **Cổng thông tin dịch vụ**, website Admin riêng, API và các thư viện dùng chung.

## Cấu trúc

- `artifacts/cong-dich-vu-moi`: website công khai, phục vụ tại `/`.
- `artifacts/cong-dich-vu-admin`: website quản trị độc lập, phục vụ tại `/admin/`.
- `artifacts/api-server`: API dùng chung, phục vụ dưới `/api`.
- `lib/api-client-react`, `lib/api-zod`, `lib/api-spec`, `lib/db`: mã client, hợp đồng API, kiểu dữ liệu và schema CSDL dùng chung.

Gói chỉ bao gồm mã nguồn và tài nguyên giao diện tĩnh. Không bao gồm `node_modules`, bản build, khóa bí mật, dữ liệu cơ sở dữ liệu hoặc ảnh đã tải lên/công bố trong Object Storage.

## Chạy trong workspace pnpm

1. Giải nén toàn bộ thư mục vào gốc một workspace pnpm mới.
2. Dùng Node.js và pnpm tương thích với môi trường dự án; chạy `pnpm install`.
3. Tạo lại các dịch vụ/artifact trong dự án Replit mới. Cấu hình đường dẫn `/`, `/admin/`, `/api` và các biến `PORT`, `BASE_PATH` theo dịch vụ tương ứng. Các cấu hình artifact của dự án cũ không nằm trong gói vì ID dịch vụ thuộc dự án Replit cũ.
4. Thiết lập PostgreSQL và chạy cập nhật schema theo hướng dẫn nội bộ của dự án (`pnpm --filter @workspace/db run push`). Không chạy migration trên cơ sở dữ liệu đang có nếu chưa sao lưu và xác nhận môi trường đích.
5. Kết nối Clerk và Object Storage của dự án mới, sau đó thêm các biến cần thiết qua Replit Secrets/Environment Variables — **không đưa giá trị bí mật vào mã nguồn**.
6. Chạy API, website công khai và Admin bằng các lệnh `dev` trong package tương ứng.

## Cấu hình cần thiết

Tên biến được mã nguồn tham chiếu (chỉ là tên, không kèm giá trị):

- API/đăng nhập/quyền Admin: `DATABASE_URL`, `ADMIN_EMAILS`, `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PROXY_URL`.
- Lưu ảnh: `PUBLIC_OBJECT_SEARCH_PATHS`, `PRIVATE_OBJECT_DIR`.
- Chạy Vite: `PORT`, `BASE_PATH`.

`DATABASE_URL` và khóa Clerk phải được cấu hình bằng Secrets ở dự án đích. Tạo mới kho Object Storage và cấu hình lại đường dẫn; ảnh đã công bố trong dự án cũ không được đóng gói.

## Lưu ý về dữ liệu

Website công khai vẫn hiển thị cảnh báo không phải hệ thống chính thức. Biểu mẫu An sinh xã hội trong mã nguồn chỉ tạo bản xem trước trên trình duyệt, không gửi/lưu dữ liệu cá nhân và dùng số định danh ví dụ cố định. Không dùng trang này để thu thập hoặc tra cứu CCCD thật.
