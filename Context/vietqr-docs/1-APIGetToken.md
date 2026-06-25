# API Get Token

### <mark style="color:green;">`2.1 POST`</mark> Get Token <a href="#get-token" id="get-token"></a>

```
https://<your-host>/<your-basepath>/api/token_generate
```

**Headers**

<table><thead><tr><th width="249">Name</th><th>Value</th></tr></thead><tbody><tr><td>Content-Type</td><td><code>application/json</code></td></tr><tr><td>Authorization</td><td>Basic Authentication: Base64[<code>username:password</code>]</td></tr></tbody></table>

{% hint style="success" %}
`username` và `password` của API này sẽ do bạn định nghĩa và cung cấp cho VietQR.
{% endhint %}

**Body**

<table><thead><tr><th width="201">Name</th><th width="99">Type</th><th width="101">Required</th><th>Description</th></tr></thead><tbody><tr><td><code>access_token</code></td><td>String</td><td>Yes</td><td>Là Bearer Token do đối tác cung cấp cho VietQR sử dụng để xác thực và callback giao dịch vào API Transaction Sync của đối tác</td></tr><tr><td><code>token_type</code></td><td>String</td><td>Yes</td><td>Là dạng token dạng “Bearer”.</td></tr><tr><td><code>expires_in</code></td><td>Integer</td><td>Yes</td><td>Thời gian (giấy/s) hết hạn của token kể từ thời điểm được tạo</td></tr></tbody></table>

**Response**

{% tabs %}
{% tab title="200" %}

```json
{
  "access_token": "bearer_token",
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

### 2.2 - Code cài đặt

Test với Posmant :

curl --location --request POST '<https://uat8.thuythu.vn/mrtao/wp-json/tt-vietqr/api/token_generate>' \ --header 'Authorization: Basic dGFpcGhpbTRrOjYxZTU1ZmU0LTBhNjMtNGU4Zi1hZDgyLTBlNjFiYzk4M\mRlNA=='

{% tabs %}
{% tab title="C#" %}

```csharp
namespace YourNamespace.Controllers
{
    [Route("vqr/api")]
    [ApiController]
    public class TokenController : ControllerBase
    {
        private const string VALID_USERNAME = "customer-vietqrtest-user2468";
        private const string VALID_PASSWORD = "Y3VzdG9tZXItdmlldHFydGVzdC11c2VyMjQ2ODpZM1Z6ZEc5dFpYSXRkbWxsZEhGeWRHVnpkQzExYzJWeU1qUTJPQT09"; // Base64 của username:password
        private const string SECRET_KEY = "your-256-bit-secret"; // Bí mật để ký JWT token

        [HttpPost("token_generate")]
        public IActionResult GenerateToken([FromHeader] string Authorization)
        {
            // Kiểm tra Authorization header
            if (string.IsNullOrEmpty(Authorization) || !Authorization.StartsWith("Basic "))
            {
                return BadRequest("Authorization header is missing or invalid");
            }

            // Giải mã Base64
            var base64Credentials = Authorization.Substring("Basic ".Length).Trim();
            var credentials = Encoding.UTF8.GetString(Convert.FromBase64String(base64Credentials));
            var values = credentials.Split(':', 2);

            if (values.Length != 2)
            {
                return BadRequest("Invalid Authorization header format");
            }

            var username = values[0];
            var password = values[1];

            // Kiểm tra username và password
            if (username == VALID_USERNAME && password == VALID_PASSWORD)
            {
                var token = GenerateJwtToken(username);
                return Ok(new
                {
                    access_token = token,
                    token_type = "Bearer",
                    expires_in = 300 // Thời gian hết hạn token
                });
            }
            else
            {
                return Unauthorized("Invalid credentials");
            }
        }

        // Hàm tạo JWT token
        private string GenerateJwtToken(string username)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(SECRET_KEY);

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new Claim[]
                {
                    new Claim(ClaimTypes.Name, username)
                }),
                Expires = DateTime.UtcNow.AddMinutes(5), // Token hết hạn sau 5 phút
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha512Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }
    }
}

// Đây là Sample Code mang tính chất tham khảo
```

{% endtab %}

{% tab title="Java" %}

```java
@RestController
@RequestMapping("/vqr/api")
public class TokenController {

    private static final String VALID_USERNAME = "customer-vietqrtest-user2468";
    private static final String VALID_PASSWORD = "Y3VzdG9tZXItdmlldHFydGVzdC11c2VyMjQ2ODpZM1Z6ZEc5dFpYSXRkbWxsZEhGeWRHVnpkQzExYzJWeU1qUTJPQT09"; // Đây là chuỗi base64 từ username:password thật của bạn.

    // API để tạo token
    @PostMapping("/token_generate")
    public ResponseEntity<?> generateToken(@RequestHeader("Authorization") String authHeader) {
        // Kiểm tra xem header có Authorization không
        if (authHeader != null && authHeader.startsWith("Basic ")) {
            // Giải mã Base64 từ Authorization header
            String base64Credentials = authHeader.substring("Basic ".length()).trim();
            String credentials = new String(Base64.getDecoder().decode(base64Credentials), StandardCharsets.UTF_8);

            // Phân tách username và password
            final String[] values = credentials.split(":", 2);
            String username = values[0];
            String password = values[1];

            // Kiểm tra tính hợp lệ của username và password
            if (VALID_USERNAME.equals(username) && VALID_PASSWORD.equals(password)) {
                // Nếu hợp lệ, tạo JWT token
                String token = "your-generated-jwt-token"; // Ở đây bạn cần tạo JWT token thực sự, ví dụ với jjwt.

                return ResponseEntity.ok(new TokenResponse(token, "Bearer", 300));
            } else {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid credentials");
            }
        } else {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Authorization header is missing or invalid");
        }
    }

    // Class cho response
    public static class TokenResponse {
        private String access_token;
        private String token_type;
        private int expires_in;

        public TokenResponse(String access_token, String token_type, int expires_in) {
            this.access_token = access_token;
            this.token_type = token_type;
            this.expires_in = expires_in;
        }

        // Getters và Setters
        public String getAccess_token() {
            return access_token;
        }

        public void setAccess_token(String access_token) {
            this.access_token = access_token;
        }

        public String getToken_type() {
            return token_type;
        }

        public void setToken_type(String token_type) {
            this.token_type = token_type;
        }

        public int getExpires_in() {
            return expires_in;
        }

        public void setExpires_in(int expires_in) {
            this.expires_in = expires_in;
        }
    }
}

// Đây là Sample Code mang tính chất tham khảo
```

{% endtab %}

{% tab title="NodeJS" %}

```javascript
const express = require("express");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");

// Khởi tạo ứng dụng Express
const app = express();
app.use(bodyParser.json());

const VALID_USERNAME = "customer-vietqrtest-user2468";
const VALID_PASSWORD =
  "Y3VzdG9tZXItdmlldHFydGVzdC11c2VyMjQ2ODpZM1Z6ZEc5dFpYSXRkbWxsZEhGeWRHVnpkQzExYzJWeU1qUTJPQT09"; // Base64 của username:password
const SECRET_KEY = "your-256-bit-secret"; // Secret key để ký JWT

// API để tạo token
app.post("/vqr/api/token_generate", (req, res) => {
  // Kiểm tra Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return res
      .status(400)
      .json({ error: "Authorization header is missing or invalid" });
  }

  // Giải mã Base64 từ Authorization header
  const base64Credentials = authHeader.split(" ")[1];
  const credentials = Buffer.from(base64Credentials, "base64").toString(
    "utf-8",
  );
  const [username, password] = credentials.split(":");

  // Kiểm tra username và password
  if (username === VALID_USERNAME && password === VALID_PASSWORD) {
    // Tạo JWT token
    const token = jwt.sign(
      { username },
      SECRET_KEY,
      { algorithm: "HS512", expiresIn: "5m" }, // Token hết hạn sau 5 phút
    );

    // Trả về token
    res.json({
      access_token: token,
      token_type: "Bearer",
      expires_in: 300, // 300 giây = 5 phút
    });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

// Chạy server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Đây là Sample Code mang tính chất tham khảo
```

{% endtab %}

{% tab title="PHP" %}

```php
<?php
require __DIR__ . '/vendor/autoload.php'; // Autoload từ Composer
use \Firebase\JWT\JWT;

class TokenAPI {
    private $validUsername = 'customer-vietqrtest-user2468';
    private $validPassword = 'Y3VzdG9tZXItdmlldHFydGVzdC11c2VyMjQ2ODpZM1Z6ZEc5dFpYSXRkbWxsZEhGeWRHVnpkQzExYzJWeU1qUTJPQT09'; // Base64 của username:password
    private $secretKey = 'your-256-bit-secret'; // Secret key để ký JWT

    public function generateToken() {
        // Kiểm tra Authorization header
        if (!isset($_SERVER['HTTP_AUTHORIZATION'])) {
            http_response_code(400);
            echo json_encode(["error" => "Authorization header is missing or invalid"]);
            return;
        }

        $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
        if (strpos($authHeader, 'Basic ') !== 0) {
            http_response_code(400);
            echo json_encode(["error" => "Invalid Authorization header"]);
            return;
        }

        // Giải mã Base64 từ Authorization header
        $base64Credentials = substr($authHeader, 6);
        $credentials = base64_decode($base64Credentials);
        list($username, $password) = explode(':', $credentials);

        // Kiểm tra username và password
        if ($username === $this->validUsername && $password === $this->validPassword) {
            $token = $this->createJwtToken($username);
            echo json_encode([
                "access_token" => $token,
                "token_type" => "Bearer",
                "expires_in" => 300
            ]);
        } else {
            http_response_code(401);
            echo json_encode(["error" => "Invalid credentials"]);
        }
    }

    // Hàm tạo JWT token
    private function createJwtToken($username) {
        $issuedAt = time();
        $expirationTime = $issuedAt + 300;  // Token hết hạn sau 300 giây
        $payload = [
            'iss' => 'https://yourdomain.com', // Issuer của token
            'iat' => $issuedAt,
            'exp' => $expirationTime,
            'username' => $username
        ];

        return JWT::encode($payload, $this->secretKey, 'HS512');
    }
}

// Khởi tạo đối tượng và gọi hàm generateToken
$api = new TokenAPI();
$api->generateToken();


// Đây là Sample Code mang tính chất tham khảo
```

{% endtab %}

{% tab title="Python" %}

```python
from flask import Flask, request, jsonify
import jwt
import time
import base64

app = Flask(__name__)

# Cấu hình username, password hợp lệ và secret key
VALID_USERNAME = 'customer-vietqrtest-user2468'
VALID_PASSWORD = 'Y3VzdG9tZXItdmlldHFydGVzdC11c2VyMjQ2ODpZM1Z6ZEc5dFpYSXRkbWxsZEhGeWRHVnpkQzExYzJWeU1qUTJPQT09' # Base64 của username:password
SECRET_KEY = 'your-256-bit-secret'  # Secret key để ký JWT

# API để tạo token
@app.route('/vqr/api/token_generate', methods=['POST'])
def generate_token():
    # Kiểm tra Authorization header
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Basic '):
        return jsonify({"error": "Authorization header is missing or invalid"}), 400

    # Giải mã Base64 từ Authorization header
    base64_credentials = auth_header.split(' ')[1]
    credentials = base64.b64decode(base64_credentials).decode('utf-8')
    username, password = credentials.split(':')

    # Kiểm tra username và password
    if username == VALID_USERNAME and password == VALID_PASSWORD:
        # Tạo JWT token
        issued_at = int(time.time())
        expiration_time = issued_at + 300  # Token hết hạn sau 300 giây (5 phút)
        payload = {
            'username': username,
            'iat': issued_at,
            'exp': expiration_time
        }

        token = jwt.encode(payload, SECRET_KEY, algorithm='HS512')

        # Trả về token
        return jsonify({
            "access_token": token,
            "token_type": "Bearer",
            "expires_in": 300
        })
    else:
        return jsonify({"error": "Invalid credentials"}), 401

if __name__ == '__main__':
    app.run(port=5000)

// Đây là Sample Code mang tính chất tham khảo
```

{% endtab %}
{% endtabs %}

---

### 2.3 - Các câu hỏi thường gặp chủ đề API Get Token

> <details>
>
> <summary>Làm thế nào để cấp quyền truy cập cho VietQR vào API của chúng tôi?</summary>
>
> Bạn cần tạo một username và password dành riêng cho VietQR để họ có thể truy cập vào API Transaction Sync của bạn. Sau đó, bạn chia sẻ thông tin này với đội ngũ VietQR để họ có thể thực hiện đồng bộ dữ liệu.
>
> </details>
>
> <details>
>
> <summary>Thông tin đăng nhập VietQR sử dụng có bảo mật không?</summary>
>
> VietQR cam kết tuân thủ các quy trình bảo mật nghiêm ngặt. Thông tin đăng nhập mà bạn cung cấp sẽ được mã hóa và chỉ sử dụng cho mục đích đồng bộ dữ liệu theo thỏa thuận giữa hai bên.
>
> </details>
>
> <details>
>
> <summary>Có giới hạn nào về tần suất truy cập mà VietQR có thể thực hiện vào API của tôi?</summary>
>
> Nếu có bất kỳ giới hạn nào về tần suất truy cập hoặc tài nguyên, bạn nên thông báo trước với đội ngũ VietQR để họ có thể điều chỉnh tần suất truy cập phù hợp và tránh quá tải hệ thống.
>
> </details>
>
> <details>
>
> <summary>Tôi có thể giới hạn quyền truy cập của VietQR vào một phần nhất định của API không?</summary>
>
> Có, bạn có thể cấu hình quyền truy cập để VietQR chỉ có thể truy cập vào các endpoint cần thiết cho việc đồng bộ dữ liệu. Điều này giúp đảm bảo an toàn và bảo mật cho hệ thống của bạn.
>
> </details>
