// src/prompts.ts

interface PRFile {
  filename: string;
  status: string;
  patch: string;
  additions: number;
  deletions: number;
}

export function buildReviewPrompt(files: PRFile[], prTitle: string): string {
  // Format các file thay đổi thành text mà Gemini có thể đọc hiểu
  const filesContent = files
    .filter((f) => f.patch) // Bỏ qua file binary hoặc không có diff
    .map(
      (f) => `
### File: ${f.filename} (${f.status}) | +${f.additions} -${f.deletions}
\`\`\`diff
${f.patch}
\`\`\`
`
    )
    .join("\n");

  // Prompt được chia thành 3 phần rõ ràng:
  // 1. Vai trò (ai là Gemini trong context này)
  // 2. Nhiệm vụ cụ thể (cần làm gì)
  // 3. Format output mong muốn (trả về dạng gì)
  return `
Bạn là một senior software engineer đang review code. 
Hãy phân tích PR dưới đây một cách kỹ lưỡng và xây dựng.

**PR Title:** ${prTitle}

**Files thay đổi:**
${filesContent}

---

Hãy review theo các tiêu chí sau:

1. **Correctness** — Logic có đúng không? Có edge case nào bị bỏ sót không?
2. **Security** — Có lỗ hổng bảo mật tiềm ẩn nào không? (SQL injection, XSS, lộ secret...)
3. **Performance** — Có N+1 query, vòng lặp không cần thiết, hay memory leak không?
4. **Code Quality** — Có tuân thủ best practices? Code có dễ đọc và maintain không?
5. **Test Coverage** — Các thay đổi có được test đầy đủ không?

**Format output:**
- Dùng Markdown để format (GitHub sẽ render đẹp)
- Mỗi vấn đề cần chỉ rõ: file nào, dòng nào, tại sao đó là vấn đề, và gợi ý cải thiện
- Cung cấp code fix cho vấn đề đó
- Phân loại theo mức độ: 🔴 Critical, 🟡 Warning, 🟢 Suggestion
- Kết thúc bằng tóm tắt tổng thể và verdict: Approve / Request Changes / Needs Discussion
`;
}