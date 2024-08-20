import os
import json
import time
import secrets
import requests
from typing import Tuple, Dict

if os.environ['FLASK_ENV'] == "development":
    ACCESS_MANAGER_URL = 'http://accessmanager:5000'
else:
    ACCESS_MANAGER_URL = os.environ['ACCESS_MANAGER_URL']

def post_request_access_manager(endpoint:str, request_body:dict[str, any]) -> any:
    assert endpoint.startswith('/')

    data = json.loads(json.dumps(request_body))
    response = requests.post(url=f'{ACCESS_MANAGER_URL}{endpoint}', json=data)
    response = response.json()
    return response

def authorize_request(username:str, request:Tuple[str, str]) -> bool:
    request_body = {'username':username, 'request':request}
    response = post_request_access_manager('/authorize_request', request_body)
    if not response['authorized']:
        return False
    
    return response['authorized']

class Session():
    def __init__(self, username, has_sword):
        self.username: str = username
        
        self.session_key:str = secrets.token_hex(32)
        self.disabled:bool = False
        
        self.allowed_requests: Dict[str, list[str]] = {}
        self.denied_requests: Dict[str, list[str]] = {}
        
        self.is_requesting_access = False
        self.has_sword = has_sword

        self.request_log: list[Tuple[str, str]] = []

    def get_key(self) -> Tuple[bool, str]:
        return self.disabled, self.session_key
    
    def disable_session(self):
        self.disabled = True
        self.session_key = None
        self.allowed_requests = None 
        self.denied_requests = None

    def save_request_results(self, request, request_authorized):
        data_type, data_id = request

        request_list = self.allowed_requests if request_authorized else self.denied_requests

        if data_type not in request_list:
            request_list[data_type] = []

        request_list[data_type].append(data_id)

    def is_allowed_access(self, request:Tuple[str, str]) -> bool:
        if self.disabled:
            return False
        
        data_type, data_id = request

        # check if previously denied access
        if data_type in self.denied_requests and data_id in self.denied_requests[data_type]:
            return False

        # check if request previously was authorized
        if data_type in self.allowed_requests:
            is_allowed = data_id in self.allowed_requests[data_type]
            if is_allowed:
                self.request_log.append(request)
                return True
        
        if self.is_requesting_access:
            while self.is_requesting_access:
                time.sleep(1)
            return self.is_allowed_access(request)


        self.is_requesting_access = True

        # ask accessmanager for authorization
        request_authorized = authorize_request(self.username, request)
        self.save_request_results(request, request_authorized)

        self.is_requesting_access = False


        if request_authorized:
            self.request_log.append(request)
            
        return request_authorized