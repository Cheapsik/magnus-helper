# Magnus Helper

Neutralne narzędzie dla Mistrza Gry (MG) do prowadzenia kampanii RPG w dowolnym systemie mechaniki. Magnus nie zna żadnych cech, wzorów ani nazw z konkretnych systemów — wszystko, co mechaniczne, definiuje MG w ramach kampanii.

## Kampania i jej system

**Kampania**:
Nadrzędny, w pełni odizolowany kontener całej pracy MG nad jedną rozgrywką (karty, walka, notatki, questy, sceny, ambient, timery, relacje, generatory, presety). Jedno konto MG może mieć wiele kampanii, każdą w innym systemie.
_Avoid_: Sesja (to pojedyncze spotkanie przy stole), Świat, Projekt.

**System kampanii**:
Całość definicji mechaniki należących do jednej kampanii: struktury kart, rodzaje testów, rodzaje ataku, stany, waluta i generator. Nie jest osobnym bytem współdzielonym między kampaniami — każda kampania ma własny i edytuje go przez cały czas jej trwania.
_Avoid_: Profil zasad, Ruleset, System RPG, Szablon (szablon to tylko punkt startowy).

**Punkt startowy**:
Jednorazowy wybór przy tworzeniu kampanii: neutralny szablon startowy albo pusta struktura. Po utworzeniu system kampanii jest jej własną kopią, niepowiązaną z punktem startowym.

**Neutralny szablon startowy**:
Punkt startowy dostarczany przez Magnusa, zawierający wyłącznie ogólne, niekojarzące się z żadnym systemem elementy (np. cechy Siła, Zręczność, Wytrzymałość, Inteligencja oraz zdrowie, inicjatywę i ochronę).
_Avoid_: Preset systemu, Domyślny system.

## Karty

**Karta**:
Opis jednego bohatera, NPC albo potwora w kampanii: stały rdzeń karty plus sekcje i pola zdefiniowane przez MG dla danego typu karty.
_Avoid_: Arkusz postaci, Statblock, Postać (jako osobny byt).

**Typ karty**:
Jeden z trzech rodzajów kart — **bohater**, **NPC**, **potwór** — z których każdy ma własną, niezależnie edytowalną strukturę. Struktura NPC powstaje jako kopia struktury bohatera z sekcją notatek MG, a struktura potwora jako jej uproszczona wersja; potem każda żyje własnym życiem.
_Avoid_: Przeciwnik, Wróg (używamy "Potwór").

**Rdzeń karty**:
Pola, które ma każda karta niezależnie od systemu kampanii: nazwa, portret i notatki. MG nie może ich usunąć.

**Sekcja karty**:
Nazwana przez MG grupa pól na karcie (np. cechy, umiejętności, zasoby, ekwipunek).

**Pole karty**:
Pojedyncza wartość na karcie, zdefiniowana i nazwana przez MG w ramach sekcji. Nazwa pola nie niesie dla Magnusa żadnego znaczenia.

**Ukryte pole**:
Pole usunięte przez MG ze struktury, którego wartości na istniejących kartach zostają zachowane i które można przywrócić.
_Avoid_: Skasowane pole.

**Lista wpisów**:
Pole, dla którego MG definiuje strukturę pojedynczego wpisu, a na karcie dodaje dowolną liczbę wpisów (np. umiejętności, broń, ekwipunek, zaklęcia).
_Avoid_: Tabela, Repeater.

**Notacja kości**:
Wartość pola zapisana jako wyrażenie rzutu (np. „1k8+2”), którą można rzucić bezpośrednio z karty.

**Tor punktów**:
Pole przedstawiane jako szereg kropek lub kratek do zaznaczania (np. poczytalność, stres, rany).

**Reguła losowania**:
Część definicji pola w strukturze karty — zakres liczb albo lista wartości — z której generator wypełnia pole przy losowaniu karty.

**Rola pola**:
Świadome oznaczenie przez MG pola karty jako wykorzystywanego przez wspólne narzędzia Magnusa. Magnus nigdy nie odgaduje roli po nazwie pola. Role: **inicjatywa** (co najwyżej jedna), **zasób główny** aktualny/maksymalny (co najwyżej jeden), **zasób dodatkowy**, **obrona** (dowolna liczba, każda nazwana, np. KP, Unik) i **redukcja obrażeń**.
_Avoid_: Mapowanie pola, Tag pola.

## Testy i walka

**Rodzaj testu**:
Nazwany przez MG sposób rozstrzygania rzutu w kampanii: tryb (pod wartość, nad wartość/vs stopień trudności, pula kości, przedziały wyników), kość, drabina trudności, margines, krytyki oraz pola karty, z których wolno go wykonać. Kampania może mieć dowolną liczbę rodzajów testów.
_Avoid_: Profil testu, Mechanika.

**Drabina trudności**:
Lista nazwanych modyfikatorów trudności należąca do rodzaju testu.

**Rodzaj ataku**:
Nazwany przez MG sposób prowadzenia ataku: który rodzaj testu i które pole atakującego, sposób rozstrzygnięcia trafienia, obrażenia, redukcja i opcjonalne lokacje trafień. Każdy krok może być wyłączony albo ręczny.

**Rozstrzygnięcie trafienia**:
Część rodzaju ataku określająca, z czym porównuje się rzut atakującego: z jego własną wartością, z polem obrony celu, z przeciwstawnym testem celu (z zasadą remisu) albo ręcznie przez MG.

**Lokacja trafienia**:
Opcjonalna tabela przedziałów rzutu wskazująca trafioną część celu, z opcjonalną redukcją obrażeń osobno dla każdej lokacji.

**Tracker walki**:
Wspólne narzędzie prowadzenia walki — uczestnicy, kolejność, tury, rundy, statusy, notatki — korzystające z ról pól i rodzajów ataku kampanii. Bez skonfigurowanych ról i rodzajów ataku działa w trybie ręcznym.

**Uczestnik walki**:
Udział konkretnej karty w konkretnej walce: kolejność, statusy i notatka właściwe tej walce, niezależne od struktury karty.
_Avoid_: Kombatant, Token.

## Listy kampanii

**Stan**:
Nazwany przez MG efekt nakładany na uczestnika walki lub kartę (np. ogłuszony, krwawienie). Lista stanów należy do kampanii.
_Avoid_: Status (w UI dopuszczalne), Kondycja.

**Waluta kampanii**:
Zdefiniowane przez MG nominały i ich przeliczniki, wspólne dla łupu, sklepu i majątku na kartach.
