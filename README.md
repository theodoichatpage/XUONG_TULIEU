# Xưởng Tư Liệu

Trang tra cứu ảnh và phim độc lập với Xưởng VOX. Tìm trong Wikimedia Commons và Internet Archive, xem hồ sơ nguồn, mở tệp gốc và lưu lựa chọn. “Tìm sâu” mở rộng truy vấn theo biến thể Việt–Anh có trong bộ từ khóa và trả thêm kết quả. Kết quả được gộp theo mã nguồn, SHA-1 nếu kho có cung cấp và tiêu đề chuẩn hóa.

Ảnh và video do AI tạo được nhập như tệp thông thường. Tệp Adobe Illustrator (.ai) được lưu và tải lại, xem nội dung bằng Illustrator. Tệp nhập và mục đã lưu nằm trong IndexedDB của trình duyệt trên thiết bị đang dùng.

## Chạy thử

Yêu cầu Node.js 22 trở lên. Không cần cài thư viện hoặc API key.

```sh
npm run check
npm run dev
```

Mở http://127.0.0.1:3030. Hai endpoint tìm kiếm và lấy danh sách tệp cần kết nối Internet.

## Vercel

Import repo này dưới dạng một project riêng. `public/` chứa giao diện và `api/` chứa các hàm Node.js. Tệp lớn được mở trực tiếp từ kho gốc.

## Tìm rộng trên web

Đặt biến môi trường máy chủ `BRAVE_SEARCH_API_KEY` trên Vercel rồi triển khai lại để bật tìm ảnh/video trên chỉ mục web Brave. Mặc định trang vẫn tìm trong Wikimedia Commons, Internet Archive và có các mục tham khảo đã đối chiếu cho chủ đề kéo pháo Điện Biên Phủ. Các nút Google Ảnh, Google Video và YouTube mở truy vấn ở nguồn tương ứng.
