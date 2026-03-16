// src/server.ts
import express from "express";
import crypto from "crypto";
import { reviewPR } from "./reviewer";

const app = express();

// QUAN TRỌNG: phải dùng raw body để verify webhook signature
// Nếu parse JSON trước thì signature sẽ không khớp
app.use("/", express.raw({ type: "application/json" }));
app.use(express.json());

// Verify rằng request thực sự đến từ GitHub, không phải giả mạo
function verifyGitHubSignature(payload: Buffer, signature: string): boolean {
  const secret = process.env.GITHUB_WEBHOOK_SECRET!;
  const hmac = crypto.createHmac("sha256", secret);
  const digest = "sha256=" + hmac.update(payload).digest("hex");
  // timingSafeEqual ngăn timing attack
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

app.post("/", async (req, res) => {
  const signature = req.headers["x-hub-signature-256"] as string;

  // Từ chối request không có signature hợp lệ
  if (!signature || !verifyGitHubSignature(req.body, signature)) {
    console.log("Invalid signature");
    return res.status(401).json({ error: "Invalid signature" });
  }

  const event = req.headers["x-github-event"];
  const payload = JSON.parse(req.body.toString());

  // Chỉ xử lý event "pull_request" với action "opened" hoặc "synchronize"
  // "synchronize" = có commit mới được push lên PR
  if (event === "pull_request" && ["opened", "synchronize"].includes(payload.action)) {
    const { number, title } = payload.pull_request;
    const { owner, name: repo } = payload.repository;

    console.log("Reviewing PR #${number}: ${title}");

    // Trả về 200 ngay lập tức — GitHub chờ tối đa 10s
    // Việc review có thể mất lâu hơn nên chạy async ở background
    res.status(200).json({ message: "Review đang được xử lý..." });

    // Chạy review ở background, không block response
    reviewPR(owner.login, repo, number, title).catch(console.error);
  } else {
    console.log("Event không cần xử lý");
    res.status(200).json({ message: "Event không cần xử lý" });
  }
});

app.listen(3000, () => console.log("🚀 Webhook server sẵn sàng tại port 3000"));