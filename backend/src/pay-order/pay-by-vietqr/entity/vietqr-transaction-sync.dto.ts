/**
 * DTO cho request body từ VietQR Transaction Sync
 * Theo tài liệu 2-APITransactionSync.md
 */
export class TransactionCallbackDto {
  transactionid: string; // ID của giao dịch (Required)
  transactiontime: number; // Thời gian giao dịch timestamp ms (Required)
  referencenumber: string; // Mã giao dịch (Required)
  amount: number; // Số tiền giao dịch (Required)
  content: string; // Nội dung chuyển tiền (Required)
  bankaccount: string; // Tài khoản ngân hàng tạo mã thanh toán (Required)
  bankAccount?: string; // Fallback nếu sandbox gửi camelCase
  orderId?: string; // Sandbox có thể gửi rỗng; fallback theo content
  sign?: string; // Chữ ký (Optional)
  terminalCode?: string; // Mã cửa hàng/điểm bán (Optional)
  urlLink?: string; // Link điều hướng sau thanh toán (Optional)
  serviceCode?: string; // Mã sản phẩm/dịch vụ (Optional)
  subTerminalCode?: string; // Mã cửa hàng phụ (Optional)
  transType?: string; // Phân loại giao dịch: D (ghi nợ) / C (ghi có)
}
