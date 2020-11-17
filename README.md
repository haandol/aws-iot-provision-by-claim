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

create IAM Role ref https://aws.amazon.com/ko/blogs/iot/setting-up-just-in-time-provisioning-with-aws-iot-core/

```bash
$ ./scripts/create-jitp-template.sh arn:aws:iam::929831892372:role/JITPRole

$ ./scripts/register-root-ca.sh $PROFILE
```

## Deploy infrastructure

```bash
$ cdk deploy "*"
```

## Connect device

install dependencies

```bash
$ cd src
$ npm i
```

run app.js

```bash
$ export DATA_ENDPOINT=$(aws iot describe-endpoint --endpoint-type iot:Data-ATS | jq -r '.endpointAddress')
$ node app.js -e $DATA_ENDPOINT -c clientID1 -n thing01
```

# References

https://aws.amazon.com/ko/blogs/iot/how-to-automate-onboarding-of-iot-devices-to-aws-iot-core-at-scale-with-fleet-provisioning/
https://github.com/aws-samples/aws-iot-fleet-provisioning