"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode_1 = __importDefault(require("vscode"));
const consts_1 = require("./consts");
const logger_1 = require("./logger");
const provider_1 = require("./provider");
let activeProvider;
function activate(context) {
    logger_1.logger.info('Activating extension');
    context.subscriptions.push(vscode_1.default.commands.registerCommand('mimo-copilot.showLogs', () => logger_1.logger.show()), vscode_1.default.commands.registerCommand('mimo-copilot.getApiKey', () => vscode_1.default.env.openExternal(vscode_1.default.Uri.parse('https://platform.xiaomimimo.com/console/api-keys'))), vscode_1.default.commands.registerCommand('mimo-copilot.openSettings', () => vscode_1.default.commands.executeCommand('workbench.action.openSettings', 'mimo-copilot')));
    try {
        const provider = new provider_1.MiMoChatProvider(context);
        activeProvider = provider;
        context.subscriptions.push(vscode_1.default.commands.registerCommand('mimo-copilot.setApiKey', () => provider.configureApiKey()), vscode_1.default.commands.registerCommand('mimo-copilot.clearApiKey', () => provider.clearApiKey()), vscode_1.default.lm.registerLanguageModelChatProvider('mimo', provider));
        void showWelcomeIfNeeded(context, provider).catch((error) => {
            logger_1.logger.warn('Failed to show MiMo welcome prompt', error);
        });
        logger_1.logger.info('Extension activated');
    }
    catch (error) {
        activeProvider = undefined;
        logger_1.logger.error('Failed to activate MiMo extension', error);
        void vscode_1.default.window.showErrorMessage('MiMo failed to activate. Run "MiMo: Show Logs" for details.');
        throw error;
    }
}
async function showWelcomeIfNeeded(context, provider) {
    if (context.globalState.get(consts_1.WELCOME_SHOWN_KEY)) {
        return;
    }
    await context.globalState.update(consts_1.WELCOME_SHOWN_KEY, true);
}
async function deactivate() {
    try {
        await activeProvider?.prepareForDeactivate();
    }
    catch (error) {
        logger_1.logger.warn('Failed to prepare MiMo provider for deactivate', error);
    }
    finally {
        activeProvider = undefined;
        logger_1.logger.info('Extension deactivated');
        logger_1.logger.dispose();
    }
}
//# sourceMappingURL=extension.js.map