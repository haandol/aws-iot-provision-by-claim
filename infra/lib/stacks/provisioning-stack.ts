import * as fs from 'fs';
import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iot from 'aws-cdk-lib/aws-iot';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';

interface IProps extends cdk.StackProps {
  templateName: string;
  devicePrefix: string;
}

export class ProvisioningStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: IProps) {
    super(scope, id, props);

    const ns = this.node.tryGetContext('ns') || '';

    const devicePolicyDocument = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: [
            'iot:Publish',
            'iot:Subscribe',
            'iot:Connect',
            'iot:Receive',
          ],
          Resource: ['*'],
        },
        {
          Effect: 'Allow',
          Action: [
            'iot:GetThingShadow',
            'iot:UpdateThingShadow',
            'iot:DeleteThingShadow',
          ],
          Resource: ['*'],
        },
      ],
    };
    const templateBody = JSON.stringify({
      Parameters: {
        SerialNumber: {
          Type: 'String',
        },
        ModelType: {
          Type: 'String',
        },
        'AWS::IoT::Certificate::Id': {
          Type: 'String',
        },
      },
      Resources: {
        thing: {
          Type: 'AWS::IoT::Thing',
          Properties: {
            AttributePayload: {
              model_type: {
                Ref: 'ModelType',
              },
            },
            ThingGroups: [],
            ThingName: {
              'Fn::Join': [
                '',
                [
                  props.devicePrefix,
                  {
                    Ref: 'SerialNumber',
                  },
                ],
              ],
            },
          },
          OverrideSettings: {
            AttributePayload: 'MERGE',
            ThingTypeName: 'REPLACE',
            ThingGroups: 'DO_NOTHING',
          },
        },
        certificate: {
          Type: 'AWS::IoT::Certificate',
          Properties: {
            CertificateId: {
              Ref: 'AWS::IoT::Certificate::Id',
            },
            Status: 'ACTIVE',
          },
        },
        policy: {
          Type: 'AWS::IoT::Policy',
          Properties: {
            PolicyDocument: JSON.stringify(devicePolicyDocument),
          },
        },
      },
    });
    const provisioningRole = new iam.Role(this, 'ProvisioningRole', {
      assumedBy: new iam.ServicePrincipal('iot.amazonaws.com'),
      managedPolicies: [
        {
          managedPolicyArn:
            'arn:aws:iam::aws:policy/service-role/AWSIoTThingsRegistration',
        },
      ],
    });
    const preHookFunction = new lambda.Function(this, 'PreHookFunction', {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.PYTHON_3_11,
      code: lambda.Code.fromAsset(path.resolve(__dirname, '..', 'functions')),
      handler: 'hook.handler',
    });
    preHookFunction.grantInvoke(new iam.ServicePrincipal('iot.amazonaws.com'));
    new iot.CfnProvisioningTemplate(this, `ProvisioningTemplate`, {
      provisioningRoleArn: provisioningRole.roleArn,
      templateBody,
      enabled: true,
      templateName: props.templateName,
      preProvisioningHook: {
        payloadVersion: '2020-04-01',
        targetArn: preHookFunction.functionArn,
      },
    });

    const account = cdk.Stack.of(this).account;
    const region = cdk.Stack.of(this).region;
    const provisionPolicyDocument = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: ['iot:Connect'],
          Resource: '*',
        },
        {
          Effect: 'Allow',
          Action: ['iot:Publish', 'iot:Receive'],
          Resource: [
            `arn:aws:iot:${region}:${account}:topic/$aws/certificates/create/*`,
            `arn:aws:iot:${region}:${account}:topic/$aws/provisioning-templates/${props.templateName}/provision/*`,
          ],
        },
        {
          Effect: 'Allow',
          Action: 'iot:Subscribe',
          Resource: [
            `arn:aws:iot:${region}:${account}:topicfilter/$aws/certificates/create/*`,
            `arn:aws:iot:${region}:${account}:topicfilter/$aws/provisioning-templates/${props.templateName}/provision/*`,
          ],
        },
      ],
    };
    const provisioningPolicy = new iot.CfnPolicy(this, 'ProvisioningPolicy', {
      policyDocument: provisionPolicyDocument,
      policyName: `${ns}provisioningPolicy`,
    });

    const caCertificatePem = fs.readFileSync(
      path.resolve(__dirname, '..', '..', '..', 'certs', 'Certificate.pem')
    );
    const certificate = new iot.CfnCertificate(
      this,
      'ProvisioningCertificate',
      {
        status: 'ACTIVE',
        caCertificatePem: caCertificatePem.toString(),
        certificatePem: caCertificatePem.toString(),
        certificateMode: 'DEFAULT',
      }
    );
    new iot.CfnPolicyPrincipalAttachment(this, 'ProvisioningPolicyAttachment', {
      policyName: provisioningPolicy.policyName!,
      principal: certificate.attrArn,
    });
  }
}
