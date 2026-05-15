"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthManager = void 0;
const vscode_1 = __importDefault(require("vscode"));
const consts_1 = require("./consts");
/**
 * Manages MiMo API key via VS Code SecretStorage (secure) with
 * fallback to extension settings (less secure, for CI/automation).
 */
class AuthManager {
    secretStorage;
    constructor(context) {
        this.secretStorage = context.secrets;
    }
    /**
     * Get API key. Tries SecretStorage first, then falls back to settings.
     */
    async getApiKey() {
        const secretKey = await this.secretStorage.get(consts_1.API_KEY_SECRET);
        if (secretKey) {
            return secretKey;
        }
        const config = vscode_1.default.workspace.getConfiguration('mimo-copilot');
        const settingsKey = config.get('apiKey');
        if (settingsKey?.trim()) {
            return settingsKey.trim();
        }
        return undefined;
    }
    /**
     * Store API key in SecretStorage.
     */
    async setApiKey(apiKey) {
        await this.secretStorage.store(consts_1.API_KEY_SECRET, apiKey.trim());
    }
    /**
     * Delete stored API key.
     */
    async deleteApiKey() {
        await this.secretStorage.delete(consts_1.API_KEY_SECRET);
    }
    /**
     * Check if an API key is configured.
     */
    async hasApiKey() {
        const key = await this.getApiKey();
        return key !== undefined && key.length > 0;
    }
    /**
     * Prompt user to enter API key via input box.
     */
    async promptForApiKey() {
        const apiKey = await vscode_1.default.window.showInputBox({
            prompt: 'Enter your MiMo API key',
            placeHolder: 'sk-... or tp-...',
            password: true,
            ignoreFocusOut: true,
            validateInput: (value) => {
                if (!value?.trim()) {
                    return 'API key cannot be empty';
                }
                return undefined;
            },
        });
        if (apiKey) {
            await this.setApiKey(apiKey);
            vscode_1.default.window.showInformationMessage('MiMo API key saved securely.');
            return true;
        }
        return false;
    }
}
exports.AuthManager = AuthManager;
//# sourceMappingURL=auth.js.map