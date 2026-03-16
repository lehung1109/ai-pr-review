# test-ai

Bot **AI Code Review cho GitHub Pull Request**: nhận GitHub webhook (PR opened/synchronize), lấy danh sách file thay đổi, gửi diff sang **Gemini** để review, rồi **comment kết quả lên PR**.

## Tính năng

- **Webhook server** (Express) nhận event `pull_request`.
- **Verify chữ ký webhook** (`x-hub-signature-256`) để chống giả mạo.
- **Lấy file thay đổi của PR** bằng GitHub API (Octokit).
- **Tự động review bằng Gemini** và post comment tổng kết lên PR.
- **Lọc file không cần review** (lockfile, minified, ảnh...).
- **PR lớn**: tự chuyển sang review theo từng file.

## Kiến trúc nhanh

- `src/server.ts`: HTTP server + verify webhook signature + trigger review.
- `src/reviewer.ts`: luồng review (fetch PR files → build prompt → gọi Gemini → post comment).
- `src/github.ts`: wrapper Octokit (list files, post comment).
- `src/prompts.ts`: dựng prompt review (Markdown + diff).
- `src/index.ts`: ví dụ gọi Gemini streaming (demo).

## Yêu cầu

- **Node.js**: khuyến nghị >= 18
- **npm**
- GitHub repo cần quyền tạo comment trên PR

## Cấu hình môi trường

Tạo file `.env` ở root (file này đã bị ignore bởi `.gitignore`, **không commit**).

Các biến cần có:

- **`GEMINI_API_KEY`**: API key của Gemini (dùng `@google/genai`)
- **`GITHUB_WEBHOOK_SECRET`**: secret dùng để sign webhook từ GitHub
- **`GITHUB_TOKEN`**: GitHub token có quyền đọc PR + tạo comment (ví dụ fine-grained PAT)

Ví dụ:

```bash
GEMINI_API_KEY=...
GITHUB_WEBHOOK_SECRET=...
GITHUB_TOKEN=...
```

## Cài đặt

```bash
npm install
```

## Chạy local

Hiện repo chưa có sẵn script build/run trong `package.json`. Bạn có thể chạy theo 1 trong 2 cách:

### Cách A: Build TypeScript rồi chạy Node

1) Cài TypeScript (nếu máy bạn chưa có):

```bash
npm i -D typescript
```

2) Build:

```bash
npx tsc
```

3) Chạy server:

```bash
node -r dotenv/config dist/src/server.js
```

Server sẽ lắng nghe tại **port 3000**.

### Cách B: Chạy file demo Gemini

```bash
node -r dotenv/config dist/src/index.js
```

> Ghi chú: cần build bằng `npx tsc` trước khi chạy từ `dist/`.

## Cấu hình GitHub Webhook

Trên GitHub repo:

1) Vào **Settings → Webhooks → Add webhook**
2) **Payload URL**: URL public trỏ tới server (ví dụ dùng ngrok khi dev)
3) **Content type**: `application/json`
4) **Secret**: trùng với `GITHUB_WEBHOOK_SECRET`
5) **Which events**: chọn **Let me select individual events** → bật **Pull requests**

Sau đó tạo PR mới hoặc push thêm commit vào PR để thấy bot comment.

## Bảo mật

- **Không commit `.env`** và không đưa token/key vào log.
- Webhook được verify bằng HMAC SHA-256 (`x-hub-signature-256`).

## Troubleshooting

- **401 Invalid signature**: sai `GITHUB_WEBHOOK_SECRET`, hoặc GitHub gửi payload khác với loại body bạn verify.
- **Không comment lên PR**: token thiếu quyền, hoặc repo/org policy chặn PAT.
- **PR lớn bị “review theo batch”**: do tổng thay đổi > 2000 dòng (ngưỡng trong `src/reviewer.ts`).

