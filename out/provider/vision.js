"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripImagesIfNeeded = stripImagesIfNeeded;
const vscode_1 = __importDefault(require("vscode"));
const logger_1 = require("../logger");
/**
 * Strip image parts from messages when the model doesn't support vision.
 * Logs a warning for each dropped image.
 */
function stripImagesIfNeeded(messages, modelDef) {
    if (modelDef?.capabilities.imageInput) {
        return messages;
    }
    const hasImages = messages.some((m) => m.content.some((p) => p instanceof vscode_1.default.LanguageModelDataPart && p.mimeType.startsWith('image/')));
    if (!hasImages) {
        return messages;
    }
    logger_1.logger.warn(`Model "${modelDef?.id}" does not support vision. Image attachments will be dropped.`);
    return messages.map((m) => {
        const filtered = m.content.filter((p) => !(p instanceof vscode_1.default.LanguageModelDataPart && p.mimeType.startsWith('image/')));
        return {
            role: m.role,
            content: filtered,
        };
    });
}
//# sourceMappingURL=vision.js.map