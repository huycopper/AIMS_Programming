/**
 * Product model — maps to the Product entity from the backend.
 * Follows the Entity definition from Group20-ClassDesignSpecification.md §3.3.
 */

export interface Book {
  productId: string;
  authors: string[];
  coverType: string;
  publisher: string;
  publicationDate: string;
  numberOfPages: number | null;
  language: string | null;
  genre: string | null;
}

export interface Cd {
  productId: string;
  artists: string[];
  recordLabel: string;
  tracks: Array<{ title: string; length?: string }>;
  genre: string;
  releaseDate: string | null;
}

export interface Dvd {
  productId: string;
  discType: string;
  director: string;
  runtime: number;
  studio: string;
  language: string;
  subtitles: string[];
  releaseDate: string | null;
  genre: string | null;
}

export interface Newspaper {
  productId: string;
  editorInChief: string;
  publisher: string;
  publicationDate: string;
  issueNumber: string | null;
  publicationFrequency: string | null;
  issn: string | null;
  language: string | null;
  sections: string[] | null;
}

export type ProductType = 'BOOK' | 'CD' | 'DVD' | 'NEWSPAPER';
export type ProductStatus = 'ACTIVE' | 'DEACTIVATED' | 'DELETED';

export interface Product {
  productId: string;
  productType: ProductType;
  title: string;
  category: string;
  generalDescription: string | null;
  height: number;
  width: number;
  length: number;
  weight: number;
  barcode: string;
  originalValue: number;
  currentPrice: number;
  stockQuantity: number;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
  book?: Book | null;
  cd?: Cd | null;
  dvd?: Dvd | null;
  newspaper?: Newspaper | null;
}

export interface SearchProductsParams {
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}

export interface PaginatedProducts {
  data: Product[];
  total: number;
  page: number;
  limit: number;
}

export interface ProductBasePayload {
  productType: ProductType;
  title: string;
  category: string;
  generalDescription?: string | null;
  height: number;
  width: number;
  length: number;
  weight: number;
  barcode: string;
  originalValue: number;
  currentPrice: number;
  stockQuantity: number;
  status?: ProductStatus;
}

export type BookPayload = Omit<Book, 'productId'>;
export type CdPayload = Omit<Cd, 'productId'>;
export type DvdPayload = Omit<Dvd, 'productId'>;
export type NewspaperPayload = Omit<Newspaper, 'productId'>;

export interface ProductSubtypePayloads {
  book?: BookPayload;
  cd?: CdPayload;
  dvd?: DvdPayload;
  newspaper?: NewspaperPayload;
}

export type CreateProductRequest = ProductBasePayload & ProductSubtypePayloads;

export type UpdateProductRequest = Partial<ProductBasePayload> &
  ProductSubtypePayloads & {
    stockAdjustmentReason?: string;
  };

export interface BulkDeleteProductsRequest {
  productIds: string[];
  reason?: string;
}

export interface BulkDeleteProductResult {
  productId: string;
  status: 'DELETED' | 'DEACTIVATED' | 'REJECTED';
  message: string;
}

export interface BulkDeleteProductsResponse {
  results: BulkDeleteProductResult[];
}

export type ProductHistoryActionType =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'DEACTIVATE'
  | 'STOCK_ADJUST';

export interface ProductHistory {
  historyId: string;
  productId: string;
  performedBy: string;
  actionType: ProductHistoryActionType;
  actionTime: string;
  oldValueSnapshot: Record<string, unknown> | null;
  newValueSnapshot: Record<string, unknown> | null;
  reason: string | null;
}

export interface ProductHistoryQuery {
  actionType?: ProductHistoryActionType;
  from?: string;
  to?: string;
}
