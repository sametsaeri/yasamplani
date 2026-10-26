// Sayfalar arası gezinme yardımcısı — web (HTTP) ve Electron (file://) uyumlu.
// Statik export'ta her sayfa ayrı .html dosyasıdır; file:// altında <Link>
// istemci gezinmesi çalışmaz, bu yüzden protokole göre ham konum değiştirilir.

export function gitSayfasi(yol: string) {
  if (typeof window === "undefined") return;
  if (window.location.protocol === "file:") {
    const temiz = yol.replace(/^\/+|\/+$/g, "");
    window.location.href = (temiz || "index") + ".html";
  } else {
    window.location.assign(yol);
  }
}
