# BaoBao POS V6 — deploy-ready

Bản này đã được chuẩn bị để đi theo **2 chế độ**:

- **Local/dev nhanh**: vẫn chạy như trước bằng frontend Vite + backend Express, dữ liệu lưu bằng JSON để test ngay trên PC và iPhone cùng Wi‑Fi.
- **Deploy nội bộ thật**: dùng **PostgreSQL** qua biến môi trường `DATABASE_URL`, backend sẽ tự khởi tạo bảng và seed dữ liệu lần đầu. Frontend build xong sẽ được backend phục vụ luôn, nên khi lên mạng chỉ cần **1 app URL**.

## Những gì đã sẵn sàng ở V6
- Chủ shop: toàn quyền
- Trợ lý: lên đơn + xem đơn + nhập hàng
- Giá nhập để tính lợi nhuận
- Doanh thu ngày / tuần / tháng
- Lịch sử nhập hàng có ngày giờ tự động
- Frontend production dùng chung domain với backend (`/api` same-origin)
- Hỗ trợ `DATABASE_URL` để đưa dữ liệu lên PostgreSQL
- Có sẵn `Dockerfile` và `docker-compose.yml`

## Tài khoản seed mặc định
Tài khoản được seed theo biến môi trường. Nếu bạn không truyền biến môi trường riêng, app sẽ dùng mặc định:

- Boss username: `vinper619623`
- Assistant username: `baobao619623`

> Mật khẩu được lấy từ biến môi trường trong `backend/.env.example` hoặc `docker-compose.yml`.
> Khi đưa app lên mạng, nên đổi lại ngay.

## Chạy local nhanh (giữ kiểu cũ)
### 1) Cài package
```bash
npm install
npm run install:all
```

### 2) Chạy backend (JSON local)
```bash
cd backend
npm run dev
```

### 3) Chạy frontend
```bash
cd frontend
npm run dev -- --host
```

- Backend: `http://localhost:4000`
- Frontend: `http://localhost:5173`

Trên iPhone cùng Wi‑Fi, mở:
```text
http://IP-MAY-TINH:5173
```

## Chạy production local bằng Docker (khuyên dùng khi muốn có bộ nhớ thật)
Yêu cầu: máy có Docker Desktop.

### 1) Chạy toàn bộ app + Postgres
```bash
docker compose up --build
```

### 2) Mở app
```text
http://localhost:4000
```

Ở mode này:
- frontend đã build sẵn
- backend và frontend dùng chung 1 cổng
- dữ liệu được giữ trong Postgres volume `postgres_data`

## Deploy lên host bất kỳ
Bạn có thể deploy lên bất kỳ nơi nào hỗ trợ Node + Postgres hoặc Docker.

### Cách tối giản
- Build command:
```bash
npm install && npm run install:all && npm run build
```
- Start command:
```bash
npm start
```
- Env cần có tối thiểu:
```env
PORT=4000
HOST=0.0.0.0
NODE_ENV=production
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/baobao_pos
BOSS_USERNAME=vinper619623
BOSS_PASSWORD=Vinper.619623!
BOSS_NAME=Sang
ASSISTANT_USERNAME=baobao619623
ASSISTANT_PASSWORD=Baobaoshop
ASSISTANT_NAME=Trợ lý BaoBao
STORE_NAME=BaoBao POS
STORE_PHONE=0824 005 119
STORE_ADDRESS=BaoBao Pijama
INVOICE_FOOTER=Cảm ơn bạn đã mua hàng tại BaoBao 💖
```

## Cấu trúc chính
- `backend/src/server.js`: API + phục vụ frontend build trong production
- `backend/src/db.js`: tự chọn Postgres hoặc JSON local
- `backend/src/postgresStore.js`: logic PostgreSQL
- `backend/src/jsonStore.js`: fallback local để test nhanh
- `frontend/src`: giao diện React/Vite
- `Dockerfile`: đóng gói 1 app production
- `docker-compose.yml`: chạy app + Postgres cùng nhau

## Ghi chú
- Nếu **có `DATABASE_URL`**: app dùng PostgreSQL
- Nếu **không có `DATABASE_URL`**: app dùng JSON local để test nhanh
- File reset dữ liệu `npm --prefix backend run reset` chỉ dành cho mode JSON local
