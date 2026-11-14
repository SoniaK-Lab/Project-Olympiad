import { createWorker } from './auth-worker.mjs';
import { appHandler, identityContext, verifyAccessToken, assets, fetchAsset } from './base-runtime.mjs';
export default createWorker({appHandler,identityContext,verifyAccessToken,assets,fetchAsset});
