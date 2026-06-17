import { FreshContext, STATUS_CODE } from "$fresh/server.ts";
import { parse, toSeconds } from "https://esm.sh/iso8601-duration@2.1.1";
import { NrkPodcastEpisode, nrkRadio } from "../../../../../lib/nrk/nrk.ts";
import { responseJSON, withHttpCache } from "../../../../../lib/utils.ts";

const CHAPTERS_CACHE_KEY = "chapters-cache";
// NRK index points are effectively immutable once an episode is published.
const CHAPTERS_TTL_SECONDS = 24 * 60 * 60; // 24 hours

type Chapter = {
  title: string | undefined;
  startTime: number | undefined;
};

function toChapters(episode: NrkPodcastEpisode): Chapter[] | null {
  if (!episode.indexPoints) {
    return null;
  }
  return episode.indexPoints.map((indexPoint) => ({
    title: indexPoint.title,
    startTime: indexPoint.startPoint ? toSeconds(parse(indexPoint.startPoint)) : undefined,
  }));
}

export const handler = async (request: Request, ctx: FreshContext): Promise<Response> => {
  const seriesId = ctx.params.seriesId;
  const episodeId = ctx.params.episodeId;

  const response = await withHttpCache(CHAPTERS_CACHE_KEY, request, CHAPTERS_TTL_SECONDS, async () => {
    console.log(`Fetching chapters for ${episodeId}`);
    const episode = await nrkRadio.getEpisode(seriesId, episodeId);
    if (!episode) {
      return null;
    }
    return responseJSON({ version: "1.2.0", chapters: toChapters(episode) }, STATUS_CODE.OK);
  });

  if (!response) {
    return responseJSON({ message: `Episode ${episodeId} is missing` }, STATUS_CODE.NotFound);
  }
  return response;
};
