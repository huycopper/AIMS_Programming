# AIMS Programming Project

**AIMS** (An Internet Media Store) là hệ thống bán hàng trực tuyến dành riêng cho các sản phẩm media (sách, báo, CD, DVD).
Đây là dự án trong học phần **ITSS Software Development (IT4549E)** tại SOICT-HUST.

Dự án này áp dụng mô hình phân lớp hiện đại với **Backend** xây dựng bằng **Node.js/NestJS**, **Frontend** sử dụng **Angular**, và cơ sở dữ liệu quan hệ **PostgreSQL**. Ngoài ra, hệ thống còn được tích hợp các nền tảng thanh toán bên thứ ba là **VietQR Sandbox** và **PayPal Sandbox**.

### Phân quyền và Chức năng cốt lõi

1. **Khách hàng (Customer)**
   - Không yêu cầu đăng nhập.
   - Duyệt, tìm kiếm và lọc các sản phẩm.
   - Thêm sản phẩm vào giỏ hàng, cập nhật số lượng, đặt hàng.
   - Nhập thông tin giao hàng, xem hóa đơn và thanh toán qua mã QR (VietQR) hoặc thẻ tín dụng (PayPal).
   - Hủy các đơn hàng đang chờ duyệt (thông qua link gửi qua email).

2. **Quản lý sản phẩm (Product Manager)**
   - Yêu cầu đăng nhập.
   - Thêm, xem, chỉnh sửa thông tin hoặc xóa các sản phẩm media.
   - Điều chỉnh số lượng sản phẩm trong kho thủ công (bắt buộc nhập lý do).
   - Xem danh sách và duyệt / từ chối các đơn đặt hàng.
   - _Lưu ý_: Chỉ được phép xóa tối đa 10 sản phẩm 1 lần, và sản phẩm phải có số lượng bằng 0.

3. **Quản trị viên (Administrator)**
   - Yêu cầu đăng nhập.
   - Tạo mới, xem, vô hiệu hóa, khóa/mở khóa tài khoản.
   - Phân quyền người dùng và thiết lập lại mật khẩu.

## Prerequisites

Before running the project, make sure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [PostgreSQL](https://www.postgresql.org/) (Ensure the database service is running locally)
- [Ngrok](https://ngrok.com/) (Required for local VietQR webhook testing)

---

## 1. Backend Setup

The backend API is built using [NestJS](https://nestjs.com/) and uses TypeORM to connect to PostgreSQL.

1. **Navigate to the backend directory:**

   ```bash
   cd backend
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Environment Configuration:**
   - Create a PostgreSQL database (e.g., `aims_db`).
   - Copy the example environment file:
     ```bash
     cp .env.example .env
     ```
   - Open the `.env` file and update your PostgreSQL credentials (`DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`, `DB_PORT`).
   - _Note: You can also configure your VietQR and SMTP Email credentials here._

4. **Seed the Database (Optional but recommended):**
   To populate the database with initial products, admin, and staff accounts, run:

   ```bash
   npm run seed
   npm run seed:staff
   ```

5. **Start the Backend Server:**

   ```bash
   npm run start:dev
   ```

   The backend will start and listen on port `8080` by default.

---

## 2. Frontend Setup

The user interface is built using [Angular](https://angular.dev/) and TailwindCSS.

1. **Navigate to the frontend directory:**

   ```bash
   cd frontend
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Start the Frontend Application:**

   ```bash
   npm run start
   ```

   The Angular development server will start. Open your browser and navigate to `http://localhost:4200/`.

---

## 3. VietQR Webhooks (Local Testing)

For the VietQR service to send payment confirmation callbacks to your local backend, you need to expose your local server to the internet using Ngrok.

1. Ensure your backend is running on port `8080` (`npm run start:dev` in the `backend` folder).
2. Open a new terminal and run:
   ```bash
   ngrok http 8080
   ```
3. Copy the forwarding HTTPS URL provided by Ngrok (e.g., `https://<random-id>.ngrok-free.app`).
4. Update your VietQR configurations/sandbox to point the callback webhook to this ngrok URL so the system can receive payment confirmations locally.
