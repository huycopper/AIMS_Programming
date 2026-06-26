// @vitest-environment jsdom
import '@angular/compiler';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { of, throwError } from 'rxjs';
import { Product } from '../../models/product.model';
import { CartService } from '../../services/cart.service';
import { ProductService } from '../../services/product.service';
import { ProductDetailScreen } from './product-detail-screen';

describe('ProductDetailScreen', () => {
  const product: Product = {
    productId: 'p1',
    productType: 'BOOK',
    title: 'Clean Code',
    category: 'Programming',
    generalDescription: 'Readable code practices',
    height: 20,
    width: 15,
    length: 3,
    weight: 0.8,
    barcode: 'BC-1',
    originalValue: 100000,
    currentPrice: 120000,
    stockQuantity: 4,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    book: {
      productId: 'p1',
      authors: ['Robert C. Martin'],
      coverType: 'Paperback',
      publisher: 'Prentice Hall',
      publicationDate: '2008-08-01',
      numberOfPages: 464,
      language: 'English',
      genre: 'Software',
    },
  };

  let productService: { getProductById: ReturnType<typeof vi.fn> };
  let cartService: {
    addItem: ReturnType<typeof vi.fn>;
    getCart: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    productService = { getProductById: vi.fn().mockReturnValue(of(product)) };
    cartService = {
      addItem: vi.fn(),
      getCart: vi.fn().mockReturnValue({ getItem: vi.fn().mockReturnValue(undefined) }),
    };

    await TestBed.configureTestingModule({
      imports: [ProductDetailScreen],
      providers: [
        { provide: ProductService, useValue: productService },
        { provide: CartService, useValue: cartService },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ productId: 'p1' })) },
        },
      ],
    }).compileComponents();
  });

  it('renders general and book subtype fields', () => {
    const fixture = TestBed.createComponent(ProductDetailScreen);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Clean Code');
    expect(text).toContain('Programming');
    expect(text).toContain('Readable code practices');
    expect(text).toContain('Robert C. Martin');
    expect(text).toContain('Prentice Hall');
    expect(text).toContain('464');
  });

  it('adds requested detail quantity to cart', () => {
    const fixture = TestBed.createComponent(ProductDetailScreen);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.quantity = 2;

    component.addToCart();

    expect(cartService.addItem).toHaveBeenCalledWith(product, 2);
  });

  it('rejects detail quantity above available stock', () => {
    const fixture = TestBed.createComponent(ProductDetailScreen);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.quantity = 5;

    component.addToCart();

    expect(cartService.addItem).not.toHaveBeenCalled();
    expect(component.addToCartMessage).toContain('Only 4 units are in stock');
  });

  it('rejects detail add when existing cart quantity would exceed stock', () => {
    const fixture = TestBed.createComponent(ProductDetailScreen);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    cartService.getCart.mockReturnValue({
      getItem: vi.fn().mockReturnValue({ quantity: 3 }),
    });
    component.quantity = 2;

    component.addToCart();

    expect(cartService.addItem).not.toHaveBeenCalled();
    expect(component.addToCartMessage).toContain('add at most 1 more');
  });

  it('shows safe unavailable state for missing products', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ProductDetailScreen],
      providers: [
        {
          provide: ProductService,
          useValue: { getProductById: vi.fn().mockReturnValue(throwError(() => new Error('404'))) },
        },
        { provide: CartService, useValue: cartService },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ productId: 'missing' })) },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ProductDetailScreen);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Product unavailable');
  });
});
