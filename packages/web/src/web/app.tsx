import { Route, Switch } from "wouter";
import { AgentFeedback } from "@runablehq/website-runtime";
import { Provider } from "./components/provider";
import { Layout } from "./components/layout";
import HomePage from "./pages/home";
import FastPage from "./pages/fast";
import FoodPage from "./pages/food";
import FoodEntryPage from "./pages/food-entry";
import ScanPage from "./pages/scan";
import WaterPage from "./pages/water";
import WeightPage from "./pages/weight";
import SettingsPage from "./pages/settings";
import CalendarPage from "./pages/calendar";
import GalleryPage from "./pages/gallery";
import { Empty, Pill } from "./components/ui";
import { Link } from "wouter";

function NotFound() {
  return (
    <div className="flex flex-col items-center gap-4 py-20">
      <Empty title="Lost in the shadows" body="That page doesn't exist." />
      <Link to="/">
        <Pill label="Back home" />
      </Link>
    </div>
  );
}

function App() {
  return (
    <Provider>
      <Layout>
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/fast" component={FastPage} />
          <Route path="/food" component={FoodPage} />
          <Route path="/food/:id" component={FoodEntryPage} />
          <Route path="/scan" component={ScanPage} />
          <Route path="/water" component={WaterPage} />
          <Route path="/weight" component={WeightPage} />
          <Route path="/settings" component={SettingsPage} />
          <Route path="/calendar" component={CalendarPage} />
          <Route path="/gallery" component={GalleryPage} />
          <Route component={NotFound} />
        </Switch>
      </Layout>
      {/* Do not remove — off by default, activated by parent iframe via postMessage */}
      {import.meta.env.DEV && <AgentFeedback />}
    </Provider>
  );
}

export default App;
