# AWS IoT Provisioing by Claim

<img src="https://d2908q01vomqb2.cloudfront.net/f6e1126cedebf23e1463aee73f9df08783640400/2020/04/30/fleet-provisioning-1.jpg"/>

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
$ npm i -g aws-cdk@2.97.0
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
$ npm i -g forever
```

```bash
$ cd src
$ npm i
```

2. run app.js

```bash
$ export THING_NAME=thing1
$ export DATA_ENDPOINT=$(aws iot describe-endpoint --endpoint-type iot:Data-ATS --profile $PROFILE --query endpointAddress --output text)
$ forever run app.js -e $DATA_ENDPOINT -n $THING_NAME -c clientID1 -t demo
```

3. test publish message

```bash
$ aws iot-data publish --profile $PROFILE --topic iot/thing/$THING_NAME --payload hi
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
