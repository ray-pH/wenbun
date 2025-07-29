export type FilePayload = {
    data: string | Uint8Array;
    filename: string;
    mimeType: string;
};

export interface IFileManager {
    /**
    * Let the user pick a file, read it as UTF-8 text or binary, 
    * and tell you what it is.
    * @param acceptExtensions Optional list of extensions to filter (e.g. ["txt","png","json"])
    * @returns a FilePayload or null if cancelled
    */
    upload(acceptExtensions?: string[]): Promise<FilePayload | null>;
    
    /**
    * Prompt the user to save a file (text or binary).
    * @param payload the data, name, and mime type to write
    */
    download(payload: FilePayload): Promise<void>;
}

export class WebFileManager implements IFileManager {
    async upload(acceptExtensions=[]): Promise<FilePayload | null> {
        return new Promise(resolve => {
            const inp = document.createElement('input');
            inp.type = 'file';
            if (acceptExtensions.length)
            inp.accept = acceptExtensions.map(e => `.${e}`).join(',');
            inp.onchange = async () => {
                const file = inp.files?.[0];
                if (!file) return resolve(null);
                const isText = file.type.startsWith('text/') || file.name.match(/\.(txt|json|csv|md)$/);
                const data = isText ? await file.text() : new Uint8Array(await file.arrayBuffer());
                resolve({ data, filename: file.name, mimeType: file.type || (isText ? 'text/plain' : 'application/octet-stream') });
            };
            inp.click();
        });
    }

    async download({ data, filename, mimeType }: FilePayload): Promise<void> {
        const blob = data instanceof Uint8Array
            ? new Blob([data], { type: mimeType })
            : new Blob([data], { type: mimeType });
    
        // Chromium File System Access API
        if ('showSaveFilePicker' in window) {
            // Derive extension for the accept map, e.g. ".txt" from "file.txt"
            const extension = filename.includes('.') 
                ? filename.slice(filename.lastIndexOf('.')) 
                : '';
            const handle = await (window as any).showSaveFilePicker({
                suggestedName: filename,
                types: [{
                    description: 'File',
                    accept: { [mimeType]: [extension] }
                }]
            });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            return;
        }
    
        // Fallback: anchor click
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
};