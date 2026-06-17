import { FreshContext, STATUS_CODE } from "$fresh/server.ts";
import { caching } from "../../../lib/caching.ts";
import { rss } from "../../../lib/rss.ts";
import { responseJSON, responseXML, withHttpCache } from "../../../lib/utils.ts";

const FEED_CACHE_KEY = "feeds-cache";
const FEED_TTL_SECONDS = 2 * 60 * 60; // 2 hours

export const handler = async (
  request: Request,
  ctx: FreshContext,
): Promise<Response> => {
  const seriesId = ctx.params.seriesId;

  const response = await withHttpCache(FEED_CACHE_KEY, request, FEED_TTL_SECONDS, async () => {
    console.log(`Fetching feed for ${seriesId}`);
    const series = await caching.getSeries({ id: seriesId });
    if (!series) {
      return null;
    }
    return responseXML(rss.assembleFeed(series), STATUS_CODE.OK);
  });

  if (!response) {
    return responseJSON({ message: "Series not found" }, STATUS_CODE.NotFound);
  }
  return response;
};
