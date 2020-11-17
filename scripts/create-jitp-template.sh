#!/bin/sh

print_usage() {
  echo "Usage: $0 <ROLE_ARN>"
  exit 2
}

if [ -n "$1" ];
then ROLE_ARN=$1
else
  print_usage
fi

sed "s|<ROLE_ARN>|${ROLE_ARN}|g" ./jitp/base-template.json > ./certs/provisioning-template.json