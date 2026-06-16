/**
 * ฝัง structured data (schema.org) ลงหน้าเป็น <script type="application/ld+json">
 * ข้อมูลสร้างจากฝั่งเราเอง (ไม่ใช่ user input) — escape `<` กัน script breakout ไว้เผื่อ
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
