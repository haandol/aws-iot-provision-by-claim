#!/bin/sh

mkdir -p certs

pushd .
cd certs

openssl genrsa -out rootCA.key 2048

SUBJ="/C=KR"
openssl req -x509 -new -nodes -key rootCA.key -sha256 -days 1024 -out rootCA.pem -extensions v3_ca -subj $SUBJ

popd