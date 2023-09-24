#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ProvisioningStack } from '../lib/stacks/provisioning-stack';
import { Config } from '../config/loader';

const ns = Config.app.ns;
const app = new cdk.App({
  context: {
    ns,
  },
});

new ProvisioningStack(app, `${ns}ProvisioningStack`, {
  templateName: Config.iot.templateName,
  devicePrefix: Config.iot.devicePrefix,
});
