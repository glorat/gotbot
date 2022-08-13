import {NetworkInterface} from "./NetworkInterface";
import {NetworkFetch} from "./NetworkFetch";

export class STTApiConfig {
    static readonly URL_PLATFORM: string = 'https://thorium.disruptorbeam.com/';
    static readonly URL_SERVER: string = 'https://stt.disruptorbeam.com/';

    // default client_id of the Steam Windows version of STT
    static readonly CLIENT_ID: string = '4fc852d7-d602-476a-a292-d243022a475d';
    static readonly CLIENT_API_VERSION: number = 19;
    static readonly CLIENT_VERSION: string = '7.0.10';
    static readonly CLIENT_PLATFORM: string = 'webgl';
}


export default class STTApiLite {
    private _accessToken: string | undefined;
    private _net: NetworkInterface;

    constructor() {
        this._net = new NetworkFetch();
    }

    async loginWithToken(token:string) {
        this._accessToken = token;
        // TODO: Validate the token with some call?
    }

    async login(username: string, password: string, autoLogin: boolean): Promise<string> {
        let data = await this._net.post(STTApiConfig.URL_PLATFORM + 'oauth2/token', {
            username: username,
            password: password,
            client_id: STTApiConfig.CLIENT_ID,
            grant_type: 'password'
        });

        if (data.error_description) {
            throw new Error(data.error_description);
        } else if (data.access_token) {
            this._accessToken = data.access_token;
            return data.access_token;
        } else {
            throw new Error('Invalid data for login!');
        }
    }
    async executeGetRequest(resourceUrl: string, qs: any = {}): Promise<any> {
        if (this._accessToken === undefined) {
            throw new Error('Not logged in!');
        }

        return this._net.get(
            STTApiConfig.URL_SERVER + resourceUrl,
            Object.assign({ client_api: STTApiConfig.CLIENT_API_VERSION, access_token: this._accessToken }, qs)
        );
    }
    async executePostRequest(resourceUrl: string, qs: any): Promise<any> {
        if (this._accessToken === undefined) {
            throw new Error('Not logged in!');
        }

        return this._net.post(
            STTApiConfig.URL_SERVER + resourceUrl,
            Object.assign({ client_api: STTApiConfig.CLIENT_API_VERSION }, qs),
            this._accessToken
        );
    }

}

