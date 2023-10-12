#!/bin/sh

print_usage() {
  echo "Usage: $0 <PROFILE>"
  exit 2
}

if [ -n "$1" ];
then PROFILE=$1
else
  print_usage
fi

pushd .
cd certs

openssl genrsa -out verification.key 2048

REG_CODE=$(aws iot get-registration-code --profile $PROFILE --query registrationCode --output text)
SUBJ="/C=KR/CN=$REG_CODE"
openssl req -new -key verification.key -out verification.csr -subj $SUBJ

openssl x509 -req -in verification.csr -CA Certificate.pem -CAkey Certificate.key -CAcreateserial -out verification.pem -days 500 -sha256

popd
