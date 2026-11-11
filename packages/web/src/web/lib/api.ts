import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { AppRouterClient } from "../../api";
import { getDeviceId } from "./device";

const link = new RPCLink({
  url: `${window.location.origin}/api/rpc`,
  headers: () => ({ "x-device-id": getDeviceId() }),
});

/** Direct typed client: await client.profile.get() */
export const client: AppRouterClient = createORPCClient(link);

/** TanStack Query helpers: useQuery(orpc.profile.get.queryOptions()) */
export const orpc = createTanstackQueryUtils(client);
