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
}

// This method is called when your extension is deactivated
export function deactivate() {}
