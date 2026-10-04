// lib/security/safeEqual.js
//
// Secret/token karşılaştırması için sabit-zamanlı eşitlik. İki değer de önce
// SHA-256 ile aynı uzunluğa (32 bayt) getirilir, sonra crypto.timingSafeEqual
// ile karşılaştırılır — böylece hem karakter-karakter timing hem de uzunluk
// farkı üzerinden sızıntı olmaz (uzunluk farkında erken return YOK).
import { createHash, timingSafeEqual } from 'crypto';

const sha256 = (v) => createHash('sha256').update(String(v ?? '')).digest();

export function safeEqual(a, b) {
    const ha = sha256(a);
    const hb = sha256(b);
    const equal = timingSafeEqual(ha, hb);
    // Hash eşitliği uzunluk eşitliğini zaten garanti eder (çakışma ihmal edilebilir),
    // ama açık olsun diye ham değerlerin boş olmadığını da şart koşuyoruz.
    return equal && String(a ?? '').length > 0;
}
