import { supabaseConfig } from './config.js';
import { createAuth } from './auth.js';
import { createCloudApi } from './api.js';
import { createSync } from './sync.js';
import { createLibraryVisibility } from './library-visibility.js';
let storage;
try { storage=globalThis.localStorage; } catch { storage={getItem(){throw new Error('Local storage unavailable.');},setItem(){throw new Error('Local storage unavailable.');},removeItem(){}}; }
const config=globalThis.KB_SUPABASE_CONFIG || supabaseConfig;
export const auth=createAuth({storage,config});
const api=createCloudApi(auth,{config});
export const libraryVisibility=createLibraryVisibility(auth,api,{storage});
export const sync=createSync(auth,api,{storage,visibility:libraryVisibility});
