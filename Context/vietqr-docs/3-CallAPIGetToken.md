# Gọi API Get Token

### <mark style="color:green;">`POST-`</mark> Môi trường Dev (Test/Kiểm thử)

```
https://dev.vietqr.org/vqr/api/token_generate
```

### <mark style="color:green;">`POST-`</mark> Môi trường Production (Golive/Vận hành)

```
https://api.vietqr.org/vqr/api/token_generate
```

**Headers**

<table><thead><tr><th width="225">Name</th><th>Value</th></tr></thead><tbody><tr><td>Content-Type</td><td><code>application/json</code></td></tr><tr><td>Authorization</td><td>Basic Authentication: Base64[<code>username:password</code>]</td></tr></tbody></table>

**Body**

<table><thead><tr><th width="226">Name</th><th width="110">Type</th><th>Description</th></tr></thead><tbody><tr><td><code>access_token</code></td><td>String</td><td>Là Bearer Token do VietQR cung cấp dùng để truy cập các API của VietQR</td></tr><tr><td><code>token_type</code></td><td>String</td><td>Là dạng token dạng “Bearer”.</td></tr><tr><td><code>expires_in</code></td><td>Integer</td><td>Thời gian hết hạn của token. Mặc định là 300 giây.</td></tr></tbody></table>

**Response**

{% tabs %}
{% tab title="200" %}

```json
{
  "access_token": "bearer_token_của_VietQR_cung_cấp",
  "token_type": "Bearer",
  "expires_in": 300
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

**Note:**

Đối với môi trường Sandbox\
Username và Password do VietQR cung cấp khi đăng ký tích hợp và kết nối thành công \
(hình ảnh minh họa)

<figure><img src="/files/VJRhlvXTZat2fWDtFpiQ" alt=""><figcaption></figcaption></figure>

<figure><img src="/files/jHqIJtgxWTsJL8iY2VJn" alt=""><figcaption></figcaption></figure>

### Code tham khảo

{% tabs %}
{% tab title="cURL" %}

```
curl --location --request POST 'https://dev.vietqr.org/vqr/api/token_generate' \
--header 'Authorization: Basic Y3VzdG9tZXItdmlldHFydGVzdC11c2VyMjQ2ODpZM1Z6ZEc5dFpYSXRkbWxsZEhGeWRHVnpkQzExYzJWeU1qUTJPQT09'


Response:
{
    "access_token": "eyJhbGciOiJIUzUxMiJ9.eyJhdXRob3JpdGllcyI6WyJST0xFX1VTRVIiXSwidXNlciI6IlkzVnpkRzl0WlhJdGRtbGxkSEZ5ZEdWemRDMTFjMlZ5TWpRMk9BPT0iLCJpYXQiOjE3MjEzNzI2MzQsImV4cCI6MTcyMTM3MjkzNH0.D19qvrpYHUgcGjDCXuXXAv3j6lZr6tfmIB0VzdCzAXMJAElGok04sNLysS6PRLdRb0hSgEX5_9KpLjB-xErn-A",
    "token_type": "Bearer",
    "expires_in": 300
}
```

{% endtab %}
{% endtabs %}

---

### Các câu hỏi thường gặp

<details>

<summary>API Get Token dùng để làm gì?</summary>

API Get Token được sử dụng để cấp quyền truy cập vào các dịch vụ của VietQR bằng cách cung cấp một mã token (`access_token`). Mã token này sẽ được sử dụng trong các yêu cầu API khác để xác thực người dùng.

</details>

<details>

<summary>Làm thế nào để gọi API Get Token?</summary>

Bạn cần gửi một yêu cầu POST đến endpoint của API Get Token với thông tin xác thực (username và password) trong phần header. VietQR sẽ cung cấp thông tin này cho bạn sau khi hoàn tất quá trình đăng ký.

</details>

<details>

<summary>Token có thời gian sử dụng bao lâu?</summary>

Token được cấp bởi API Get Token thường có thời gian sử dụng là 300 giây (5 phút). Sau thời gian này, bạn cần gọi lại API để lấy token mới.

</details>

<details>

<summary>Tôi cần làm gì nếu nhận được thông báo lỗi khi gọi API Get Token?</summary>

Kiểm tra lại các thông tin bạn đã gửi, bao gồm username và password. Đảm bảo rằng các thông tin này đúng và vẫn còn hiệu lực. Nếu vấn đề vẫn tiếp diễn, hãy liên hệ với bộ phận hỗ trợ của VietQR để được giúp đỡ.

</details>

<details>

<summary>Tại sao tôi lại nhận được mã lỗi khi gọi API Get Token?</summary>

Các mã lỗi thường xuất hiện do vấn đề xác thực (sai username hoặc password), yêu cầu không hợp lệ, hoặc lỗi kết nối. Thông báo lỗi sẽ cung cấp chi tiết về nguyên nhân cụ thể, giúp bạn xác định và khắc phục vấn đề.

</details>

<details>

<summary>Tôi có thể sử dụng token trên môi trường nào?</summary>

Token được cấp có thể sử dụng trên các API của VietQR, tùy thuộc vào môi trường mà bạn đang sử dụng (Test hoặc Prod). Đảm bảo rằng bạn đang gọi API trên đúng môi trường tương ứng.

</details>

<details>

<summary>Làm thế nào để bảo mật token sau khi nhận được?</summary>

Token cần được bảo mật như một thông tin nhạy cảm. Không chia sẻ token với bất kỳ ai và lưu trữ nó một cách an toàn. Khi sử dụng token, hãy đảm bảo rằng kết nối của bạn được mã hóa (sử dụng HTTPS) để bảo vệ thông tin khỏi bị lộ.

</details>
