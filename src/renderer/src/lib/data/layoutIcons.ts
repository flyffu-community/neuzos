export type LayoutIconOption = {
  slug: string;
  label: string;
};

export type LayoutIconGroup = {
  heading: string;
  icons: LayoutIconOption[];
};

function numberedIconOptions(
  folder: string,
  prefix: string,
  label: string,
  start: number,
  end: number,
): LayoutIconOption[] {
  return Array.from({ length: end - start + 1 }, (_, index) => {
    const value = start + index;
    return {
      slug: `${folder}/${prefix}${value}`,
      label: `${label} ${value}`,
    };
  });
}

function petIconOptions(
  name: string,
  label: string,
  includeSClass = true,
): LayoutIconOption[] {
  const icons = [{ slug: `pets/pet_${name}`, label }];
  if (includeSClass) {
    icons.push({
      slug: `pets/pet_${name}_s`,
      label: `${label} S Class`,
    });
  }
  return icons;
}

function colorIconOptions(
  prefix: string,
  label: string,
  colors: string[],
): LayoutIconOption[] {
  return colors.map((color) => ({
    slug: `misc/${prefix}_${color}`,
    label: `${label} ${color.charAt(0).toUpperCase()}${color.slice(1)}`,
  }));
}

function pieceIconOptions(colors: string[]): LayoutIconOption[] {
  return colors.map((color) => ({
    slug: `misc/piece_${color}`,
    label: `Piece ${color.charAt(0).toUpperCase()}${color.slice(1)}`,
  }));
}

export const extendedLayoutIconGroups: LayoutIconGroup[] = [
  {
    heading: "Master / Hero Badges",
    icons: [
      { slug: "levels/master_1", label: "Master Lv. 70" },
      { slug: "levels/master_2", label: "Master Lv. 80" },
      { slug: "levels/master_3", label: "Master Lv. 90" },
      { slug: "levels/master_4", label: "Master Lv. 100" },
      { slug: "levels/master_5", label: "Master Lv. 110" },
      { slug: "levels/master_6", label: "Master Lv. 120" },
      { slug: "levels/hero_1", label: "Hero Lv. 125" },
      { slug: "levels/hero_2", label: "Hero Lv. 140" },
      { slug: "levels/hero_3", label: "Hero Lv. 160" },
      { slug: "levels/hero_4", label: "Hero Lv. 180" },
    ],
  },
  {
    heading: "Pet Levels",
    icons: [
      { slug: "pets/egg", label: "Egg" },
      ...numberedIconOptions("pets", "level_", "Level", 1, 9),
    ],
  },
  {
    heading: "Pets",
    icons: [
      ...petIconOptions("angel", "Angel"),
      ...petIconOptions("crab", "Crab"),
      ...petIconOptions("dragon", "Dragon"),
      ...petIconOptions("fox", "Fox"),
      ...petIconOptions("griffin", "Griffin"),
      ...petIconOptions("lion", "Lion"),
      ...petIconOptions("rabbit", "Rabbit"),
      ...petIconOptions("tiger", "Tiger"),
      ...petIconOptions("unicorn", "Unicorn"),
      ...petIconOptions("whitelion", "White Lion", false),
      ...petIconOptions("draco", "Draco", false),
    ],
  },
  {
    heading: "Other Icons",
    icons: [
      { slug: "neuzos_pang", label: "NeuzOS" },
      { slug: "misc/browser", label: "Browser" },
      { slug: "misc/neuz_hat", label: "Neuz" },
      { slug: "misc/wooden_sword", label: "Wooden Sword" },
      { slug: "misc/lollipop", label: "Lollipop" },
      { slug: "misc/star", label: "Star" },
      { slug: "misc/stars", label: "Stars" },
      { slug: "misc/honor", label: "Honor" },
      { slug: "misc/perin", label: "Perin" },
      { slug: "misc/penya", label: "Penya" },
      { slug: "misc/item", label: "Item" },
      { slug: "misc/bag", label: "Bag" },
      { slug: "misc/pet_food", label: "Pet Food" },
      { slug: "misc/battlepass", label: "Battle Pass" },
      { slug: "misc/fwc", label: "FWC" },
      { slug: "misc/Crown", label: "Crown" },
      { slug: "misc/MVP", label: "MVP" },
      { slug: "misc/trophy", label: "Trophy" },
      { slug: "misc/diamond_black", label: "Diamond Black" },
      { slug: "misc/diamond", label: "Diamond" },
      { slug: "misc/gold_token", label: "Gold Token" },
      ...numberedIconOptions(
        "misc",
        "pickup_pet_buff_",
        "Pickup Pet Buff",
        1,
        3,
      ),
      { slug: "misc/jewel_silver", label: "Jewel Silver" },
      ...colorIconOptions("jewel", "Jewel", [
        "black",
        "green",
        "purple",
        "red",
        "yellow",
      ]),
      ...numberedIconOptions("misc", "card", "Card", 1, 10),
      ...colorIconOptions("heart", "Heart", [
        "blue",
        "cyan",
        "green",
        "red",
        "yellow",
      ]),
      { slug: "misc/cyclone_orb", label: "Cyclone Orb" },
      { slug: "misc/desert_orb", label: "Desert Orb" },
      { slug: "misc/flame_orb", label: "Flame Orb" },
      { slug: "misc/generator_orb", label: "Generator Orb" },
      { slug: "misc/river_orb", label: "River Orb" },
      ...colorIconOptions("element", "Element", [
        "white",
        "blue",
        "green",
        "purple",
        "red",
        "yellow",
      ]),
      { slug: "misc/candy_blue", label: "Candy Blue" },
      { slug: "misc/candy_green", label: "Candy Green" },
      { slug: "misc/candy_orange", label: "Candy Orange" },
      { slug: "misc/candy_pink", label: "Candy Pink" },
      { slug: "misc/candy_purple", label: "Candy Purple" },
      { slug: "misc/candy_red", label: "Candy Red" },
      { slug: "misc/candy_skyblue", label: "Candy Sky Blue" },
      { slug: "misc/candy_white", label: "Candy White" },
      { slug: "misc/candy_yellow", label: "Candy Yellow" },
      ...pieceIconOptions([
        "blue",
        "cyan",
        "gold",
        "green",
        "grey",
        "red",
        "yellow",
      ]),
    ],
  },
];
