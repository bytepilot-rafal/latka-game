# Przygody zaginionej Łatki

Przygodowa gra 3D w przeglądarce. Łatka, młoda dalmatynka, ma czas do zachodu słońca, żeby znaleźć pięć reliktów
i otworzyć Roszczeńskie Wrota Świątyni Piszczykowskiej, za którymi czekają szczeniaki.

**Zagraj w przeglądarce: <https://bytepilot-rafal.github.io/latka-game/>**

Wszystko (teren, tekstury, modele, dźwięki, muzyka) jest generowane w kodzie — nie ma plików graficznych ani audio.
Silnik: [Three.js](https://threejs.org) 0.170 ładowany z CDN, więc do gry potrzebny jest internet.

## Uruchomienie

```bash
python3 server.py
```

i otwórz <http://localhost:5173>. Sam plik `index.html` otwarty dwuklikiem nie zadziała (przeglądarka nie wczyta modułów z dysku).

## Wersja do wysłania znajomym

```bash
python3 build_standalone.py
```

tworzy `dist/Przygody-zaginionej-Latki/` z jednym plikiem `index.html`, który działa po dwukliku, oraz gotowy `.zip`.

## Publikowanie nowej wersji

Strona <https://bytepilot-rafal.github.io/latka-game/> pokazuje zawartość folderu `docs/`, który tworzy ten sam skrypt:

```bash
python3 build_standalone.py
git add -A && git commit -m "opis zmian" && git push
```

Każde zbudowanie dostaje numer wersji (`docs/version.txt`). Gra przy otwarciu sprawdza ten numer z pominięciem pamięci
podręcznej i, jeśli jest nowszy, sama przeładowuje się do nowej wersji — znajomi nie muszą niczego czyścić.

## Sterowanie

| Klawisz | Akcja |
|---|---|
| WASD / strzałki | ruch |
| Spacja | skok |
| Shift | bieg |
| przeciągnięcie myszą, Q / E | kamera |
| telefon / tablet | drążek i przyciski na ekranie pojawiają się same |
| kółko myszy | przybliżenie |
| H | hau! |
| M | muzyka wł./wył. |
| P | ukrycie interfejsu |

## Pliki

| Plik | Co zawiera |
|---|---|
| `index.html` | strona, interfejs, style |
| `src/main.js` | pętla gry, sterowanie, kamera, fabuła, teksty |
| `src/world.js` | kanion, rzeka, wodospad, dżungla, most, schody, tunel, świątynia, relikty |
| `src/run.js` | poziom 2 „Pościg za Milą”: tor, przeszkody, rozgrywka (adres z `?level=2`) |
| `src/night.js` | poziom 3 „Nocna wyprawa po szczeniaki”: ogrody, skradanie, szczeniaki (adres z `?level=3`) |
| `src/relics.js` | modele 3D reliktów, wspólne dla obu poziomów |
| `src/cat.js` | model i animacja kotki Mili |
| `src/dog.js` | model i animacja Łatki, szczeniaków i posągów |
| `src/sky.js` | niebo, słońce, zachód, mgła |
| `src/textures.js` | generowane tekstury |
| `src/fx.js` | cząsteczki i słupy światła |
| `src/audio.js` | dźwięki i muzyka |
| `server.py` | prosty serwer do pracy nad grą |
| `build_standalone.py` | pakowanie do jednego pliku |

W konsoli przeglądarki jest obiekt `__latka` z narzędziami do testów (np. `__latka.playTo('door')` przechodzi poziom skryptem).
