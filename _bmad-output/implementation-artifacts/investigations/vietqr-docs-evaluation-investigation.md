# Investigation: Đánh giá tài liệu VietQR cho Story 3_2

## Hand-off Brief

1. **What happened.** Người dùng yêu cầu đánh giá bộ tài liệu tích hợp VietQR (trong `Context/vietqr-docs`) xem có đủ thông tin để tích hợp backend cho story 3_2 hay chưa.
2. **Where the case stands.** Đã đọc toàn bộ 4 file tài liệu. Phát hiện thiếu một số thông tin quan trọng về cấu hình, thông tin xác thực Sandbox và payload của Webhook (Transaction Sync).
3. **What's needed next.** Cần cung cấp thêm các thông tin còn thiếu (đặc biệt là schema của API Transaction Sync và thông tin tài khoản test) để có thể bắt đầu code.

## Case Info

| Field            | Value                                                                      |
| ---------------- | -------------------------------------------------------------------------- |
| Ticket           | N/A                                                       |
| Date opened      | 2026-06-01                                                                     |
| Status           | Active                                                                     |
| System           | Backend (NestJS)                                |
| Evidence sources | Thư mục `Context/vietqr-docs` (4 files markdown)        |

## Problem Statement

Mục tiêu là đánh giá xem bộ tài liệu VietQR hiện có đã đủ thông tin kỹ thuật (endpoints, body/header, credentials, luồng callback) để tích hợp gọi API VietQR vào hệ thống backend hiện tại cho story 3_2 hay chưa. Cần liệt kê rõ các thông tin hoặc tài nguyên còn thiếu.

## Evidence Inventory

| Source   | Status                          | Notes     |
| -------- | ------------------------------- | --------- |
| `1-APIGetToken.md` | Available | Mô tả API do đối tác (mình) cung cấp để VietQR lấy token. |
| `2-CallAPIGetToken.md` | Available | Mô tả API gọi sang VietQR để lấy access token của VietQR. |
| `3-CallAPIGenerateQRCode.md` | Available | Mô tả API tạo mã QR thanh toán (động, bán động, tĩnh). |
| `4-CallAPITestCallback.md` | Available | Mô tả API để trigger test callback từ VietQR sang hệ thống của mình. |

## Confirmed Findings

### Finding 1: Có đủ thông tin để gọi API tạo QR và lấy Token
**Evidence:** `2-CallAPIGetToken.md` và `3-CallAPIGenerateQRCode.md`
**Detail:** Đã có đầy đủ URL (môi trường dev/prod), Headers, Body schema và Response schema cho việc gọi sang VietQR để lấy Token và tạo mã QR.

### Finding 2: Thiếu tài khoản Sandbox (Credentials)
**Evidence:** `2-CallAPIGetToken.md`
**Detail:** Tài liệu ghi "Username và Password do VietQR cung cấp khi đăng ký tích hợp". Hiện tại trong docs chỉ có thông tin base64 mẫu (`customer-vietqrtest-user2468`). Để code và test chạy thật trên Sandbox, cần có thông tin đăng nhập thật. Ngoài ra, thiếu thông tin về tài khoản ngân hàng thụ hưởng (bankCode, bankAccount, userBankName) hợp lệ để test.

### Finding 3: Thiếu schema của API Transaction Sync (Callback)
**Evidence:** `1-APIGetToken.md` và `4-CallAPITestCallback.md`
**Detail:** Tài liệu yêu cầu mình phải dựng một "API Transaction Sync" để nhận callback từ VietQR. Tuy nhiên, KHÔNG có file nào mô tả payload (Request Body, Headers) mà VietQR sẽ POST sang API này. Việc này khiến chúng ta không thể code được logic xử lý và validate callback (như signature verification nếu có).

### Finding 4: Thiếu hướng dẫn cấu hình Webhook URL
**Evidence:** `4-CallAPITestCallback.md`
**Detail:** Tài liệu đề cập "API Test Callback sẽ gửi yêu cầu HTTP POST đến endpoint của API Transaction Sync mà bạn đã cấu hình". Tuy nhiên, không có thông tin về việc làm sao để cấu hình URL này (cấu hình trên CMS/Portal của VietQR hay truyền qua tham số API nào?).

### Finding 5: Cần cấu hình public URL / IP
**Detail:** Để VietQR có thể callback về API Transaction Sync của mình khi chạy local/dev, mình sẽ cần cấu hình mạng (ví dụ sử dụng ngrok) để có public URL và phải biết VietQR có yêu cầu Whitelist IP hay không.

## Missing Evidence

| Gap              | Impact                               | How to Obtain   |
| ---------------- | ------------------------------------ | --------------- |
| Schema của Webhook (Transaction Sync API) | Không thể code được logic xử lý IPN/Callback để cập nhật trạng thái đơn hàng. | Yêu cầu tài liệu bổ sung từ VietQR. |
| Credentials Sandbox (Username, Password, Bank Account) | Không thể gọi API thật để kiểm thử. | Lấy từ tài khoản đã đăng ký trên VietQR Portal. |
| Cách thiết lập Callback URL | Không thể nhận callback từ VietQR. | Cấu hình trên Portal của VietQR hoặc xem thêm tài liệu. |

## Conclusion

**Confidence:** High

Bộ tài liệu hiện tại **CHƯA ĐỦ** để hoàn thiện toàn bộ luồng tích hợp. Chúng ta có thể code được một nửa luồng (gọi API lấy Token và tạo QR), nhưng sẽ bị block ở phần xử lý Webhook (Callback) do thiếu hoàn toàn schema dữ liệu đầu vào. Hơn nữa, cũng chưa có thông tin tài khoản thật để test sandbox.

## Recommended Next Steps

### Fix direction
1. Cần bổ sung tài liệu về Webhook/IPN: Schema của Request Body, Header, cách tính toán chữ ký (nếu có) để verify request đến từ VietQR.
2. Cần cung cấp các credentials cho Sandbox: Username, Password, `bankCode`, `bankAccount` để test.
3. Cần xác nhận cách cấu hình Callback URL trên hệ thống VietQR.
4. Cần cài đặt công cụ public local port (như ngrok, localtunnel) để test callback khi code ở local.

## Follow-up: 2026-06-02

### Cập nhật tình hình bằng chứng (New Findings)
- **Đã giải quyết blocker lớn nhất (Schema Webhook):** File `2-APITransactionSync.md` đã cung cấp schema chi tiết cho API nhận Callback (Transaction Sync):
  - **Header:** Yêu cầu `Authorization: Bearer <token>`. Đặc biệt, token này là JWT và backend cần xác thực bằng một `SECRET_KEY` (hiện trong tài liệu mẫu là `your-256-bit-secret`).
  - **Body:** Đã có đầy đủ các field (`transactionid`, `amount`, `bankaccount`, `orderId`, `content`, `sign`...).
  - **Response:** Backend cần trả về HTTP 200 với `reftransactionid` khi thành công, hoặc HTTP 400 khi lỗi.
- **Luồng nghiệp vụ đã rõ ràng hơn:** File `mô tả luồng nghiệp vụ API.md` làm rõ 3 bước: Lấy Token -> Tạo QR -> Dùng API Test Callback để giả lập giao dịch thành công.

### Bằng chứng vẫn còn thiếu (Remaining Gaps)
1. **SECRET_KEY thực tế:** Để xác thực JWT gửi đến Webhook, chúng ta cần `SECRET_KEY` từ VietQR (tài liệu đang để `your-256-bit-secret`).
2. **Credentials Sandbox chuẩn xác:** Mặc dù trong file `4-CallAPIGetToken.md` có một chuỗi Base64 authorization trong lệnh cURL, chúng ta vẫn cần xác nhận `bankCode` và `bankAccount` thụ hưởng nào có thể dùng để test.
3. **Cấu hình Callback URL:** Tài liệu chưa nói rõ cách thức cấu hình URL webhook lên hệ thống VietQR (qua giao diện portal hay cấu hình cứng?).

### Kết luận cập nhật (Updated Conclusion)
**Confidence:** Medium-High
Với bộ tài liệu hiện tại, **đã hoàn toàn đủ cơ sở để code và unit test toàn bộ luồng tích hợp (cả phần gọi API lẫn phần nhận Webhook)**. Việc tích hợp không còn bị block. Chúng ta có thể dùng Mock data hoặc dùng thử Credentials trong cURL để code. Các thông tin còn thiếu (Secret key, Sandbox account thật, Callback config) chỉ là tham số môi trường (Environment variables) dùng cho giai đoạn kiểm thử tích hợp (Integration Test) thực tế.
