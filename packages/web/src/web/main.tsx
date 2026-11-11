// Entry point referenced by index.html — composition only, real bootstrap
// lives in __main.tsx (template-managed).
import { initPwa } from "./lib/pwa";
import "./__main";

initPwa();
