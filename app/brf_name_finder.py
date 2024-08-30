import os
import re
import pickle
import random
import requests
from time import sleep, time
from azure.storage.blob import BlobServiceClient
from azure.identity import DefaultAzureCredential

class BRFNameFinder():
    def __init__(self, save_path:str, load_cache:bool) -> None:
        super(BRFNameFinder, self).__init__()

        self.save_path = save_path
        
        self.url = "https://www.allabrf.se/items/names"

        self.user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Safari/605.1.15",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36",
        ]

        self.headers = {
            "Accept": "*/*",
            "Accept-Encoding": "gzip, deflate, br, zstd",
            "Accept-Language": "en-US,en;q=0.9,nb-NO;q=0.8,nb;q=0.7,no;q=0.6,sv;q=0.5",
            "Connection": "keep-alive",
            "DNT": "1",
            "Host": "www.allabrf.se",
            "Origin": "https://sv.allabrf.se",
            "Referer": "https://sv.allabrf.se/",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-site",
            "User-Agent": random.choice(self.user_agents),
            "sec-ch-ua-mobile": "?0",
        }

        self.cookies = {}
        self.defualt_cookies = {
            "domain":"allabrf.se", 
            "path": "/",
            "SameSite":"Lax"
        }

        self.required_url_hops = [
            'https://www.allabrf.se/web_components/footer?data[exclude_css]=true&&data[exclude_js]=true',
            'https://www.allabrf.se/web_components/navbar?data[modal_login]=false'
        ]

        self.url_template = 'https://www.allabrf.se/items/names?query={}'

        self.use_azure_storage = os.getenv('USE_AZURE_STORAGE', 'False') == 'True'
        self.azure_blob_service_url = os.getenv('AZURE_BLOB_SERVICE_URL', '')
        self.account_url = os.getenv('AZURE_ACCOUNT_URL', '')
        self.azure_container_name = os.getenv('AZURE_CONTAINER_NAME', '')

        if self.use_azure_storage:
            if self.azure_blob_service_url:
                self.blob_service_client = BlobServiceClient(account_url=self.azure_blob_service_url)
            else:
                credential = DefaultAzureCredential()
                self.blob_service_client = BlobServiceClient(account_url=self.account_url, credential=credential)

        self.session_creation_time = None
        
        self.query_cache = {}
        
        if load_cache:
            self.load_cache()

        
    def change_user_agent(self) -> None:
        current_user_agent = self.headers['User-Agent']
        possible_new_user_agents = [agent for agent in self.user_agents if agent != current_user_agent]
        self.headers['User-Agent'] = random.choice(possible_new_user_agents)
    

    def request_handler(self, url:str):
        # Format query and send request
        response = requests.get(url, headers=self.headers, cookies=self.cookies)
        response_json = response.json()

        # Check the status code and print the response
        if response.status_code != 200:
            print(f"Request failed with status code {response.status_code}")
            return response_json
        
        # Update cookies
        session_cookie = response.cookies.get('_abrf_session')
        if not session_cookie:
            print("Session cookie not found.")
            return response_json
        self.cookies['_abrf_session'] = session_cookie 
        
        return response_json

    def save_cache(self) -> None:
        if self.use_azure_storage:
            try:
                blob_client = self.blob_service_client.get_blob_client(container=self.azure_container_name, blob=self.save_path)

                state_data = pickle.dumps(self.query_cache)
                blob_client.upload_blob(state_data, overwrite=True)
            except Exception as e:
                print(e)
        else:
            try:
                with open(self.save_path, 'wb') as file:
                    pickle.dump(self.query_cache, file)
            except Exception as e:
                print(e)

    def load_cache(self) -> None:
        if self.use_azure_storage:
            try:
                blob_client = self.blob_service_client.get_blob_client(container=self.azure_container_name, blob=self.save_path)
                
                if not blob_client.exists():
                    assert False, "Blob does not exist"

                state_data = blob_client.download_blob().readall()
                self.query_cache = pickle.loads(state_data)

            except Exception as e:
                print(e)
        else:
            try:
                if not os.path.exists(self.save_path):
                    assert False, "File does not exist"

                with open(self.save_path, 'rb') as file:
                    self.query_cache = pickle.load(file)

            except Exception as e:
                print(e)

    def query_handler(self, query) -> None:
        # Check for cache hit
        if query in self.query_cache:
            return self.query_cache[query]
    
        url = self.url_template.format(query)
        response_json = self.request_handler(url)

        # Update cache
        self.query_cache[query] = response_json

        self.save_cache()

        return response_json

    def start_new_session(self) -> None:
        self.cookies = self.defualt_cookies

        for url in self.required_url_hops:
            self.request_handler(url)
            sleep(.62831)

        self.session_creation_time = time()

    def address_to_query(self, address:str) -> str:
        words_in_address = address.split(" ")
    
        # Remove every word containing a number
        for i, word in enumerate(words_in_address):
            if bool(re.search(r'\d', word)):
                words_in_address[i] = None
    
        # Remove none and join
        query = ' '.join([word for word in words_in_address if word])

        return query
    
    def find_brf(self, address:str) -> dict:
        if not self.session_creation_time:
            self.start_new_session()

        address = address.lower()

        # Create variations of query
        default_query = self.address_to_query(address)
        query_variations = [default_query, default_query.replace('city', ''), default_query.replace('gothenburg', 'göteborg')]

        new_query = default_query.split(" ")
        # Remove every word containing väg
        for i, word in enumerate(new_query):
            if 'väg' in word:
                new_query[i] = None
    
        # Remove none and join
        new_query = ' '.join([word for word in new_query if word])
        if len(new_query.replace('city', '').replace('stockholm', '')) > 2:
            query_variations.append(new_query)

        query_variations = list(set(query_variations))

        print(query_variations)
        
        # Check for cache hits
        found_empty_results = False
        for variation in query_variations:
            if variation in self.query_cache:
                cache_hit = self.query_cache[variation]
                # Check for empty hit
                if cache_hit['items'] == []:
                    found_empty_results = True
                else:
                    return cache_hit
        if found_empty_results:
            return None

        # Search every query variations
        for query in query_variations:
            response = self.query_handler(query)
    
            if response['items'] != []:
                return response

            sleep(0.24)
        
        print("unable to get any hits")
        return response
    
if __name__ == "__main__":
    serch_engine = BRFNameFinder('cache.json', load_cache=True)
    serch_engine.start_new_session()
    serch_engine.find_brf('Bjurholmsplan 23A, 11663 Stockholm City')