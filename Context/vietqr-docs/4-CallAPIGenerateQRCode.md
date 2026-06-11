# Gọi API Generate VietQR Code

### `<mark style="color:green;">POST-``</mark>` Môi trường Dev (Test/Kiểm thử)

```
https://dev.vietqr.org/vqr/api/qr/generate-customer
```

### `<mark style="color:green;">POST-``</mark>` Môi trường Production (Golive/Vận hành)

```
https://api.vietqr.org/vqr/api/qr/generate-customer
```

**Headers**

<table><thead><tr><th width="249">Name</th><th>Value</th></tr></thead><tbody><tr><td>Content-Type</td><td><code>application/json</code></td></tr><tr><td>Authorization</td><td>Bearer <token>  bạn nhận được khi gọi API Get Token của VietQR</td></tr></tbody></table>

**Body**&#x20;mlui jfer ahhc qgdkmlui jfer ahhc qgdkmlui jfer ahhc qgdk

<table data-full-width="false"><thead><tr><th width="215">Name</th><th width="90">Type</th><th width="98">Required</th><th>Description</th></tr></thead><tbody><tr><td><code>bankCode</code></td><td>String</td><td>Yes</td><td>Mã ngân hàng của tài khoản. </td></tr><tr><td><code>bankAccount</code></td><td>String</td><td>Yes</td><td>Tài khoản ngân hàng tạo mã thanh toán VietQR.</td></tr><tr><td><code>userBankName</code></td><td>String</td><td>Yes</td><td>Họ tên chủ tài khoản. Không dấu tiếng Việt.</td></tr><tr><td><code>content</code></td><td>String</td><td>Yes</td><td>Nội dung chuyển tiền.<br><mark style="color:red;">T<strong>ối đa 23 ký tự,</strong></mark> tiếng Việt không dấu, không ký tự đặc biệt.</td></tr><tr><td><code>qrType</code></td><td>Integer</td><td>Yes</td><td><p>Tùy loại mã thanh toán cần tạo, nhập giá trị tương ứng:<br>- <mark style="background-color:green;">VietQR động: 0</mark><br>- <mark style="background-color:green;">VietQR tĩnh: 1</mark></p><p>- <mark style="background-color:green;">VietQR bán động: 3</mark> </p></td></tr><tr><td><code>amount</code></td><td>Long</td><td>Optional</td><td>Số tiền cần thanh toán.<br><mark style="background-color:green;"><Bắt buộc nếu "<code>qrType</code>" = 0 hoặc 3></mark></td></tr><tr><td><code>orderId</code></td><td>String</td><td>Optional</td><td>Mã đơn hàng bên đối tác cần quản lý. “orderId” sẽ được trả về khi hệ thống nhận biến động số dư (có thông tin giao dịch trùng với giao dịch được tạo bằng mã QR).<br><mark style="color:red;"><strong>Tối đa 13 ký tự.</strong></mark><br><mark style="background-color:green;"><Bắt buộc nếu "<code>qrType</code>" = 0></mark></td></tr><tr><td><code>transType</code></td><td>String</td><td>Optional</td><td>Phân loại giao dịch là ghi nợ/ghi có (giá trị: D/C). <br>Mặc định là “C”.<br><mark style="background-color:green;"><Bắt buộc nếu "<code>qrType</code>" = 0></mark></td></tr><tr><td><code>terminalCode</code></td><td>String</td><td>Optional</td><td>Mã cửa hàng/điểm bán.<br><mark style="background-color:green;"><Bắt buộc nếu "<code>qrType</code>" = 1 hoặc 3></mark></td></tr><tr><td><code>serviceCode</code></td><td>String</td><td>Optional</td><td>Mã sản phẩm, dịch vụ được thanh toán.<br><mark style="background-color:green;"><Bắt buộc nếu "<code>qrType</code>" = 3></mark></td></tr><tr><td><code>subTerminalCode</code></td><td>String</td><td>Optional</td><td>Mã cửa hàng/điểm bán phụ.</td></tr><tr><td><code>sign</code></td><td>String</td><td>Optional</td><td>Chữ ký. </td></tr><tr><td><mark style="color:red;"><strong><code>urlLink</code></strong></mark></td><td><mark style="color:red;"><strong>String</strong></mark></td><td><mark style="color:red;"><strong>Optional</strong></mark></td><td><mark style="color:red;">Trang chuyển đến sau khi quét mã thanh toán.</mark> </td></tr><tr><td><code>note</code></td><td>String</td><td>Optional</td><td>Ghi chú cho giao dịch.</td></tr><tr><td><code>additionalData</code></td><td>List<Object></td><td>Optional</td><td>Các tham số truyền thêm.</td></tr></tbody></table>

**Response**

```json
// Ví dụ kết quả trả về mã QR động
{
    "bankCode": "MB",
    "bankName": "Ngân hàng TMCP Quân đội",
    "bankAccount": "0852240768",
    "userBankName": "HA TRUNG HIEU",
    "amount": "6868",
    "content": "Test VA Account",
    "qrCode": "00020101021238570010A000000727012700069704220113VQRQACYEK56060208QRIBFTTA5303704540468685802VN62300107NPS68690815Test VA Account6304BE01",
    "imgId": "58b7190b-a294-4b14-968f-cd365593893e",
    "existing": 1,
    "transactionId": "",
    "transactionRefId": "MGEzMDIzNjktYThiZi00ZTFhLTlmNGEtZTI0ODBkMjE4Y2Vh",
    "qrLink": "https://pro.vietqr.vn/qr-generated?token=MGEzMDIzNjktYThiZi00ZTFhLTlmNGEtZTI0ODBkMjE4Y2Vh",
    "terminalCode": null,
    "subTerminalCode": "",
    "serviceCode": "",
    "orderId": "TESTVA",
    "additionalData": [],
    "vaAccount": "VQRQACYEK5606" (VA được hỗ trợ cho luồng TF MB và BIDV)
}
```

{% tabs %}
{% tab title="200 - mã QR động" %}

<pre class="language-json"><code class="lang-json"><strong>{
</strong>    "bankCode": "mã_ngân_hàng",
    "bankName": "tên_ngân_hàng",
    "bankAccount": "tài_khoản_ngân_hàng_nhận",
    "userBankName": "tên_chủ_tài_khoản",
    "amount": "số_tiền_cần_thanh_toán",
    "content": "nội_dung_thanh_toán",
    "qrCode": "mã_QR_dạng_string",
    "imgId": "id_ảnh_ngân_hàng",
    "existing": "1: đã_được_tạo_trên_hệ_thống_vietQR_thành_công",
    "transactionId": "id_định_danh_của_QR",
    "transactionRefId": "mã_định_danh_của_QR",
    "qrLink": "mã_QR_dạng_link",
    "terminalCode": "mã_điểm_bán",
    "subTerminalCode": "mã_con_điểm_bán",
    "serviceCode": "mã_sản_phẩm",
    "orderId": "mã_đơn_hàng",
    "additionalData": "thông_tin_thêm",
    "vaAccount": "thông_tin_tài_khoản_ảo_Virtual_Account"
<strong>}
</strong></code></pre>

{% endtab %}

{% tab title="200 - mã QR bán động" %}

```json
{
  "bankCode": "mã_ngân_hàng",
  "bankName": "tên_ngân_hàng",
  "bankAccount": "tài_khoản_ngân_hàng_nhận",
  "userBankName": "tên_chủ_tài_khoản",
  "amount": "số_tiền_cần_thanh_toán",
  "content": "nội_dung_thanh_toán",
  "qrCode": "mã_QR_dạng_string",
  "imgId": "id_ảnh_ngân_hàng",
  "existing": "1: đã_được_tạo_trên_hệ_thống_vietQR_thành_công",
  "transactionId": "id_định_danh_của_QR",
  "transactionRefId": "mã_định_danh_của_QR",
  "qrLink": "mã_QR_dạng_link",
  "terminalCode": "mã_điểm_bán",
  "subTerminalCode": "mã_con_điểm_bán",
  "serviceCode": "mã_sản_phẩm",
  "orderId": "mã_đơn_hàng",
  "additionalData": "thông_tin_thêm",
  "vaAccount": "thông_tin_tài_khoản_ảo_Virtual_Account"
}
```

{% endtab %}

{% tab title="200 - mã QR tĩnh" %}

```json
{
  "bankCode": "mã_ngân_hàng",
  "bankName": "tên_ngân_hàng",
  "bankAccount": "tài_khoản_ngân_hàng_nhận",
  "userBankName": "tên_chủ_tài_khoản",
  "amount": "số_tiền_cần_thanh_toán",
  "content": "nội_dung_thanh_toán",
  "qrCode": "mã_QR_dạng_string",
  "imgId": "id_ảnh_ngân_hàng",
  "existing": "1: đã_được_tạo_trên_hệ_thống_vietQR_thành_công",
  "transactionId": "id_định_danh_của_QR",
  "transactionRefId": "mã_định_danh_của_QR",
  "qrLink": "mã_QR_dạng_link",
  "terminalCode": "mã_điểm_bán",
  "subTerminalCode": "mã_con_điểm_bán",
  "serviceCode": "mã_sản_phẩm",
  "orderId": "mã_đơn_hàng",
  "additionalData": "thông_tin_thêm",
  "vaAccount": "thông_tin_tài_khoản_ảo_Virtual_Account"
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

### Code tham khảo

{% tabs %}
{% tab title="cURL tạo mã QR động" %}

```
curl --location 'https://dev.vietqr.org/vqr/api/qr/generate-customer' \
--header 'Cookie: JSESSIONID=5CAD2D74C5EBDF9B1CAC5684F2DB47CE; JSESSIONID=C1711954475F66AE09967ADFFA4C80CD; JSESSIONID=D4468C26FD481B215DBF12CB9707B0AD' \
--header 'Content-Type: application/json' \
--data '{
    "amount": "số_tiền_cần_thanh_toán",
    "content": "nội_dung_thanh_toán",
    "bankAccount": "tài_khoản_ngân_hàng_nhận",
    "bankCode": "mã_ngân_hàng",
    "userBankName": "tên_chủ_tài_khoản",
    "transType": "C:giao_dịch_đến/D:giao_dịch_đi",
    "orderId": "mã_đơn_hàng",
    "sign": "chữ_ký",
    "serviceCode": "mã_sản_phẩm",
    "qrType": "loại qr: 0",
    "terminalCode": "mã_điểm_bán",
    "subTerminalCode": "mã_con_điểm_bán",
    "note": "ghi_chú_mã_qr",
    "urlLink": "link_mà_trang_qr_link_sẽ_redirect_nếu_mã_qr_được_thanh_toán_thành công",
    "additionalData": "thông_tin_thêm_mã_QR_có_thể_truyền_empty_do_KH_tự_định_nghĩa",
}'
```

{% endtab %}

{% tab title="cURL tạo mã QR bán động" %}

```
curl --location 'https://dev.vietqr.org/vqr/api/qr/generate-customer' \
--header 'Cookie: JSESSIONID=5CAD2D74C5EBDF9B1CAC5684F2DB47CE; JSESSIONID=C1711954475F66AE09967ADFFA4C80CD; JSESSIONID=D4468C26FD481B215DBF12CB9707B0AD' \
--header 'Content-Type: application/json' \
--data '{
    "amount": "số_tiền_của_sản_phẩm",
    "content": "nội_dung_thanh_toán",
    "bankAccount": "tài_khoản_ngân_hàng_nhận",
    "bankCode": "mã_ngân_hàng",
    "userBankName": "tên_chủ_tài_khoản",
    "transType": "C:giao_dịch_đến/D:giao_dịch_đi",
    "qrType": "loại qr: 1",
    "terminalCode": "mã_điểm_bán_đã_đồng_bộ"
    "serviceCode": "mã_sản_phẩm",
    "qrType": 3
}'
```

{% endtab %}

{% tab title="cURL tạo mã QR tĩnh" %}

```
curl --location 'https://dev.vietqr.org/vqr/api/qr/generate-customer' \
--header 'Cookie: JSESSIONID=5CAD2D74C5EBDF9B1CAC5684F2DB47CE; JSESSIONID=C1711954475F66AE09967ADFFA4C80CD; JSESSIONID=A2494C77F9BCB561B15CDFDF6FF2CD1F' \
--header 'Content-Type: application/json' \
--data '{
    "content": "nội_dung_thanh_toán",
    "bankAccount": "tài_khoản_ngân_hàng_nhận",
    "bankCode": "mã_ngân_hàng",
    "userBankName": "tên_chủ_tài_khoản",
    "transType": "C:giao_dịch_đến/D:giao_dịch_đi",
    "qrType": "loại qr: 1",
    "terminalCode": "mã_điểm_bán_đã_đồng_bộ"
}'
```

{% endtab %}
{% endtabs %}

---

### Các câu hỏi thường gặp

<details>

<summary>Khi gọi API Generate VietQR Code, tôi gặp phải mã lỗi trả về là "E34"??!</summary>

Khi gặp phải mã lỗi này, bạn hãy kiểm tra lại 2 trường sau:

- &#x20;`content` :&#x20;
  - Độ dài không được vượt quá 23 ký tự.&#x20;
  - Không chứa ký tự đặc biệt.
  - Ký tự thuộc dạng chữ cái Latin/Tiếng Việt không dấu.
- `orderId` :&#x20;
  - Độ dài không được vượt quá 13 ký tự.&#x20;
  - Không chứa ký tự đặc biệt.
  - Ký tự thuộc dạng chữ cái Latin/Tiếng Việt không dấu.

</details>

<details>

<summary>API Generate VietQR Code dùng để làm gì?</summary>

API Generate VietQR Code được sử dụng để tạo mã QR thanh toán cho các giao dịch. Mã QR này có thể được khách hàng quét để thực hiện thanh toán trực tiếp từ tài khoản ngân hàng.

</details>

<details>

<summary>Tôi cần cung cấp những thông tin gì để tạo mã QR thanh toán?</summary>

Để tạo mã QR thanh toán, bạn cần cung cấp các thông tin như số tiền, mã đơn hàng, thông tin người nhận, và thông tin tài khoản ngân hàng của người nhận. Các thông tin này sẽ được mã hóa vào mã QR. Bạn có thể xem chi tiết các thông tin cần thiết cho từng loại mã QR ở trên.

</details>

<details>

<summary>Làm thế nào để biết mã QR đã được tạo thành công?</summary>

Khi mã QR được tạo thành công, API sẽ trả về hình ảnh mã QR dưới dạng string cùng với các thông tin chi tiết liên quan đến giao dịch. Nếu có lỗi xảy ra, bạn sẽ nhận được thông báo lỗi trong phần phản hồi.

</details>

<details>

<summary>Làm thế nào để xử lý lỗi khi gọi API Generate VietQR Code?</summary>

Nếu bạn gặp lỗi khi gọi API, trước tiên hãy kiểm tra lại các thông tin đầu vào như số tiền, thông tin tài khoản, và mã đơn hàng. Đảm bảo rằng các thông tin này chính xác và hợp lệ. Nếu vấn đề vẫn tiếp diễn, hãy liên hệ với bộ phận hỗ trợ kỹ thuật của VietQR để được giúp đỡ.

</details>

<details>

<summary>Mã QR có thể được quét bằng ứng dụng nào?</summary>

Mã QR được tạo bởi API VietQR có thể được quét bằng bất kỳ ứng dụng ngân hàng nào hỗ trợ chuẩn thanh toán QR tại Việt Nam, hoặc các ứng dụng thanh toán ví điện tử có tính năng quét mã QR.

</details>

<details>

<summary>Tôi có cần mã hóa thông tin trước khi gửi đến API không?</summary>

Không, API VietQR sẽ tự động mã hóa các thông tin cần thiết khi tạo mã QR. Bạn chỉ cần đảm bảo rằng các thông tin gửi đến API là chính xác và đầy đủ.

</details>
