export type Episode = {
  id: string;
  title: string;
  subtitle: string | null;
  url: string;
  shareLink: string;
  date: Date;
  durationInSeconds: number;
};

export type Series = {
  id: string;
  title: string;
  subtitle: string | null;
  link: string;
  imageUrl: string;
  lastFetchedAt: Date;
  episodes: Episode[];
};

const kv = await Deno.openKv();

type Identifiable = { id: string };
type Collection = "series";

function read<T extends Identifiable>(collection: Collection) {
  return async function (series: Identifiable) {
    const key = [collection, series.id];
    const read = await kv.get(key);
    return read.value as T | null;
  };
}

function write<T extends Identifiable>(collection: Collection) {
  return async function (entity: T) {
    const key = [collection, entity.id];
    const stored = await kv.set(key, entity);
    return stored.ok;
  };
}

const readSeries = read<Series>("series");
const writeSeries = write<Series>("series");

export const storage = {
  readSeries,
  writeSeries,
};
