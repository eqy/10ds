import json
import os
import re
import requests
import time


from alpha_vantage.timeseries import TimeSeries

#def has_strike(child):
#    res = re.search('[0-9]{1,5}(p|c)', child['data']['selftext'])
#    if res != None:
#        print("??", res)
#    return res != None
#
#
#def has_ticker(child):
#    crap = {'TLDR', 'DD', 'IV'}
#    res = re.search('[A-Z]{2,4}', child['data']['selftext'])
#    print("?", res)
#    if res == None:
#        return False
#    else:
#        for res in 
#    return False

def has_meme(child):
    res = re.search('[A-Z]{2,4} +[0-9]{1,5}(p|c)', child['data']['selftext'])
    if res != None:
        print(res)
    return res != None 

def get_wsb(reqs=10):
    after = None
    children = list()
    for req in range(reqs):
        print("getting req", req)
        url = 'https://www.reddit.com/r/wallstreetbets.json'
        if after is not None:
            url = url + '?after=' + after
        response = requests.get(url,
                                headers={'User-agent': '10ds'}).json()
        after = response['data']['after'] 
        children += response['data']['children']
        time.sleep(0.5)
    return children


def get_post_text(child):
    return child['data']['selftext']


def main():
    alpha_vantage_key = os.environ['ALPHA_VANTAGE_KEY']
    series = TimeSeries(alpha_vantage_key)
    aapl, meta = series.get_daily(symbol='AAPL')
    wsb = get_wsb(50)
    for child in wsb:
        if has_meme(child):
            print(get_post_text(child))
            print("--------------")
    


if __name__ == '__main__':
    main()
