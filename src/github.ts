// src/github.ts
import { Octokit } from "@octokit/rest";

export const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

export async function getPRDiff(
  owner: string,
  repo: string,
  pullNumber: number
) {
  // GitHub có endpoint riêng để lấy diff — phải set Accept header đặc biệt
  const { data } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: pullNumber,
    // Header này yêu cầu GitHub trả về raw diff thay vì JSON
    mediaType: { format: "diff" },
  });

  return data as unknown as string; // Trả về raw diff string
}

export async function getPRFiles(
  owner: string,
  repo: string,
  pullNumber: number
) {
  // Lấy danh sách files thay đổi kèm theo patch (diff) của từng file
  const { data } = await octokit.rest.pulls.listFiles({
    owner,
    repo,
    pull_number: pullNumber,
  });

  // Mỗi file có: filename, status (added/modified/removed), patch (diff)
  return data.map((file) => ({
    filename: file.filename,
    status: file.status,
    // patch chứa nội dung thay đổi theo format unified diff
    patch: file.patch ?? "",
    additions: file.additions,
    deletions: file.deletions,
  }));
}

export async function postReviewComment(
  owner: string,
  repo: string,
  pullNumber: number,
  body: string
) {
  // Tạo một PR review comment tổng thể (không phải inline comment)
  await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: pullNumber,
    body,
  });
}