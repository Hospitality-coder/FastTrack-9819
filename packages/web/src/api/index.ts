import type { RouterClient } from "@orpc/server";
import { createApp } from "./__core/app";
import { ping } from "./routes/ping";
import { profile } from "./routes/profile";
import { fasts } from "./routes/fasts";
import { food } from "./routes/food";
import { weight } from "./routes/weight";
import { water } from "./routes/water";
import { suggestions } from "./routes/suggestions";
import { upload } from "./routes/upload";
import { exercise } from "./routes/exercise";
import { photos } from "./routes/photos";
import { calendar } from "./routes/calendar";

export const router = {
  ping,
  profile,
  fasts,
  food,
  weight,
  water,
  suggestions,
  upload,
  exercise,
  photos,
  calendar,
};

export type AppRouter = typeof router;
/** Typed client for the router — used by the web and mobile api clients. */
export type AppRouterClient = RouterClient<AppRouter>;

const app = createApp(router);

export default app;
