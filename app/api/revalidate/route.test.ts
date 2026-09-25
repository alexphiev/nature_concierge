import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { revalidateTagMock } = vi.hoisted(() => ({
  revalidateTagMock: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidateTag: revalidateTagMock }));

import { POST } from "./route";

function makeRequest(token?: string) {
  return new Request("http://localhost/api/revalidate", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }) as unknown as Parameters<typeof POST>[0];
}

describe("POST /api/revalidate", () => {
  beforeEach(() => {
    revalidateTagMock.mockReset();
    vi.stubEnv("REVALIDATE_TOKEN", "correct-token");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 401 when no token is provided", async () => {
    const response = await POST(makeRequest());

    expect(response.status).toBe(401);
    expect(revalidateTagMock).not.toHaveBeenCalled();
  });

  it("returns 401 when the wrong token is provided", async () => {
    const response = await POST(makeRequest("wrong-token"));

    expect(response.status).toBe(401);
    expect(revalidateTagMock).not.toHaveBeenCalled();
  });

  it("revalidates the corpus tag and returns { revalidated: true } with the right token", async () => {
    const response = await POST(makeRequest("correct-token"));

    expect(revalidateTagMock).toHaveBeenCalledWith("corpus", "max");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ revalidated: true });
  });
});
