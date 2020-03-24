import json
import os
import requests


from alpha_vantage.timeseries import TimeSeries

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
    return children


def get_post_text(child):
    return child['data']['selftext']


def main():
    alpha_vantage_key = os.environ['ALPHA_VANTAGE_KEY']
    series = TimeSeries(alpha_vantage_key)
    aapl, meta = series.get_daily(symbol='AAPL')
    wsb = get_wsb()
    for child in wsb:
        print(get_post_text(child))
        print("--------------")
    


if __name__ == '__main__':
    main()
