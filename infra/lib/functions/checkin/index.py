import os
import json
import boto3
import logging
import requests
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('checkin')

client = boto3.client('iot-data')
URL = os.environ['URL']


def handler(event, context):
    logger.info(f'event: {event}')

    thing_name = event['thingName']

    resp = requests.post(f'{URL}/cards/checkin', data=json.dumps(event).encode('utf-8'), headers={'authorization': 'allow'})
    logger.info(f'{resp.status_code}, {resp.content}')

    if 200 == resp.status_code:
        client.publish(
            topic=f'iot/thing/{thing_name}/checkin/accepted',
            qos=1,
            payload=json.dumps({'success': True, 'msg': resp.content}).encode('utf-8')
        )
    else:
        client.publish(
            topic=f'iot/thing/{thing_name}/checkin/rejected',
            qos=1,
            payload=json.dumps({'success': False, 'msg': resp.content}).encode('utf-8')
        )