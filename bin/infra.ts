#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { AwsIotProvisionByClaimStack } from '../lib/aws-iot-provision-by-claim-stack';

const app = new cdk.App();
new AwsIotProvisionByClaimStack(app, 'AwsIotProvisionByClaimStack');
