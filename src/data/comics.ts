import { ImageSourcePropType } from 'react-native';
import { getSupabaseImageSource } from './asset-cdn';

export type ComicId =
  | 'gadfly_of_athens'
  | 'the_broken_leg'
  | 'the_cave'
  | 'the_choice_of_hercules'
  | 'the_eternal_return'
  | 'the_exciles_calm'
  | 'the_golden_mean'
  | 'the_porch_and_the_storm'
  | 'the_sun_and_the_shadow'
  | 'the_weight_of_the_world';

type ComicMeta = {
  title: string;
  description: string;
  folder: string;
  emoji: string;
  pageFiles: [string, string, string, string, string];
};

const COMIC_CATALOG: Record<ComicId, ComicMeta> = {
  gadfly_of_athens: {
    title: 'Gadfly of Athens',
    description: 'The story of Socrates and his questioning nature',
    folder: 'gadfly_of_athens',
    emoji: '🦟',
    pageFiles: ['1_Gadfly.webp', '2_Gadfly.webp', '3_Gadfly.webp', '4_Gadfly.webp', '5_Gadfly.webp'],
  },
  the_broken_leg: {
    title: 'The Broken Leg',
    description: 'A stoic perspective on misfortune',
    folder: 'the_broken_leg',
    emoji: '🦴',
    pageFiles: ['1_Broken_Leg.webp', '2_Broken_Leg.webp', '3_Broken_Leg.webp', '4_Broken_Leg.webp', '5_Broken_Leg.webp'],
  },
  the_cave: {
    title: 'The Cave',
    description: "Plato's allegory of enlightenment",
    folder: 'the_cave',
    emoji: '🕳️',
    pageFiles: ['1_Cave.webp', '2_Cave.webp', '3_Cave.webp', '4_Cave.webp', '5_Cave.webp'],
  },
  the_choice_of_hercules: {
    title: 'The Choice of Hercules',
    description: 'Choosing between virtue and vice',
    folder: 'the_choice_of_hercules',
    emoji: '💪',
    pageFiles: ['1_Hercules.webp', '2_Hercules.webp', '3_Hercules.webp', '4_Hercules.webp', '5_Hercules.webp'],
  },
  the_eternal_return: {
    title: 'The Eternal Return',
    description: "Nietzsche's thought experiment",
    folder: 'the_eternal_return',
    emoji: '♾️',
    pageFiles: ['1_Eternal_Return.webp', '2_Eternal_Return.webp', '3_Eternal_Return.webp', '4_Eternal_Return.webp', '5_Eternal_Return.webp'],
  },
  the_exciles_calm: {
    title: "The Exile's Calm",
    description: 'Finding peace in banishment',
    folder: 'the_exciles_calm',
    emoji: '🌊',
    pageFiles: ['1_Exciles.webp', '2_Exciles.webp', '3_Exciles.webp', '4_Exciles.webp', '5_Exciles.webp'],
  },
  the_golden_mean: {
    title: 'The Golden Mean',
    description: 'Aristotle on balance and moderation',
    folder: 'the_golden_mean',
    emoji: '⚖️',
    pageFiles: ['1_Golden_Mean.webp', '2_Golden_Mean.webp', '3_Golden_Mean.webp', '4_Golden_Mean.webp', '5_Golden_Mean.webp'],
  },
  the_porch_and_the_storm: {
    title: 'The Porch and the Storm',
    description: 'Origins of stoic philosophy',
    folder: 'the_porch_and_the_storm',
    emoji: '⛈️',
    pageFiles: ['1_Zeno.webp', '2_Zeno.webp', '3_Zeno.webp', '4_Zeno.webp', '5_Zeno.webp'],
  },
  the_sun_and_the_shadow: {
    title: 'The Sun and the Shadow',
    description: 'Diogenes and Alexander the Great',
    folder: 'the_sun_and_the_shadow',
    emoji: '☀️',
    pageFiles: ['1_Sun_and_Shadow.webp', '2_Sun_and_Shadow.webp', '3_Sun_and_Shadow.webp', '4_Sun_and_Shadow.webp', '5_Sun_and_Shadow.webp'],
  },
  the_weight_of_the_world: {
    title: 'The Weight of the World',
    description: 'The myth of Atlas and burden',
    folder: 'the_weight_of_the_world',
    emoji: '🌍',
    pageFiles: ['1_Weight_of_World.webp', '2_Weight_of_World.webp', '3_Weight_of_World.webp', '4_Weight_of_World.webp', '5_Weight_of_World.webp'],
  },
};

export const COMICS = Object.entries(COMIC_CATALOG).map(([id, meta]) => ({
  id: id as ComicId,
  title: meta.title,
  description: meta.description,
  emoji: meta.emoji,
  folder: meta.folder,
  hasCover: true,
}));

export const COMICS_DATA = Object.fromEntries(
  Object.entries(COMIC_CATALOG).map(([id, meta]) => [
    id,
    {
      title: meta.title,
      description: meta.description,
      folder: meta.folder,
    },
  ])
) as Record<ComicId, { title: string; description: string; folder: string }>;

function getComicImagePath(comicId: ComicId, pageIndex: number) {
  const comic = COMIC_CATALOG[comicId];
  const file = comic.pageFiles[pageIndex];
  return `images/comic/${comic.folder}/${file}`;
}

export function getComicImagePaths(comicId: ComicId): string[] {
  return COMIC_CATALOG[comicId].pageFiles.map((_, pageIndex) => getComicImagePath(comicId, pageIndex));
}

export function getAllComicImagePaths(): string[] {
  const paths = new Set<string>();

  (Object.keys(COMIC_CATALOG) as ComicId[]).forEach((comicId) => {
    getComicImagePaths(comicId).forEach((path) => paths.add(path));
  });

  return Array.from(paths);
}

type RemoteSourceSet = {
  primary: ImageSourcePropType | null;
  fallback: ImageSourcePropType | null;
};

export function getComicCoverSources(comicId: ComicId): RemoteSourceSet {
  const path = getComicImagePath(comicId, 0);
  const primarySource = getSupabaseImageSource(path);

  return {
    primary: primarySource,
    fallback: null,
  };
}

export type ComicPageSource = {
  primary: ImageSourcePropType | null;
  fallback: ImageSourcePropType | null;
};

export function getComicPageSources(comicId: ComicId): ComicPageSource[] {
  return COMIC_CATALOG[comicId].pageFiles.map((_, index) => {
    const path = getComicImagePath(comicId, index);
    const primarySource = getSupabaseImageSource(path);

    return {
      primary: primarySource,
      fallback: null,
    };
  });
}

export function isComicId(value: string): value is ComicId {
  return value in COMIC_CATALOG;
}
