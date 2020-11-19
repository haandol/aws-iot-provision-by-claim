import * as path from 'path';
import * as cdk from '@aws-cdk/core';
import * as iot from '@aws-cdk/aws-iot';
import * as iam from '@aws-cdk/aws-iam';
import * as lambda from '@aws-cdk/aws-lambda';
import { Url } from './config/service';

export class RuleStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const fn = new lambda.Function(this, 'CheckInFunction', {
      runtime: lambda.Runtime.PYTHON_3_7,
      code: lambda.Code.fromAsset(path.resolve(__dirname, 'functions', 'checkin')),
      handler: 'index.handler',
      environment: {
        URL: Url,
      }
    });
    fn.grantInvoke(new iam.ServicePrincipal('iot.amazonaws.com'));
    fn.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['iot:Publish'],
      resources: ['*'],
    }));

    // Rules
    new iot.CfnTopicRule(this, 'CheckInRule', {
      topicRulePayload: {
        actions: [
          {
            lambda: {
              functionArn: fn.functionArn,
            }
          },
        ],
        ruleDisabled: false,
        sql: "SELECT * FROM 'iot/thing/+/checkin'",
        awsIotSqlVersion: '2016-03-23',
      },
      ruleName: 'CardCheckIn',
    });
  }

}