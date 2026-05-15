"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MiMoChatProvider = void 0;
const vscode_1 = __importDefault(require("vscode"));
const auth_1 = require("../auth");
const client_1 = require("../client");
const config_1 = require("../config");
const consts_1 = require("../consts");
const logger_1 = require("../logger");
const cache_1 = require("./cache");
const convert_1 = require("./convert");
const vision_1 = require("./vision");
/**
 * MiMo Chat Provider — implements vscode.LanguageModelChatProvider so
 * MiMo models appear directly in the Copilot Chat model picker.
 */
class MiMoChatProvider {
    authManager;
    onDidChangeLanguageModelChatInformationEmitter = new vscode_1.default.EventEmitter();
    isActive = true;
    onDidChangeLanguageModelChatInformation = this.onDidChangeLanguageModelChatInformationEmitter.event;
    /** reasoning text → tool_call IDs cache. */
    reasoningCache = new Map();
    /**
     * Adaptive chars-per-token ratio, calibrated from actual usage data.
     * Updated via exponential moving average each time the API reports real token counts.
     */
    charsPerToken = 4.0;
    constructor(context) {
        this.authManager = new auth_1.AuthManager(context);
        context.subscriptions.push(this.onDidChangeLanguageModelChatInformationEmitter, 
        // Settings-based fallback API key changes.
        vscode_1.default.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('mimo-copilot.apiKey')) {
                this.onDidChangeLanguageModelChatInformationEmitter.fire();
            }
        }), 
        // Multi-window: SecretStorage changes don't fire onDidChangeConfiguration.
        // When another window sets/clears the API key, refresh this window's
        // model picker so the warning state stays in sync.
        context.secrets.onDidChange((e) => {
            if (e.key === 'mimo-copilot.apiKey') {
                this.onDidChangeLanguageModelChatInformationEmitter.fire();
            }
        }));
    }
    // ---- Public commands ----
    async configureApiKey() {
        const saved = await this.authManager.promptForApiKey();
        if (saved) {
            this.onDidChangeLanguageModelChatInformationEmitter.fire();
        }
    }
    async clearApiKey() {
        await this.authManager.deleteApiKey();
        this.onDidChangeLanguageModelChatInformationEmitter.fire();
        vscode_1.default.window.showInformationMessage('MiMo API key removed.');
    }
    async hasApiKey() {
        return this.authManager.hasApiKey();
    }
    async prepareForDeactivate() {
        this.isActive = false;
        this.onDidChangeLanguageModelChatInformationEmitter.fire();
        // Force the host to re-pull `provideLanguageModelChatInformation` synchronously
        // before the extension unloads. With `isActive = false` we now return [],
        // which makes Copilot Chat drop MiMo models from the picker immediately
        // instead of leaving stale entries behind after deactivate.
        try {
            await vscode_1.default.lm.selectChatModels({ vendor: 'mimo' });
        }
        catch (error) {
            logger_1.logger.warn('Failed to refresh MiMo models during deactivate', error);
        }
    }
    // ---- LanguageModelChatProvider ----
    async provideLanguageModelChatInformation(_options, _token) {
        if (!this.isActive) {
            return [];
        }
        const hasKey = await this.authManager.hasApiKey();
        return consts_1.MODELS.map((model) => toChatInfo(model, true));
    }
    async provideLanguageModelChatResponse(modelInfo, messages, options, progress, token) {
        const apiKey = await this.authManager.getApiKey();
        const baseUrl = (0, config_1.getBaseUrl)();
        const client = new client_1.MiMoClient(baseUrl, apiKey);
        const modelDef = consts_1.MODELS.find((m) => m.id === modelInfo.id);
        const isThinkingModel = modelDef?.capabilities.thinking ?? false;
        const maxTokens = (0, config_1.getMaxTokens)();
        // Heuristic: detect conversation start to clear stale cache.
        if (messages.length <= 2) {
            (0, cache_1.pruneReasoningCache)(this.reasoningCache, true);
        }
        // Strip images for models that don't support vision
        const resolvedMessages = (0, vision_1.stripImagesIfNeeded)(messages, modelDef);
        const mimoMessages = (0, convert_1.convertMessages)(resolvedMessages, isThinkingModel, this.reasoningCache);
        const tools = modelDef?.capabilities.toolCalling ? (0, convert_1.convertTools)(options.tools) : undefined;
        const totalRequestChars = (0, convert_1.countMessageChars)(mimoMessages);
        let accumulatedReasoning = '';
        const pendingToolCallIds = [];
        let responseMessageId;
        return new Promise((resolve, reject) => {
            client.streamChatCompletion({
                model: (0, config_1.getApiModelId)(modelInfo.id),
                messages: mimoMessages,
                stream: true,
                tools,
                tool_choice: tools && tools.length > 0 ? 'auto' : undefined,
                max_tokens: maxTokens,
            }, {
                onContent: (content) => {
                    progress.report(new vscode_1.default.LanguageModelTextPart(content));
                },
                onThinking: (text) => {
                    accumulatedReasoning += text;
                    // LanguageModelThinkingPart is a proposed API — the class
                    // exists at runtime in both stable and Insiders, but the
                    // stable vscode.d.ts doesn't include it. The .d.ts
                    // augmentation in the project root provides type safety.
                    progress.report(new vscode_1.default.LanguageModelThinkingPart(text));
                },
                onToolCall: (toolCall) => {
                    pendingToolCallIds.push(toolCall.id);
                    // Cache reasoning keyed by tool_call ID
                    if (isThinkingModel && accumulatedReasoning) {
                        this.reasoningCache.set(toolCall.id, {
                            text: accumulatedReasoning,
                            timestamp: Date.now(),
                        });
                    }
                    try {
                        const args = JSON.parse(toolCall.function.arguments);
                        progress.report(new vscode_1.default.LanguageModelToolCallPart(toolCall.id, toolCall.function.name, args));
                    }
                    catch {
                        progress.report(new vscode_1.default.LanguageModelToolCallPart(toolCall.id, toolCall.function.name, {}));
                    }
                },
                onError: (error) => {
                    reject(error);
                },
                onDone: () => {
                    // Cache reasoning for the final response (non-tool-call case).
                    if (isThinkingModel && accumulatedReasoning && pendingToolCallIds.length === 0) {
                        responseMessageId = `resp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
                        this.reasoningCache.set(responseMessageId, {
                            text: accumulatedReasoning,
                            timestamp: Date.now(),
                        });
                    }
                    (0, cache_1.pruneReasoningCache)(this.reasoningCache, false);
                    resolve();
                },
                onUsage: (usage) => {
                    // Calibrate chars-per-token ratio from real API usage data.
                    if (totalRequestChars > 0 && usage.prompt_tokens > 0) {
                        const observedRatio = totalRequestChars / usage.prompt_tokens;
                        this.charsPerToken = this.charsPerToken * 0.7 + observedRatio * 0.3;
                    }
                    // Log cache hit stats and reasoning tokens for observability.
                    const cacheHit = usage.prompt_tokens_details?.cached_tokens ?? 0;
                    const reasoningTokens = usage.completion_tokens_details?.reasoning_tokens ?? 0;
                    const hitRate = usage.prompt_tokens > 0 ? ((cacheHit / usage.prompt_tokens) * 100).toFixed(0) : 'n/a';
                    logger_1.logger.info(`tokens: prompt=${usage.prompt_tokens} completion=${usage.completion_tokens}` +
                        ` | cache: hit=${cacheHit} rate=${hitRate}%` +
                        ` | reasoning=${reasoningTokens}` +
                        ` | chars/tok=${this.charsPerToken.toFixed(2)}`);
                },
            }, token);
        });
    }
    async provideTokenCount(_modelInfo, text, _token) {
        if (typeof text === 'string') {
            return Math.max(1, Math.ceil(text.length / this.charsPerToken));
        }
        if (!text?.content || !Array.isArray(text.content)) {
            return 1;
        }
        let total = 0;
        for (const part of text.content) {
            if (part instanceof vscode_1.default.LanguageModelTextPart) {
                total += part.value.length;
            }
        }
        return Math.max(1, Math.ceil(total / this.charsPerToken));
    }
}
exports.MiMoChatProvider = MiMoChatProvider;
// ---- Helpers ----
function toChatInfo(m, hasApiKey) {
    return {
        id: m.id,
        name: m.name,
        family: m.family,
        version: m.version,
        detail: hasApiKey ? m.detail : consts_1.API_KEY_REQUIRED_DETAIL,
        tooltip: hasApiKey ? undefined : consts_1.API_KEY_REQUIRED_DETAIL,
        statusIcon: hasApiKey ? undefined : new vscode_1.default.ThemeIcon('warning'),
        maxInputTokens: m.maxInputTokens,
        maxOutputTokens: m.maxOutputTokens,
        isUserSelectable: true,
        capabilities: {
            toolCalling: m.capabilities.toolCalling,
            imageInput: m.capabilities.imageInput,
        },
    };
}
//# sourceMappingURL=index.js.map