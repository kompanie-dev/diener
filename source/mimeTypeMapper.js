export class MimeTypeMapper {
    #mimeTypeMap;

    constructor(mimeTypeMap) {
        this.#mimeTypeMap = mimeTypeMap;
    }

    getMimeTypeByFileExtension(fileExtension) {
        return this.#mimeTypeMap[fileExtension] || "application/octet-stream";
    }

    isTextMimeType(mimeType) {
        const textMimeTypes = [
            "text/",
            "application/javascript",
            "application/json",
            "image/svg+xml",
            "application/xml"
        ];

        return textMimeTypes.some(type => mimeType.startsWith(type));
    }
}