import { supabaseConfig } from './config.js';
import { createAuth } from './auth.js';
import { createCloudApi } from './api.js';
import { createSync } from './sync.js';
let storage;
try { storage=globalThis.localStorage; } catch { storage={getItem(){throw new Error('Local storage unavailable.');},setItem(){throw new Error('Local storage unavailable.');},removeItem(){}}; }
const config=globalThis.KB_SUPABASE_CONFIG || supabaseConfig;
export const auth=createAuth({storage,config});
export const sync=createSync(auth,createCloudApi(auth,{config}),{storage});
