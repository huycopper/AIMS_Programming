# API Transaction Sync

### <mark style="color:green;">`POST`</mark> API Transaction Sync <a href="#api-transaction-sync" id="api-transaction-sync"></a>

```
https://<your-host>/<your-basepath>/bank/api/transaction-sync
```

**Headers**

<table><thead><tr><th width="203">Name</th><th>Value</th></tr></thead><tbody><tr><td>Content-Type</td><td><code>application/json</code></td></tr><tr><td>Authorization</td><td><code>Bearer &#x3C;token></code>  Bearer Token VietQR nhận được từ response API Get Token của đối tác trả về.</td></tr></tbody></table>

**Body**

<table data-full-width="false"><thead><tr><th width="203">Name</th><th width="98">Type</th><th width="105">Required</th><th>Description</th></tr></thead><tbody><tr><td><code>bankaccount</code></td><td>String</td><td>Yes</td><td>Tài khoản ngân hàng tạo mã thanh toán.</td></tr><tr><td><code>amount</code></td><td>Long</td><td>Yes</td><td>Số tiền giao dịch.</td></tr><tr><td><code>transType</code></td><td>String</td><td>Yes</td><td>Phân loại giao dịch là ghi nợ/ghi có (giá trị: D/C).</td></tr><tr><td><code>content</code></td><td>String</td><td>Yes</td><td>Nội dung chuyển tiền.</td></tr><tr><td><code>transactionid</code></td><td>String</td><td>Yes</td><td>ID của giao dịch.</td></tr><tr><td><code>transactiontime</code></td><td>Long</td><td>Yes</td><td>Thời gian giao dịch được thực hiện (timestamp (ms))<br>Ví dụ: 1757342061000</td></tr><tr><td><code>referencenumber</code></td><td>String</td><td>Yes</td><td>Mã giao dịch.</td></tr><tr><td><code>orderId</code></td><td>String</td><td>Yes</td><td>Mã đơn hàng</td></tr><tr><td><code>terminalCode</code></td><td>String</td><td>Optional</td><td>Mã cửa hàng/điểm bán.</td></tr><tr><td><code>subTerminalCode</code></td><td>String</td><td>Optional</td><td>Mã cửa hàng phụ/điểm bán phụ.</td></tr><tr><td><code>serviceCode</code></td><td>String</td><td>Optional</td><td>Mã sản phẩm/dịch vụ.</td></tr><tr><td><code>urlLink</code></td><td>String</td><td>Optional</td><td>Link điều hướng sau khi thanh toán thành công.</td></tr><tr><td><code>sign</code></td><td>String</td><td>Optional</td><td>Chữ ký.</td></tr></tbody></table>

Response

{% tabs %}
{% tab title="200 (OK)" %}

```json
{
  "error": false,
  "errorReason": "mã_lỗi_trả_về_từ_đối_tác",
  "toastMessage": "mô_tả_lỗi_trả_về_từ_đối_tác",
  "object": {
    "reftransactionid": "ID_của_giao_dịch"
  }
}
```

{% endtab %}

{% tab title="400 (Error Request)" %}

```json
{
  "error": true,
  "errorReason": "mã_lỗi_trả_về_từ_đối_tác",
  "toastMessage": "mô_tả_lỗi_trả_về_từ_đối_tác",
  "object": null
}
```

{% endtab %}
{% endtabs %}

### 3.2 Code cài đặt

{% tabs %}
{% tab title="C#" %}

```csharp
namespace YourNamespace.Controllers
{
    [Route("bank/api")]
    [ApiController]
    public class TransactionSyncController : ControllerBase
    {
        private const string SECRET_KEY = "your-256-bit-secret"; // Secret key để kiểm tra JWT
        private const string BEARER_PREFIX = "Bearer ";

        // API để xử lý transaction-sync
        [HttpPost("transaction-sync")]
        public IActionResult TransactionSync([FromBody] TransactionCallback transactionCallback)
        {
            // Lấy token từ header Authorization
            string authHeader = Request.Headers["Authorization"];
            if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith(BEARER_PREFIX))
            {
                return StatusCode(401, new ErrorResponse
                {
                    Error = true,
                    ErrorReason = "INVALID_AUTH_HEADER",
                    ToastMessage = "Authorization header is missing or invalid",
                    Object = null
                });
            }

            string token = authHeader.Substring(BEARER_PREFIX.Length).Trim();

            // Xác thực token
            if (!ValidateToken(token))
            {
                return StatusCode(401, new ErrorResponse
                {
                    Error = true,
                    ErrorReason = "INVALID_TOKEN",
                    ToastMessage = "Invalid or expired token",
                    Object = null
                });
            }

            // Xử lý logic của transaction
            try
            {
                // Ví dụ xử lý nghiệp vụ và sinh mã reftransactionid
                string refTransactionId = "GeneratedRefTransactionId"; // Tạo ID của giao dịch

                // Trả về response 200 OK với thông tin giao dịch
                return Ok(new SuccessResponse
                {
                    Error = false,
                    ErrorReason = null,
                    ToastMessage = "Transaction processed successfully",
                    Object = new TransactionResponseObject
                    {
                        reftransactionid = refTransactionId
                    }
                });
            }
            catch (Exception ex)
            {
                // Trả về lỗi trong trường hợp có exception
                return StatusCode(400, new ErrorResponse
                {
                    Error = true,
                    ErrorReason = "TRANSACTION_FAILED",
                    ToastMessage = ex.Message,
                    Object = null
                });
            }
        }

        // Phương thức để xác thực token JWT
        private bool ValidateToken(string token)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(SECRET_KEY);

            try
            {
                tokenHandler.ValidateToken(token, new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(key),
                    ValidateIssuer = false,
                    ValidateAudience = false,
                    ClockSkew = TimeSpan.Zero, // Không cho phép độ trễ thời gian
                }, out SecurityToken validatedToken);

                return true;
            }
            catch
            {
                return false;
            }
        }
    }

    // Lớp model cho request body
    public class TransactionCallback
    {
        public string transactionid { get; set; }
        public long transactiontime { get; set; }
        public string referencenumber { get; set; }
        public decimal amount { get; set; }
        public string content { get; set; }
        public string bankaccount { get; set; }
        public string orderId { get; set; }
        public string sign { get; set; }
        public string terminalCode { get; set; }
        public string urlLink { get; set; }
        public string serviceCode { get; set; }
        public string subTerminalCode { get; set; }
    }

    // Lớp model cho success response
    public class SuccessResponse
    {
        public bool Error { get; set; }
        public string ErrorReason { get; set; }
        public string ToastMessage { get; set; }
        public TransactionResponseObject Object { get; set; }
    }

    // Lớp model cho lỗi response
    public class ErrorResponse
    {
        public bool Error { get; set; }
        public string ErrorReason { get; set; }
        public string ToastMessage { get; set; }
        public object Object { get; set; }
    }

    // Lớp model cho object trả về trong success response
    public class TransactionResponseObject
    {
        public string reftransactionid { get; set; }
    }
}

// Đây là Sample Code mang tính chất tham khảo
```

{% endtab %}

{% tab title="Java" %}

```java
@RestController
@RequestMapping("/bank/api")
public class TransactionSyncController {

    private static final String SECRET_KEY = "your-256-bit-secret"; // Secret key để kiểm tra JWT
    private static final String BEARER_PREFIX = "Bearer ";

    @PostMapping("/transaction-sync")
    public ResponseEntity<Object> transactionSync(@RequestBody TransactionCallback transactionCallback,
                                                  HttpServletRequest request) {
        // Lấy token từ header Authorization
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith(BEARER_PREFIX)) {
            return new ResponseEntity<>(new ErrorResponse(true, "INVALID_AUTH_HEADER",
                    "Authorization header is missing or invalid", null), HttpStatus.UNAUTHORIZED);
        }

        String token = authHeader.substring(BEARER_PREFIX.length()).trim();

        // Xác thực token
        if (!validateToken(token)) {
            return new ResponseEntity<>(new ErrorResponse(true, "INVALID_TOKEN",
                    "Invalid or expired token", null), HttpStatus.UNAUTHORIZED);
        }

        try {
            // Xử lý nghiệp vụ, sinh mã refTransactionId (Giả sử tạo một mã ngẫu nhiên)
            String refTransactionId = "GeneratedRefTransactionId"; // Sinh ID của giao dịch

            // Trả về response 200 OK với thông tin giao dịch
            TransactionResponseObject transactionResponse = new TransactionResponseObject(refTransactionId);
            return ResponseEntity.ok(new SuccessResponse(false, null,
                    "Transaction processed successfully", transactionResponse));
        } catch (Exception ex) {
            // Trả về lỗi trong trường hợp có exception
            return new ResponseEntity<>(new ErrorResponse(true, "TRANSACTION_FAILED", ex.getMessage(), null), HttpStatus.BAD_REQUEST);
        }
    }

    // Phương thức để xác thực token JWT
    private boolean validateToken(String token) {
        // Đây là phương pháp giả sử validate token với SECRET_KEY
        // Bạn có thể tích hợp JWT library như `io.jsonwebtoken` để validate
        try {
            // Giả sử giải mã token với SECRET_KEY
            byte[] secretKeyBytes = SECRET_KEY.getBytes();
            String decodedToken = new String(Base64.getDecoder().decode(token.getBytes()));

            // Kiểm tra token hợp lệ (thực tế nên sử dụng JWT library như jjwt)
            return decodedToken.contains(SECRET_KEY);
        } catch (Exception e) {
            return false;
        }
    }
}

// Lớp model cho request body
class TransactionCallback {
    private String transactionid;
    private long transactiontime;
    private String referencenumber;
    private double amount;
    private String content;
    private String bankaccount;
    private String orderId;
    private String sign;
    private String terminalCode;
    private String urlLink;
    private String serviceCode;
    private String subTerminalCode;

    // Getters and Setters
    // ...
}

// Lớp model cho success response
class SuccessResponse {
    private boolean error;
    private String errorReason;
    private String toastMessage;
    private TransactionResponseObject object;

    public SuccessResponse(boolean error, String errorReason, String toastMessage, TransactionResponseObject object) {
        this.error = error;
        this.errorReason = errorReason;
        this.toastMessage = toastMessage;
        this.object = object;
    }

    // Getters and Setters
    // ...
}

// Lớp model cho lỗi response
class ErrorResponse {
    private boolean error;
    private String errorReason;
    private String toastMessage;
    private Object object;

    public ErrorResponse(boolean error, String errorReason, String toastMessage, Object object) {
        this.error = error;
        this.errorReason = errorReason;
        this.toastMessage = toastMessage;
        this.object = object;
    }

    // Getters and Setters
    // ...
}

// Lớp model cho object trả về trong success response
class TransactionResponseObject {
    private String reftransactionid;

    public TransactionResponseObject(String reftransactionid) {
        this.reftransactionid = reftransactionid;
    }

    // Getters and Setters
    // ...
}

// Đây là Sample Code mang tính chất tham khảo
```

{% endtab %}

{% tab title="NodeJS" %}

```javascript
const express = require("express");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 3000;

const SECRET_KEY = "your-256-bit-secret"; // Secret key để kiểm tra JWT
const BEARER_PREFIX = "Bearer ";

app.use(bodyParser.json());

// Model cho request body
class TransactionCallback {
  constructor(
    transactionid,
    transactiontime,
    referencenumber,
    amount,
    content,
    bankaccount,
    orderId,
    sign,
    terminalCode,
    urlLink,
    serviceCode,
    subTerminalCode,
  ) {
    this.transactionid = transactionid;
    this.transactiontime = transactiontime;
    this.referencenumber = referencenumber;
    this.amount = amount;
    this.content = content;
    this.bankaccount = bankaccount;
    this.orderId = orderId;
    this.sign = sign;
    this.terminalCode = terminalCode;
    this.urlLink = urlLink;
    this.serviceCode = serviceCode;
    this.subTerminalCode = subTerminalCode;
  }
}

// API để xử lý transaction-sync
app.post("/bank/api/transaction-sync", (req, res) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith(BEARER_PREFIX)) {
    return res
      .status(401)
      .json(
        new ErrorResponse(
          true,
          "INVALID_AUTH_HEADER",
          "Authorization header is missing or invalid",
          null,
        ),
      );
  }

  const token = authHeader.substring(BEARER_PREFIX.length).trim();

  // Xác thực token
  if (!validateToken(token)) {
    return res
      .status(401)
      .json(
        new ErrorResponse(
          true,
          "INVALID_TOKEN",
          "Invalid or expired token",
          null,
        ),
      );
  }

  const transactionCallback = new TransactionCallback(
    req.body.transactionid,
    req.body.transactiontime,
    req.body.referencenumber,
    req.body.amount,
    req.body.content,
    req.body.bankaccount,
    req.body.orderId,
    req.body.sign,
    req.body.terminalCode,
    req.body.urlLink,
    req.body.serviceCode,
    req.body.subTerminalCode,
  );

  try {
    // Ví dụ xử lý nghiệp vụ và sinh mã reftransactionid
    const refTransactionId = "GeneratedRefTransactionId"; // Tạo ID của giao dịch

    // Trả về response 200 OK với thông tin giao dịch
    return res
      .status(200)
      .json(
        new SuccessResponse(
          false,
          null,
          "Transaction processed successfully",
          new TransactionResponseObject(refTransactionId),
        ),
      );
  } catch (error) {
    // Trả về lỗi trong trường hợp có exception
    return res
      .status(400)
      .json(new ErrorResponse(true, "TRANSACTION_FAILED", error.message, null));
  }
});

// Phương thức để xác thực token JWT
const validateToken = (token) => {
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    return true;
  } catch (error) {
    return false;
  }
};

// Lớp model cho success response
class SuccessResponse {
  constructor(error, errorReason, toastMessage, object) {
    this.error = error;
    this.errorReason = errorReason;
    this.toastMessage = toastMessage;
    this.object = object;
  }
}

// Lớp model cho lỗi response
class ErrorResponse {
  constructor(error, errorReason, toastMessage, object) {
    this.error = error;
    this.errorReason = errorReason;
    this.toastMessage = toastMessage;
    this.object = object;
  }
}

// Lớp model cho object trả về trong success response
class TransactionResponseObject {
  constructor(reftransactionid) {
    this.reftransactionid = reftransactionid;
  }
}

// Khởi động server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

//sample code mang tính chất tham khảo
```

{% endtab %}

{% tab title="PHP" %}

```php
<?php

require 'vendor/autoload.php';

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Slim\Factory\AppFactory;
use Firebase\JWT\JWT;
use Firebase\JWT\ExpiredException;

$app = AppFactory::create();

$SECRET_KEY = 'your-256-bit-secret'; // Secret key để kiểm tra JWT

// Model cho request body
class TransactionCallback {
    public $transactionid;
    public $transactiontime;
    public $referencenumber;
    public $amount;
    public $content;
    public $bankaccount;
    public $orderId;
    public $sign;
    public $terminalCode;
    public $urlLink;
    public $serviceCode;
    public $subTerminalCode;

    public function __construct($data) {
        $this->transactionid = $data['transactionid'];
        $this->transactiontime = $data['transactiontime'];
        $this->referencenumber = $data['referencenumber'];
        $this->amount = $data['amount'];
        $this->content = $data['content'];
        $this->bankaccount = $data['bankaccount'];
        $this->orderId = $data['orderId'];
        $this->sign = $data['sign'];
        $this->terminalCode = $data['terminalCode'];
        $this->urlLink = $data['urlLink'];
        $this->serviceCode = $data['serviceCode'];
        $this->subTerminalCode = $data['subTerminalCode'];
    }
}

// Lớp model cho success response
class SuccessResponse {
    public $error;
    public $errorReason;
    public $toastMessage;
    public $object;

    public function __construct($error, $errorReason, $toastMessage, $object) {
        $this->error = $error;
        $this->errorReason = $errorReason;
        $this->toastMessage = $toastMessage;
        $this->object = $object;
    }
}

// Lớp model cho lỗi response
class ErrorResponse {
    public $error;
    public $errorReason;
    public $toastMessage;
    public $object;

    public function __construct($error, $errorReason, $toastMessage, $object) {
        $this->error = $error;
        $this->errorReason = $errorReason;
        $this->toastMessage = $toastMessage;
        $this->object = $object;
    }
}

// Lớp model cho object trả về trong success response
class TransactionResponseObject {
    public $reftransactionid;

    public function __construct($reftransactionid) {
        $this->reftransactionid = $reftransactionid;
    }
}

// API để xử lý transaction-sync
$app->post('/bank/api/transaction-sync', function (ServerRequestInterface $request, ResponseInterface $response) use ($SECRET_KEY) {
    $authHeader = $request->getHeaderLine('Authorization');
    $bearerPrefix = 'Bearer ';

    if (empty($authHeader) || !str_starts_with($authHeader, $bearerPrefix)) {
        return $this->respondWithError($response, new ErrorResponse(true, "INVALID_AUTH_HEADER", "Authorization header is missing or invalid", null), 401);
    }

    $token = substr($authHeader, strlen($bearerPrefix));

    // Xác thực token
    if (!validateToken($token, $SECRET_KEY)) {
        return $this->respondWithError($response, new ErrorResponse(true, "INVALID_TOKEN", "Invalid or expired token", null), 401);
    }

    $data = json_decode($request->getBody(), true);
    $transactionCallback = new TransactionCallback($data);

    try {
        // Ví dụ xử lý nghiệp vụ và sinh mã reftransactionid
        $refTransactionId = "GeneratedRefTransactionId"; // Tạo ID của giao dịch

        // Trả về response 200 OK với thông tin giao dịch
        $successResponse = new SuccessResponse(false, null, "Transaction processed successfully", new TransactionResponseObject($refTransactionId));
        $response->getBody()->write(json_encode($successResponse));
        return $response->withStatus(200)->withHeader('Content-Type', 'application/json');
    } catch (Exception $e) {
        return $this->respondWithError($response, new ErrorResponse(true, "TRANSACTION_FAILED", $e->getMessage(), null), 400);
    }
});

// Phương thức để xác thực token JWT
function validateToken($token, $secretKey) {
    try {
        JWT::decode($token, $secretKey, ['HS256']);
        return true;
    } catch (ExpiredException $e) {
        return false;
    } catch (Exception $e) {
        return false;
    }
}

// Phương thức để trả về lỗi response
function respondWithError($response, $errorResponse, $statusCode) {
    $response->getBody()->write(json_encode($errorResponse));
    return $response->withStatus($statusCode)->withHeader('Content-Type', 'application/json');
}

// Khởi động server
$app->run();

//sample code mang tính chất tham khảo
```

{% endtab %}

{% tab title="Python" %}

```python
from flask import Flask, request, jsonify
import jwt
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError

app = Flask(__name__)

SECRET_KEY = 'your-256-bit-secret'  # Secret key để kiểm tra JWT

# Model cho request body
class TransactionCallback:
    def __init__(self, data):
        self.transactionid = data.get('transactionid')
        self.transactiontime = data.get('transactiontime')
        self.referencenumber = data.get('referencenumber')
        self.amount = data.get('amount')
        self.content = data.get('content')
        self.bankaccount = data.get('bankaccount')
        self.orderId = data.get('orderId')
        self.sign = data.get('sign')
        self.terminalCode = data.get('terminalCode')
        self.urlLink = data.get('urlLink')
        self.serviceCode = data.get('serviceCode')
        self.subTerminalCode = data.get('subTerminalCode')

# Lớp model cho success response
class SuccessResponse:
    def __init__(self, error, errorReason, toastMessage, object):
        self.error = error
        self.errorReason = errorReason
        self.toastMessage = toastMessage
        self.object = object

# Lớp model cho lỗi response
class ErrorResponse:
    def __init__(self, error, errorReason, toastMessage, object):
        self.error = error
        self.errorReason = errorReason
        self.toastMessage = toastMessage
        self.object = object

# Lớp model cho object trả về trong success response
class TransactionResponseObject:
    def __init__(self, reftransactionid):
        self.reftransactionid = reftransactionid

@app.route('/bank/api/transaction-sync', methods=['POST'])
def transaction_sync():
    auth_header = request.headers.get('Authorization')
    bearer_prefix = 'Bearer '

    if not auth_header or not auth_header.startswith(bearer_prefix):
        return jsonify(ErrorResponse(True, "INVALID_AUTH_HEADER", "Authorization header is missing or invalid", None).__dict__), 401

    token = auth_header[len(bearer_prefix):]

    # Xác thực token
    if not validate_token(token):
        return jsonify(ErrorResponse(True, "INVALID_TOKEN", "Invalid or expired token", None).__dict__), 401

    transaction_callback = TransactionCallback(request.json)

    try:
        # Ví dụ xử lý nghiệp vụ và sinh mã reftransactionid
        ref_transaction_id = "GeneratedRefTransactionId"  # Tạo ID của giao dịch

        # Trả về response 200 OK với thông tin giao dịch
        success_response = SuccessResponse(False, None, "Transaction processed successfully",
                                           TransactionResponseObject(ref_transaction_id))
        return jsonify(success_response.__dict__), 200

    except Exception as e:
        return jsonify(ErrorResponse(True, "TRANSACTION_FAILED", str(e), None).__dict__), 400

# Phương thức để xác thực token JWT
def validate_token(token):
    try:
        jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return True
    except (ExpiredSignatureError, InvalidTokenError):
        return False

if __name__ == '__main__':
    app.run(debug=True, port=5000)

//sample code mang tính chất tham khảo
```

{% endtab %}
{% endtabs %}

### 3.3 - Các câu hỏi thường gặp triển khai API Transaction Sync

> <details>
>
> <summary>API Transaction Sync dùng để làm gì?</summary>
>
> API Transaction Sync được sử dụng để đồng bộ dữ liệu giao dịch từ hệ thống của VietQR với hệ thống của khách hàng. Nó giúp đảm bảo rằng thông tin về các giao dịch luôn được cập nhật và nhất quán giữa hai hệ thống.
>
> </details>
>
> <details>
>
> <summary>Cần chuẩn bị những gì trước khi triển khai API Transaction Sync?</summary>
>
> Trước khi triển khai, bạn cần chuẩn bị thông tin xác thực (username và password) mà VietQR cung cấp, cùng với endpoint API mà bạn sẽ tích hợp. Đảm bảo hệ thống của bạn đã sẵn sàng để tiếp nhận và xử lý dữ liệu đồng bộ từ VietQR.
>
> </details>
>
> <details>
>
> <summary>Dữ liệu đồng bộ qua API Transaction Sync bao gồm những gì?</summary>
>
> Dữ liệu được đồng bộ qua API Transaction Sync thường bao gồm các thông tin giao dịch như mã giao dịch, số tiền, trạng thái giao dịch, và thời gian thực hiện. Các thông tin chi tiết sẽ phụ thuộc vào cấu hình của VietQR và yêu cầu cụ thể của hệ thống bạn.
>
> </details>
>
> <details>
>
> <summary>Làm thế nào để xử lý nếu việc đồng bộ thất bại?</summary>
>
> Nếu việc đồng bộ thất bại, API sẽ trả về mã lỗi và thông báo chi tiết. Bạn nên kiểm tra lại dữ liệu được gửi, đảm bảo rằng thông tin xác thực là chính xác và hệ thống của bạn có thể tiếp nhận dữ liệu từ API. Nếu lỗi vẫn tiếp diễn, hãy liên hệ với bộ phận kỹ thuật của VietQR.
>
> </details>
