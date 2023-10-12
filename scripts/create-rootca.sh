#!/bin/sh

mkdir -p certs

pushd .
cd certs

openssl genrsa -out Certificate.key 2048

SUBJ="/C=KR"
openssl req -x509 -new -nodes -key Certificate.key -sha256 -days 1024 -out Certificate.pem -extensions v3_ca -subj $SUBJ

popd