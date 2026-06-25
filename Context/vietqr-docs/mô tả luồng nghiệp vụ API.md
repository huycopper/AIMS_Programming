# Mô tả luồng nghiệp API

## Mô tả luồng nghiệp API VietQR

### 1. Các bước để tạo mã thanh toán VietQR:

#### • Bước 1: Lấy Token truy cập

Khách hàng (KH) cần gọi API Get Token của VietQR để thực hiện truy cập và xác thực. Sau khi xác thực thành công, VietQR sẽ trả về một token, đóng vai trò như chìa khóa để truy cập API tạo mã VietQR.

🔗 [Tham khảo API Get Token](https://api.vietqr.vn/vi/api-vietqr/goi-api-get-token)

#### • Bước 2: Tạo mã thanh toán VietQR

Sau khi nhận được token, KH sử dụng token này để gọi API tạo mã thanh toán VietQR.

🔗 [Tham khảo API tạo mã VietQR](https://api.vietqr.vn/vi/api-vietqr/goi-api-generate-vietqr-code)

#### • Bước 3: Giả lập thanh toán trong môi trường Test/Staging/Sandbox

Trong môi trường thử nghiệm, KH không cần quét mã để thanh toán thực tế. Thay vào đó, KH có thể gọi API Test Callback để giả lập giao dịch thanh toán thành công.

🔗 [Tham khảo API Test Callback](https://api.vietqr.vn/vi/api-vietqr/goi-api-test-callback)

📌 Lưu ý: Sau khi hoàn tất thanh toán, KH cần một nơi để nhận thông báo biến động số dư (BĐSD). Do đó, cần thiết lập một hệ thống tiếp nhận thông tin thanh toán.

### 📌 Tóm lại:

Quy trình bao gồm việc tạo mã thanh toán VietQR, giả lập thanh toán (trong môi trường test), và xây dựng hệ thống tiếp nhận dữ liệu thanh toán/BĐSD để đảm bảo thông tin giao dịch được ghi nhận đầy đủ.
