import { Classic } from "@caido/primevue";
import PrimeVue from "primevue/config";
import Tooltip from "primevue/tooltip";
import { createApp } from "vue";

import App from "@/views/App.vue";
import { SDKPlugin, type FrontendSDK } from "@/plugins/sdk";

export const defineApp = (sdk: FrontendSDK) => {
  const app = createApp(App);
  app.use(PrimeVue, { unstyled: true, pt: Classic });
  app.directive("tooltip", Tooltip);
  app.use(SDKPlugin, sdk);
  return app;
};
