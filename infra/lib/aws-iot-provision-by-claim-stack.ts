import * as fs from 'fs';
import * as path from 'path';
import * as cdk from '@aws-cdk/core';
import * as iot from '@aws-cdk/aws-iot';
import * as iam from '@aws-cdk/aws-iam';
import * as lambda from '@aws-cdk/aws-lambda';
import { Account, Region, DevicePrefix, TemplateName } from './config/service';
export class AwsIotProvisionByClaimStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const devicePolicyDocument = {
      'Version': '2012-10-17',
      'Statement': [
        {
          'Effect': 'Allow',
          'Action': [
            'iot:Publish',
            'iot:Subscribe',
            'iot:Connect',
            'iot:Receive'
          ],
          'Resource': [
            '*'
          ]
        },
        {
          'Effect': 'Allow',
          'Action': [
            'iot:GetThingShadow',
            'iot:UpdateThingShadow',
            'iot:DeleteThingShadow'
          ],
          'Resource': [
            '*'
          ]
        },
        {
          'Effect': 'Allow',
          'Action': [
            'greengrass:*'
          ],
          'Resource': [
            '*'
          ]
        }
      ]
    };
    const templateBody = JSON.stringify({
      'Parameters': {
        'SerialNumber': {
          'Type': 'String'
        },
        'ModelType': {
          'Type': 'String'
        },
        'AWS::IoT::Certificate::Id': {
          'Type': 'String'
        }
      },
      'Resources': {
        'certificate': {
          'Properties': {
            'CertificateId': {
              'Ref': 'AWS::IoT::Certificate::Id'
            },
            'Status': 'Active'
          },
          'Type': 'AWS::IoT::Certificate'
        },
        'policy': {
          'Properties': {
            'PolicyDocument': JSON.stringify(devicePolicyDocument),
          },
          'Type': 'AWS::IoT::Policy'
        },
        'thing': {
          'OverrideSettings': {
            'AttributePayload': 'MERGE',
            'ThingGroups': 'DO_NOTHING',
            'ThingTypeName': 'REPLACE'
          },
          'Properties': {
            'AttributePayload': {
              'model_type': {
                'Ref': 'ModelType'
              }
            },
            'ThingGroups': [],
            'ThingName': {
              'Fn::Join': [
                '',
                [
                  DevicePrefix,
                  {
                    'Ref': 'SerialNumber'
                  }
                ]
              ]
            }
          },
          'Type': 'AWS::IoT::Thing'
        }
      }
    });
    const provisioningRole = new iam.Role(this, 'ProvisioningRole', {
      assumedBy: new iam.ServicePrincipal('iot.amazonaws.com'),
      managedPolicies: [
        { managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSIoTThingsRegistration' },
      ],
    });
    const preHookFunction = new lambda.Function(this, 'PreHookFunction', {
      runtime: lambda.Runtime.PYTHON_3_7,
      code: lambda.Code.fromAsset(path.resolve(__dirname, 'functions')),
      handler: 'hook.handler',
    });
    preHookFunction.grantInvoke(new iam.ServicePrincipal('iot.amazonaws.com'));
    new iot.CfnProvisioningTemplate(this, `ProvisioningTemplate`, {
      provisioningRoleArn: provisioningRole.roleArn,
      templateBody,
      enabled: true,
      templateName: TemplateName,
      preProvisioningHook: {
        payloadVersion: '2020-04-01',
        targetArn: preHookFunction.functionArn,
      },
    });

    const provisionPolicyDocument = {
      'Version': '2012-10-17',
      'Statement': [
        {
          'Effect': 'Allow',
          'Action': [
            'iot:Connect'
          ],
          'Resource': '*'
        },
        {
          'Effect': 'Allow',
          'Action': [
            'iot:Publish',
            'iot:Receive'
          ],
          'Resource': [
            `arn:aws:iot:${Region}:${Account}:topic/$aws/certificates/create/*`,
            `arn:aws:iot:${Region}:${Account}:topic/$aws/provisioning-templates/${TemplateName}/provision/*`,
          ]
        },
        {
          'Effect': 'Allow',
          'Action': 'iot:Subscribe',
          'Resource': [
            `arn:aws:iot:${Region}:${Account}:topicfilter/$aws/certificates/create/*`,
            `arn:aws:iot:${Region}:${Account}:topicfilter/$aws/provisioning-templates/${TemplateName}/provision/*`,
          ]
        }
      ]
    };
    const provisioningPolicy = new iot.CfnPolicy(this, 'ProvisioningPolicy', {
      policyDocument: provisionPolicyDocument,
      policyName: 'provisioningPolicy', 
    });

    const caCertificatePem = fs.readFileSync(path.resolve(__dirname, '..', '..', 'certs', 'rootCA.pem'));
    const certificate = new iot.CfnCertificate(this, 'ProvisioningCertificate', {
      status: 'ACTIVE',
      caCertificatePem: caCertificatePem.toString(),
      certificatePem: caCertificatePem.toString(),
      certificateMode: 'DEFAULT',
    });
    certificate.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
    new iot.CfnPolicyPrincipalAttachment(this, 'ProvisioningPolicyAttachment', {
      policyName: provisioningPolicy.policyName!,
      principal: certificate.attrArn,
    });
  }

}
