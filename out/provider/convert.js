"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertMessages = convertMessages;
exports.convertTools = convertTools;
exports.countMessageChars = countMessageChars;
const vscode_1 = __importDefault(require("vscode"));
/**
 * Convert VS Code chat messages to MiMo format.
 * Injects cached reasoning_content for assistant messages that had tool calls
 * in prior turns.
 */
function convertMessages(messages, isThinkingModel, reasoningCache) {
    const result = [];
    for (const message of messages) {
        const role = mapRole(message.role);
        let content = '';
        const toolCalls = [];
        const toolResults = [];
        for (const part of message.content) {
            if (part instanceof vscode_1.default.LanguageModelTextPart) {
                content += part.value;
            }
            else if (part instanceof vscode_1.default.LanguageModelToolCallPart) {
                toolCalls.push({
                    id: part.callId,
                    type: 'function',
                    function: {
                        name: part.name,
                        arguments: JSON.stringify(part.input),
                    },
                });
            }
            else if (part instanceof vscode_1.default.LanguageModelToolResultPart) {
                let toolContent = '';
                for (const item of part.content) {
                    if (item instanceof vscode_1.default.LanguageModelTextPart) {
                        toolContent += item.value;
                    }
                }
                toolResults.push({
                    callId: part.callId,
                    content: toolContent || JSON.stringify(part.content),
                });
            }
        }
        if (role === 'assistant') {
            // Inject reasoning_content from cache for assistant messages
            // that have tool calls (per API requirement).
            let reasoningContent;
            if (isThinkingModel && toolCalls.length > 0) {
                for (const tc of toolCalls) {
                    const cached = reasoningCache.get(tc.id);
                    if (cached) {
                        reasoningContent = cached.text;
                        break;
                    }
                }
            }
            if (content || toolCalls.length > 0) {
                const msg = {
                    role: 'assistant',
                    content: content || '',
                };
                if (toolCalls.length > 0) {
                    msg.tool_calls = toolCalls;
                }
                if (isThinkingModel) {
                    msg.reasoning_content = reasoningContent || '';
                }
                result.push(msg);
            }
        }
        else if (content) {
            result.push({
                role: role,
                content: content,
            });
        }
        // Tool result messages follow their associated assistant message
        for (const tr of toolResults) {
            result.push({
                role: 'tool',
                content: tr.content,
                tool_call_id: tr.callId,
            });
        }
    }
    return result;
}
function mapRole(role) {
    switch (role) {
        case vscode_1.default.LanguageModelChatMessageRole.User:
            return 'user';
        case vscode_1.default.LanguageModelChatMessageRole.Assistant:
            return 'assistant';
        default:
            return 'user';
    }
}
/**
 * Convert VS Code tool definitions to MiMo format.
 */
function convertTools(tools) {
    if (!tools || tools.length === 0) {
        return undefined;
    }
    return tools.map((tool) => ({
        type: 'function',
        function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.inputSchema,
        },
    }));
}
/**
 * Count total characters across all messages to calibrate chars-per-token ratio.
 */
function countMessageChars(messages) {
    let total = 0;
    for (const msg of messages) {
        total += msg.content?.length ?? 0;
        if (msg.tool_calls) {
            for (const tc of msg.tool_calls) {
                total += tc.function?.name?.length ?? 0;
                total += tc.function?.arguments?.length ?? 0;
            }
        }
    }
    return total;
}
//# sourceMappingURL=convert.js.map