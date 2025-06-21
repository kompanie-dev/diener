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

Specifies the time in milliseconds the debounce algorithm waits before triggering a browser reload. Defaults to 200.

### --folder

Specifies the folder that should be watched and served. Defaults to the current working directory of node.

### --ignore-git

When this flag is present, the watcher ignores paths and files containing .git.
This prevents triggering reloads if something inside the git folder is changing.
Disabled by default.

### --ignore-nodemodules

When this flag is present, the watcher ignores paths and files containing node_modules.
This prevents triggering reloads if something inside the node_modules folder is changing.
This is useful since there are a lot of changes happening randomly in this directory.
Disabled by default.

### --index

Specifies the default file which should be served if only a folder is specified as URL.
This is also treated as the application entry point, in which the livereload script is injected. Defaults to index.html.

### --livereload

When this flag is present, the server injects script tags into the index html files to connect to the Web Socket based live reload server.
Everytime a file changes, the browser refreshes.
Disabled by default.

### --mimemap

Specifies the path to a JSON map for mapping file extensions to mimetypes.
Defaults and the file structure can be seen in [defaultMimeTypeMap.json](./source/defaultMimeTypeMap.json)

### --port

Specifies the port that should be used to serve the application.
Defaults to port 8000.

## Test project

This repository includes a small test project in `westWebApp`, which can be used to try out stuff while developing.
It can be executed via `npm start`.
