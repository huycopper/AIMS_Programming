// import { Controller, Post, Headers, HttpException, HttpStatus } from '@nestjs/common';
// import { VietQRBoundary } from './viet-qr.service.js';

// @Controller('vqr/api')
// export class VietQRController {
//   constructor(private readonly vietqrService: VietQRBoundary) {}

//   /*
//   VietQR sẽ callback tới api này cùng với header như dưới để đăng nhập
//   curl --location --request POST 'https://<your-host>/<your-basepath>/vqr/api/token_generate'
//   --header 'Authorization: Basic dGFpcGhpbTRrOjYxZTU1ZmU0LTBhNjMtNGU4Zi1hZDgyLTBlNjFiYzk4M\mRlNA==
//   */

//   @Post('token_generate') // MỞ endpoint để hứng (lắng nghe) request từ bên ngoài gửi tới
//   token_generate(@Headers('authorization') authHeader: string) {
//     /*
//       - @Headers(): decorator dùng để trích xuất thông tin từ HTTP Headers.
//       - 'authorization': tên của header cần lấy giá trị (ví dụ: 'Content-Type', 'User-Agent').
//       - authHeader: tên biến sẽ được gán giá trị của header 'authorization'.
//     */

//     // Kiểm tra Authorization header
//     if (!authHeader || !authHeader.startsWith('Basic ')) {
//       throw new HttpException(
//         { error: 'Authorization header is missing or invalid' },
//         HttpStatus.BAD_REQUEST
//       );
//     }

//     // Giải mã Base64 từ Authorization header
//     const base64Credentials = authHeader.split(' ')[1];
//     const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
//     const [username, password] = credentials.split(':');

//     // Gọi Service xử lý tiếp việc đăng nhập từ bên VietQR gửi đến
//     return this.vietqrService.generateJWTToken(username, password);
//   }
// }
