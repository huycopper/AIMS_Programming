# Gọi API Test Callback

{% hint style="danger" %}
**Lưu ý: API này chỉ có thể áp dụng ở môi trường Sandbox (TEST).**
{% endhint %}

{% hint style="success" %}
**Giả Định Giao Dịch:** Trong môi trường thử nghiệm này, API giả định rằng một giao dịch đã được hoàn thành và thanh toán.
{% endhint %}

### <mark style="color:green;">`POST-`</mark> Môi trường Dev (Test/Kiểm thử)

```
https://dev.vietqr.org/vqr/bank/api/test/transaction-callback
```

**Headers**

<table><thead><tr><th width="250">Name</th><th>Value</th></tr></thead><tbody><tr><td>Content-Type</td><td><code>application/json</code>   </td></tr><tr><td>Authorization</td><td>Bearer &#x3C;token>  bạn nhận được khi gọi API Get Token của VietQR<br><mark style="color:red;">Lưu ý: Token bạn nhận được ở môi trường Sandbox</mark></td></tr></tbody></table>

**Body**

<table data-full-width="false"><thead><tr><th width="213">Name</th><th width="92">Type</th><th width="98">Required</th><th>Description</th></tr></thead><tbody><tr><td><code>bankAccount</code></td><td>String</td><td>Yes</td><td>Tài khoản ngân hàng tạo mã thanh toán VietQR.</td></tr><tr><td><code>content</code></td><td>String</td><td>Yes</td><td>Nội dung chuyển tiền. <br>Bạn cần truyền đúng nội dung <em><strong>Response</strong></em> API tạo mã QR để đối soát giao dịch thành công</td></tr><tr><td><code>amount</code></td><td>Long</td><td>Yes</td><td>Số tiền.<br>Bạn cần truyền đúng số tiền <em><strong>Response</strong></em> API tạo mã QR để đối soát giao dịch thành công với mã QR động (qrType = 0) hoặc số tiền bất kỳ với loại qr khác</td></tr><tr><td><code>transType</code></td><td>String</td><td>Yes</td><td>Phân loại giao dịch là ghi nợ/ghi có (giá trị: D/C). Mặc định là “C”.</td></tr><tr><td><code>bankCode</code></td><td>String</td><td>Yes</td><td>Mã ngân hàng. <br>VD: "MB" cho ngân hàng MBBank.</td></tr></tbody></table>

**Response**

{% tabs %}
{% tab title="200" %}

```json
{
  "status": "SUCCESS",
  "message": ""
}
```

{% endtab %}

{% tab title="400" %}

```json
{
  "status": "FAILED",
  "message": "mã_lỗi"
}
```

{% endtab %}
{% endtabs %}

---

### Code mẫu

{% tabs %}
{% tab title="cURL" %}

```
curl --location 'https://dev.vietqr.org/vqr/bank/api/test/transaction-callback' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer eyJhbGciOiJIUzUxMiJ9.eyJhdXRob3JpdGllcyI6WyJST0xFX1VTRVIiXSwidXNlciI6IlkzVnpkRzl0WlhJdGJtZDFlV1Z1TFhWelpYSXlORGt5IiwiaWF0IjoxNzIxNDUwMzEzLCJleHAiOjE3MjE0NTA2MTN9.u0hK2fZVFvtaZQ3jyVJmMvhyqW8aRFGJIgpL8C71jtXbAPfPhqyJIdGc0Lv-XOY7e1NcjZQWH3FUhc4SXxgqlQ' \
--header 'Cookie: JSESSIONID=5DAD675C6D1BFEB2305B2340FE3BEDEC' \
--data '{
    "bankAccount": "tài_khoản_ngân_hàng_đồng_bộ",
    "content": "nội_dung_test_callback_là_nội_dung_khi_quét_mã_qr_thanh_toán",
    "amount": "số_tiền",
    "bankCode": "mã_ngân_hàng", //VD: "MB" cho ngân hàng MBBank.
    "transType": "C:giao_dịch_đến, D:giao_dịch_đi"
}'
```

{% endtab %}
{% endtabs %}

---

### Các câu hỏi thường gặp

<details>

<summary>API Test Callback dùng để làm gì?</summary>

API Test Callback được sử dụng để kiểm tra khả năng tiếp nhận và xử lý callback từ hệ thống của VietQR đến hệ thống của bạn. Nó giúp xác minh rằng hệ thống của bạn có thể nhận và xử lý thông báo từ VietQR khi có sự kiện xảy ra.

</details>

<details>

<summary>Tại sao cần phải thực hiện Test Callback?</summary>

Thực hiện Test Callback giúp đảm bảo rằng hệ thống của bạn có thể nhận thông báo (callback) một cách chính xác từ VietQR, điều này rất quan trọng trong việc đồng bộ trạng thái giao dịch và phản hồi kịp thời cho khách hàng.

</details>

<details>

<summary>Khi nào nên thực hiện Test Callback?</summary>

Bạn nên thực hiện Test Callback sau khi đã cấu hình xong các endpoint cần thiết trên hệ thống của mình và trước khi triển khai dịch vụ vào môi trường sản xuất. Điều này giúp phát hiện và khắc phục sớm các vấn đề tiềm ẩn.

</details>

<details>

<summary>Làm thế nào để kiểm tra rằng hệ thống của tôi đã nhận đúng callback?</summary>

Bạn có thể theo dõi log hệ thống của mình hoặc kiểm tra các phản hồi từ API Test Callback để xác nhận rằng hệ thống đã nhận đúng callback và xử lý nó theo mong đợi.

</details>

<details>

<summary>Phản hồi của API Test Callback sẽ như thế nào?</summary>

API Test Callback sẽ gửi một yêu cầu HTTP POST đến endpoint của API Transaction Sync mà bạn đã cấu hình, với dữ liệu mô phỏng giao dịch đã được thanh toán thực tế. Hệ thống của bạn cần trả về một phản hồi HTTP 200 OK để xác nhận rằng callback đã được nhận và xử lý thành công.

</details>

<details>

<summary>Sau khi tôi gọi API Test Callback thành công, nhưng vẫn chưa nhận được báo có giao dịch từ API Transaction Sync?</summary>

Hãy truyền đúng 2 trường `content` và `amount` được trả về ở phần response lúc tạo mã ở bước 6.

</details>

<details>

<summary><strong>Nếu callback không được xử lý thành công thì cần làm gì?</strong></summary>

Nếu callback không được xử lý thành công, bạn cần kiểm tra lại cấu hình endpoint, logic xử lý callback trên hệ thống của bạn, và thử lại Test Callback. Kiểm tra log và các thông báo lỗi để xác định nguyên nhân và khắc phục.

</details>

<details>

<summary>Có thể thực hiện Test Callback bao nhiêu lần?</summary>

Bạn có thể thực hiện Test Callback nhiều lần cho đến khi đảm bảo rằng hệ thống của bạn có thể xử lý callback một cách chính xác và ổn định.

</details>

<details>

<summary>Làm thế nào để xác nhận rằng callback đã được xử lý đúng cách?</summary>

Sau khi nhận được callback, hệ thống của bạn cần thực hiện các bước xử lý theo yêu cầu và gửi phản hồi HTTP 200 OK. Kiểm tra log hệ thống để đảm bảo rằng tất cả các bước đã được thực hiện đúng.

</details>
