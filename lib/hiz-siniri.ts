// Basit bellek-içi hız sınırı: anahtar (kullanıcı/ip hedefi) başına
// pencere içinde deneme sayısı. Tek sunuculuk yeter; dağıtıkta Redis'e taşınır.
const kayitlar = new Map<string, { sayi: number; ilk: number; kilit: number }>();

export function ipDenemesi(anahtar: string, maxDeneme: number, pencereMs: number): boolean {
  const simdi = Date.now();
  let k = kayitlar.get(anahtar);
  if (!k || simdi - k.ilk > pencereMs) {
    k = { sayi: 0, ilk: simdi, kilit: 0 };
    kayitlar.set(anahtar, k);
  }
  if (k.kilit > simdi) return false;
  if (k.sayi >= maxDeneme) {
    k.kilit = simdi + pencereMs;
    k.sayi = 0;
    k.ilk = simdi;
    return false;
  }
  k.sayi++;
  return true;
}

/** Doğrulama BAŞARILI olunca sayacı sıfırlar (yanlış alarmları önler). */
export function temizle(anahtar: string) {
  kayitlar.delete(anahtar);
}
