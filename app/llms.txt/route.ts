import { getActivePlaces } from "@/src/corpus/queries";
import { buildLlmsTxt } from "@/src/seo/llms-txt";
import { SITE_URL } from "@/src/site";

export async function GET() {
  const places = await getActivePlaces();
  return new Response(buildLlmsTxt(places, SITE_URL), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
