# AWS IoT Provisioing by Claim

<img src="https://d2908q01vomqb2.cloudfront.net/f6e1126cedebf23e1463aee73f9df08783640400/2020/04/30/fleet-provisioning-1.jpg"/>

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

1. open [**infra/lib/config/service.ts**](infra/lib/config/service.ts) fill the information

2. deploy infrastructure

install cdk
```bash
$ npm i -g cdk@1.74.0
```

deploy cdk

```bash
$ cd infra
$ npm i
$ cdk bootstrap
$ cdk deploy "*" --require-apporval never
```

## Connect device

1. install dependencies

```bash
$ npm i -g forever
```

```bash
$ cd src
$ npm i
```

2. run app.js

```bash
$ export THING_NAME=thing1
$ export DATA_ENDPOINT=$(aws iot describe-endpoint --endpoint-type iot:Data-ATS --profile $PROFILE | jq -r '.endpointAddress')
$ forever run app.js -e $DATA_ENDPOINT -n $THING_NAME -c clientID1 -t demo
```

3. test publish message
```bash
$ aws iot-data publish --profile $PROFILE --topic iot/thing/$THING_NAME --payload hi
```

# References

https://aws.amazon.com/ko/blogs/iot/how-to-automate-onboarding-of-iot-devices-to-aws-iot-core-at-scale-with-fleet-provisioning/
https://github.com/aws-samples/aws-iot-fleet-provisioning