export class IngestionBlockedError extends Error { status?:number }
export function normalizeSource(value:string):string;
export function sourceHash(value:string):string;
export function robotsAllows(robotsText:string,url:string,userAgent?:string):boolean;
export function preflightAndFetch(url:string,options?:{fetchImpl?:typeof fetch;userAgent?:string;timeoutMs?:number;maxBytes?:number;retries?:number;backoffMs?:number}):Promise<{url:string;status:number;contentType:string;body:string;hash:string;robotsUrl:string}>;
export function summarizeChanges(previous:Record<string,unknown>,next:Record<string,unknown>):Array<{field:string;previousValue:unknown;newValue:unknown;reviewStatus:'pending'}>;
