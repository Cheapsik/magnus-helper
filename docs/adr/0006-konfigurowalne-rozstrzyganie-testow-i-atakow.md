# Konfigurowalne rozstrzyganie testów i ataków, bez języka formuł

Zastępuje ADR 0005. Aplikacja ma obsłużyć kampanie w dowolnym systemie (k100 pod wartość, k20 vs stopień trudności, pule kości, przedziały wyników), a jednocześnie zachować dzisiejszą użyteczność trackera walki. Zdecydowano, że rozstrzyganie testów i ataków jest **automatyczne, ale w całości zdefiniowane danymi kampanii**: MG tworzy dowolną liczbę rodzajów testów (tryb, kość, drabina trudności, margines, krytyki, przedziały wyników) oraz rodzajów ataku (test i pole atakującego; rozstrzygnięcie vs własna wartość / vs pole obrony celu / test przeciwstawny / ręcznie; obrażenia z notacji kości, wartości stałej lub ręcznie, z opcjonalnym dodaniem wartości wskazanego pola i marginesu; redukcja z pól o roli „redukcja obrażeń”; opcjonalne lokacje trafień). Magnus nie zawiera żadnych domyślnych wzorów konkretnego systemu.

## Considered Options

- **Zero automatyki (ADR 0005)** — odrzucone: tracker tracił funkcjonalność, którą użytkownicy dziś mają.
- **Formuły użytkownika** (`1k10 + [Siła]/10 − [Wytrzymałość]`) — odrzucone na razie: wymagają parsera, walidacji i obsługi błędów, a zamknięty zestaw opcji pokrywa typowe systemy. Każda opcja jest prostą operacją (porównanie, jedno dodawanie, odejmowanie), więc późniejsze dodanie formuł nie unieważni tego modelu.
