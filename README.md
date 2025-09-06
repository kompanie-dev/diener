# Diener 🤵

A compact, dependency-free development web server with live reload support, made for buildless web applications.

## Getting Started

At first you need to install the package using the following command:

```console
npm i @kompanie/diener
```

You can start the server directly using `npx diener`.

```console
npx diener --folder="./web/" --port=8000 --livereload
```

## Command Line Switches

The development server supports command line arguments.
All of them are optional and come with sensible defaults.

### --debouncedelay

Specifies the time in milliseconds the debounce algorithm waits before triggering a browser reload.

Default: `200`.

### --folder

Specifies the folder that should be watched and served.

Default: [current working directory of node](https://nodejs.org/api/process.html#processcwd).

### --ignore-git

When this flag is present, the watcher ignores paths and files containing .git.
This prevents triggering reloads if something inside the git folder is changing.

Default: off

### --ignore-nodemodules

When this flag is present, the watcher ignores paths and files containing node_modules.
This prevents triggering reloads if something inside the node_modules folder is changing.
This is useful since there are a lot of changes happening randomly in this directory.

Default: off

### --index

Specifies the default file which should be served if only a folder is specified as URL.
This is also treated as the application entry point, in which the livereload script is injected.

Default: `index.html`.

### --livereload

When this flag is present, the server injects a script tag into the file specified in `--index` to connect to the Web Socket based live reload server.
Everytime a file changes, the browser refreshes.
`.DS_Store` and `.tmp` files will never trigger reloads.

Default: off

### --mimemap

Specifies the path to a JSON map for mapping file extensions to mimetypes.

Default: [defaultMimeTypeMap.json](./source/defaultMimeTypeMap.json)

### --port

Specifies the port that should be used to serve the application.

Default: `8000`.

### --verbose

Enables verbose logging for the live reload server.
The server will then log individually in which file or folder a change was detected and when the browser reload was triggered.

Default: off

## Test project

This repository includes a small test project in `westWebApp`, which can be used to try out stuff while developing.
It can be executed via `npm start`.
