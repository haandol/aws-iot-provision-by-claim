import json
from datetime import date

provision_response = {
    'allowProvisioning': True,
    'parameterOverrides': {'CertDate': date.today().strftime('%m/%d/%y')}
}


def handler(event, context):
    ########################
    ## Stringent validation against internal API's/DB etc to validate the request before proceeding
    ##
    ## if event['parameters']['SerialNumber'] == 'approved by company CSO':
    ##     provision_response['allowProvisioning'] = True
    #####################
    return provision_response