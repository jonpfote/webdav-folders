import * as vscode from "vscode";
import * as webdav from "webdav";


function isFileStat(test: webdav.FileStat | webdav.ResponseDataDetailed<webdav.FileStat>): test is webdav.FileStat {
  return (test as webdav.FileStat).filename !== undefined;
};

/**
 * @implements {vscode.FileSystemProvider}
 */
export default class WebdavFS {

	onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]>;
	clients: { [key: string]: webdav.WebDAVClient };
	_emitter: vscode.EventEmitter<vscode.FileChangeEvent[]>;

	constructor() {
		/**
		 * @private
		 * @type {{[k:string]:webdav.WebDAVClient}}
		 */
		this.clients = {};

		/**
		 * @private
		 * @type {vscode.EventEmitter<vscode.FileChangeEvent[]>}
		 */
		this._emitter = new vscode.EventEmitter();
		/**
		 * @readonly
		 * @type {vscode.Event<vscode.FileChangeEvent[]>}
		 */
		this.onDidChangeFile = this._emitter.event;
	}

	/**
	 * Subscribes to file change events in the file or folder denoted by `uri`.
	 *
	 * @param {vscode.Uri} _resource
	 * @returns {vscode.Disposable}
	 */
	// eslint-disable-next-line no-unused-vars
	watch(_resource: vscode.Uri) {
		// as WebDAV does not support watching files don't do anything
		return new vscode.Disposable(() => {});
	}

	/**
	 * Retrieve metadata about a file.
	 *
	 * @param {vscode.Uri} uri
	 * @return {Promise<vscode.FileStat>}
	 */
	async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
		try {
			const client = this.getClient(uri);

			// load information about the file from the server
			const statInfo = await client.stat(uri.path)
				.then((stat: webdav.FileStat | webdav.ResponseDataDetailed<webdav.FileStat>) => {
					if(isFileStat(stat)) {
						return stat;
					}
					return stat.data;
				})
				.catch(handleErrorFromUri(uri));

			// convert time string into unix milliseconds
			const mtime = new Date(statInfo.lastmod).getTime();
			const fileStat: vscode.FileStat = {
				type: toVscodeFileType(statInfo.type),
				mtime: mtime,
				ctime: mtime,
				size: statInfo.size,
			};
			return fileStat;
		} catch (error) {
			handleErrorFromUri(uri)(error);
			throw Error("The File could not be loaded.");
		}
	}

	/**
	 * Retrieve all entries of a directory.
	 *
	 * @param {vscode.Uri} uri
	 * @returns {Promise<[string, vscode.FileType][]>}
	 */
	async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
		try {
			const client = this.getClient(uri);

			// load file list from server
			const directoryEntries: Array<webdav.FileStat> = await client.getDirectoryContents(uri.path)
				.then(
					(data: Array<webdav.FileStat> | webdav.ResponseDataDetailed<webdav.FileStat[]>) => {
						return (
							data instanceof Array
							? data
							: data.data
						);
					})
				.catch(handleErrorFromUri(uri));

			// return files array with the correct format:
			// ["filename.txt", vscode.FileType.File]
			return directoryEntries.map((fileInformation) => {
				return [
					fileInformation.basename,
					toVscodeFileType(fileInformation.type),
				];
			});

		} catch (error) {
			handleErrorFromUri(uri)(error);
			throw Error("The content of the directory could not be loaded.");
		}
	}

	/**
	 * Create a new directory
	 *
	 * @param {vscode.Uri} uri
	 */
	async createDirectory(uri: vscode.Uri) {
		try {
			const client = this.getClient(uri);
			if (await client.exists(uri.path)) {
				throw vscode.FileSystemError.FileExists(uri);
			}

			// TODO:
			// * @throws {@linkcode FileSystemError.FileNotFound FileNotFound} when the parent of `uri` doesn't exist, e.g. no mkdirp-logic required.
			// * @throws {@linkcode FileSystemError.FileExists FileExists} when `uri` already exists.
			// * @throws {@linkcode FileSystemError.NoPermissions NoPermissions} when permissions aren't sufficient.

			await client.createDirectory(uri.path, {recursive: false})
				.catch(handleErrorFromUri(uri));
		} catch (error) {
			handleErrorFromUri(uri)(error);
		}
	}

	/**
	 * Read the entire contents of a file.
	 *
	 * @param {vscode.Uri} uri
	 * @returns {Promise<Uint8Array>}
	 */
	async readFile(uri: vscode.Uri): Promise<Uint8Array> {
		try {
			// throw vscode.FileSystemError.FileNotFound(uri);
			const client = this.getClient(uri);


			// throw vscode.FileSystemError.FileNotFound(uri);

			// load binary data from server
			const buffer = await client.getFileContents(uri.path, { format: "binary" })
				.then((r: webdav.BufferLike | string | webdav.ResponseDataDetailed<webdav.BufferLike | string>) => (r))
				.catch(handleErrorFromUri(uri));


			return getUint8ArrayFromFileContentResponse(buffer);

		} catch (error) {
			handleErrorFromUri(uri)(error);
			throw Error("The content of the file could not be loaded.");
		}
	}

	/**
	 * Write data to a file, replacing its entire contents.
	 *
	 * @param {vscode.Uri} uri
	 * @param {Uint8Array} content
	 * @param {{ create: boolean, overwrite: boolean }} options
	 */
	async writeFile(uri: vscode.Uri, content: Uint8Array, options: { readonly create: boolean; readonly overwrite: boolean }) {
		try {
			const client = await this.getClient(uri);
			const filePath = uri.path;
			const existsAlready = await client.exists(filePath);

			// The file does not exist and should not be created
			if (!existsAlready && !options.create) {
				throw vscode.FileSystemError.FileNotFound(uri);
			}

			if (existsAlready) {
				// The file exists but should not be overwritten
				if (!options.overwrite) {
					throw vscode.FileSystemError.FileExists(uri);
				}

				// TODO:
				// * @throws {@linkcode FileSystemError.FileNotFound FileNotFound} when the parent of `uri` doesn't exist and `create` is set, e.g. no mkdirp-logic required.

				// Check if the file which exists is a directory
				const stat: webdav.FileStat = await client.stat(filePath)
					.then((stat: webdav.FileStat | webdav.ResponseDataDetailed<webdav.FileStat>) => {
						if(isFileStat(stat)) {
							return stat;
						}
						return stat.data;
					})
					.catch(handleErrorFromUri(uri));
				if (stat.type === "directory") {
					throw vscode.FileSystemError.FileIsADirectory(uri);
				}
			}

			// Upload file contents
			await client.putFileContents(filePath, content, {
				overwrite: options.overwrite,
			})
			.catch(handleErrorFromUri(uri));
		} catch (error) {
			handleErrorFromUri(uri)(error);
			throw Error("The file could not be created or written to.");
		}
	}

	/**
	 * Delete a file.
	 *
	 * @param {vscode.Uri} uri
	 */
	async delete(uri: vscode.Uri) {
		const client = this.getClient(uri);
		await client.deleteFile(uri.path)
			.catch(handleErrorFromUri(uri));
	}

	/**
	 * Rename a file or folder.
	 *
	 * @param {vscode.Uri} oldUri
	 * @param {vscode.Uri} newUri
	 * @param {{ overwrite: boolean }} options
	 */
	async rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean }) {
		try {
			const client = this.getClient(oldUri);

			// the client must be the same after renaming the file
			if (client !== this.getClient(newUri)) {
				throw vscode.FileSystemError.NoPermissions;
			}

			const oldFilepath = oldUri.path;
			const newFilepath = newUri.path;

			if (!options.overwrite) {
				const newFilepathExists = await client.exists(newFilepath);
				if (newFilepathExists) {
					throw vscode.FileSystemError.FileExists(newUri);
				}
			}

			await client.moveFile(oldFilepath, newFilepath)
				.catch(handleErrorFromUri(oldUri));
		} catch (error) {
			handleErrorFromUri(oldUri)(error);
			throw Error("The file could not be renamed.");
		}
	}

	/**
	 * @param {vscode.Uri} oldUri
	 * @param {vscode.Uri} newUri
	 * @param {{ overwrite: boolean }} options
	 */
	async copy(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean }) {
		try {
			const client = this.getClient(oldUri);

			// the client must be the same after copying the file
			if (client !== this.getClient(newUri)) {
				throw vscode.FileSystemError.NoPermissions(oldUri);
			}

			const oldFilepath = oldUri.path;
			const newFilepath = newUri.path;

			if (!options.overwrite) {
				const newFilepathExists = await client.exists(newFilepath);
				if (newFilepathExists) {
					throw vscode.FileSystemError.FileExists(newUri);
				}
			}
			await client.copyFile(oldFilepath, newFilepath)
				.catch(handleErrorFromUri(oldUri));
		} catch (error) {
			handleErrorFromUri(oldUri)(error);
			throw Error("The file could not be copied.");
		}
	}



	/**
	 * format:
	 *
	 * webdav://[user:password@]host[:port][/path/to/file/or/folder]
	 * @private
	 * @param {vscode.Uri} uri
	 */
	getClient(uri: vscode.Uri) {
		const key: string = uri.authority;
		if (this.clients[key]) {
			return this.clients[key];
		}

		// Get the config of the current workspace
		const workspaceConfig: vscode.WorkspaceConfiguration | undefined = vscode.workspace.getConfiguration().get('jonpfote.webdav-folders');
		if(!workspaceConfig) {
			throw vscode.FileSystemError.FileNotFound("The Config is invalid: No config found.");
		}

		// Check if the config is set correctly
		const webdavFolderConfig: any =workspaceConfig[uri.authority];

		if(!webdavFolderConfig || typeof webdavFolderConfig !== "object" || Array.isArray(webdavFolderConfig)) {
			throw vscode.FileSystemError.FileNotFound("The Config is invalid: No config found.");
		}

		const useSSL = typeof webdavFolderConfig.ssl === "boolean" ? webdavFolderConfig.ssl : true;
		const host = webdavFolderConfig.host;
		if(typeof host !== "string") {
			throw vscode.FileSystemError.FileNotFound("The Config is invalid: No 'host' of type 'string' in config.");
		}

		const authtype = webdavFolderConfig.authtype;
		const opt: webdav.WebDAVClientOptions = {};
		if(typeof authtype === "string") {
			if(authtype === "basic") {
				opt.authType = webdav.AuthType.Password;
			} else if(authtype === "digest") {
				opt.authType = webdav.AuthType.Digest;
			} else {
				throw new Error(
					`Authentication type '${authtype}' is not supported!`
				);
			}

			opt.username = webdavFolderConfig.username;
			opt.password = webdavFolderConfig.password;
		}
		// ("Die Konfiguration de")

		// Create new client
		const pathOfClient = (
			(useSSL ? 'https://' : 'http://')
			+ host
		);

		try {
			const client: webdav.WebDAVClient = webdav.createClient(pathOfClient, opt);
			this.clients[key] = client;
			return client;

		} catch (error) {
			handleErrorFromUri(uri)(error);
			throw Error("The Extension could not be initialized.");
		}
	}
}


/**
 * @param {webdav.FileStat['type']} ftype
 * @returns {vscode.FileType}
 */
function toVscodeFileType(ftype: string) {
	return (
		ftype === "file"
		? vscode.FileType.File
		: vscode.FileType.Directory
	);
}
function getUint8ArrayFromFileContentResponse(buffer: webdav.BufferLike | string | webdav.ResponseDataDetailed<webdav.BufferLike | string>): Uint8Array {
	// Handle different types of buffers
	if(typeof buffer === "string") {
		const encoder = new TextEncoder();
		return encoder.encode(buffer);
	}

	if(buffer instanceof Uint8Array) {
		return buffer;
	}
	if(buffer instanceof ArrayBuffer) {
		return new Uint8Array(buffer);
	}

	return getUint8ArrayFromFileContentResponse(buffer.data);
}

/**
 * @type {(uri:vscode.Uri)=>(err:{status:number})=>never}
 */
const handleErrorFromUri = (uri: vscode.Uri): (reason: any) => PromiseLike<never> => {
	const errorHandler = (error: any): never => {
		if(typeof error === "string") {
			vscode.window.showErrorMessage(`Error for file "${uri.path}"; ${error}`);
			throw Error(error);
		}

		if(error && typeof error === "object") {
			vscode.window.showErrorMessage(`Error ${error.status} for file "${uri.path}"; ${error.message}`);
			if (error.status === 403 || error.status === 401 ) {
				throw vscode.FileSystemError.NoPermissions(uri);
			}
			if (error.status === 404) {
				throw vscode.FileSystemError.FileNotFound(uri);
			}
			throw error;
		}

		throw Error("Unable to show error message.");
	};
	return errorHandler;
};