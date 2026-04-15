export interface CheatSheet {
    id: string;
    title: string;
    category: string;
    content: string;
  }
  
  export const CATEGORIES = [
    "Wszystkie",
    "Testy",
    "Walka",
    "Obrażenia",
    "Stany",
    "Ekwipunek",
    "Akcje",
    "Modyfikatory",
  ];
  
  export const CHEAT_SHEETS: CheatSheet[] = [
    {
      id: "percentile-tests",
      title: "Testy procentowe",
      category: "Testy",
      content:
        "Rzuć k100 i porównaj z liczbą docelową (cecha + modyfikatory). Wynik ≤ cel = sukces. Cyfra dziesiątek udanego rzutu to stopnie sukcesu. Cyfra dziesiątek nieudanego rzutu to stopnie porażki. Przykład: Cel 45, rzut 23 → 2 stopnie sukcesu.",
    },
    {
      id: "opposed-tests",
      title: "Testy przeciwstawne",
      category: "Testy",
      content:
        "Obie strony wykonują testy procentowe przeciw własnym liczbom docelowym. Porównaj stopnie sukcesu. Strona z większą liczbą stopni wygrywa. Jeśli obie zawiodą, wygrywa strona z mniejszą liczbą stopni porażki. Remisy zwykle na korzyść obrońcy lub powtórka.",
    },
    {
      id: "combat-round",
      title: "Struktura rundy walki",
      category: "Walka",
      content:
        "1. Deklaracja akcji (wszyscy gracze ogłaszają zamiar)\n2. Rzut na inicjatywę (test Zręczności lub stała wartość)\n3. Tury w kolejności inicjatywy\n4. Rozstrzyganie ataków, ruchu i innych akcji\n5. Koniec rundy: efekty ciągłe, test morale",
    },
    {
      id: "melee-attack",
      title: "Atak w zwarciu",
      category: "Walka",
      content:
        "Wykonaj test Walki Wręcz. Sukces = trafienie. Odwróć cyfry rzutu, aby ustalić lokalizację trafienia (np. rzut 34 → lokalizacja 43). Rzuć obrażenia: obrażenia broni + bonus z Siły. Odejmij bonus z Wytrzymałości celu i pancerz w danej lokalizacji.",
    },
    {
      id: "ranged-attack",
      title: "Atak dystansowy",
      category: "Walka",
      content:
        "Wykonaj test Umiejętności Strzeleckich z modyfikatorami zasięgu. Krótki zasięg: +10, Długi: -10, Ekstremalny: -30. Sukces: odwróć cyfry dla lokalizacji. Obrażenia = obrażenia broni (bez bonusu z Siły dla większości broni). Odejmij Wytrzymałość + pancerz.",
    },
    {
      id: "hit-locations",
      title: "Tabela lokalizacji trafień",
      category: "Walka",
      content:
        "01–15: Głowa\n16–35: Prawa ręka\n36–55: Lewa ręka\n56–80: Korpus\n81–90: Prawa noga\n91–00: Lewa noga\n\nOdwróć cyfry rzutu ataku, aby ustalić lokalizację trafienia.",
    },
    {
      id: "damage-calc",
      title: "Obliczanie obrażeń",
      category: "Obrażenia",
      content:
        "Zadane obrażenia = Obrażenia broni + bonus z Siły (zwarcie) − bonus z Wytrzymałości celu − Pancerz w lokalizacji trafienia.\n\nJeśli wynik > 0, odejmij od Żywotności celu. Gdy Żywotność spadnie do 0, zastosuj Trafienie Krytyczne.",
    },
    {
      id: "critical-hits",
      title: "Trafienia krytyczne",
      category: "Obrażenia",
      content:
        "Gdy trafienie obniża Żywotność poniżej 0, nadwyżka obrażeń określa powagę efektu krytycznego. Efekty zależą od lokalizacji trafienia i poziomu powagi. Mogą wahać się od drobnych kar do natychmiastowej śmierci przy ekstremalnych poziomach.",
    },
    {
      id: "healing",
      title: "Leczenie i regeneracja",
      category: "Obrażenia",
      content:
        "Naturalne leczenie: odzyskaj bonus z Wytrzymałości punktów Żywotności na dzień odpoczynku. Leczenie medyczne: test Leczenia dla dodatkowych punktów. Obrażenia krytyczne wymagają specjalistycznej opieki i mogą mieć trwałe skutki.",
    },
    {
      id: "conditions-stunned",
      title: "Ogłuszony",
      category: "Stany",
      content:
        "Nie może podejmować akcji przez 1 rundę. Może się bronić z karami. Powodowane przez trafienia w głowę, niektóre zaklęcia lub efekty krytyczne. Może próbować testu Wytrzymałości lub Siły Woli, aby wyzdrowieć wcześniej.",
    },
    {
      id: "conditions-prone",
      title: "Powalony",
      category: "Stany",
      content:
        "Leży na ziemi. Atakujący w zwarciu otrzymują +10 do trafienia. -20 do własnych ataków w zwarciu. Wstanie kosztuje pół akcji. Ataki dystansowe na powalonego na dystansie mają -20.",
    },
    {
      id: "conditions-fatigued",
      title: "Zmęczony",
      category: "Stany",
      content:
        "Kara -10 do wszystkich testów. Powodowane wyczerpaniem, forsownym marszem, brakiem snu lub pewnymi efektami. Każdy dodatkowy poziom zmęczenia kumuluje się. 8 godzin odpoczynku usuwa jeden poziom.",
    },
    {
      id: "conditions-bleeding",
      title: "Krwawienie",
      category: "Stany",
      content:
        "Trać 1 punkt Żywotności na końcu każdej rundy, dopóki nie zostanie opatrzone. Wymaga testu Leczenia lub bandażowania. Wielokrotne efekty krwawienia mogą się kumulować. Postać z 0 Żywotności, która krwawi, jest w poważnym niebezpieczeństwie.",
    },
    {
      id: "action-types",
      title: "Rodzaje akcji",
      category: "Akcje",
      content:
        "Pełna akcja: zajmuje całą turę (szarża, celowanie+strzał, bieg)\nPół akcji: masz 2 na turę (atak, ruch, przygotowanie broni, celowanie)\nDarmowa akcja: nic nie kosztuje (mówienie, upuszczenie przedmiotu, prosta percepcja)\n\nWiększość postaci wykonuje 2 pół akcje LUB 1 pełną akcję na turę.",
    },
    {
      id: "common-actions",
      title: "Typowe akcje bojowe",
      category: "Akcje",
      content:
        "Atak standardowy (pół): jeden atak wręcz lub dystansowy\nSzarża (pełna): ruch + atak z bonusem +10\nCelowanie (pół): +10 do następnego ataku dystansowego (+20 przy pełnej akcji)\nUnik (reakcja): test Zręczności by uniknąć trafienia\nParowanie (reakcja): test WW by zablokować trafienie\nOderwanie (pełna): opuszczenie zwarcia bez prowokowania",
    },
    {
      id: "common-modifiers",
      title: "Typowe modyfikatory testów",
      category: "Modyfikatory",
      content:
        "Bardzo łatwy: +30\nŁatwy: +20\nRutynowy: +10\nPrzeciętny: +0\nWymagający: −10\nTrudny: −20\nBardzo trudny: −30\n\nKumulują się z modyfikatorami sytuacyjnymi jak oświetlenie, osłona i jakość ekwipunku.",
    },
    {
      id: "situational-modifiers",
      title: "Modyfikatory sytuacyjne",
      category: "Modyfikatory",
      content:
        "Przewaga liczebna: +10 za każdego dodatkowego sojusznika w zwarciu (maks. +30)\nWyższa pozycja: +10\nCiemność: -20 do -30\nCzęściowa osłona: -10 do ataków dystansowych\nPełna osłona: -30 do ataków dystansowych\nBroń dobrej jakości: +5 do +10\nBroń kiepskiej jakości: -5 do -10",
    },
    {
      id: "armor-table",
      title: "Przegląd pancerzy",
      category: "Ekwipunek",
      content:
        "Skórzany: 1 PP, wszystkie lokalizacje\nKolczuga: 3 PP, korpus + ręce\nPłytowy: 5 PP, korpus\nHełm: 2 PP, głowa\nTarcza: +1 PP do jednej lokalizacji (ręka), może parować\n\nPancerz kumuluje się przy noszeniu wielu warstw (zwykle maks. 5). Ciężki pancerz może nakładać kary.",
    },
    {
      id: "weapon-qualities",
      title: "Cechy broni",
      category: "Ekwipunek",
      content:
        "Szybka: +10 do inicjatywy gdy dzierżona\nWolna: -10 do inicjatywy\nDruzgocząca: +1 obrażeń przy trafieniu\nPrzebijająca: ignoruje 1 punkt pancerza\nDwuręczna: wymaga obu rąk, nie można użyć tarczy\nWyważona: +5 do prób parowania",
    },
  ];
  