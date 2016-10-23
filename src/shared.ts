import Config from './config';
import Storage from './storage';
import { decodeBase64 } from './utils';

class Shared {
  static $inject = ['$q', '$window', 'SatellizerConfig', 'SatellizerStorage'];
  
  private prefixedStorageKeyToken: string;
  private prefixedStorageKeyIsGuest: string;

  constructor(private $q: angular.IQService,
              private $window: angular.IWindowService,
              private SatellizerConfig: Config,
              private SatellizerStorage: Storage) {
    const { storagePrefix, storageKeyToken, storageKeyIsGuest } = this.SatellizerConfig;
    this.prefixedStorageKeyToken = storagePrefix ? [storagePrefix, storageKeyToken].join('_') : storageKeyToken;
    this.prefixedStorageKeyIsGuest = storagePrefix ? [storagePrefix, storageKeyIsGuest].join('_') : storageKeyIsGuest;
  }

  getToken(): string {
    return this.SatellizerStorage.get(this.prefixedStorageKeyToken);
  }

  getPayload(): any {
    const token = this.SatellizerStorage.get(this.prefixedStorageKeyToken);

    if (token && token.split('.').length === 3) {
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace('-', '+').replace('_', '/');
        return JSON.parse(decodeBase64(base64));
      } catch (e) {
        // no-op
      }
    }
  }

  setToken(response, isGuest: boolean = false): void {
    const tokenRoot = this.SatellizerConfig.tokenRoot;
    const tokenName = this.SatellizerConfig.tokenName;
    const accessToken = response && response.access_token;

    let token;

    if (accessToken) {
      if (angular.isObject(accessToken) && angular.isObject(accessToken.data)) {
        response = accessToken;
      } else if (angular.isString(accessToken)) {
        token = accessToken;
      }
    }

    if (!token && response) {
      const tokenRootData = tokenRoot && tokenRoot.split('.').reduce((o, x) => o[x], response.data);
      token = tokenRootData ? tokenRootData[tokenName] : response.data && response.data[tokenName];
    }

    if (token) {
      this.SatellizerStorage.set(this.prefixedStorageKeyToken, token);
      this.SatellizerStorage.set(this.prefixedStorageKeyIsGuest, isGuest ? "true" : "false");
    }
  }

  removeToken(): void {
    this.SatellizerStorage.remove(this.prefixedStorageKeyToken);
    this.SatellizerStorage.remove(this.prefixedStorageKeyIsGuest);
  }

  isAuthenticated(ignoreGuest: boolean = true): boolean {
    const token = this.SatellizerStorage.get(this.prefixedStorageKeyToken);

    let result = false;
    if (token) {  // Token is present
      if (token.split('.').length === 3) {  // Token with a valid JWT format XXX.YYY.ZZZ
        try { // Could be a valid JWT or an access token with the same format
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace('-', '+').replace('_', '/');
          const exp = JSON.parse(this.$window.atob(base64)).exp;
          if (typeof exp === 'number') {  // JWT with an optonal expiration claims
            result = Math.round(new Date().getTime() / 1000) < exp;
          }
        } catch (e) {
          result = true;  // Pass: Non-JWT token that looks like JWT
        }
      } else {
        result = true;  // Pass: All other (non JWT) tokens
      }
    }

    // If required, mark guest as un-authenticated
    let isGuestStr = this.SatellizerStorage.get(this.prefixedStorageKeyIsGuest);
    let isGuest = (isGuestStr == "true") ? true : false;
    if (ignoreGuest && isGuest) {
        result = false;
    }

    return result;
  }

  isGuest() : boolean {
    let isGuestStr = this.SatellizerStorage.get(this.prefixedStorageKeyIsGuest);
    let isGuest = (isGuestStr == "true") ? true : false;

    return (this.isAuthenticated(false) && isGuest);
  }

  logout(): angular.IPromise<void> {
    this.SatellizerStorage.remove(this.prefixedStorageKeyToken);
    this.SatellizerStorage.remove(this.prefixedStorageKeyIsGuest);
    return this.$q.when();
  }

  setStorageType(type): void {
    this.SatellizerConfig.storageType = type;
  }
}

export default Shared;
