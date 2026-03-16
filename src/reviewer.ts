// src/reviewer.ts
import { GoogleGenAI } from "@google/genai";
import { getPRFiles, postReviewComment } from "./github";
import { buildReviewPrompt } from "./prompts";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function reviewPR(
  owner: string,
  repo: string,
  pullNumber: number,
  prTitle: string
) {
  console.log(`🔍 Đang review PR #${pullNumber}: ${prTitle}`);

  // Bước 1: Lấy danh sách file thay đổi
  const files = await getPRFiles(owner, repo, pullNumber);

  // Bước 2: Lọc bỏ các file không cần review
  // (lock files, generated files, assets... thường không cần AI review)
  const reviewableFiles = files.filter(
    (f) =>
      !f.filename.includes("package-lock.json") &&
      !f.filename.includes(".min.js") &&
      !f.filename.match(/\.(png|jpg|svg|gif|ico)$/)
  );

  if (reviewableFiles.length === 0) {
    console.log("Không có file code nào cần review.");
    return;
  }

  console.log("Reviewable files: ", reviewableFiles);

  // Bước 3: Tính tổng số dòng thay đổi để cảnh báo nếu PR quá lớn
  const totalChanges = reviewableFiles.reduce(
    (sum, f) => sum + f.additions + f.deletions,
    0
  );

  // Gemini có giới hạn context window — nếu PR quá lớn cần xử lý theo batch
  if (totalChanges > 2000) {
    console.warn(`⚠️ PR lớn: ${totalChanges} dòng thay đổi. Đang review theo batch...`);
    return await reviewLargePR(owner, repo, pullNumber, prTitle, reviewableFiles);
  }

  // Bước 4: Build prompt và gọi Gemini
  const prompt = buildReviewPrompt(reviewableFiles, prTitle);

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    config: {
      systemInstruction: `Bạn là senior engineer với 10 năm kinh nghiệm. 
        Hãy review code nghiêm túc nhưng xây dựng. 
        Luôn giải thích TẠI SAO một điều gì đó là vấn đề, không chỉ nói "cái này sai".`,
      // Tăng maxOutputTokens vì review có thể dài
      maxOutputTokens: 4096,
    },
    contents: prompt,
  });

  const reviewComment = response.text ?? "Không thể tạo review.";

  // Bước 5: Post comment lên GitHub PR
  const finalComment = `## 🤖 AI Code Review\n\n${reviewComment}\n\n---\n*Review được tạo tự động bởi Gemini AI*`;
  await postReviewComment(owner, repo, pullNumber, finalComment);

  console.log(`✅ Đã post review lên PR #${pullNumber}`);
  return reviewComment;
}

// Xử lý PR lớn bằng cách review từng file một
async function reviewLargePR(
  owner: string,
  repo: string,
  pullNumber: number,
  prTitle: string,
  files: any[]
) {
  const reviews: string[] = [];

  // Review từng file riêng lẻ thay vì gộp chung
  // Mỗi file là một request độc lập đến Gemini
  for (const file of files) {
    if (!file.patch) continue;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: buildReviewPrompt([file], prTitle),
    });

    reviews.push(`### 📄 ${file.filename}\n\n${response.text}`);
  }

  // Gộp tất cả review lại thành một comment duy nhất
  const combined = `## 🤖 AI Code Review (Large PR)\n\n${reviews.join("\n\n---\n\n")}\n\n---\n*Review được tạo tự động bởi Gemini AI*`;
  await postReviewComment(owner, repo, pullNumber, combined);
}