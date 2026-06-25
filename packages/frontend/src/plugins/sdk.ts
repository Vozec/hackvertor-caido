import type { Caido } from "@caido/sdk-frontend";
import type { InjectionKey, Plugin } from "vue";
import { inject } from "vue";

import type { API, BackendEvents } from "backend";

export type FrontendSDK = Caido<API, BackendEvents>;

const KEY: InjectionKey<FrontendSDK> = Symbol("HackvertorSDK");

export const SDKPlugin: Plugin = (app, sdk: FrontendSDK) => {
  app.provide(KEY, sdk);
};

export const useSDK = (): FrontendSDK => inject(KEY) as FrontendSDK;
