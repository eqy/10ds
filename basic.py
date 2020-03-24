import os

from alpha_vantage.timeseries import TimeSeries


def main():
    alpha_vantage_key = os.environ['ALPHA_VANTAGE_KEY']
    series = TimeSeries(alpha_vantage_key)
    aapl, meta = series.get_daily(symbol='AAPL')
    print(aapl)

if __name__ == '__main__':
    main()
