import Config from './config';
import Shared from './shared';
import Storage from './storage';

export default class Interceptor implements angular.IHttpInterceptor {

  static $inject = ['SatellizerConfig', 'SatellizerShared', 'SatellizerStorage'];

  static Factory(SatellizerConfig: Config, SatellizerShared: Shared, SatellizerStorage: Storage): Interceptor {
    return new Interceptor(SatellizerConfig, SatellizerShared, SatellizerStorage);
  }

  constructor(private SatellizerConfig: Config,
              private SatellizerShared: Shared,
              private SatellizerStorage: Storage) {
  }

  request = (config: angular.IRequestConfig): angular.IRequestConfig => {
    if (config['skipAuthorization']) {
      return config;
    }

    if (this.SatellizerShared.isAuthenticated() && this.SatellizerConfig.httpInterceptor()) {
      const storageKeyToken = this.SatellizerConfig.storagePrefix ?
        [this.SatellizerConfig.storagePrefix, this.SatellizerConfig.storageKeyToken].join('_') : this.SatellizerConfig.storageKeyToken;
      let token = this.SatellizerStorage.get(storageKeyToken);

      if (this.SatellizerConfig.tokenHeader && this.SatellizerConfig.tokenType) {
        token = this.SatellizerConfig.tokenType + ' ' + token;
      }

      config.headers[this.SatellizerConfig.tokenHeader] = token;
    }

    return config;
  };
}

Interceptor.Factory.$inject = ['SatellizerConfig', 'SatellizerShared', 'SatellizerStorage'];