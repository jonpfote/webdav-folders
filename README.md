# WebDAV Filesystem for `.code-workspace` files

This extension was created to connect to a WebDAV server using a `.code-workspace` file. Configuration is also possible in the user settings.

> ## Security Warning
>
> This extension **trusts ANY configuration** even in **`untrusted workspaces`**. This means that this extension will connect to any server which is configured in the current workspace settings.
>
> **`Passwords`** are stored as **plain text**. Anyone who can access your workspace config will also be able to read the password. **Use a different extension if you want to store the password securely.**

## Features

- connect to a WebDAV server
- change any configuration in workspace settings or user settings
- use `basic` or `digest` authentication with username and password
- requests via `https` by default (`http` is also supported)
- allow file editing in untrusted workspaces
- support for multiple connections to different servers/as different users at the same time

## Extension Settings

You have to manually create a `example.code-workspace` file.

### Example Config
The following configuration (`example.code-workspace`) will connect to `example.com` via `https` without any authentication (no username/passwort).
```json
{
	"folders": [
		{
			"uri": "webdav://my-folder-id"
		}
	],
	"settings": {
		"jonpfote.webdav-folders": {
			"my-folder-id": {
				"host": "example.com",
				// authentication is optional (see below)
			}
		}
	}
}
```

The object `"jonpfote.webdav-folders": { ... }` can also be put in `User Settings (JSON)`. Look at this example:

```json
example.code-workspace
{
	"folders": [
		{
			"uri": "webdav://my-folder-id"
		}
		// multiple folders at the same time are possible
	]
}

settings.json
{
	"settings": {
		"jonpfote.webdav-folders": { ... }
	}
}
```



### Usage of `basic` or `digest` authentication
```json
"my-folder-id": {
	"host": "example.com",
	"authtype": "basic", // "digest" is also possible
	"username": "my-username",
	"password": "secret-password-as-plain-text"
}
```

### Disable `https` / Use a `http` connection
```json
"my-folder-id": {
	"host": "example.com",
	"ssl": false, // default: true
}
```

### Set a custom port
Use `"host": "example.com:1234"` in the settings.

## Release Notes

This extension uses a JS library called `webdav` (v4.11.2) by `@perry-mitchell`. It is licensed under MIT an can be viewed at [github.com/perry-mitchell/webdav-client](https://github.com/perry-mitchell/webdav-client)
