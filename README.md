# AWS IoT Provisioing by Claim

# Prerequisites

- awscli
- node.js 10.x+
- AWS Account and locally configured AWS credential


# Installation

1. Register RooCA
2. Deploy Infra
3. Connect device
## Create RootCA

```bash
$ export PROFILE=default
$ ./scripts/create-rootca.sh
```

### Create private key verification certificate

```bash
$ ./scripts/create-verification-crt.sh $PROFILE
```

### Register RootCA using verification certification

```bash
$ ./scripts/register-root-ca.sh $PROFILE
```

## Deploy infrastructure

1. open [**lib/config/service.ts**](lib/config/service.ts) fill the information

2. deploy cdk

```bash
$ cdk bootstrap
$ cdk deploy "*" --require-apporval never
```

## Connect device

1. install dependencies

```bash
$ cd src
$ npm i
```

2. run app.js

```bash
$ export DATA_ENDPOINT=$(aws iot describe-endpoint --endpoint-type iot:Data-ATS | jq -r '.endpointAddress')
$ node app.js -e $DATA_ENDPOINT -c clientID1 -n thing01
```

# References

https://aws.amazon.com/ko/blogs/iot/how-to-automate-onboarding-of-iot-devices-to-aws-iot-core-at-scale-with-fleet-provisioning/
https://github.com/aws-samples/aws-iot-fleet-provisioning