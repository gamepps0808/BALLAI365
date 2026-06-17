import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { cached } from "./cache";

/**
 * ข่าวฟุตบอลต่างประเทศ (ซื้อขายนักเตะ/ข่าวทั่วไป) จาก RSS เว็บใหญ่ที่น่าเชื่อถือ
 * — ดึงฟรี (ไม่ต้องมี API key) แสดง headline + สรุปสั้น + ลิงก์ไปอ่านต่อที่ต้นทาง
 *   (ไม่ก็อปบทความเต็ม เลี่ยงลิขสิทธิ์)
 * — แปลไทยด้วย Claude + cache รายข่าวถาวร (แปลครั้งเดียว/ข่าว ไม่แปลซ้ำ คุมต้นทุน)
 */

export interface NewsItem {
  title: string;
  summary: string;
  link: string;
  source: string;
  pubDate: string;
}

const SOURCES = [
  { name: "BBC Sport", url: "https://feeds.bbci.co.uk/sport/football/rss.xml" },
  { name: "The Guardian", url: "https://www.theguardian.com/football/rss" },
];

const MAX_ITEMS = 12; // จำกัดเพื่อคุมต้นทุนแปล
const DIR = path.join(process.cwd(), ".cache", "news");
const TRANS_FILE = path.join(DIR, "translations.json");

/* --------------------------- RSS --------------------------- */

function pick(block: string, tag: string): string {
  const m = block.match(
    new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`, "i")
  );
  return m ? m[1].trim() : "";
}

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseRss(xml: string, source: string): NewsItem[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => {
    const b = m[1];
    return {
      title: stripHtml(pick(b, "title")),
      summary: stripHtml(pick(b, "description")).slice(0, 260),
      link: pick(b, "link"),
      source,
      pubDate: pick(b, "pubDate"),
    };
  });
}

/** ดึง RSS ทุกแหล่ง รวม เรียงตามวันที่ ตัด MAX_ITEMS — cache 30 นาที (ข้อมูลดิบอังกฤษ) */
async function fetchRaw(): Promise<NewsItem[]> {
  return cached("news:raw", 1800, async () => {
    const all: NewsItem[] = [];
    await Promise.all(
      SOURCES.map(async (s) => {
        try {
          const r = await fetch(s.url, {
            signal: AbortSignal.timeout(10_000),
            headers: { "User-Agent": "Mozilla/5.0" },
          });
          if (r.ok) all.push(...parseRss(await r.text(), s.name));
        } catch {
          /* ข้ามแหล่งที่ล่ม */
        }
      })
    );
    return all
      .filter((n) => n.title && n.link)
      .sort((a, b) => Date.parse(b.pubDate || "0") - Date.parse(a.pubDate || "0"))
      .slice(0, MAX_ITEMS);
  });
}

/* --------------------------- แปลไทย + cache --------------------------- */

type TransMap = Record<string, { titleTh: string; summaryTh: string }>;

function loadTrans(): TransMap {
  try {
    return JSON.parse(fs.readFileSync(TRANS_FILE, "utf8")) as TransMap;
  } catch {
    return {};
  }
}

function saveTrans(map: TransMap): void {
  try {
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(TRANS_FILE, JSON.stringify(map, null, 1));
  } catch (err) {
    console.error("[news] save trans failed:", (err as Error).message);
  }
}

const TransSchema = z.object({
  items: z.array(
    z.object({
      i: z.number().int(),
      titleTh: z.string(),
      summaryTh: z.string(),
    })
  ),
});

/** แปลเฉพาะข่าวที่ยังไม่เคยแปล (batch เดียว) แล้ว cache ถาวร */
async function translate(items: NewsItem[]): Promise<NewsItem[]> {
  if (!process.env.ANTHROPIC_API_KEY) return items; // ไม่มี key → คงอังกฤษ
  const trans = loadTrans();
  const todo = items.filter((n) => !trans[n.link]);

  if (todo.length > 0) {
    try {
      const client = new Anthropic();
      const res = await client.messages.parse({
        model: "claude-opus-4-8",
        max_tokens: 4000,
        system:
          "แปลข่าวฟุตบอลเป็นภาษาไทยให้เป็นธรรมชาติ กระชับ คงชื่อทีม/นักเตะเป็นภาษาอังกฤษได้ ห้ามแต่งเติมข้อมูลที่ไม่มีในต้นฉบับ",
        messages: [
          {
            role: "user",
            content: `แปลหัวข้อและสรุปข่าวต่อไปนี้เป็นไทย (ตอบตาม index i):\n${JSON.stringify(
              todo.map((n, i) => ({ i, title: n.title, summary: n.summary })),
              null,
              1
            )}`,
          },
        ],
        output_config: { format: zodOutputFormat(TransSchema) },
      });
      for (const t of res.parsed_output?.items ?? []) {
        const n = todo[t.i];
        if (n) trans[n.link] = { titleTh: t.titleTh, summaryTh: t.summaryTh };
      }
      saveTrans(trans);
    } catch (err) {
      console.error("[news] translate failed:", (err as Error).message);
    }
  }

  return items.map((n) => {
    const t = trans[n.link];
    return t ? { ...n, title: t.titleTh, summary: t.summaryTh } : n;
  });
}

/** ข่าวฟุตบอลต่างประเทศ แปลไทยแล้ว (cache แปลถาวร) */
export async function getFootballNews(): Promise<NewsItem[]> {
  try {
    return await translate(await fetchRaw());
  } catch (err) {
    console.error("[news] getFootballNews failed:", (err as Error).message);
    return [];
  }
}
