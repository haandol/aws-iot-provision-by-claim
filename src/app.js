const fs = require('fs');
const path = require('path');
const yargs = require('yargs');
const awsIot = require('aws-iot-device-sdk');

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
  .option('t', {
    alias: 'templateName',
    type: 'string',
    description: 'template name',
    demandOption: true,
  })
  .argv;

class Device {
  constructor(props) {
    this.thingName = props.thingName;
    this.clientId = props.clientId;
    this.initialized = false;

    let keyPath= path.resolve(__dirname, '..', 'certs', 'rootCA.key');
    let certPath= path.resolve(__dirname, '..', 'certs', 'rootCA.pem');
    if (fs.existsSync(path.resolve(__dirname, '..', 'certs', 'device.key'))) {
      keyPath = path.resolve(__dirname, '..', 'certs', 'device.key');
      certPath = path.resolve(__dirname, '..', 'certs', 'device.pem');
      this.initialized = true;
    }

    this.device = awsIot.device({
      keyPath,
      certPath,
      caPath: path.resolve(__dirname, '..', 'certs', 'AmazonRootCA1.pem'),
      clientId: props.clientId,
      host: props.endpoint,
    });
 
    this.device.on('connect', (msg) => {
      console.log('[Device]connect');

      if (!this.initialized) {
        this.subscribe('$aws/certificates/create/json/accepted');
        this.subscribe('$aws/certificates/create/json/rejected');
        this.publish(`$aws/certificates/create/json`, '');
      } else {
        this.subscribe(`iot/thing/${props.thingName}`);
      }
    });

    this.device.on('disconnect', () => {
      console.log('[Device] disconnect');
    })

    this.device.on('message', (topic, message) => {
      console.log(`[OnMessage][${topic}]:`)
      if (topic === '$aws/certificates/create/json/accepted') {
        const payload = JSON.parse(message.toString());
        console.log(payload);

        fs.writeFileSync(path.resolve(__dirname, '..', 'certs', 'device.pem'), payload.certificatePem);
        fs.writeFileSync(path.resolve(__dirname, '..', 'certs', 'device.key'), payload.privateKey);

        const register_template = {
          'certificateOwnershipToken': payload.certificateOwnershipToken,
          'parameters': {
            'SerialNumber': this.thingName,
            'ModelType': 'Demo',
          },
        }

        this.publish(`$aws/provisioning-templates/${props.templateName}/provision/json`, JSON.stringify(register_template));
      } else {
        console.log(`[Device] message: ${topic}-${message.toString()}`);
      }
    });
  }

  publish(topic, msg) {
    console.info(`[Device] publish msg to [${topic}]: ${msg}`);
    this.device.publish(topic, msg);
  }

  subscribe(topic) {
    console.info(`[Device] subscribe [${topic}]`);
    this.device.subscribe(topic);
  }
}


const device = new Device(argv);
