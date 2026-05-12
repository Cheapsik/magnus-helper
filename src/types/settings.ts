export type ThemeId =
  | "steel_and_gold"
  | "forest_and_copper"
  | "ink_and_silver"
  | "blood_and_bone"
  | "purple_and_bone"
  | "stone_and_enamel"
  | "port_rybakow_z_przystani"
  | "podwodne_krolestwo_nereidow"
  | "zatoka_zeglarzy_burzy"
  | "sanktuarium_mrocznego_elfa"
  | "bagno_zielonego_druida"
  | "gildia_zakazanej_magii"
  | "noc_valpurgii"
  | "ruiny_starozytnego_miru"
  | "karczma_na_skraju_puszczy"
  | "swiatynia_morskiego_boga"
  | "obserwatorium_gwiezdnego_maga"
  | "palac_niebianskiej_krolowej_elfow"
  | "kuznia_ognistego_demona"
  | "blazen_zlotego_dworu"
  | "rozany_ogrod_czarownicy"
  | "zamek_z_czerwonej_gliny"
  | "komnata_krola_pod_gora";

export interface AppSettings {
  theme: ThemeId;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "steel_and_gold",
};

export const SETTINGS_STORAGE_KEY = "magnus_settings";

/**
 * Definicja motywu — surowe wartości HEX (CSS variables w postaci, jakiej
 * oczekuje spec). Provider zadba o ich aplikację (w tym mapowanie na zmienne
 * shadcn HSL używane przez resztę aplikacji).
 */
export interface ThemeDefinition {
  id: ThemeId;
  label: string;
  vars: {
    "--bg-primary": string;
    "--bg-secondary": string;
    "--bg-tertiary": string;
    "--bg-card": string;
    "--accent-gold": string;
    "--accent-gold-hover": string;
    "--accent-red": string;
    "--text-primary": string;
    "--text-muted": string;
    "--text-faint": string;
    "--border-color": string;
    "--border-accent": string;
  };
}

export const THEMES: Record<ThemeId, ThemeDefinition> = {
  steel_and_gold: {
    id: "steel_and_gold",
    label: "Kowal Królewskiego Zamku",
    vars: {
      "--bg-primary": "#0B0D12",
      "--bg-secondary": "#151922",
      "--bg-tertiary": "#2A2F3A",
      "--bg-card": "#1C2130",
      "--accent-gold": "#C8A24A",
      "--accent-gold-hover": "#DDB965",
      "--accent-red": "#A02020",
      "--text-primary": "#EDE6D6",
      "--text-muted": "#9A9288",
      "--text-faint": "#5A5450",
      "--border-color": "#343A48",
      "--border-accent": "#4A4232",
    },
  },
  forest_and_copper: {
    id: "forest_and_copper",
    label: "Leśny Strażnik Granicy",
    vars: {
      "--bg-primary": "#0C120F",
      "--bg-secondary": "#151C17",
      "--bg-tertiary": "#263126",
      "--bg-card": "#1C2A1E",
      "--accent-gold": "#7DA56A",
      "--accent-gold-hover": "#95C081",
      "--accent-red": "#A04020",
      "--text-primary": "#D8B87A",
      "--text-muted": "#90715A",
      "--text-faint": "#5A4A3E",
      "--border-color": "#344530",
      "--border-accent": "#4A5838",
    },
  },
  ink_and_silver: {
    id: "ink_and_silver",
    label: "Kronikarz Srebrnego Skryptorium",
    vars: {
      "--bg-primary": "#0B0E14",
      "--bg-secondary": "#141923",
      "--bg-tertiary": "#262C3A",
      "--bg-card": "#1C2234",
      "--accent-gold": "#8C95B8",
      "--accent-gold-hover": "#A8B0CC",
      "--accent-red": "#9A3055",
      "--text-primary": "#DCE0EC",
      "--text-muted": "#8C90A2",
      "--text-faint": "#505566",
      "--border-color": "#333A52",
      "--border-accent": "#3E4660",
    },
  },
  blood_and_bone: {
    id: "blood_and_bone",
    label: "Krypta Upadłego Paladyna",
    vars: {
      "--bg-primary": "#100D0E",
      "--bg-secondary": "#1A1416",
      "--bg-tertiary": "#2D1F22",
      "--bg-card": "#221619",
      "--accent-gold": "#A83030",
      "--accent-gold-hover": "#C44848",
      "--accent-red": "#7A1A1A",
      "--text-primary": "#EAD8C4",
      "--text-muted": "#9A8E80",
      "--text-faint": "#5A5048",
      "--border-color": "#3D2828",
      "--border-accent": "#522E2E",
    },
  },
  purple_and_bone: {
    id: "purple_and_bone",
    label: "Wieża Arcymaga",
    vars: {
      "--bg-primary": "#0D0B12",
      "--bg-secondary": "#17131D",
      "--bg-tertiary": "#2A2233",
      "--bg-card": "#201830",
      "--accent-gold": "#9B66B8",
      "--accent-gold-hover": "#B880D0",
      "--accent-red": "#9A1A55",
      "--text-primary": "#E8D8EE",
      "--text-muted": "#9589A4",
      "--text-faint": "#5A5068",
      "--border-color": "#382A4E",
      "--border-accent": "#4A3862",
    },
  },
  stone_and_enamel: {
    id: "stone_and_enamel",
    label: "Twierdza Na Rubieżach",
    vars: {
      "--bg-primary": "#0F1114",
      "--bg-secondary": "#181C22",
      "--bg-tertiary": "#2C313A",
      "--bg-card": "#20252E",
      "--accent-gold": "#7AA0B8",
      "--accent-gold-hover": "#96B8CC",
      "--accent-red": "#9A4040",
      "--text-primary": "#DDD0AA",
      "--text-muted": "#958A6A",
      "--text-faint": "#5A5245",
      "--border-color": "#363D4A",
      "--border-accent": "#424E62",
    },
  },
  port_rybakow_z_przystani: {
    id: "port_rybakow_z_przystani",
    label: "Port Rybaków z Przystani",
    vars: {
      "--bg-primary": "#181818",
      "--bg-secondary": "#1b2222",
      "--bg-tertiary": "#1f3031",
      "--bg-card": "#1c2728",
      "--accent-gold": "#4fc4cf",
      "--accent-gold-hover": "#6bcdd6",
      "--accent-red": "#dc2626",
      "--text-primary": "#fffffe",
      "--text-muted": "#a8a8a8",
      "--text-faint": "#727272",
      "--border-color": "#263638",
      "--border-accent": "#2e5558",
    },
  },
  podwodne_krolestwo_nereidow: {
    id: "podwodne_krolestwo_nereidow",
    label: "Podwodne Królestwo Nereidów",
    vars: {
      "--bg-primary": "#00214d",
      "--bg-secondary": "#002d54",
      "--bg-tertiary": "#003d5e",
      "--bg-card": "#003357",
      "--accent-gold": "#00ebc7",
      "--accent-gold-hover": "#28eecf",
      "--accent-red": "#ff5470",
      "--text-primary": "#fffffe",
      "--text-muted": "#9dafc2",
      "--text-faint": "#6680a0",
      "--border-color": "#004472",
      "--border-accent": "#006888",
    },
  },
  zatoka_zeglarzy_burzy: {
    id: "zatoka_zeglarzy_burzy",
    label: "Zatoka Żeglarzy Burzy",
    vars: {
      "--bg-primary": "#094067",
      "--bg-secondary": "#0c466f",
      "--bg-tertiary": "#104e7b",
      "--bg-card": "#0d4974",
      "--accent-gold": "#3da9fc",
      "--accent-gold-hover": "#5cb6fc",
      "--accent-red": "#ef4565",
      "--text-primary": "#fffffe",
      "--text-muted": "#9fb6c8",
      "--text-faint": "#6e90aa",
      "--border-color": "#1a5e88",
      "--border-accent": "#246ea0",
    },
  },
  sanktuarium_mrocznego_elfa: {
    id: "sanktuarium_mrocznego_elfa",
    label: "Sanktuarium Mrocznego Elfa",
    vars: {
      "--bg-primary": "#16161a",
      "--bg-secondary": "#1c1a26",
      "--bg-tertiary": "#241f37",
      "--bg-card": "#1f1c2d",
      "--accent-gold": "#7f5af0",
      "--accent-gold-hover": "#9374f2",
      "--accent-red": "#d03030",
      "--text-primary": "#fffffe",
      "--text-muted": "#a8a8aa",
      "--text-faint": "#747476",
      "--border-color": "#2e2848",
      "--border-accent": "#3e3268",
    },
  },
  bagno_zielonego_druida: {
    id: "bagno_zielonego_druida",
    label: "Bagno Zielonego Druida",
    vars: {
      "--bg-primary": "#00332c",
      "--bg-secondary": "#0f3a2b",
      "--bg-tertiary": "#23442b",
      "--bg-card": "#163e2b",
      "--accent-gold": "#faae2b",
      "--accent-gold-hover": "#faba4c",
      "--accent-red": "#fa5246",
      "--text-primary": "#f2f7f5",
      "--text-muted": "#98b2ae",
      "--text-faint": "#658880",
      "--border-color": "#284e38",
      "--border-accent": "#4e6030",
    },
  },
  gildia_zakazanej_magii: {
    id: "gildia_zakazanej_magii",
    label: "Gildia Zakazanej Magii",
    vars: {
      "--bg-primary": "#2b2c34",
      "--bg-secondary": "#2e2d3e",
      "--bg-tertiary": "#322f4d",
      "--bg-card": "#2f2e44",
      "--accent-gold": "#6246ea",
      "--accent-gold-hover": "#7b63ed",
      "--accent-red": "#e04545",
      "--text-primary": "#fffffe",
      "--text-muted": "#b2b3b8",
      "--text-faint": "#828488",
      "--border-color": "#403c60",
      "--border-accent": "#4e4278",
    },
  },
  noc_valpurgii: {
    id: "noc_valpurgii",
    label: "Noc Valpurgii",
    vars: {
      "--bg-primary": "#0e172c",
      "--bg-secondary": "#1c2136",
      "--bg-tertiary": "#2f2f43",
      "--bg-card": "#23263b",
      "--accent-gold": "#fec7d7",
      "--accent-gold-hover": "#fecfdd",
      "--accent-red": "#f43f5e",
      "--text-primary": "#fffffe",
      "--text-muted": "#a2a6ae",
      "--text-faint": "#6e7480",
      "--border-color": "#333650",
      "--border-accent": "#5a5068",
    },
  },
  ruiny_starozytnego_miru: {
    id: "ruiny_starozytnego_miru",
    label: "Ruiny Starożytnego Miru",
    vars: {
      "--bg-primary": "#232323",
      "--bg-secondary": "#212828",
      "--bg-tertiary": "#1f3030",
      "--bg-card": "#202b2b",
      "--accent-gold": "#078080",
      "--accent-gold-hover": "#2e9494",
      "--accent-red": "#f45d48",
      "--text-primary": "#fffffe",
      "--text-muted": "#adadad",
      "--text-faint": "#7a7a7a",
      "--border-color": "#2a3e3e",
      "--border-accent": "#1e4e4e",
    },
  },
  karczma_na_skraju_puszczy: {
    id: "karczma_na_skraju_puszczy",
    label: "Karczma Na Skraju Puszczy",
    vars: {
      "--bg-primary": "#0d0d0d",
      "--bg-secondary": "#1b140f",
      "--bg-tertiary": "#2e1f13",
      "--bg-card": "#221811",
      "--accent-gold": "#ff8e3c",
      "--accent-gold-hover": "#ffa05b",
      "--accent-red": "#d9376e",
      "--text-primary": "#fffffe",
      "--text-muted": "#a8a8a8",
      "--text-faint": "#747474",
      "--border-color": "#3a2518",
      "--border-accent": "#5c3a1e",
    },
  },
  swiatynia_morskiego_boga: {
    id: "swiatynia_morskiego_boga",
    label: "Świątynia Morskiego Boga",
    vars: {
      "--bg-primary": "#004643",
      "--bg-secondary": "#0e4d44",
      "--bg-tertiary": "#225647",
      "--bg-card": "#165045",
      "--accent-gold": "#f9bc60",
      "--accent-gold-hover": "#f9c679",
      "--accent-red": "#e06060",
      "--text-primary": "#fffffe",
      "--text-muted": "#9abcba",
      "--text-faint": "#689490",
      "--border-color": "#226255",
      "--border-accent": "#4a7255",
    },
  },
  obserwatorium_gwiezdnego_maga: {
    id: "obserwatorium_gwiezdnego_maga",
    label: "Obserwatorium Gwiezdnego Maga",
    vars: {
      "--bg-primary": "#020826",
      "--bg-secondary": "#0a0e28",
      "--bg-tertiary": "#15172c",
      "--bg-card": "#0e1229",
      "--accent-gold": "#8c7851",
      "--accent-gold-hover": "#a8926c",
      "--accent-red": "#f25042",
      "--text-primary": "#fffffe",
      "--text-muted": "#9c9fac",
      "--text-faint": "#686b80",
      "--border-color": "#1e2042",
      "--border-accent": "#302e50",
    },
  },
  palac_niebianskiej_krolowej_elfow: {
    id: "palac_niebianskiej_krolowej_elfow",
    label: "Pałac Niebiańskiej Królowej Elfów",
    vars: {
      "--bg-primary": "#232946",
      "--bg-secondary": "#2f314d",
      "--bg-tertiary": "#3f3d57",
      "--bg-card": "#353651",
      "--accent-gold": "#eebbc3",
      "--accent-gold-hover": "#f0c5cc",
      "--accent-red": "#e11d48",
      "--text-primary": "#fffffe",
      "--text-muted": "#aeafc0",
      "--text-faint": "#80829a",
      "--border-color": "#484862",
      "--border-accent": "#685872",
    },
  },
  kuznia_ognistego_demona: {
    id: "kuznia_ognistego_demona",
    label: "Kuźnia Ognistego Demona",
    vars: {
      "--bg-primary": "#0f0e17",
      "--bg-secondary": "#1d1515",
      "--bg-tertiary": "#301f14",
      "--bg-card": "#241915",
      "--accent-gold": "#ff8906",
      "--accent-gold-hover": "#ff9b2d",
      "--accent-red": "#f25f4c",
      "--text-primary": "#fffffe",
      "--text-muted": "#a8a8aa",
      "--text-faint": "#787878",
      "--border-color": "#3e2618",
      "--border-accent": "#5e3812",
    },
  },
  blazen_zlotego_dworu: {
    id: "blazen_zlotego_dworu",
    label: "Błazen Złotego Dworu",
    vars: {
      "--bg-primary": "#272343",
      "--bg-secondary": "#332d3f",
      "--bg-tertiary": "#453c3a",
      "--bg-card": "#3a333d",
      "--accent-gold": "#ffd803",
      "--accent-gold-hover": "#ffde2b",
      "--accent-red": "#e11d48",
      "--text-primary": "#fffffe",
      "--text-muted": "#b0aeba",
      "--text-faint": "#828098",
      "--border-color": "#524a50",
      "--border-accent": "#706040",
    },
  },
  rozany_ogrod_czarownicy: {
    id: "rozany_ogrod_czarownicy",
    label: "Różany Ogród Czarownicy",
    vars: {
      "--bg-primary": "#33272a",
      "--bg-secondary": "#3f2d31",
      "--bg-tertiary": "#4f353b",
      "--bg-card": "#453035",
      "--accent-gold": "#ff8ba7",
      "--accent-gold-hover": "#ff9db5",
      "--accent-red": "#e11d48",
      "--text-primary": "#fffffe",
      "--text-muted": "#b5b0b0",
      "--text-faint": "#8a8282",
      "--border-color": "#5e4048",
      "--border-accent": "#784858",
    },
  },
  zamek_z_czerwonej_gliny: {
    id: "zamek_z_czerwonej_gliny",
    label: "Zamek z Czerwonej Gliny",
    vars: {
      "--bg-primary": "#55423d",
      "--bg-secondary": "#5d4644",
      "--bg-tertiary": "#694c4d",
      "--bg-card": "#624847",
      "--accent-gold": "#e78fb3",
      "--accent-gold-hover": "#eaa0bf",
      "--accent-red": "#c2410c",
      "--text-primary": "#fffffe",
      "--text-muted": "#c0b8b5",
      "--text-faint": "#9e9895",
      "--border-color": "#7a5858",
      "--border-accent": "#906070",
    },
  },
  komnata_krola_pod_gora: {
    id: "komnata_krola_pod_gora",
    label: "Komnata Króla Pod Górą",
    vars: {
      "--bg-primary": "#001858",
      "--bg-secondary": "#0f2560",
      "--bg-tertiary": "#23376b",
      "--bg-card": "#162b64",
      "--accent-gold": "#fef6e4",
      "--accent-gold-hover": "#8bd3dd",
      "--accent-red": "#f582ae",
      "--text-primary": "#fef6e4",
      "--text-muted": "#a0a8be",
      "--text-faint": "#6a749a",
      "--border-color": "#2a3e7a",
      "--border-accent": "#505e96",
    },
  },
};

export const THEME_ORDER: ThemeId[] = [
  "steel_and_gold",
  "forest_and_copper",
  "ink_and_silver",
  "blood_and_bone",
  "purple_and_bone",
  "stone_and_enamel",
  "port_rybakow_z_przystani",
  "podwodne_krolestwo_nereidow",
  "zatoka_zeglarzy_burzy",
  "sanktuarium_mrocznego_elfa",
  "bagno_zielonego_druida",
  "gildia_zakazanej_magii",
  "noc_valpurgii",
  "ruiny_starozytnego_miru",
  "karczma_na_skraju_puszczy",
  "swiatynia_morskiego_boga",
  "obserwatorium_gwiezdnego_maga",
  "palac_niebianskiej_krolowej_elfow",
  "kuznia_ognistego_demona",
  "blazen_zlotego_dworu",
  "rozany_ogrod_czarownicy",
  "zamek_z_czerwonej_gliny",
  "komnata_krola_pod_gora",
];
