#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { ProvisioningStack } from '../lib/provisioning-stack';
import { RuleStack } from '../lib/rule-stack';
import { Namespace } from '../lib/config/service';

const app = new cdk.App();

new ProvisioningStack(app, `${Namespace}ProvisioningStack`);
new RuleStack(app, `${Namespace}RuleStack`);