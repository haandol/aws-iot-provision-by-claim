import * as fs from 'fs';
import { mqtt, iot, mqtt5, auth, iotidentity } from 'aws-iot-device-sdk-v2';
import { once } from 'events';
const yargs = require('yargs');

type Args = { [index: string]: any };

const argv = yargs
  .usage('Usage: $0 [options]')
  .option('e', {
    alias: 'endpoint',
    type: 'string',
    description: 'device endpoint',
    demandOption: true,
  })
  .option('r', {
    alias: 'region',
    type: 'string',
    default: 'ap-northeast-2',
    description: 'thing name',
  })
  .option('n', {
    alias: 'thingName',
    type: 'string',
    description: 'thing name',
    demandOption: true,
  })
  .option('c', {
    alias: 'clientId',
    type: 'string',
    description: 'client id',
    demandOption: true,
  })
  .option('a', {
    alias: 'caFilepath',
    type: 'string',
    description: 'CA cert file path',
    demandOption: true,
  })
  .option('t', {
    alias: 'templateName',
    type: 'string',
    description: 'template name',
    demandOption: true,
  }).argv;

/*
 * Build an mqtt connection using websockets
 */
async function buildMqtt5Client(
  endpoint: string,
  caFilepath: string,
  clientId: string,
  region: string
) {
  let configBuilder =
    iot.AwsIotMqtt5ClientConfigBuilder.newWebsocketMqttBuilderWithSigv4Auth(
      endpoint,
      {
        region,
        credentialsProvider: auth.AwsCredentialsProvider.newDefault(),
      }
    );
  configBuilder.withCertificateAuthorityFromPath(undefined, caFilepath);
  configBuilder.withConnectProperties({
    keepAliveIntervalSeconds: 60,
    clientId,
  });
  configBuilder.withSessionBehavior(
    mqtt5.ClientSessionBehavior.RejoinPostSuccess
  );

  return new mqtt5.Mqtt5Client(configBuilder.build());
}

async function executeKeys(
  identity: iotidentity.IotIdentityClient
): Promise<string | undefined> {
  return new Promise(async (resolve, reject) => {
    try {
      const keysAccepted = (
        error?: iotidentity.IotIdentityError,
        response?: iotidentity.model.CreateKeysAndCertificateResponse
      ) => {
        if (response) {
          console.log('Got CreateKeysAndCertificateResponse');
        }

        if (error || !response) {
          console.log('Error occurred..');
          reject(error);
        } else {
          resolve(response.certificateOwnershipToken);
        }
      };

      const keysRejected = (
        error?: iotidentity.IotIdentityError,
        response?: iotidentity.model.ErrorResponse
      ) => {
        if (response) {
          console.log(
            'CreateKeysAndCertificate ErrorResponse for ' +
              ' statusCode=:' +
              response.statusCode +
              ' errorCode=:' +
              response.errorCode +
              ' errorMessage=:' +
              response.errorMessage
          );
        }
        if (error) {
          console.log('Error occurred..');
        }
        reject(error);
      };

      console.log(
        'Subscribing to CreateKeysAndCertificate Accepted and Rejected topics..'
      );
      const keysSubRequest: iotidentity.model.CreateKeysAndCertificateSubscriptionRequest =
        {};
      console.log(
        await identity.subscribeToCreateKeysAndCertificateAccepted(
          keysSubRequest,
          mqtt.QoS.AtLeastOnce,
          keysAccepted
        )
      );
      console.log(
        await identity.subscribeToCreateKeysAndCertificateRejected(
          keysSubRequest,
          mqtt.QoS.AtLeastOnce,
          keysRejected
        )
      );

      console.log('Publishing to CreateKeysAndCertificate topic..');
      const keysRequest: iotidentity.model.CreateKeysAndCertificateRequest = {
        toJSON() {
          return {};
        },
      };
      console.log(
        await identity.publishCreateKeysAndCertificate(
          keysRequest,
          mqtt.QoS.AtLeastOnce
        )
      );
    } catch (err) {
      reject(err);
    }
  });
}

async function executeRegisterThing(
  identity: iotidentity.IotIdentityClient,
  token: string,
  templateName: string,
  thingName: string
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    const registerAccepted = (
      error?: iotidentity.IotIdentityError,
      response?: iotidentity.model.RegisterThingResponse
    ) => {
      if (response) {
        console.log('Got RegisterThingResponse');
      }
      if (error) {
        console.log('Error occurred..');
      }
      resolve();
    };
    const registerRejected = (
      error?: iotidentity.IotIdentityError,
      response?: iotidentity.model.ErrorResponse
    ) => {
      if (response) {
        console.log(
          'RegisterThing ErrorResponse for ' +
            'statusCode=:' +
            response.statusCode +
            'errorCode=:' +
            response.errorCode +
            'errorMessage=:' +
            response.errorMessage
        );
      }
      if (error) {
        console.log('Error occurred..');
      }
      reject(error);
    };

    console.log('Subscribing to RegisterThing Accepted and Rejected topics..');
    const registerThingSubRequest: iotidentity.model.RegisterThingSubscriptionRequest =
      { templateName };

    await identity.subscribeToRegisterThingAccepted(
      registerThingSubRequest,
      mqtt.QoS.AtLeastOnce,
      registerAccepted
    );
    await identity.subscribeToRegisterThingRejected(
      registerThingSubRequest,
      mqtt.QoS.AtLeastOnce,
      registerRejected
    );

    console.log('Publishing to RegisterThing topic..');
    const parameters = {
      SerialNumber: thingName,
      ModelType: 'Demo',
    };
    console.log('token=' + token);

    const registerThing: iotidentity.model.RegisterThingRequest = {
      parameters,
      templateName,
      certificateOwnershipToken: token,
    };
    await identity.publishRegisterThing(registerThing, mqtt.QoS.AtLeastOnce);
  });
}

async function main(argv: Args) {
  console.log(`Connecting... ${JSON.stringify(argv)}`);

  const client5 = await buildMqtt5Client(
    argv.endpoint,
    argv.caFilepath,
    argv.clientId,
    argv.region
  );
  const identity = iotidentity.IotIdentityClient.newFromMqtt5Client(client5);

  const connectionSuccess = once(client5, 'connectionSuccess');
  client5.start();

  // force node to wait 60 seconds before killing itself, promises do not keep node alive
  const timer = setTimeout(() => {}, 60 * 1000);
  await connectionSuccess;
  console.log('Connected with Mqtt5 Client!');

  let token = await executeKeys(identity);
  console.log(`token: ${token}`);
  await executeRegisterThing(
    identity,
    token as string,
    argv.templateName,
    argv.thingName
  );

  console.log('Disconnecting...');
  let stopped = once(client5, 'stopped');
  client5.stop();
  await stopped;
  client5.close();
  console.log('Disconnected');

  // Allow node to die if the promise above resolved
  clearTimeout(timer);
}

main(argv).catch((e) => console.error(e));
