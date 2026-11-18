"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.identifyWarningLights = identifyWarningLights;
const scan_1 = require("./scan");
async function identifyWarningLights(provider, image) {
    const result = await provider.identify(image);
    return { ...result, disclaimer: scan_1.PHOTO_DISCLAIMER };
}
