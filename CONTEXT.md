# Magnus Helper

Neutralne narzędzie dla Mistrza Gry (MG) do prowadzenia kampanii RPG, niezależne od konkretnego komercyjnego systemu mechaniki.

## Language

**Kampania**:
Nadrzędny kontener całej pracy MG nad jedną rozgrywką. Jedno konto MG może mieć wiele kampanii. Wszystkie dane robocze MG (bohaterowie, NPC, walka, notatki, questy, sceny, ambient, timery, relacje, generatory, presety) są w pełni izolowane per kampania — nic nie jest współdzielone między kampaniami. Kampania sama definiuje swoje mechanizmy: strukturę kart (bohatera, NPC, opcjonalnie przeciwnika) oraz opcjonalne role pól wykorzystywane przez wspólne narzędzia Magnusa. Nie ma osobnego, nazwanego bytu reprezentującego te zasady — to kampania jako całość niesie tę definicję. Przy tworzeniu kampanii MG jednorazowo wybiera punkt startowy (neutralny szablon startowy albo pusta struktura) — kampanii nie da się później przełączyć na inny szablon startowy ani zresetować do innego wariantu. Po utworzeniu struktura staje się własną, niezależną konfiguracją tej kampanii i MG może ją swobodnie edytować przez cały czas jej trwania (nazwy, sekcje, pola, struktura list wpisów, role pól) — edycje, które usuwałyby dane z istniejących kart, wymagają jasnego ostrzeżenia i świadomego potwierdzenia MG przed zatwierdzeniem. Magnus nie dostarcza gotowych, nazwanych profili konkretnych komercyjnych systemów RPG, ich treści ani lore.
_Avoid_: Sesja (sesja to pojedyncze spotkanie przy stole, nie kontener na dane), Świat, Projekt, Profil zasad, System RPG, Ruleset.

**Karta**:
Zestaw sekcji i pól zdefiniowany przez kampanię, opisujący bohatera, NPC lub potwora w tej kampanii. Cała struktura karty — sekcje, pola, ich nazwy i układ — jest definiowana przez MG w ramach kampanii, nie narzucona przez Magnusa. Bohater, NPC i potwór to trzy osobne typy kart, każdy z własną, niezależną strukturą (np. potwór może mieć uproszczoną strukturę, szybszą do wypełnienia niż pełnoprawny NPC z historią i osobowością).
_Avoid_: Arkusz postaci (sugeruje gotowy, narzucony układ), Statblock, Przeciwnik (używamy "Potwór").

**Sekcja karty**:
Nazwana przez MG grupa pól na karcie (np. cechy, umiejętności, zdolności, zasoby, ekwipunek, notatki). MG dowolnie dodaje, usuwa i układa sekcje w ramach struktury kampanii.

**Pole karty**:
Pojedyncza wartość na karcie, zdefiniowana i nazwana przez MG w ramach sekcji. Nazwa pola należy wyłącznie do MG i sama w sobie nie niesie dla Magnusa żadnego znaczenia.

**Rola pola**:
Opcjonalne, świadome oznaczenie pola karty jako wykorzystywanego przez wspólne narzędzia Magnusa. Role nie ograniczają tego, jakie pola MG może tworzyć — to wyłącznie dodatkowe, opcjonalne powiązania nad dowolną strukturą karty. Rolę nadaje wyłącznie MG — Magnus nigdy nie odgaduje roli pola na podstawie jego nazwy. Pole bez przypisanej roli pozostaje pełnoprawną częścią karty. Zamknięty zestaw ról w MVP: **domyślna inicjatywa** (co najwyżej jedno pole na kartę, opcjonalna), **główny zasób** aktualny/maksymalny (co najwyżej jedno pole na kartę, opcjonalny, pokazywany jako podstawowy pasek stanu w trackerze), **zasób dodatkowy istotny w walce** (dowolna liczba pól, pokazywane pomocniczo), oraz **dostępność do testów** (dowolna liczba pól liczbowych, każde niezależnie oznaczalne jako źródło prostego testu).
_Avoid_: Mapowanie pola, Tag pola.

**Uczestnik walki**:
Udział konkretnej karty w konkretnej walce prowadzonej w trackerze. Niesie dane właściwe tej walce — kolejność (domyślnie z pola oznaczonego rolą inicjatywy, zawsze ręcznie nadpisywalna), statusy i notatkę — niezależnie od struktury karty źródłowej. Statusy i notatka uczestnika walki nie są polami karty i nie wymagają żadnej konfiguracji w strukturze kampanii.
_Avoid_: Kombatant (zbyt techniczne), Token.

**Lista wpisów**:
Typ pola sekcji, dla którego MG definiuje strukturę pojedynczego wpisu (własny zestaw pól), a następnie dodaje, edytuje, usuwa i porządkuje dowolną liczbę wpisów tej struktury na karcie (np. umiejętności, broń, ekwipunek, zaklęcia, statusy).
_Avoid_: Tabela, Repeater (zbyt techniczne).

**Tracker walki**:
Generyczne wspólne narzędzie do prowadzenia stanu walki — uczestnicy, kolejność, tury, rundy, statusy, notatki. Korzysta wyłącznie z pól, które MG oznaczył odpowiednią rolą w strukturze swojej kampanii; bez skonfigurowanej roli działa w trybie ręcznym. Nie rozstrzyga automatycznie trafień, obrażeń ani efektów specjalnych.

## Stan implementacji

Zaimplementowany fundament (Decyzje 1, 2, 7): rejestr kampanii, pełna izolacja danych w localStorage (namespacing per kampania), automatyczna jednorazowa migracja istniejących danych do domyślnej kampanii „Moja kampania”, przełącznik kampanii w headerze oraz pełny konfigurator (tworzenie, zmiana nazwy, archiwizacja, usuwanie) w Ustawieniach.

Świadomie odłożone na kolejny etap: kreator własnej struktury kart (Decyzje 3–4, 9), role pól i ich integracja z trackerem walki/testami (Decyzja 5–6, 10). Dziś każda kampania startuje z pełną kopią dzisiejszej, zaszytej na sztywno struktury WFRP-podobnej — nie ma jeszcze możliwości jej edycji ani tworzenia od pustej struktury.
