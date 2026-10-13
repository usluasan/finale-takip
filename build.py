#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Finale Takibi build betiği.

kaynak-artifact-index.html (claude.ai artifact sayfası) dosyasından
bağımsız uygulamanın kullandığı web/index.html dosyasını üretir.

Yapılan dönüşümler:
  1. Başa doctype + <html> + <head> + meta etiketleri + shim.js eklenir.
  2. xlsx kütüphanesi CDN yerine yerel vendor/ klasöründen yüklenir.
  3. </style> etiketinden sonra </head><body> eklenir.
  4. Sona </body></html> eklenir.

Kullanım (repo kök klasöründe):
  python3 build.py            web/index.html dosyasını yeniden üretir
  python3 build.py --kontrol  dosyaya dokunmaz; güncel mi diye bakar
"""
import sys
from pathlib import Path

KOK = Path(__file__).resolve().parent
KAYNAK = KOK / "kaynak-artifact-index.html"
HEDEF = KOK / "web" / "index.html"

BAS = (
    "<!doctype html>\n"
    '<html lang="tr">\n'
    "<head>\n"
    '<meta charset="utf-8">\n'
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
    '<meta name="theme-color" content="#0a3f37">\n'
    '<script src="shim.js"></script>\n'
)
XLSX_CDN = '<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>'
XLSX_YEREL = '<script src="vendor/xlsx.full.min.js"></script>'
STIL_SONU = "</style>\n"
SON = "\n</body>\n</html>\n"


def uret(kaynak: str) -> str:
    """Kaynak sayfa metninden web/index.html metnini üretir."""
    # Çapa noktaları tam bir kez geçmeli; yoksa kaynak sayfa değişmiştir, sessizce bozuk çıktı üretme.
    for ad, parca in (("xlsx CDN satırı", XLSX_CDN), ("</style> satırı", STIL_SONU)):
        adet = kaynak.count(parca)
        if adet != 1:
            raise SystemExit(
                "HATA: %s kaynakta %d kez bulundu (tam 1 olmalı). "
                "Kaynak sayfa değişmiş olabilir; build.py güncellenmeli." % (ad, adet)
            )
    if "<!doctype" in kaynak.lower()[:200]:
        raise SystemExit("HATA: kaynak sayfa zaten doctype içeriyor; yanlış dosya olabilir.")
    govde = kaynak.replace(XLSX_CDN, XLSX_YEREL)
    govde = govde.replace(STIL_SONU, STIL_SONU + "</head>\n<body>\n")
    return BAS + govde + SON


def main() -> int:
    kontrol = "--kontrol" in sys.argv[1:]
    yeni = uret(KAYNAK.read_text(encoding="utf-8"))
    eski = HEDEF.read_text(encoding="utf-8") if HEDEF.exists() else None
    if kontrol:
        if eski == yeni:
            print("TAMAM: web/index.html kaynakla uyumlu.")
            return 0
        print("FARK VAR: web/index.html güncel değil. 'python3 build.py' çalıştırın.")
        return 1
    if eski == yeni:
        print("Değişiklik yok: web/index.html zaten güncel.")
        return 0
    HEDEF.write_text(yeni, encoding="utf-8")
    print("Üretildi: %s (%d bayt)" % (HEDEF.relative_to(KOK), len(yeni.encode("utf-8"))))
    return 0


if __name__ == "__main__":
    sys.exit(main())
