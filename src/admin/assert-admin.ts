import { headers } from "next/headers";
import { isAdminAuthorization } from "./basic-auth";

export async function assertAdmin(): Promise<void> {
  if (!isAdminAuthorization((await headers()).get("authorization"))) {
    throw new Error("Unauthorized");
  }
}
