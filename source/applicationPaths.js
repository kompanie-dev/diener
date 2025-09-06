import { dirname } from "path";
import { fileURLToPath } from "url";

export class ApplicationPaths {
    static get sourceDirectory() {
        const currentFileName = fileURLToPath(import.meta.url);

        return dirname(currentFileName);
    }
}