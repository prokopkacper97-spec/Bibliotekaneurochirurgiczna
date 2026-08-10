# Biblioteka Neurochirurgiczna

Prywatna biblioteka podręczników neurochirurgicznych w PDF — z okładkami (generowanymi
automatycznie z pierwszej strony PDF lub wgrywanymi ręcznie), podziałem na grupy/kategorie
oraz szatą graficzną stylizowaną na bibliotekę.

## Stack technologiczny

- **Next.js 16** (App Router, TypeScript) — frontend + API routes w jednej aplikacji
- **Prisma 7** + **Postgres (Supabase)** — baza danych z metadanymi książek i grup
- **Supabase Storage** — przechowywanie plików PDF i okładek
- **pdfjs-dist** + **node-canvas** — generowanie miniaturki okładki z pierwszej strony PDF

## Wymagania

- Node.js 20+
- Projekt Supabase (baza Postgres + bucket Storage) — patrz [„Konfiguracja Supabase”](#konfiguracja-supabase) niżej

## Konfiguracja Supabase

Aplikacja nie trzyma już nic lokalnie (ani bazy, ani plików) — nawet do pracy lokalnej
potrzebny jest projekt Supabase.

1. Załóż projekt na [supabase.com](https://supabase.com) (darmowy plan wystarczy).
2. **Baza danych** → *Project Settings → Database → Connection string*: skopiuj oba warianty
   connection stringa:
   - **Transaction pooler** (port `6543`) → to będzie `DATABASE_URL`
   - **Session/direct** (port `5432`) → to będzie `DIRECT_URL` (używany tylko przy migracjach —
     pooler Supabase nie obsługuje prepared statements, których Prisma potrzebuje do migracji)
3. **Storage** → zakładka *Storage* → *New bucket* → utwórz bucket (np. `library`), **prywatny**
   (nie zaznaczaj „Public bucket” — pliki są serwowane przez API aplikacji, nie bezpośrednio).
4. **Klucz API** → *Project Settings → API*: skopiuj `service_role` key (**nie** `anon` key —
   `service_role` ma pełny dostęp i musi zostać tylko po stronie serwera).
5. Skopiuj `.env.example` do `.env` i uzupełnij wszystkie wartości.

```bash
cp .env.example .env
```

6. Wygeneruj tabele w bazie (za pierwszym razem i po każdej zmianie `prisma/schema.prisma`):

```bash
npx prisma migrate dev
```

## Uruchomienie lokalne

```bash
npm install
npm run dev
```

Aplikacja wystartuje pod `http://localhost:3000`.

### Build produkcyjny (lokalnie)

```bash
npm run build
npm run start
```

## Funkcje

- Dodawanie książek: tytuł, autor, opis, plik PDF, opcjonalnie własna okładka
- Automatyczne generowanie okładki z pierwszej strony PDF, gdy nie wgrano własnej
- Grupy/kategorie książek (tworzenie, zmiana nazwy, usuwanie) — półki w widoku głównym
- Edycja książki: zmiana tytułu, autora, opisu, grupy oraz podmiana okładki
- Podgląd PDF w przeglądarce oraz pobieranie pliku (z licznikiem pobrań)
- Wyszukiwanie po tytule/autorze
- Usuwanie książek i grup

## Struktura danych

- `prisma/schema.prisma` — modele `Group` i `Book` (Postgres)
- Bucket Supabase Storage (`SUPABASE_STORAGE_BUCKET`):
  - `books/<id>.pdf` — oryginalne pliki PDF
  - `covers/<id>.jpg` — okładki (wygenerowane lub wgrane ręcznie)

## Wdrożenie na Vercel

1. Wypchnij repozytorium na GitHub.
2. Na [vercel.com](https://vercel.com) → *Add New… → Project* → zaimportuj repo z GitHuba.
3. W ustawieniach projektu (*Settings → Environment Variables*) dodaj te same zmienne co w
   `.env`: `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
   `SUPABASE_STORAGE_BUCKET`.
4. Deploy. Vercel sam wykryje Next.js; `prisma generate` uruchamia się automatycznie dzięki
   skryptowi `postinstall` w `package.json`.
5. Migracje bazy (`prisma migrate deploy`) trzeba uruchomić raz przy pierwszym wdrożeniu i po
   każdej zmianie schematu — najprościej lokalnie, wskazując na tę samą bazę Supabase:
   ```bash
   npx prisma migrate deploy
   ```

## built by Kacper Prokop
