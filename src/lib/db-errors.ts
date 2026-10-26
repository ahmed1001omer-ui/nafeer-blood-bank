/** التحقق من خطأ تكرار قيمة فريدة في قاعدة البيانات */
export function isDuplicateError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: unknown }).code;
  if (code === "23505") return true;
  const message = (error as { message?: unknown }).message;
  return typeof message === "string" && message.includes("duplicate key");
}
