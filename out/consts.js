"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MODELS = exports.MAX_CACHE_SIZE = exports.API_KEY_REQUIRED_DETAIL = exports.WALKTHROUGH_ID = exports.WELCOME_SHOWN_KEY = exports.API_KEY_SECRET = exports.CONFIG_SECTION = void 0;
/**
 * Compile-time constants shared across the extension.
 *
 * These do NOT depend on the VS Code runtime (no workspace configuration,
 * no secrets API). For run-time settings reads see `config.ts`.
 */
/** VS Code configuration section prefix for all extension settings. */
exports.CONFIG_SECTION = 'mimo-copilot';
// ---- Secret keys ----
/** SecretStorage key for the MiMo API key. */
exports.API_KEY_SECRET = 'mimo-copilot.apiKey';
/** memento key tracking whether the welcome walkthrough has been shown. */
exports.WELCOME_SHOWN_KEY = 'mimo-copilot.welcomeShown';
// ---- Walkthrough ----
/** Walkthrough contribution ID. */
exports.WALKTHROUGH_ID = 'sdmapvstool.xiaomimimo-for-copilot#mimoGettingStarted';
// ---- Model picker ----
/** Detail text shown in the model picker when no API key is configured. */
exports.API_KEY_REQUIRED_DETAIL = 'API key optional for OpenGateway. Use MiMo: Set API Key for official API.';
// ---- Cache ----
/** Max entries in the reasoning-content cache before eviction kicks in. */
exports.MAX_CACHE_SIZE = 200;
// ---- Model registry ----
/** Available MiMo models exposed through the language model provider. */
exports.MODELS = [
    {
        id: 'mimo-v2.5-pro',
        name: 'MiMo V2.5 Pro',
        family: 'mimo',
        version: 'v2.5',
        detail: 'Most capable reasoning model',
        maxInputTokens: 917504,
        maxOutputTokens: 131072,
        capabilities: {
            toolCalling: true,
            imageInput: false,
            thinking: true,
        },
        requiresThinkingParam: false,
    },
    {
        id: 'mimo-v2.5',
        name: 'MiMo V2.5',
        family: 'mimo',
        version: 'v2.5',
        detail: 'Fast model with vision support',
        maxInputTokens: 917504,
        maxOutputTokens: 131072,
        capabilities: {
            toolCalling: true,
            imageInput: true,
            thinking: true,
        },
        requiresThinkingParam: false,
    },
];
//# sourceMappingURL=consts.js.map