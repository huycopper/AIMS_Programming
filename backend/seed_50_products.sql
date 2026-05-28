-- ============================================================
-- AIMS Media Store – 50 sản phẩm seed data
-- Phân bổ: 15 Book | 12 CD | 13 DVD | 10 Newspaper
-- Constraints:
--   height, width, length, weight >= 0
--   original_value >= 0
--   current_price >= original_value * 0.30
--   current_price <= original_value * 1.50
--   stock_quantity >= 0
-- ============================================================

-- Xoá dữ liệu cũ (nếu có) theo thứ tự FK
DELETE FROM newspapers;
DELETE FROM dvds;
DELETE FROM cds;
DELETE FROM books;
DELETE FROM products;

-- ============================================================
-- 1. BOOKS (15 sản phẩm)
-- ============================================================

-- Book 1
INSERT INTO products (product_id, product_type, title, category, general_description, height, width, length, weight, barcode, original_value, current_price, stock_quantity, status)
VALUES ('b0000001-0000-0000-0000-000000000001', 'BOOK', 'Clean Code', 'Programming', 'A Handbook of Agile Software Craftsmanship by Robert C. Martin', 23.50, 19.00, 3.20, 0.75, 'BOOK-001-CC', 450000, 499000, 25, 'ACTIVE');
INSERT INTO books (product_id, authors, cover_type, publisher, publication_date, number_of_pages, language, genre)
VALUES ('b0000001-0000-0000-0000-000000000001', '["Robert C. Martin"]', 'PAPERBACK', 'Prentice Hall', '2008-08-01', 464, 'English', 'Programming');

-- Book 2
INSERT INTO products (product_id, product_type, title, category, general_description, height, width, length, weight, barcode, original_value, current_price, stock_quantity, status)
VALUES ('b0000001-0000-0000-0000-000000000002', 'BOOK', 'Design Patterns', 'Programming', 'Elements of Reusable Object-Oriented Software by Gang of Four', 24.00, 19.50, 3.50, 0.85, 'BOOK-002-DP', 550000, 599000, 18, 'ACTIVE');
INSERT INTO books (product_id, authors, cover_type, publisher, publication_date, number_of_pages, language, genre)
VALUES ('b0000001-0000-0000-0000-000000000002', '["Erich Gamma","Richard Helm","Ralph Johnson","John Vlissides"]', 'HARDCOVER', 'Addison-Wesley', '1994-10-31', 395, 'English', 'Programming');

-- Book 3
INSERT INTO products (product_id, product_type, title, category, general_description, height, width, length, weight, barcode, original_value, current_price, stock_quantity, status)
VALUES ('b0000001-0000-0000-0000-000000000003', 'BOOK', 'Nhà Giả Kim', 'Fiction', 'Tiểu thuyết nổi tiếng của Paulo Coelho về hành trình theo đuổi giấc mơ', 20.50, 13.00, 1.50, 0.30, 'BOOK-003-NGK', 79000, 89000, 50, 'ACTIVE');
INSERT INTO books (product_id, authors, cover_type, publisher, publication_date, number_of_pages, language, genre)
VALUES ('b0000001-0000-0000-0000-000000000003', '["Paulo Coelho"]', 'PAPERBACK', 'NXB Hội Nhà Văn', '2013-06-15', 228, 'Vietnamese', 'Fiction');

-- Book 4
INSERT INTO products (product_id, product_type, title, category, general_description, height, width, length, weight, barcode, original_value, current_price, stock_quantity, status)
VALUES ('b0000001-0000-0000-0000-000000000004', 'BOOK', 'The Pragmatic Programmer', 'Programming', 'Your Journey to Mastery, 20th Anniversary Edition', 23.00, 18.50, 2.80, 0.70, 'BOOK-004-PP', 500000, 520000, 15, 'ACTIVE');
INSERT INTO books (product_id, authors, cover_type, publisher, publication_date, number_of_pages, language, genre)
VALUES ('b0000001-0000-0000-0000-000000000004', '["David Thomas","Andrew Hunt"]', 'PAPERBACK', 'Addison-Wesley', '2019-09-23', 352, 'English', 'Programming');

-- Book 5
INSERT INTO products (product_id, product_type, title, category, general_description, height, width, length, weight, barcode, original_value, current_price, stock_quantity, status)
VALUES ('b0000001-0000-0000-0000-000000000005', 'BOOK', 'Đắc Nhân Tâm', 'Self-Help', 'Cuốn sách kinh điển của Dale Carnegie về nghệ thuật giao tiếp', 20.50, 14.50, 2.00, 0.35, 'BOOK-005-DNT', 86000, 98000, 100, 'ACTIVE');
INSERT INTO books (product_id, authors, cover_type, publisher, publication_date, number_of_pages, language, genre)
VALUES ('b0000001-0000-0000-0000-000000000005', '["Dale Carnegie"]', 'PAPERBACK', 'NXB Tổng hợp TPHCM', '2016-03-01', 320, 'Vietnamese', 'Self-Help');

-- Book 6
INSERT INTO products (product_id, product_type, title, category, general_description, height, width, length, weight, barcode, original_value, current_price, stock_quantity, status)
VALUES ('b0000001-0000-0000-0000-000000000006', 'BOOK', 'Sapiens: A Brief History of Humankind', 'Non-Fiction', 'Lịch sử loài người từ thời kỳ đồ đá đến thế kỷ 21', 23.50, 15.50, 3.00, 0.55, 'BOOK-006-SAP', 189000, 215000, 30, 'ACTIVE');
INSERT INTO books (product_id, authors, cover_type, publisher, publication_date, number_of_pages, language, genre)
VALUES ('b0000001-0000-0000-0000-000000000006', '["Yuval Noah Harari"]', 'PAPERBACK', 'NXB Tri thức', '2018-07-20', 560, 'Vietnamese', 'Non-Fiction');

-- Book 7
INSERT INTO products (product_id, product_type, title, category, general_description, height, width, length, weight, barcode, original_value, current_price, stock_quantity, status)
VALUES ('b0000001-0000-0000-0000-000000000007', 'BOOK', 'Introduction to Algorithms', 'Academic', 'CLRS - The classic textbook on algorithms', 25.50, 20.00, 4.50, 1.80, 'BOOK-007-CLRS', 1200000, 1350000, 8, 'ACTIVE');
INSERT INTO books (product_id, authors, cover_type, publisher, publication_date, number_of_pages, language, genre)
VALUES ('b0000001-0000-0000-0000-000000000007', '["Thomas H. Cormen","Charles E. Leiserson","Ronald L. Rivest","Clifford Stein"]', 'HARDCOVER', 'MIT Press', '2022-04-05', 1312, 'English', 'Academic');

-- Book 8
INSERT INTO products (product_id, product_type, title, category, general_description, height, width, length, weight, barcode, original_value, current_price, stock_quantity, status)
VALUES ('b0000001-0000-0000-0000-000000000008', 'BOOK', 'Tôi Thấy Hoa Vàng Trên Cỏ Xanh', 'Fiction', 'Tiểu thuyết nổi tiếng của Nguyễn Nhật Ánh', 20.00, 13.00, 1.80, 0.28, 'BOOK-008-TTHV', 68000, 75000, 45, 'ACTIVE');
INSERT INTO books (product_id, authors, cover_type, publisher, publication_date, number_of_pages, language, genre)
VALUES ('b0000001-0000-0000-0000-000000000008', '["Nguyễn Nhật Ánh"]', 'PAPERBACK', 'NXB Trẻ', '2010-12-01', 378, 'Vietnamese', 'Fiction');

-- Book 9
INSERT INTO products (product_id, product_type, title, category, general_description, height, width, length, weight, barcode, original_value, current_price, stock_quantity, status)
VALUES ('b0000001-0000-0000-0000-000000000009', 'BOOK', 'Atomic Habits', 'Self-Help', 'An Easy & Proven Way to Build Good Habits & Break Bad Ones', 21.00, 14.00, 2.20, 0.40, 'BOOK-009-AH', 299000, 330000, 60, 'ACTIVE');
INSERT INTO books (product_id, authors, cover_type, publisher, publication_date, number_of_pages, language, genre)
VALUES ('b0000001-0000-0000-0000-000000000009', '["James Clear"]', 'PAPERBACK', 'NXB Lao Động', '2020-01-15', 320, 'Vietnamese', 'Self-Help');

-- Book 10
INSERT INTO products (product_id, product_type, title, category, general_description, height, width, length, weight, barcode, original_value, current_price, stock_quantity, status)
VALUES ('b0000001-0000-0000-0000-000000000010', 'BOOK', 'Harry Potter and the Philosopher''s Stone', 'Fiction', 'The first book in the legendary Harry Potter series', 22.00, 14.00, 2.50, 0.45, 'BOOK-010-HP1', 250000, 280000, 35, 'ACTIVE');
INSERT INTO books (product_id, authors, cover_type, publisher, publication_date, number_of_pages, language, genre)
VALUES ('b0000001-0000-0000-0000-000000000010', '["J.K. Rowling"]', 'PAPERBACK', 'Bloomsbury', '1997-06-26', 332, 'English', 'Fantasy');

-- Book 11
INSERT INTO products (product_id, product_type, title, category, general_description, height, width, length, weight, barcode, original_value, current_price, stock_quantity, status)
VALUES ('b0000001-0000-0000-0000-000000000011', 'BOOK', 'Tuổi Trẻ Đáng Giá Bao Nhiêu', 'Self-Help', 'Cuốn sách truyền cảm hứng cho giới trẻ Việt Nam của Rosie Nguyễn', 20.50, 14.50, 1.50, 0.32, 'BOOK-011-TTDG', 76000, 85000, 70, 'ACTIVE');
INSERT INTO books (product_id, authors, cover_type, publisher, publication_date, number_of_pages, language, genre)
VALUES ('b0000001-0000-0000-0000-000000000011', '["Rosie Nguyễn"]', 'PAPERBACK', 'NXB Hội Nhà Văn', '2016-09-01', 256, 'Vietnamese', 'Self-Help');

-- Book 12
INSERT INTO products (product_id, product_type, title, category, general_description, height, width, length, weight, barcode, original_value, current_price, stock_quantity, status)
VALUES ('b0000001-0000-0000-0000-000000000012', 'BOOK', 'System Design Interview', 'Programming', 'An insider''s guide by Alex Xu', 23.00, 18.00, 2.50, 0.60, 'BOOK-012-SDI', 650000, 720000, 12, 'ACTIVE');
INSERT INTO books (product_id, authors, cover_type, publisher, publication_date, number_of_pages, language, genre)
VALUES ('b0000001-0000-0000-0000-000000000012', '["Alex Xu"]', 'PAPERBACK', 'ByteByteGo', '2020-06-12', 322, 'English', 'Programming');

-- Book 13
INSERT INTO products (product_id, product_type, title, category, general_description, height, width, length, weight, barcode, original_value, current_price, stock_quantity, status)
VALUES ('b0000001-0000-0000-0000-000000000013', 'BOOK', 'Dune', 'Fiction', 'The epic science fiction masterpiece by Frank Herbert', 21.00, 14.00, 3.00, 0.50, 'BOOK-013-DUNE', 320000, 360000, 20, 'ACTIVE');
INSERT INTO books (product_id, authors, cover_type, publisher, publication_date, number_of_pages, language, genre)
VALUES ('b0000001-0000-0000-0000-000000000013', '["Frank Herbert"]', 'PAPERBACK', 'Ace Books', '1965-08-01', 688, 'English', 'Science Fiction');

-- Book 14
INSERT INTO products (product_id, product_type, title, category, general_description, height, width, length, weight, barcode, original_value, current_price, stock_quantity, status)
VALUES ('b0000001-0000-0000-0000-000000000014', 'BOOK', 'Số Đỏ', 'Fiction', 'Tác phẩm kinh điển của văn học Việt Nam hiện đại', 20.00, 13.00, 1.20, 0.25, 'BOOK-014-SD', 55000, 62000, 40, 'ACTIVE');
INSERT INTO books (product_id, authors, cover_type, publisher, publication_date, number_of_pages, language, genre)
VALUES ('b0000001-0000-0000-0000-000000000014', '["Vũ Trọng Phụng"]', 'PAPERBACK', 'NXB Văn Học', '2015-01-01', 280, 'Vietnamese', 'Classic Literature');

-- Book 15
INSERT INTO products (product_id, product_type, title, category, general_description, height, width, length, weight, barcode, original_value, current_price, stock_quantity, status)
VALUES ('b0000001-0000-0000-0000-000000000015', 'BOOK', 'Refactoring', 'Programming', 'Improving the Design of Existing Code, 2nd Edition', 24.00, 18.50, 3.00, 0.80, 'BOOK-015-REF', 580000, 650000, 10, 'ACTIVE');
INSERT INTO books (product_id, authors, cover_type, publisher, publication_date, number_of_pages, language, genre)
VALUES ('b0000001-0000-0000-0000-000000000015', '["Martin Fowler"]', 'PAPERBACK', 'Addison-Wesley', '2018-11-20', 448, 'English', 'Programming');


-- ============================================================
-- 2. CDs (12 sản phẩm)
-- ============================================================

-- CD 1
INSERT INTO products (product_id, product_type, title, category, general_description, height, width, length, weight, barcode, original_value, current_price, stock_quantity, status)
VALUES ('c0000001-0000-0000-0000-000000000001', 'CD', 'Back in Black', 'Rock', 'Album huyền thoại của AC/DC, best-selling album mọi thời đại', 14.20, 12.50, 1.00, 0.10, 'CD-001-BIB', 250000, 280000, 30, 'ACTIVE');
INSERT INTO cds (product_id, artists, record_label, tracks, genre, release_date)
VALUES ('c0000001-0000-0000-0000-000000000001', '["AC/DC"]', 'Albert/Atlantic', '[{"title":"Hells Bells","length":"5:12"},{"title":"Shoot to Thrill","length":"5:17"},{"title":"Back in Black","length":"4:15"},{"title":"You Shook Me All Night Long","length":"3:30"}]', 'Rock', '1980-07-25');

-- CD 2
INSERT INTO products (product_id, product_type, title, category, general_description, height, width, length, weight, barcode, original_value, current_price, stock_quantity, status)
VALUES ('c0000001-0000-0000-0000-000000000002', 'CD', 'Hoàng - Hoàng Thuỳ Linh', 'V-Pop', 'Album đình đám của nữ ca sĩ Hoàng Thuỳ Linh', 14.20, 12.50, 1.00, 0.10, 'CD-002-HTL', 180000, 199000, 40, 'ACTIVE');
INSERT INTO cds (product_id, artists, record_label, tracks, genre, release_date)
VALUES ('c0000001-0000-0000-0000-000000000002', '["Hoàng Thuỳ Linh"]', 'Universal Music Vietnam', '[{"title":"Để Mị Nói Cho Mà Nghe","length":"4:05"},{"title":"Bánh Trôi Nước","length":"3:48"},{"title":"See Tình","length":"3:22"},{"title":"Gieo Quẻ","length":"3:45"}]', 'V-Pop', '2019-12-10');

-- CD 3
INSERT INTO products (product_id, product_type, title, category, general_description, height, width, length, weight, barcode, original_value, current_price, stock_quantity, status)
VALUES ('c0000001-0000-0000-0000-000000000003', 'CD', 'Abbey Road', 'Rock', 'Album cuối cùng của The Beatles thu âm tại phòng thu Abbey Road', 14.20, 12.50, 1.00, 0.10, 'CD-003-AR', 350000, 399000, 15, 'ACTIVE');
INSERT INTO cds (product_id, artists, record_label, tracks, genre, release_date)
VALUES ('c0000001-0000-0000-0000-000000000003', '["The Beatles"]', 'Apple Records', '[{"title":"Come Together","length":"4:19"},{"title":"Something","length":"3:02"},{"title":"Here Comes the Sun","length":"3:05"},{"title":"Let It Be","length":"4:03"}]', 'Rock', '1969-09-26');

-- CD 4
INSERT INTO products (product_id, product_type, title, category, general_description, height, width, length, weight, barcode, original_value, current_price, stock_quantity, status)
VALUES ('c0000001-0000-0000-0000-000000000004', 'CD', 'Truyện Ngắn', 'V-Pop', 'Album phòng thu đầu tay của Hà Anh Tuấn, mang đậm chất acoustic', 14.20, 12.50, 1.00, 0.10, 'CD-004-TN', 200000, 230000, 25, 'ACTIVE');
INSERT INTO cds (product_id, artists, record_label, tracks, genre, release_date)
VALUES ('c0000001-0000-0000-0000-000000000004', '["Hà Anh Tuấn"]', 'VMusic', '[{"title":"Tháng Tư Là Lời Nói Dối Của Em","length":"4:30"},{"title":"Người Hãy Quên Em Đi","length":"5:10"},{"title":"Truyện Ngắn","length":"4:15"}]', 'V-Pop', '2022-04-01');

-- CD 5
INSERT INTO products (product_id, product_type, title, category, general_description, height, width, length, weight, barcode, original_value, current_price, stock_quantity, status)
VALUES ('c0000001-0000-0000-0000-000000000005', 'CD', 'Thriller', 'Pop', 'Album bán chạy nhất lịch sử của Michael Jackson', 14.20, 12.50, 1.00, 0.10, 'CD-005-THR', 300000, 350000, 20, 'ACTIVE');
INSERT INTO cds (product_id, artists, record_label, tracks, genre, release_date)
VALUES ('c0000001-0000-0000-0000-000000000005', '["Michael Jackson"]', 'Epic Records', '[{"title":"Wanna Be Startin Somethin","length":"6:03"},{"title":"Thriller","length":"5:57"},{"title":"Beat It","length":"4:18"},{"title":"Billie Jean","length":"4:54"}]', 'Pop', '1982-11-30');

-- CD 6
INSERT INTO products (product_id, product_type, title, category, general_description, height, width, length, weight, barcode, original_value, current_price, stock_quantity, status)
VALUES ('c0000001-0000-0000-0000-000000000006', 'CD', 'Mây Lang Thang', 'Indie', 'Album indie nổi tiếng của ban nhạc Ngọt', 14.20, 12.50, 1.00, 0.10, 'CD-006-MLT', 150000, 170000, 35, 'ACTIVE');
INSERT INTO cds (product_id, artists, record_label, tracks, genre, release_date)
VALUES ('c0000001-0000-0000-0000-000000000006', '["Ngọt"]', 'Independent', '[{"title":"Em Dạo Này","length":"3:40"},{"title":"Cho Tôi Đi Theo","length":"4:20"},{"title":"Mây Lang Thang","length":"3:55"}]', 'Indie', '2020-08-15');

-- CD 7
INSERT INTO products (product_id, product_type, title, category, general_description, height, width, length, weight, barcode, original_value, current_price, stock_quantity, status)
VALUES ('c0000001-0000-0000-0000-000000000007', 'CD', 'The Dark Side of the Moon', 'Progressive Rock', 'Album biểu tượng của Pink Floyd', 14.20, 12.50, 1.00, 0.10, 'CD-007-DSOTM', 380000, 420000, 10, 'ACTIVE');
INSERT INTO cds (product_id, artists, record_label, tracks, genre, release_date)
VALUES ('c0000001-0000-0000-0000-000000000007', '["Pink Floyd"]', 'Harvest Records', '[{"title":"Speak to Me","length":"1:30"},{"title":"Breathe","length":"2:43"},{"title":"Time","length":"7:06"},{"title":"Money","length":"6:22"}]', 'Progressive Rock', '1973-03-01');

-- CD 8
INSERT INTO products (product_id, product_type, title, category, general_description, height, width, length, weight, barcode, original_value, current_price, stock_quantity, status)
VALUES ('c0000001-0000-0000-0000-000000000008', 'CD', 'Sơn Tùng M-TP Collection', 'V-Pop', 'Tuyển tập các bản hit của Sơn Tùng M-TP', 14.20, 12.50, 1.00, 0.10, 'CD-008-STMTP', 220000, 250000, 55, 'ACTIVE');
INSERT INTO cds (product_id, artists, record_label, tracks, genre, release_date)
VALUES ('c0000001-0000-0000-0000-000000000008', '["Sơn Tùng M-TP"]', 'M-TP Entertainment', '[{"title":"Lạc Trôi","length":"4:42"},{"title":"Nơi Này Có Anh","length":"4:30"},{"title":"Hãy Trao Cho Anh","length":"4:05"},{"title":"Chạy Ngay Đi","length":"4:18"}]', 'V-Pop', '2023-06-01');

-- CD 9
INSERT INTO products (product_id, product_type, title, category, general_description, height, width, length, weight, barcode, original_value, current_price, stock_quantity, status)
VALUES ('c0000001-0000-0000-0000-000000000009', 'CD', 'A Night at the Opera', 'Rock', 'Album chứa bài Bohemian Rhapsody huyền thoại của Queen', 14.20, 12.50, 1.00, 0.10, 'CD-009-ANATO', 320000, 350000, 12, 'ACTIVE');
INSERT INTO cds (product_id, artists, record_label, tracks, genre, release_date)
VALUES ('c0000001-0000-0000-0000-000000000009', '["Queen"]', 'EMI', '[{"title":"Bohemian Rhapsody","length":"5:55"},{"title":"Love of My Life","length":"3:38"},{"title":"You are the Champions","length":"2:59"}]', 'Rock', '1975-11-21');

-- CD 10
INSERT INTO products (product_id, product_type, title, category, general_description, height, width, length, weight, barcode, original_value, current_price, stock_quantity, status)
VALUES ('c0000001-0000-0000-0000-000000000010', 'CD', 'Bích Phương Album', 'V-Pop', 'Album hit của ca sĩ Bích Phương', 14.20, 12.50, 1.00, 0.10, 'CD-010-BP', 160000, 185000, 30, 'ACTIVE');
INSERT INTO cds (product_id, artists, record_label, tracks, genre, release_date)
VALUES ('c0000001-0000-0000-0000-000000000010', '["Bích Phương"]', 'POPS Music', '[{"title":"Bùa Yêu","length":"3:58"},{"title":"Đi Đu Đưa Đi","length":"3:40"},{"title":"Gửi Anh Xa Nhớ","length":"4:15"}]', 'V-Pop', '2021-03-20');

-- CD 11
INSERT INTO products (product_id, product_type, title, category, general_description, height, width, length, weight, barcode, original_value, current_price, stock_quantity, status)
VALUES ('c0000001-0000-0000-0000-000000000011', 'CD', '21 - Adele', 'Pop', 'Album phá kỷ lục của Adele với Someone Like You', 14.20, 12.50, 1.00, 0.10, 'CD-011-21', 280000, 310000, 22, 'ACTIVE');
INSERT INTO cds (product_id, artists, record_label, tracks, genre, release_date)
VALUES ('c0000001-0000-0000-0000-000000000011', '["Adele"]', 'XL Recordings', '[{"title":"Rolling in the Deep","length":"3:48"},{"title":"Someone Like You","length":"4:45"},{"title":"Set Fire to the Rain","length":"4:01"}]', 'Pop', '2011-01-24');

-- CD 12
INSERT INTO products (product_id, product_type, title, category, general_description, height, width, length, weight, barcode, original_value, current_price, stock_quantity, status)
VALUES ('c0000001-0000-0000-0000-000000000012', 'CD', 'Beethoven Symphony Collection', 'Classical', 'Tuyển tập giao hưởng Beethoven do Berlin Philharmonic trình diễn', 14.20, 12.50, 2.50, 0.25, 'CD-012-BSC', 450000, 500000, 8, 'ACTIVE');
INSERT INTO cds (product_id, artists, record_label, tracks, genre, release_date)
VALUES ('c0000001-0000-0000-0000-000000000012', '["Berlin Philharmonic","Herbert von Karajan"]', 'Deutsche Grammophon', '[{"title":"Symphony No.5 in C minor","length":"33:10"},{"title":"Symphony No.9 in D minor","length":"65:42"},{"title":"Symphony No.7 in A major","length":"36:15"}]', 'Classical', '2015-09-10');


-- ============================================================
-- 3. DVDs (13 sản phẩm)
-- ============================================================

-- DVD 1
INSERT INTO products (product_id, product_type, title, category, general_description, height, width, length, weight, barcode, original_value, current_price, stock_quantity, status)
VALUES ('d0000001-0000-0000-0000-000000000001', 'DVD', 'The Shawshank Redemption', 'Drama', 'Bộ phim xếp hạng #1 trên IMDb mọi thời đại', 19.00, 13.50, 1.50, 0.08, 'DVD-001-TSR', 180000, 199000, 25, 'ACTIVE');
INSERT INTO dvds (product_id, disc_type, director, runtime, studio, language, subtitles, release_date, genre)
VALUES ('d0000001-0000-0000-0000-000000000001', 'BLU_RAY', 'Frank Darabont', 142, 'Castle Rock Entertainment', 'English', '["Vietnamese","English","Chinese"]', '1994-09-23', 'Drama');

-- DVD 2
INSERT INTO products (product_id, product_type, title, category, general_description, height, width, length, weight, barcode, original_value, current_price, stock_quantity, status)
VALUES ('d0000001-0000-0000-0000-000000000002', 'DVD', 'Parasite', 'Thriller', 'Phim Hàn Quốc đoạt giải Oscar Phim hay nhất 2020', 19.00, 13.50, 1.50, 0.08, 'DVD-002-PAR', 220000, 250000, 20, 'ACTIVE');
INSERT INTO dvds (product_id, disc_type, director, runtime, studio, language, subtitles, release_date, genre)
VALUES ('d0000001-0000-0000-0000-000000000002', 'BLU_RAY', 'Bong Joon-ho', 132, 'CJ Entertainment', 'Korean', '["Vietnamese","English","Korean"]', '2019-05-30', 'Thriller');

-- DVD 3
INSERT INTO products (product_id, product_type, title, category, general_description, height, width, length, weight, barcode, original_value, current_price, stock_quantity, status)
VALUES ('d0000001-0000-0000-0000-000000000003', 'DVD', 'Hai Phượng (Furie)', 'Action', 'Phim hành động Việt Nam với Ngô Thanh Vân', 19.00, 13.50, 1.50, 0.08, 'DVD-003-HP', 150000, 170000, 35, 'ACTIVE');
INSERT INTO dvds (product_id, disc_type, director, runtime, studio, language, subtitles, release_date, genre)
VALUES ('d0000001-0000-0000-0000-000000000003', 'HD_DVD', 'Lê Văn Kiệt', 98, 'Studio68', 'Vietnamese', '["English","Chinese"]', '2019-02-22', 'Action');

-- DVD 4
INSERT INTO products (product_id, product_type, title, category, general_description, height, width, length, weight, barcode, original_value, current_price, stock_quantity, status)
VALUES ('d0000001-0000-0000-0000-000000000004', 'DVD', 'Inception', 'Sci-Fi', 'Phim khoa học viễn tưởng đỉnh cao của Christopher Nolan', 19.00, 13.50, 1.50, 0.08, 'DVD-004-INC', 200000, 230000, 18, 'ACTIVE');
INSERT INTO dvds (product_id, disc_type, director, runtime, studio, language, subtitles, release_date, genre)
VALUES ('d0000001-0000-0000-0000-000000000004', 'BLU_RAY', 'Christopher Nolan', 148, 'Warner Bros', 'English', '["Vietnamese","English","Japanese"]', '2010-07-16', 'Sci-Fi');

-- DVD 5
INSERT INTO products (product_id, product_type, title, category, general_description, height, width, length, weight, barcode, original_value, current_price, stock_quantity, status)
VALUES ('d0000001-0000-0000-0000-000000000005', 'DVD', 'Spirited Away', 'Animation', 'Kiệt tác hoạt hình của Hayao Miyazaki - Studio Ghibli', 19.00, 13.50, 1.50, 0.08, 'DVD-005-SA', 280000, 320000, 15, 'ACTIVE');
INSERT INTO dvds (product_id, disc_type, director, runtime, studio, language, subtitles, release_date, genre)
VALUES ('d0000001-0000-0000-0000-000000000005', 'BLU_RAY', 'Hayao Miyazaki', 125, 'Studio Ghibli', 'Japanese', '["Vietnamese","English","Japanese"]', '2001-07-20', 'Animation');

-- DVD 6
INSERT INTO products (product_id, product_type, title, category, general_description, height, width, length, weight, barcode, original_value, current_price, stock_quantity, status)
VALUES ('d0000001-0000-0000-0000-000000000006', 'DVD', 'Mắt Biếc', 'Romance', 'Phim chuyển thể từ tiểu thuyết cùng tên của Nguyễn Nhật Ánh', 19.00, 13.50, 1.50, 0.08, 'DVD-006-MB', 160000, 180000, 28, 'ACTIVE');
INSERT INTO dvds (product_id, disc_type, director, runtime, studio, language, subtitles, release_date, genre)
VALUES ('d0000001-0000-0000-0000-000000000006', 'HD_DVD', 'Victor Vũ', 117, 'Galaxy Studio', 'Vietnamese', '["English"]', '2019-12-20', 'Romance');

-- DVD 7
INSERT INTO products (product_id, product_type, title, category, general_description, height, width, length, weight, barcode, original_value, current_price, stock_quantity, status)
VALUES ('d0000001-0000-0000-0000-000000000007', 'DVD', 'Interstellar', 'Sci-Fi', 'Hành trình xuyên không gian của Christopher Nolan', 19.00, 13.50, 1.50, 0.08, 'DVD-007-INT', 220000, 250000, 22, 'ACTIVE');
INSERT INTO dvds (product_id, disc_type, director, runtime, studio, language, subtitles, release_date, genre)
VALUES ('d0000001-0000-0000-0000-000000000007', 'BLU_RAY', 'Christopher Nolan', 169, 'Warner Bros', 'English', '["Vietnamese","English","French"]', '2014-11-07', 'Sci-Fi');

-- DVD 8
INSERT INTO products (product_id, product_type, title, category, general_description, height, width, length, weight, barcode, original_value, current_price, stock_quantity, status)
VALUES ('d0000001-0000-0000-0000-000000000008', 'DVD', 'Bố Già', 'Comedy-Drama', 'Phim Việt Nam phá kỷ lục phòng vé của Trấn Thành', 19.00, 13.50, 1.50, 0.08, 'DVD-008-BG', 140000, 160000, 45, 'ACTIVE');
INSERT INTO dvds (product_id, disc_type, director, runtime, studio, language, subtitles, release_date, genre)
VALUES ('d0000001-0000-0000-0000-000000000008', 'HD_DVD', 'Trấn Thành', 128, 'ĐPMD Entertainment', 'Vietnamese', '["English","Chinese"]', '2021-03-12', 'Comedy-Drama');

-- DVD 9
INSERT INTO products (product_id, product_type, title, category, general_description, height, width, length, weight, barcode, original_value, current_price, stock_quantity, status)
VALUES ('d0000001-0000-0000-0000-000000000009', 'DVD', 'The Lord of the Rings: The Fellowship', 'Fantasy', 'Phần 1 của bộ ba phim Chúa Nhẫn', 19.00, 13.50, 2.00, 0.12, 'DVD-009-LOTR', 350000, 399000, 10, 'ACTIVE');
INSERT INTO dvds (product_id, disc_type, director, runtime, studio, language, subtitles, release_date, genre)
VALUES ('d0000001-0000-0000-0000-000000000009', 'BLU_RAY', 'Peter Jackson', 228, 'New Line Cinema', 'English', '["Vietnamese","English","French","Spanish"]', '2001-12-19', 'Fantasy');

-- DVD 10
INSERT INTO products (product_id, product_type, title, category, general_description, height, width, length, weight, barcode, original_value, current_price, stock_quantity, status)
VALUES ('d0000001-0000-0000-0000-000000000010', 'DVD', 'Your Name (Kimi no Na wa)', 'Animation', 'Anime nổi tiếng của Makoto Shinkai', 19.00, 13.50, 1.50, 0.08, 'DVD-010-YN', 240000, 270000, 18, 'ACTIVE');
INSERT INTO dvds (product_id, disc_type, director, runtime, studio, language, subtitles, release_date, genre)
VALUES ('d0000001-0000-0000-0000-000000000010', 'BLU_RAY', 'Makoto Shinkai', 106, 'CoMix Wave Films', 'Japanese', '["Vietnamese","English","Japanese"]', '2016-08-26', 'Animation');

-- DVD 11
INSERT INTO products (product_id, product_type, title, category, general_description, height, width, length, weight, barcode, original_value, current_price, stock_quantity, status)
VALUES ('d0000001-0000-0000-0000-000000000011', 'DVD', 'The Matrix', 'Sci-Fi', 'Phim hành động sci-fi kinh điển của anh em Wachowski', 19.00, 13.50, 1.50, 0.08, 'DVD-011-MTX', 180000, 210000, 16, 'ACTIVE');
INSERT INTO dvds (product_id, disc_type, director, runtime, studio, language, subtitles, release_date, genre)
VALUES ('d0000001-0000-0000-0000-000000000011', 'HD_DVD', 'Lana Wachowski', 136, 'Warner Bros', 'English', '["Vietnamese","English"]', '1999-03-31', 'Sci-Fi');

-- DVD 12
INSERT INTO products (product_id, product_type, title, category, general_description, height, width, length, weight, barcode, original_value, current_price, stock_quantity, status)
VALUES ('d0000001-0000-0000-0000-000000000012', 'DVD', 'Em Chưa 18', 'Comedy', 'Phim hài Việt Nam đạt doanh thu cao', 19.00, 13.50, 1.50, 0.08, 'DVD-012-EC18', 120000, 140000, 38, 'ACTIVE');
INSERT INTO dvds (product_id, disc_type, director, runtime, studio, language, subtitles, release_date, genre)
VALUES ('d0000001-0000-0000-0000-000000000012', 'HD_DVD', 'Lê Thanh Sơn', 106, 'CJ HK Entertainment', 'Vietnamese', '["English"]', '2017-04-28', 'Comedy');

-- DVD 13
INSERT INTO products (product_id, product_type, title, category, general_description, height, width, length, weight, barcode, original_value, current_price, stock_quantity, status)
VALUES ('d0000001-0000-0000-0000-000000000013', 'DVD', 'Avengers: Endgame', 'Action', 'Bom tấn kết thúc Infinity Saga của Marvel', 19.00, 13.50, 1.50, 0.08, 'DVD-013-AE', 280000, 320000, 30, 'ACTIVE');
INSERT INTO dvds (product_id, disc_type, director, runtime, studio, language, subtitles, release_date, genre)
VALUES ('d0000001-0000-0000-0000-000000000013', 'BLU_RAY', 'Anthony Russo', 181, 'Marvel Studios', 'English', '["Vietnamese","English","Chinese","Korean"]', '2019-04-26', 'Action');


-- ============================================================
-- 4. NEWSPAPERS (10 sản phẩm)
-- ============================================================

-- Newspaper 1
INSERT INTO products (product_id, product_type, title, category, general_description, height, width, length, weight, barcode, original_value, current_price, stock_quantity, status)
VALUES ('e0000001-0000-0000-0000-000000000001', 'NEWSPAPER', 'Tuổi Trẻ - Số 150/2025', 'News', 'Báo Tuổi Trẻ - Nhật báo hàng đầu Việt Nam', 54.00, 38.00, 0.30, 0.18, 'NP-001-TT150', 15000, 15000, 200, 'ACTIVE');
INSERT INTO newspapers (product_id, editor_in_chief, publisher, publication_date, issue_number, publication_frequency, issn, language, sections)
VALUES ('e0000001-0000-0000-0000-000000000001', 'Lê Thế Chữ', 'Báo Tuổi Trẻ', '2025-05-28', '150/2025', 'Daily', '0800-7594', 'Vietnamese', '["Thời sự","Kinh tế","Thể thao","Giải trí","Quốc tế"]');

-- Newspaper 2
INSERT INTO products (product_id, product_type, title, category, general_description, height, width, length, weight, barcode, original_value, current_price, stock_quantity, status)
VALUES ('e0000001-0000-0000-0000-000000000002', 'NEWSPAPER', 'VnExpress Magazine - Tháng 5/2025', 'Technology', 'Tạp chí công nghệ hàng đầu Việt Nam', 29.70, 21.00, 0.50, 0.25, 'NP-002-VNE05', 45000, 50000, 80, 'ACTIVE');
INSERT INTO newspapers (product_id, editor_in_chief, publisher, publication_date, issue_number, publication_frequency, issn, language, sections)
VALUES ('e0000001-0000-0000-0000-000000000002', 'Thang Đức Thắng', 'FPT Online', '2025-05-01', '05/2025', 'Monthly', '1234-5678', 'Vietnamese', '["Công nghệ","Startup","AI & ML","Review sản phẩm"]');

-- Newspaper 3
INSERT INTO products (product_id, product_type, title, category, general_description, height, width, length, weight, barcode, original_value, current_price, stock_quantity, status)
VALUES ('e0000001-0000-0000-0000-000000000003', 'NEWSPAPER', 'The Economist - May 2025', 'Business', 'Tạp chí kinh tế uy tín nhất thế giới', 27.00, 20.00, 0.40, 0.20, 'NP-003-ECO05', 120000, 135000, 25, 'ACTIVE');
INSERT INTO newspapers (product_id, editor_in_chief, publisher, publication_date, issue_number, publication_frequency, issn, language, sections)
VALUES ('e0000001-0000-0000-0000-000000000003', 'Zanny Minton Beddoes', 'The Economist Group', '2025-05-10', 'Vol.451 No.9399', 'Weekly', '0013-0613', 'English', '["World This Week","Leaders","Business","Finance","Science"]');

-- Newspaper 4
INSERT INTO products (product_id, product_type, title, category, general_description, height, width, length, weight, barcode, original_value, current_price, stock_quantity, status)
VALUES ('e0000001-0000-0000-0000-000000000004', 'NEWSPAPER', 'Thanh Niên - Số 200/2025', 'News', 'Báo Thanh Niên - Cơ quan TW Hội Liên hiệp Thanh niên VN', 54.00, 38.00, 0.30, 0.18, 'NP-004-TN200', 12000, 12000, 150, 'ACTIVE');
INSERT INTO newspapers (product_id, editor_in_chief, publisher, publication_date, issue_number, publication_frequency, issn, language, sections)
VALUES ('e0000001-0000-0000-0000-000000000004', 'Nguyễn Ngọc Toàn', 'Báo Thanh Niên', '2025-05-27', '200/2025', 'Daily', '0800-7602', 'Vietnamese', '["Thời sự","Giáo dục","Công nghệ","Đời sống","Thể thao"]');

-- Newspaper 5
INSERT INTO products (product_id, product_type, title, category, general_description, height, width, length, weight, barcode, original_value, current_price, stock_quantity, status)
VALUES ('e0000001-0000-0000-0000-000000000005', 'NEWSPAPER', 'National Geographic - May 2025', 'Science', 'Tạp chí khoa học và khám phá nổi tiếng toàn cầu', 27.50, 21.00, 0.60, 0.30, 'NP-005-NG05', 150000, 170000, 15, 'ACTIVE');
INSERT INTO newspapers (product_id, editor_in_chief, publisher, publication_date, issue_number, publication_frequency, issn, language, sections)
VALUES ('e0000001-0000-0000-0000-000000000005', 'Nathan Lump', 'National Geographic Partners', '2025-05-01', 'Vol.247 No.5', 'Monthly', '0027-9358', 'English', '["Feature Stories","Science","Wildlife","Photography","Travel"]');

-- Newspaper 6
INSERT INTO products (product_id, product_type, title, category, general_description, height, width, length, weight, barcode, original_value, current_price, stock_quantity, status)
VALUES ('e0000001-0000-0000-0000-000000000006', 'NEWSPAPER', 'Nhân Dân - Số 25500', 'Politics', 'Cơ quan TW của Đảng Cộng sản Việt Nam', 54.00, 38.00, 0.30, 0.18, 'NP-006-ND255', 10000, 10000, 300, 'ACTIVE');
INSERT INTO newspapers (product_id, editor_in_chief, publisher, publication_date, issue_number, publication_frequency, issn, language, sections)
VALUES ('e0000001-0000-0000-0000-000000000006', 'Lê Quốc Minh', 'Báo Nhân Dân', '2025-05-28', '25500', 'Daily', '0800-7586', 'Vietnamese', '["Chính trị","Kinh tế","Xã hội","Quốc tế","Văn hoá"]');

-- Newspaper 7
INSERT INTO products (product_id, product_type, title, category, general_description, height, width, length, weight, barcode, original_value, current_price, stock_quantity, status)
VALUES ('e0000001-0000-0000-0000-000000000007', 'NEWSPAPER', 'TIME Magazine - May 26, 2025', 'General', 'Tạp chí tin tức hàng tuần nổi tiếng toàn cầu', 26.50, 20.00, 0.40, 0.22, 'NP-007-TIME05', 100000, 115000, 20, 'ACTIVE');
INSERT INTO newspapers (product_id, editor_in_chief, publisher, publication_date, issue_number, publication_frequency, issn, language, sections)
VALUES ('e0000001-0000-0000-0000-000000000007', 'Sam Jacobs', 'TIME USA', '2025-05-26', 'Vol.205 No.19', 'Weekly', '0040-781X', 'English', '["Nation","World","Business","Health","Ideas"]');

-- Newspaper 8
INSERT INTO products (product_id, product_type, title, category, general_description, height, width, length, weight, barcode, original_value, current_price, stock_quantity, status)
VALUES ('e0000001-0000-0000-0000-000000000008', 'NEWSPAPER', 'Thể Thao & Văn Hoá - Số 148/2025', 'Sports', 'Báo thể thao và văn hoá hàng ngày', 54.00, 38.00, 0.30, 0.18, 'NP-008-TTVH', 12000, 14000, 120, 'ACTIVE');
INSERT INTO newspapers (product_id, editor_in_chief, publisher, publication_date, issue_number, publication_frequency, issn, language, sections)
VALUES ('e0000001-0000-0000-0000-000000000008', 'Lê Xuân Thành', 'TTXVN', '2025-05-28', '148/2025', 'Daily', '0800-7610', 'Vietnamese', '["Bóng đá","Thể thao","Văn hoá","Giải trí","Điện ảnh"]');

-- Newspaper 9
INSERT INTO products (product_id, product_type, title, category, general_description, height, width, length, weight, barcode, original_value, current_price, stock_quantity, status)
VALUES ('e0000001-0000-0000-0000-000000000009', 'NEWSPAPER', 'Forbes Vietnam - Tháng 5/2025', 'Business', 'Ấn bản Việt Nam của tạp chí Forbes danh tiếng', 28.00, 21.50, 0.50, 0.28, 'NP-009-FV05', 85000, 95000, 35, 'ACTIVE');
INSERT INTO newspapers (product_id, editor_in_chief, publisher, publication_date, issue_number, publication_frequency, issn, language, sections)
VALUES ('e0000001-0000-0000-0000-000000000009', 'Nguyễn Lan Anh', 'Forbes Vietnam Media', '2025-05-15', '05/2025', 'Monthly', '2354-1234', 'Vietnamese', '["Tỷ phú","Doanh nghiệp","Đầu tư","Công nghệ","Lifestyle"]');

-- Newspaper 10
INSERT INTO products (product_id, product_type, title, category, general_description, height, width, length, weight, barcode, original_value, current_price, stock_quantity, status)
VALUES ('e0000001-0000-0000-0000-000000000010', 'NEWSPAPER', 'Khoa Học & Đời Sống - Số 100/2025', 'Science', 'Tạp chí khoa học phổ thông phổ biến nhất Việt Nam', 29.00, 21.00, 0.40, 0.22, 'NP-010-KHDS', 25000, 28000, 60, 'ACTIVE');
INSERT INTO newspapers (product_id, editor_in_chief, publisher, publication_date, issue_number, publication_frequency, issn, language, sections)
VALUES ('e0000001-0000-0000-0000-000000000010', 'Phạm Văn Hùng', 'Liên hiệp KH&KT VN', '2025-05-20', '100/2025', 'Weekly', '0800-7628', 'Vietnamese', '["Khoa học","Y tế","Môi trường","Công nghệ","Đời sống"]');

-- ============================================================
-- Done! 50 sản phẩm đã được tạo:
--   15 Books | 12 CDs | 13 DVDs | 10 Newspapers
-- ============================================================
