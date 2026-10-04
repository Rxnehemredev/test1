// Çark (Wheel of Fortune) — istemci ve sunucu tarafından ORTAK kullanılan
// saf veri/matematik. Node'a özel (crypto vb.) hiçbir import YOK, istemci
// tarafında çarkı çizmek/döndürmek için de kullanılabilsin diye.

export const WHEEL_MIN_BET = 10;
export const WHEEL_MAX_BET = 2000; // orta oynaklık (maks 5x) — önceki 100.000 ekonomiye göre aşırı yüksekti

// 12 dilim — toplam ağırlık üzerinden RTP ≈ %96.8 (kasa avantajı ≈ %3.2)
export const WHEEL_SEGMENTS = [
    { multiplier: 0,   weight: 15, color: '#f5365c', label: '0x' },
    { multiplier: 1.2, weight: 18, color: '#5e72e4', label: '1.2x' },
    { multiplier: 0.5, weight: 16, color: '#8892a0', label: '0.5x' },
    { multiplier: 1.5, weight: 14, color: '#2dce89', label: '1.5x' },
    { multiplier: 0,   weight: 10, color: '#f5365c', label: '0x' },
    { multiplier: 2,   weight: 10, color: '#8b5cf6', label: '2x' },
    { multiplier: 1,   weight: 16, color: '#5e72e4', label: '1x' },
    { multiplier: 0.5, weight: 14, color: '#8892a0', label: '0.5x' },
    { multiplier: 3,   weight: 6,  color: '#fbbf24', label: '3x' },
    { multiplier: 1.2, weight: 14, color: '#5e72e4', label: '1.2x' },
    { multiplier: 0,   weight: 8,  color: '#f5365c', label: '0x' },
    { multiplier: 5,   weight: 2,  color: '#fbbf24', label: '5x' },
];

export const WHEEL_TOTAL_WEIGHT = WHEEL_SEGMENTS.reduce((s, seg) => s + seg.weight, 0);
export const WHEEL_SEGMENT_ANGLE = 360 / WHEEL_SEGMENTS.length;

/** Dilim indexinden, o dilimin çark üzerindeki orta açısını (derece) döndürür. */
export function segmentCenterAngle(index) {
    return index * WHEEL_SEGMENT_ANGLE + WHEEL_SEGMENT_ANGLE / 2;
}
