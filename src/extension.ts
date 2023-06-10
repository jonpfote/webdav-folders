// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import WebdavFS from './webdavFileSystem';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// register "webdav" provider
	const webdavFs: vscode.FileSystemProvider = new WebdavFS();
	const webdavFSProvier = vscode.workspace.registerFileSystemProvider("webdav", webdavFs, {
		isCaseSensitive: true,
	});
	context.subscriptions.push(webdavFSProvier);


	context.subscriptions.push(
		vscode.commands.registerCommand("jonpfote.webdav-folders.connect", async () => {

			// Get the config of the current workspace
			const workspaceConfig: vscode.WorkspaceConfiguration | undefined = vscode.workspace.getConfiguration().get('jonpfote.webdav-folders');
			if(!workspaceConfig || typeof workspaceConfig !== "object") {
				vscode.window.showErrorMessage(
					vscode.l10n.t("You have to create a configuration \"jonpfote.webdav-folders\" before you try to add a WebDAV server to the workspace.")
				);
				return;
			}

			const options: vscode.QuickPickItem[] = Object.keys(workspaceConfig).map(key => {
				const host = workspaceConfig[key]?.host;
				return {
					label: key,
					description: typeof host === "string" ? host : 'no host'
				};
			});
			if(!options.length) {
				vscode.window.showErrorMessage(
					vscode.l10n.t("You have to create a configuration \"jonpfote.webdav-folders\" before you try to add a WebDAV server to the workspace.")
				);
				return;
			}

			const quickPickOptions: vscode.QuickPickOptions = {
				title: vscode.l10n.t("Connect to a WebDAV Server: Select the server ID"),
				// step: 1,
				// totalSteps: 1,
				placeHolder: vscode.l10n.t('Pick the correct server ID'),
				// activeItem: state.runtime,
				// shouldResume: shouldResume
			};
			const connectToFolder = await vscode.window.showQuickPick(options, quickPickOptions);
			if(!connectToFolder) {
				return;
			}
			const newUri = vscode.Uri.parse(`webdav://${connectToFolder?.label}`, true);
			vscode.workspace.updateWorkspaceFolders(0, 0, {uri: newUri});
		})
	);

}

// This method is called when your extension is deactivated
export function deactivate() {}
