import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

export type ContextChunk = {
  file: string;
  heading: string;
  text: string;
};

const WORD_RE = /[\p{L}\p{N}']+/gu;
const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "how",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "their",
  "this",
  "to",
  "was",
  "what",
  "when",
  "where",
  "who",
  "why",
  "with"
]);

export async function loadContextChunks(contextDir: string): Promise<ContextChunk[]> {
  const root = path.resolve(contextDir);
  const files = await collectMarkdownFiles(root);
  const chunks: ContextChunk[] = [];

  for (const filePath of files) {
    const markdown = await readFile(filePath, "utf8");
    const relativeFile = path.relative(root, filePath).replaceAll("\\", "/");
    chunks.push(...chunkMarkdown(relativeFile, markdown));
  }

  return chunks;
}

export function retrieveRelevantChunks(
  question: string,
  chunks: ContextChunk[],
  limit = 6
): ContextChunk[] {
  const queryTerms = tokenize(question);
  if (queryTerms.size === 0) {
    return chunks.slice(0, limit);
  }

  return chunks
    .map((chunk) => ({ chunk, score: scoreChunk(queryTerms, chunk) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.chunk);
}

export function formatChunksForPrompt(chunks: ContextChunk[]): string {
  return chunks
    .map((chunk, index) => {
      return [
        `SOURCE ${index + 1}: ${chunk.file}${chunk.heading ? ` > ${chunk.heading}` : ""}`,
        chunk.text.trim()
      ].join("\n");
    })
    .join("\n\n---\n\n");
}

async function collectMarkdownFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectMarkdownFiles(fullPath)));
    } else if (entry.isFile() && /\.mdx?$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

function chunkMarkdown(file: string, markdown: string): ContextChunk[] {
  const sections = splitByHeading(markdown);
  const chunks: ContextChunk[] = [];

  for (const section of sections) {
    const paragraphs = section.text
      .split(/\n{2,}/)
      .map((part) => part.trim())
      .filter(Boolean);

    let current = "";
    for (const paragraph of paragraphs) {
      const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
      if (candidate.length > 1400 && current) {
        chunks.push({ file, heading: section.heading, text: current });
        current = paragraph;
      } else {
        current = candidate;
      }
    }

    if (current) {
      chunks.push({ file, heading: section.heading, text: current });
    }
  }

  return chunks;
}

function splitByHeading(markdown: string): Array<{ heading: string; text: string }> {
  const lines = markdown.split(/\r?\n/);
  const sections: Array<{ heading: string; text: string[] }> = [];
  let current = { heading: "", text: [] as string[] };

  for (const line of lines) {
    const headingMatch = /^(#{1,3})\s+(.+)$/.exec(line);
    if (headingMatch && current.text.some((item) => item.trim())) {
      sections.push(current);
      current = { heading: headingMatch[2].trim(), text: [line] };
    } else {
      if (headingMatch) {
        current.heading = headingMatch[2].trim();
      }
      current.text.push(line);
    }
  }

  if (current.text.some((item) => item.trim())) {
    sections.push(current);
  }

  return sections.map((section) => ({
    heading: section.heading,
    text: section.text.join("\n").trim()
  }));
}

function scoreChunk(queryTerms: Set<string>, chunk: ContextChunk): number {
  const textTerms = tokenize(`${chunk.heading}\n${chunk.text}`);
  let score = 0;

  for (const term of queryTerms) {
    if (textTerms.has(term)) {
      score += chunk.heading.toLowerCase().includes(term) ? 3 : 1;
    }
  }

  return score;
}

function tokenize(text: string): Set<string> {
  const matches = text.toLowerCase().match(WORD_RE) ?? [];
  return new Set(matches.filter((word) => word.length > 2 && !STOP_WORDS.has(word)));
}
