export interface NetworkInterface {
	get(uri: string, qs: any, json: boolean) : Promise<any>;
	get(uri: string, qs: any) : Promise<any>;
	post(uri: string, form: any, bearerToken?: string): Promise<any>;
	postjson(uri: string, form: any): Promise<any>;
}