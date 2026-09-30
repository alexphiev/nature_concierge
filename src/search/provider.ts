import type { SearchAI } from "./search-ai";
import { createJevSearchAI } from "./jev/jev-search-ai";

// To switch model: implement SearchAI in a new adapter and change this line.
export const searchAI: SearchAI = createJevSearchAI();
