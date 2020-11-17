const path = require('path');
const awsIot = require('aws-iot-device-sdk');
const yargs = require('yargs');

const argv = yargs
  .usage('Usage: $0 [options]')
  .option('e', {
    alias: 'endpoint',
    type: 'string',
    description: 'device endpoint',
    demandOption: true,
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
  .argv;

class Device {
  constructor(props) {
    this.thingName = props.thingName;
    this.clientId = props.clientId;

    this.device = awsIot.device({
      keyPath: path.resolve(__dirname, '..', 'certs', 'rootCA.key'),
      certPath: path.resolve(__dirname, '..', 'certs', 'rootCA.pem'),
      caPath: path.resolve(__dirname, '..', 'certs', 'AmazonRootCA1.pem'),
      clientId: props.clientId,
      host: props.endpoint,
    });

    this.hbInteveral = null;

    this.device.on('connect', (msg) => {
      console.log('[Device]connect');

      this.publish(`$aws/certificates/create/json`, '');
    });

    this.device.on('disconnect', () => {
      console.log('[Device] disconnect');
      clearInterval(this.hbInteveral);
      this.hbInteveral = null;
    })

    this.device.on('message', (topic, message) => {
      if (topic === `$aws/events/thing/${this.thingName}/updated`) {
        const payload = JSON.parse(message);
        this.debug = payload.attributes.debug;
        console.log(this.debug);
      } else if (topic === '$aws/certificates/create/json/accepted') {
        const payload = JSON.parse(message.toString());
        console.log(JSON.stringify(payload));

        const register_template = {
          "certificateOwnershipToken": payload.certificateOwnershipToken,
          "parameters": {
            "SerialNumber": this.thingName,
            "ModelType": "Demo",
          },
        }
        this.publish('$aws/provisioning-templates/demo/provision/json', JSON.stringify(register_template));
      } else {
        console.log(`[Device] message: ${topic}-${message.toString()}`);
      }
    });
  }

  publish(topic, msg) {
    console.info(`[Device] publish msg to [${topic}]: ${msg}`);
    this.device.publish(topic, msg);
  }

  heartbeat() {
    this.hbInteveral = setInterval(() => {
      const topic = `iot/thing/${this.clientId}/heartbeat`;
      const msg = JSON.stringify({
        clientId: this.clientId,
        debug: this.debug,
        timestamp: +new Date(),
      });
      this.publish(topic, msg);
    }, 5 * 1000);
  }
}


const device = new Device(argv);
