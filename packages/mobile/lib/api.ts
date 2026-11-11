import Constants from "expo-constants";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { AppRouterClient } from "@template/web";
import { getDeviceId } from "./device";

const rawBase: string = Constants.expoConfig?.extra?.apiUrl ?? process.env.EXPO_PUBLIC_API_URL ?? "";
const baseUrl = rawBase.replace(/\/+$/, "");

const link = new RPCLink({
  url: `${baseUrl}/api/rpc`,
  headers: async () => ({ "x-device-id": await getDeviceId() }),
});

/** Direct typed client: await client.profile.get() */
export const client: AppRouterClient = createORPCClient(link);

/** TanStack Query helpers: useQuery(orpc.profile.get.queryOptions()) */
export const orpc = createTanstackQueryUtils(client);
