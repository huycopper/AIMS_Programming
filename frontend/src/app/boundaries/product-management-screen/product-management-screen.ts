import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  BulkDeleteProductResult,
  CreateProductRequest,
  Product,
  ProductHistory,
  ProductHistoryActionType,
  ProductType,
  UpdateProductRequest,
} from '../../models/product.model';
import { ProductService } from '../../services/product.service';

type ProductDraft = {
  productType: ProductType;
  title: string;
  category: string;
  generalDescription: string;
  height: number;
  width: number;
  length: number;
  weight: number;
  barcode: string;
  originalValue: number;
  currentPrice: number;
  stockQuantity: number;
  status: 'ACTIVE' | 'DEACTIVATED' | 'DELETED';
  stockAdjustmentReason: string;
  authorsText: string;
  coverType: 'PAPERBACK' | 'HARDCOVER';
  bookPublisher: string;
  bookPublicationDate: string;
  numberOfPages: number | null;
  bookLanguage: string;
  bookGenre: string;
  artistsText: string;
  recordLabel: string;
  tracksText: string;
  cdGenre: string;
  cdReleaseDate: string;
  discType: 'BLU_RAY' | 'HD_DVD';
  director: string;
  runtime: number;
  studio: string;
  dvdLanguage: string;
  subtitlesText: string;
  dvdReleaseDate: string;
  dvdGenre: string;
  editorInChief: string;
  newspaperPublisher: string;
  newspaperPublicationDate: string;
  issueNumber: string;
  publicationFrequency: string;
  issn: string;
  newspaperLanguage: string;
  sectionsText: string;
};

@Component({
  selector: 'app-product-management-screen',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './product-management-screen.html',
  styleUrl: './product-management-screen.css',
})
export class ProductManagementScreen implements OnInit {
  products: Product[] = [];
  histories: ProductHistory[] = [];
  deleteResults: BulkDeleteProductResult[] = [];
  selectedProduct: Product | null = null;
  selectedProductIds = new Set<string>();
  productTypes: ProductType[] = ['BOOK', 'CD', 'DVD', 'NEWSPAPER'];
  historyActions: Array<ProductHistoryActionType | ''> = [
    '',
    'CREATE',
    'UPDATE',
    'DELETE',
    'DEACTIVATE',
    'STOCK_ADJUST',
  ];
  formMode: 'create' | 'update' = 'create';
  search = '';
  historyAction: ProductHistoryActionType | '' = '';
  historyFrom = '';
  historyTo = '';
  deleteReason = '';
  errorMessage = '';
  successMessage = '';
  isLoading = false;
  isSaving = false;
  originalStockQuantity: number | null = null;
  draft: ProductDraft = this.createEmptyDraft();

  constructor(private readonly productService: ProductService) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.productService
      .getAdminProducts({
        search: this.search || undefined,
        page: 1,
        limit: 100,
      })
      .subscribe({
        next: (result) => {
          this.products = result.data;
          this.isLoading = false;
        },
        error: (error) => {
          this.errorMessage = this.readError(error);
          this.isLoading = false;
        },
      });
  }

  startCreate(): void {
    this.formMode = 'create';
    this.selectedProduct = null;
    this.originalStockQuantity = null;
    this.histories = [];
    this.draft = this.createEmptyDraft();
    this.clearMessages();
  }

  selectProduct(product: Product): void {
    this.formMode = 'update';
    this.selectedProduct = product;
    this.originalStockQuantity = Number(product.stockQuantity);
    this.draft = this.toDraft(product);
    this.deleteResults = [];
    this.clearMessages();
    this.loadHistories();
  }

  submitProduct(): void {
    this.clearMessages();
    const validationError = this.validateDraft();
    if (validationError) {
      this.errorMessage = validationError;
      return;
    }
    this.isSaving = true;
    const request =
      this.formMode === 'create'
        ? this.productService.createProduct(
            this.buildCreatePayload(),
          )
        : this.productService.updateProduct(
            this.selectedProduct!.productId,
            this.buildUpdatePayload(),
          );

    request.subscribe({
      next: (product) => {
        this.successMessage =
          this.formMode === 'create'
            ? 'Product created successfully.'
            : 'Product updated successfully.';
        this.isSaving = false;
        this.loadProducts();
        this.selectProduct(product);
      },
      error: (error) => {
        this.errorMessage = this.readError(error);
        this.isSaving = false;
      },
    });
  }

  toggleDeleteSelection(productId: string, checked: boolean): void {
    this.clearMessages();
    if (checked) {
      if (this.selectedProductIds.size >= 10) {
        this.errorMessage = 'You can select at most 10 products per request.';
        return;
      }
      this.selectedProductIds.add(productId);
    } else {
      this.selectedProductIds.delete(productId);
    }
  }

  isSelected(productId: string): boolean {
    return this.selectedProductIds.has(productId);
  }

  submitBulkDelete(): void {
    this.clearMessages();
    const productIds = [...this.selectedProductIds];
    if (productIds.length === 0) {
      this.errorMessage = 'Select at least one product.';
      return;
    }
    if (productIds.length > 10) {
      this.errorMessage = 'You can select at most 10 products per request.';
      return;
    }

    this.isSaving = true;
    this.productService
      .bulkDeleteProducts({
        productIds,
        reason: this.deleteReason || undefined,
      })
      .subscribe({
        next: (response) => {
          this.deleteResults = response.results;
          this.selectedProductIds.clear();
          this.successMessage = 'Delete request processed.';
          this.isSaving = false;
          this.loadProducts();
        },
        error: (error) => {
          this.errorMessage = this.readError(error);
          this.isSaving = false;
        },
      });
  }

  loadHistories(): void {
    if (!this.selectedProduct) {
      return;
    }
    this.productService
      .getProductHistories(this.selectedProduct.productId, {
        actionType: this.historyAction || undefined,
        from: this.historyFrom || undefined,
        to: this.historyTo || undefined,
      })
      .subscribe({
        next: (histories) => {
          this.histories = histories;
        },
        error: (error) => {
          this.errorMessage = this.readError(error);
        },
      });
  }

  formatPrice(value: number): string {
    return Number(value).toLocaleString('vi-VN') + ' VND';
  }

  private validateDraft(): string {
    if (!this.draft.title.trim() || !this.draft.category.trim() || !this.draft.barcode.trim()) {
      return 'Title, category, and barcode are required.';
    }
    if (this.draft.currentPrice < this.draft.originalValue * 0.3) {
      return 'Current price must be at least 30% of original value.';
    }
    if (this.draft.currentPrice > this.draft.originalValue * 1.5) {
      return 'Current price must be at most 150% of original value.';
    }
    if (
      this.formMode === 'update' &&
      this.originalStockQuantity !== null &&
      this.draft.stockQuantity !== this.originalStockQuantity &&
      !this.draft.stockAdjustmentReason.trim()
    ) {
      return 'Stock adjustment reason is required.';
    }

    return this.validateSubtypeFields();
  }

  private validateSubtypeFields(): string {
    if (this.draft.productType === 'BOOK') {
      if (
        !this.draft.authorsText.trim() ||
        !this.draft.bookPublisher.trim() ||
        !this.draft.bookPublicationDate
      ) {
        return 'Book authors, publisher, and publication date are required.';
      }
    }
    if (this.draft.productType === 'CD') {
      if (
        !this.draft.artistsText.trim() ||
        !this.draft.recordLabel.trim() ||
        !this.draft.tracksText.trim() ||
        !this.draft.cdGenre.trim()
      ) {
        return 'CD artists, record label, tracks, and genre are required.';
      }
    }
    if (this.draft.productType === 'DVD') {
      if (
        !this.draft.director.trim() ||
        !this.draft.studio.trim() ||
        !this.draft.dvdLanguage.trim() ||
        !this.draft.subtitlesText.trim() ||
        this.draft.runtime <= 0
      ) {
        return 'DVD director, runtime, studio, language, and subtitles are required.';
      }
    }
    if (this.draft.productType === 'NEWSPAPER') {
      if (
        !this.draft.editorInChief.trim() ||
        !this.draft.newspaperPublisher.trim() ||
        !this.draft.newspaperPublicationDate
      ) {
        return 'Newspaper editor-in-chief, publisher, and publication date are required.';
      }
    }
    return '';
  }

  private buildCreatePayload(): CreateProductRequest {
    return {
      ...this.basePayload(),
      ...this.subtypePayload(),
    };
  }

  private buildUpdatePayload(): UpdateProductRequest {
    return {
      ...this.basePayload(),
      stockAdjustmentReason: this.draft.stockAdjustmentReason || undefined,
      ...this.subtypePayload(),
    };
  }

  private basePayload() {
    return {
      productType: this.draft.productType,
      title: this.draft.title.trim(),
      category: this.draft.category.trim(),
      generalDescription: this.draft.generalDescription || null,
      height: Number(this.draft.height),
      width: Number(this.draft.width),
      length: Number(this.draft.length),
      weight: Number(this.draft.weight),
      barcode: this.draft.barcode.trim(),
      originalValue: Number(this.draft.originalValue),
      currentPrice: Number(this.draft.currentPrice),
      stockQuantity: Number(this.draft.stockQuantity),
    };
  }

  private subtypePayload() {
    if (this.draft.productType === 'BOOK') {
      return {
        book: {
          authors: this.splitList(this.draft.authorsText),
          coverType: this.draft.coverType,
          publisher: this.draft.bookPublisher.trim(),
          publicationDate: this.draft.bookPublicationDate,
          numberOfPages: this.draft.numberOfPages || null,
          language: this.draft.bookLanguage || null,
          genre: this.draft.bookGenre || null,
        },
      };
    }
    if (this.draft.productType === 'CD') {
      return {
        cd: {
          artists: this.splitList(this.draft.artistsText),
          recordLabel: this.draft.recordLabel.trim(),
          tracks: this.draft.tracksText
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => {
              const [title, length] = line.split('|').map((part) => part.trim());
              return length ? { title, length } : { title };
            }),
          genre: this.draft.cdGenre.trim(),
          releaseDate: this.draft.cdReleaseDate || null,
        },
      };
    }
    if (this.draft.productType === 'DVD') {
      return {
        dvd: {
          discType: this.draft.discType,
          director: this.draft.director.trim(),
          runtime: Number(this.draft.runtime),
          studio: this.draft.studio.trim(),
          language: this.draft.dvdLanguage.trim(),
          subtitles: this.splitList(this.draft.subtitlesText),
          releaseDate: this.draft.dvdReleaseDate || null,
          genre: this.draft.dvdGenre || null,
        },
      };
    }
    return {
      newspaper: {
        editorInChief: this.draft.editorInChief.trim(),
        publisher: this.draft.newspaperPublisher.trim(),
        publicationDate: this.draft.newspaperPublicationDate,
        issueNumber: this.draft.issueNumber || null,
        publicationFrequency: this.draft.publicationFrequency || null,
        issn: this.draft.issn || null,
        language: this.draft.newspaperLanguage || null,
        sections: this.draft.sectionsText
          ? this.splitList(this.draft.sectionsText)
          : null,
      },
    };
  }

  private splitList(value: string): string[] {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private toDraft(product: Product): ProductDraft {
    const draft = this.createEmptyDraft();
    Object.assign(draft, {
      productType: product.productType,
      title: product.title,
      category: product.category,
      generalDescription: product.generalDescription ?? '',
      height: Number(product.height),
      width: Number(product.width),
      length: Number(product.length),
      weight: Number(product.weight),
      barcode: product.barcode,
      originalValue: Number(product.originalValue),
      currentPrice: Number(product.currentPrice),
      stockQuantity: Number(product.stockQuantity),
      status: product.status,
    });

    if (product.book) {
      draft.authorsText = product.book.authors.join(', ');
      draft.coverType = product.book.coverType as 'PAPERBACK' | 'HARDCOVER';
      draft.bookPublisher = product.book.publisher;
      draft.bookPublicationDate = product.book.publicationDate;
      draft.numberOfPages = product.book.numberOfPages;
      draft.bookLanguage = product.book.language ?? '';
      draft.bookGenre = product.book.genre ?? '';
    }
    if (product.cd) {
      draft.artistsText = product.cd.artists.join(', ');
      draft.recordLabel = product.cd.recordLabel;
      draft.tracksText = product.cd.tracks
        .map((track) => (track.length ? `${track.title}|${track.length}` : track.title))
        .join('\n');
      draft.cdGenre = product.cd.genre;
      draft.cdReleaseDate = product.cd.releaseDate ?? '';
    }
    if (product.dvd) {
      draft.discType = product.dvd.discType as 'BLU_RAY' | 'HD_DVD';
      draft.director = product.dvd.director;
      draft.runtime = product.dvd.runtime;
      draft.studio = product.dvd.studio;
      draft.dvdLanguage = product.dvd.language;
      draft.subtitlesText = product.dvd.subtitles.join(', ');
      draft.dvdReleaseDate = product.dvd.releaseDate ?? '';
      draft.dvdGenre = product.dvd.genre ?? '';
    }
    if (product.newspaper) {
      draft.editorInChief = product.newspaper.editorInChief;
      draft.newspaperPublisher = product.newspaper.publisher;
      draft.newspaperPublicationDate = product.newspaper.publicationDate;
      draft.issueNumber = product.newspaper.issueNumber ?? '';
      draft.publicationFrequency = product.newspaper.publicationFrequency ?? '';
      draft.issn = product.newspaper.issn ?? '';
      draft.newspaperLanguage = product.newspaper.language ?? '';
      draft.sectionsText = product.newspaper.sections?.join(', ') ?? '';
    }

    return draft;
  }

  private createEmptyDraft(): ProductDraft {
    return {
      productType: 'BOOK',
      title: '',
      category: '',
      generalDescription: '',
      height: 0,
      width: 0,
      length: 0,
      weight: 0,
      barcode: '',
      originalValue: 0,
      currentPrice: 0,
      stockQuantity: 0,
      status: 'ACTIVE',
      stockAdjustmentReason: '',
      authorsText: '',
      coverType: 'PAPERBACK',
      bookPublisher: '',
      bookPublicationDate: '',
      numberOfPages: null,
      bookLanguage: '',
      bookGenre: '',
      artistsText: '',
      recordLabel: '',
      tracksText: '',
      cdGenre: '',
      cdReleaseDate: '',
      discType: 'BLU_RAY',
      director: '',
      runtime: 1,
      studio: '',
      dvdLanguage: '',
      subtitlesText: '',
      dvdReleaseDate: '',
      dvdGenre: '',
      editorInChief: '',
      newspaperPublisher: '',
      newspaperPublicationDate: '',
      issueNumber: '',
      publicationFrequency: '',
      issn: '',
      newspaperLanguage: '',
      sectionsText: '',
    };
  }


  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  private readError(error: any): string {
    const message = error?.error?.message;
    if (Array.isArray(message)) {
      return message.join(' ');
    }
    return message || 'Operation failed.';
  }
}
