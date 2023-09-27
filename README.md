# AWS IoT Provisioing by Claim

Image from [AWS Whitepaper](https://docs.aws.amazon.com/whitepapers/latest/device-manufacturing-provisioning/provisioning-identity-in-aws-iot-core-for-device-connections.html)

<img src="https://docs.aws.amazon.com/images/whitepapers/latest/device-manufacturing-provisioning/images/FleetProvisioningByClaim.png"/>

# Prerequisites

- awscli
- node.js 16+
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

1. open [**/infra/lib/config.ts**](infra/config/dev.toml) and replace values for your environment

2. copy `dev.toml` file under infra folder with name `.toml`

```bash
$ cd infra
$ cp config/dev.toml .toml
```

3. deploy infrastructure

install cdk

```bash
$ npm i -g aws-cdk@2.97.1
```

deploy cdk

```bash
$ npm i
$ cdk bootstrap
$ cdk deploy "*" --require-apporval never
```

## Connect device

1. install dependencies

```bash
$ npm i -g ts-node
```

```bash
$ cd src
$ npm i
```

2. run app.js

```bash
$ export THING_NAME=thing01
$ export DATA_ENDPOINT=$(aws iot describe-endpoint --endpoint-type iot:Data-ATS --query endpointAddress --output text)
$ ts-node app.ts -e $DATA_ENDPOINT -n $THING_NAME -a ../certs/AmazonRootCA1.pem -c clientID1 -t demo
```

3. test publish message

```bash
$ aws iot-data publish --topic iot/thing/$THING_NAME --payload hi
```

# References

https://aws.amazon.com/ko/blogs/iot/how-to-automate-onboarding-of-iot-devices-to-aws-iot-core-at-scale-with-fleet-provisioning/
https://github.com/aws-samples/aws-iot-fleet-provisioning

# TroubleShooting

## Error Loading extension section v3_ca on MacOS

if error, `Error Loading extension section v3_ca`, occurs when execute `create-rootca.sh`, open `/etc/ssl/openssl.cnf` and append below code.

```ini
[ v3_ca ]
basicConstraints = critical,CA:TRUE
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer:always
```
