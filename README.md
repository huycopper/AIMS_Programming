# AIMS (An Internet Media Store) - Group 20

Hệ thống bán hàng trực tuyến cho các sản phẩm media (sách, báo, CD, DVD) được phát triển cho đồ án môn học.

## 1. Thông tin chung

- **Môn học**: ITSS Software Development / Software Design and Construction (IT4549E)
- **Giảng viên**: NGUYEN Thi Thu Trang
- **Repository**: [ISD.20252-20](https://github.com/lake2804/ISD.20252-20)

## 2. Thành viên nhóm

| #   | Họ và tên       | GitHub                                        | MSSV     | Use Cases Phụ trách                            |
| --- | --------------- | --------------------------------------------- | -------- | ---------------------------------------------- |
| 1   | Đồng Đại Huy    | [huycopper](https://github.com/huycopper)     | 20235945 | Pay Order (Customer/VietQR)                    |
| 2   | Hồ Ngọc Minh    | [lake2804](https://github.com/lake2804)       | 20235973 | CUD Product (Product Manager)                  |
| 3   | Ngô Duy An      | [Gitty-Pup](https://github.com/Gitty-Pup)     | 20235883 | Place Order & Add product to Cart              |
| 4   | Nguyễn Tuấn Anh | [TuanAnh975](https://github.com/TuanAnh975)   | 20235893 | Pay Order by Credit Card & Update Cart         |
| 5   | Trần Việt Anh   | [Cons1gl1er3](https://github.com/Cons1gl1er3) | 20226013 | View Product Detail (Customer/Product Manager) |

## 3. Công nghệ sử dụng

- **Frontend**: Angular (TypeScript)
- **Backend**: NestJS (TypeScript)
- **Database**: PostgreSQL

## 4. Các tính năng chính

- **Quản lý Sản phẩm**: Quản lý đa dạng các mặt hàng media (Sách, Báo, CD, DVD).
- **Giỏ hàng & Đặt hàng**: Duyệt sản phẩm, thêm vào giỏ, tính toán phí ship dựa trên khối lượng và khoảng cách.
- **Thanh toán**: Tích hợp cổng thanh toán VietQR (mặc định) và PayPal (lựa chọn thay thế).
- **Phân quyền**: Hỗ trợ nhiều vai trò bao gồm Khách hàng, Product Manager, và Administrator.

## 5. Hướng dẫn cài đặt và chạy dự án

### Yêu cầu hệ thống

- Node.js
- PostgreSQL
- Angular CLI
- Nest CLI

### Chạy Backend (NestJS)

Trước khi chạy backend, bạn cần tạo file cấu hình môi trường `.env`. Hãy sao chép từ file mẫu đã có sẵn:

```bash
cd backend
cp .env.example .env
```

Vui lòng mở file `.env` và chỉnh sửa các thông số cấu hình cơ sở dữ liệu (database credentials) cho phù hợp với PostgreSQL của bạn. Sau đó, chạy các lệnh sau để cài đặt và khởi động server:

```bash
npm install
npm run start:dev
```

### Chạy Frontend (Angular)

```bash
cd frontend
npm install
npm start
```

### Nạp Data mẫu (Tùy chọn)

> **Lưu ý quan trọng**: Trước khi có thể nạp dữ liệu, bạn **bắt buộc phải tạo một cơ sở dữ liệu trống** (database) trong PostgreSQL trước. Tên của database cần khớp với biến `DB_DATABASE` trong file `.env` của bạn (ví dụ: `aims_db`).

Sau khi database đã được tạo, bạn có thể chạy lệnh sau trong thư mục `backend` để khởi tạo dữ liệu sản phẩm demo:

```bash
npm run seed
```

## 6. Cấu trúc thư mục mã nguồn

- `frontend/`: Chứa mã nguồn ứng dụng web giao diện người dùng bằng Angular.
- `backend/`: Chứa mã nguồn máy chủ API bằng NestJS.
- `Context/`: Chứa các tài liệu phân tích thiết kế, đặc tả yêu cầu, Use Case và các tài liệu bối cảnh (context) khác của hệ thống.
- `_bmad/` & `_bmad-output/`: Các thư mục được hệ thống tác vụ tự động AI (AI Agents / BMad skills) sử dụng để lưu trữ trạng thái làm việc, thông tin đầu vào và kết quả đầu ra (artifacts, code generation,...) trong quá trình hỗ trợ viết mã và phân tích.
