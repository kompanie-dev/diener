# Diener 🤵

A compact, dependency-free development web server with live reload support, made for buildless web applications.

## Getting Started

At first you need to install the package using the following command:

```console
npm i @kompanie/diener
```

You can start the server directly without using any command line switches.

```console
npx diener
```

If you want to specifiy the folder and port and enable live reload:
```console
npx diener --folder="./web/" --port=8000 --livereload
```

## Command Line Switches

The development server supports command line arguments.  
**All of them are optional** and come with sensible defaults.

| Switch                 | Description                                                                                                                                     | Default |
|------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------|---------|
| `--debouncedelay`      | Time in milliseconds the debounce algorithm waits before triggering a browser reload.                                                           | `200` |
| `--folder`             | The folder that should be watched and served.                                                                                                   | [current working directory of node](https://nodejs.org/api/process.html#processcwd) |
| `--ignore-git`         | Ignores paths and files containing `.git` to prevent reloads from changes inside the `.git` folder.                                             | off |
| `--ignore-nodemodules` | Ignores paths and files containing `node_modules` to prevent reloads from changes inside the `node_modules` folder.                             | off |
| `--index`              | Default file served if only a folder is specified in the URL. Treated as the application entry point, where the livereload script is injected.  | `index.html` |
| `--livereload`         | Reload the browser on file changes inside `--folder`. `.DS_Store` and `.tmp` files will never trigger reloads.                                  | off |
| `--mimemap`            | Path to a JSON map for mapping file extensions to MIME types.                                                                                   | [defaultMimeTypeMap.json](./source/defaultMimeTypeMap.json) |
| `--port`               | The port which should be used for the web server and live reload websocket server.                                                              | `8000` |
| `--verbose`            | Enables verbose logging. Logs file/folder changes, triggered browser reloads and HTTP requests.                                                 | off |

## Test project

This repository includes a small test project in `westWebApp`, which can be used to try out stuff while developing.
It can be executed via `npm start`.
