"use strict";

const _ = require('lodash');

class FixS3PublicAccessPlugin {
  constructor(serverless) {
    this.error = serverless.classes.Error;
    this.serverless = serverless;

    this.hooks = {
      'before:aws:package:finalize:mergeCustomProviderResources': this.fixAppBucketPublicAccess.bind(this)
    };
  }

  fixAppBucketPublicAccess() {
    const baseResources = this.serverless.service.provider.compiledCloudFormationTemplate;
    const isSinglePageApp = !!this.serverless.service.custom.fullstack?.singlePageApp;

    if (!isSinglePageApp) {
      const bucketConfigProps = baseResources.Resources?.WebAppS3Bucket?.Properties;
      if (!bucketConfigProps)
        throw new this.error("WebAppS3Bucket resource is not defined. Move this plugin lower in the plugins list.");

      this.serverless.cli.log(`Fixing WebApp bucket access ...`);

      bucketConfigProps.PublicAccessBlockConfiguration = {
        BlockPublicAcls: false,
        BlockPublicPolicy: false,
        IgnorePublicAcls: false,
        RestrictPublicBuckets: false
      };
    }

    return baseResources;
  }
}

module.exports = FixS3PublicAccessPlugin;